import * as THREE from "three";

// ======================================================
// AR COGNITIVE LAB
// Markerless WebXR AR - Catch the Target
// ======================================================


// ======================================================
// THREE.JS VARIABLES
// ======================================================

let scene;
let camera;
let renderer;

let controller;

let reticle;

let xrSession = null;

let viewerSpace = null;
let localFloorSpace = null;

let hitTestSource = null;

let hitTestReady = false;


// ======================================================
// GAME VARIABLES
// ======================================================

let gameGroup = null;

let placed = false;
let gameStarted = false;
let waitingForNext = false;

let currentTrial = 0;
let score = 0;

let targetColor = "";

let trialStartTime = 0;

let reactionTimes = [];

const TOTAL_TRIALS = 10;
const ORB_COUNT = 6;


// ======================================================
// COLORS
// ======================================================

const COLORS = {

    RED: 0xff304f,

    BLUE: 0x3182ff,

    GREEN: 0x22dd77,

    YELLOW: 0xffcc33,

    PURPLE: 0xb04cff,

    CYAN: 0x00d9ff

};

const COLOR_NAMES = Object.keys(COLORS);


// ======================================================
// HTML ELEMENTS
// ======================================================

const startScreen =
    document.getElementById("startScreen");

const startButton =
    document.getElementById("startButton");

const errorMessage =
    document.getElementById("errorMessage");

const instruction =
    document.getElementById("instruction");

const instructionTitle =
    document.getElementById("instructionTitle");

const instructionText =
    document.getElementById("instructionText");

const gameInfo =
    document.getElementById("gameInfo");

const trialText =
    document.getElementById("trialText");

const scoreText =
    document.getElementById("scoreText");

const resultScreen =
    document.getElementById("resultScreen");

const accuracyElement =
    document.getElementById("accuracy");

const correctElement =
    document.getElementById("correct");

const averageElement =
    document.getElementById("average");

const fastestElement =
    document.getElementById("fastest");

const restartButton =
    document.getElementById("restartButton");


// ======================================================
// INITIALIZE
// ======================================================

init();


function init() {

    // --------------------------------------------------
    // Scene
    // --------------------------------------------------

    scene =
        new THREE.Scene();


    // --------------------------------------------------
    // Camera
    // --------------------------------------------------

    camera =
        new THREE.PerspectiveCamera(
            70,
            window.innerWidth /
                window.innerHeight,
            0.01,
            20
        );


    // --------------------------------------------------
    // Renderer
    // --------------------------------------------------

    renderer =
        new THREE.WebGLRenderer({

            antialias: true,

            alpha: true,

            powerPreference:
                "high-performance"

        });


    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );


    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );


    renderer.xr.enabled = true;


    // IMPORTANT:
    // Use local initially.
    // We manually request local-floor
    // and fallback to local later.

    renderer.xr.setReferenceSpaceType(
        "local"
    );


    document.body.appendChild(
        renderer.domElement
    );


    // ==================================================
    // LIGHTING
    // ==================================================

    const ambient =
        new THREE.HemisphereLight(
            0xffffff,
            0x444444,
            2
        );

    scene.add(ambient);


    const light =
        new THREE.DirectionalLight(
            0xffffff,
            2
        );


    light.position.set(
        2,
        4,
        2
    );


    scene.add(light);


    // ==================================================
    // RETICLE
    // ==================================================

    createReticle();


    // ==================================================
    // XR CONTROLLER
    // ==================================================

    controller =
        renderer.xr.getController(0);


    controller.addEventListener(
        "select",
        onSelect
    );


    scene.add(controller);


    // ==================================================
    // EVENTS
    // ==================================================

    window.addEventListener(
        "resize",
        onResize
    );


    startButton.addEventListener(
        "click",
        startAR
    );


    restartButton.addEventListener(
        "click",
        restartGame
    );


    // ==================================================
    // RENDER LOOP
    // ==================================================

    renderer.setAnimationLoop(
        render
    );


    // ==================================================
    // CHECK AR SUPPORT
    // ==================================================

    checkARSupport();

}


// ======================================================
// CHECK WEBXR SUPPORT
// ======================================================

async function checkARSupport() {

    if (!navigator.xr) {

        disableAR(
            "WebXR is not available in this browser."
        );

        return;

    }


    try {

        const supported =
            await navigator.xr
                .isSessionSupported(
                    "immersive-ar"
                );


        if (!supported) {

            disableAR(
                "Immersive AR is not supported on this device/browser."
            );

            return;

        }


        console.log(
            "✓ immersive-ar supported"
        );


        errorMessage.innerText =
            "";


    }

    catch (error) {

        console.error(
            "WebXR support error:",
            error
        );


        disableAR(
            "Unable to check AR support."
        );

    }

}


// ======================================================
// DISABLE AR
// ======================================================

function disableAR(message) {

    startButton.disabled =
        true;

    startButton.style.opacity =
        "0.5";

    errorMessage.innerText =
        message;

}


// ======================================================
// CREATE RETICLE
// ======================================================

function createReticle() {

    const geometry =
        new THREE.RingGeometry(
            0.08,
            0.10,
            32
        );


    const material =
        new THREE.MeshBasicMaterial({

            color: 0x00ff88,

            side: THREE.DoubleSide

        });


    reticle =
        new THREE.Mesh(
            geometry,
            material
        );


    reticle.rotation.x =
        -Math.PI / 2;


    reticle.matrixAutoUpdate =
        false;


    reticle.visible =
        false;


    scene.add(reticle);

}


// ======================================================
// START AR
// ======================================================

async function startAR() {

    errorMessage.innerText =
        "";


    startButton.disabled =
        true;


    try {

        // ------------------------------------------------
        // Check WebXR
        // ------------------------------------------------

        if (!navigator.xr) {

            throw new Error(
                "WebXR is not available."
            );

        }


        instructionTitle.innerText =
            "📱 STARTING AR";


        instructionText.innerText =
            "Opening camera and AR session...";


        console.log(
            "Starting immersive AR..."
        );


        // ------------------------------------------------
        // Request AR Session
        // ------------------------------------------------

        xrSession =
            await navigator.xr.requestSession(
                "immersive-ar",
                {

                    requiredFeatures: [
                        "hit-test"
                    ],

                    optionalFeatures: [
                        "local-floor",
                        "dom-overlay"
                    ],

                    domOverlay: {
                        root:
                            document.body
                    }

                }
            );


        console.log(
            "✓ AR session started"
        );


        instructionTitle.innerText =
            "✓ AR SESSION STARTED";


        instructionText.innerText =
            "Preparing surface detection...";


        // ------------------------------------------------
        // Give session to Three.js
        // ------------------------------------------------

        await renderer.xr.setSession(
            xrSession
        );


        console.log(
            "✓ Three.js XR session ready"
        );


        // ------------------------------------------------
        // Viewer reference space
        // ------------------------------------------------

        viewerSpace =
            await xrSession
                .requestReferenceSpace(
                    "viewer"
                );


        console.log(
            "✓ Viewer reference space ready"
        );


        // ------------------------------------------------
        // Local floor reference space
        // ------------------------------------------------

        try {

            localFloorSpace =
                await xrSession
                    .requestReferenceSpace(
                        "local-floor"
                    );


            console.log(
                "✓ local-floor reference space"
            );

        }

        catch (error) {

            console.warn(
                "local-floor unavailable."
            );


            localFloorSpace =
                await xrSession
                    .requestReferenceSpace(
                        "local"
                    );


            console.log(
                "✓ local reference space fallback"
            );

        }


        // ------------------------------------------------
        // IMPORTANT:
        // Synchronize Three.js reference space
        // ------------------------------------------------

        renderer.xr.setReferenceSpace(
            localFloorSpace
        );


        console.log(
            "✓ Three.js reference space synchronized"
        );


        // ------------------------------------------------
        // Create hit-test source ONCE
        // ------------------------------------------------

        hitTestSource =
            await xrSession
                .requestHitTestSource({

                    space:
                        viewerSpace

                });


        hitTestReady =
            true;


        console.log(
            "✓ Hit-test source created"
        );


        // ------------------------------------------------
        // Reset game
        // ------------------------------------------------

        placed = false;

        gameStarted = false;

        waitingForNext = false;

        currentTrial = 0;

        score = 0;

        reactionTimes = [];


        // ------------------------------------------------
        // UI
        // ------------------------------------------------

        startScreen.style.display =
            "none";


        resultScreen.style.display =
            "none";


        instruction.style.display =
            "block";


        gameInfo.style.display =
            "none";


        instructionTitle.innerText =
            "🔍 SCANNING FOR SURFACE";


        instructionText.innerText =
            "Move your phone slowly over a floor or table.";


        // ------------------------------------------------
        // Session end
        // ------------------------------------------------

        xrSession.addEventListener(
            "end",
            onSessionEnd
        );


        // ------------------------------------------------
        // Final debug
        // ------------------------------------------------

        console.log(
            "================================"
        );

        console.log(
            "AR READY"
        );

        console.log(
            "Move phone slowly to find surface."
        );

        console.log(
            "================================"
        );

    }

    catch (error) {

        console.error(
            "AR ERROR:",
            error
        );


        startButton.disabled =
            false;


        showError(
            getReadableError(
                error
            )
        );

    }

}


// ======================================================
// ERROR MESSAGE
// ======================================================

function getReadableError(error) {

    console.error(
        "Error name:",
        error.name
    );

    console.error(
        "Error message:",
        error.message
    );


    if (
        error.name ===
        "NotAllowedError"
    ) {

        return (
            "AR permission was denied. " +
            "Allow camera permission and try again."
        );

    }


    if (
        error.name ===
        "NotSupportedError"
    ) {

        return (
            "This device/browser does not support the required AR features."
        );

    }


    if (
        error.name ===
        "SecurityError"
    ) {

        return (
            "AR requires HTTPS. " +
            "Open the GitHub Pages HTTPS URL."
        );

    }


    if (
        error.name ===
        "InvalidStateError"
    ) {

        return (
            "AR session is already running. " +
            "Reload the page and try again."
        );

    }


    return (
        "Could not start AR: " +
        (
            error.message ||
            error.name ||
            "Unknown error"
        )
    );

}


// ======================================================
// XR SELECT / PHONE TAP
// ======================================================

function onSelect(event) {

    console.log(
        "XR SELECT EVENT"
    );


    // --------------------------------------------------
    // FIRST TAP = PLACE GAME
    // --------------------------------------------------

    if (!placed) {

        if (
            !reticle.visible
        ) {

            instructionTitle.innerText =
                "❗ NO SURFACE FOUND";


            instructionText.innerText =
                "Move your phone slowly over a textured floor or table.";


            return;

        }


        placeGame();

        return;

    }


    // --------------------------------------------------
    // GAME TAP
    // --------------------------------------------------

    if (
        gameStarted &&
        !waitingForNext
    ) {

        checkTarget(
            event
        );

    }

}


// ======================================================
// PLACE GAME
// ======================================================

function placeGame() {

    if (
        !reticle.visible
    ) {

        return;

    }


    placed = true;


    // --------------------------------------------------
    // Save reticle matrix
    // --------------------------------------------------

    const placementMatrix =
        reticle.matrix.clone();


    reticle.visible =
        false;


    // --------------------------------------------------
    // Create group
    // --------------------------------------------------

    gameGroup =
        new THREE.Group();


    // --------------------------------------------------
    // Position
    // --------------------------------------------------

    gameGroup.position.setFromMatrixPosition(
        placementMatrix
    );


    // --------------------------------------------------
    // Orientation
    // --------------------------------------------------

    gameGroup.rotation.set(
        0,
        0,
        0
    );


    scene.add(
        gameGroup
    );


    // --------------------------------------------------
    // Create arena
    // --------------------------------------------------

    createArena();


    // --------------------------------------------------
    // UI
    // --------------------------------------------------

    instructionTitle.innerText =
        "🎯 AR GAME READY";


    instructionText.innerText =
        "Find and tap the requested glowing orb.";


    gameInfo.style.display =
        "flex";


    // --------------------------------------------------
    // Start game
    // --------------------------------------------------

    setTimeout(
        startGame,
        500
    );

}


// ======================================================
// CREATE ARENA
// ======================================================

function createArena() {

    // --------------------------------------------------
    // Platform
    // --------------------------------------------------

    const platformGeometry =
        new THREE.CylinderGeometry(
            0.65,
            0.65,
            0.025,
            48
        );


    const platformMaterial =
        new THREE.MeshStandardMaterial({

            color: 0x111a35,

            transparent: true,

            opacity: 0.8,

            roughness: 0.4

        });


    const platform =
        new THREE.Mesh(
            platformGeometry,
            platformMaterial
        );


    platform.position.y =
        0.015;


    gameGroup.add(
        platform
    );


    // --------------------------------------------------
    // Outer ring
    // --------------------------------------------------

    const ring =
        new THREE.Mesh(

            new THREE.TorusGeometry(
                0.65,
                0.012,
                16,
                64
            ),

            new THREE.MeshBasicMaterial({
                color: 0x00eaff
            })

        );


    ring.rotation.x =
        Math.PI / 2;


    ring.position.y =
        0.035;


    gameGroup.add(
        ring
    );

}


// ======================================================
// START GAME
// ======================================================

function startGame() {

    gameStarted =
        true;


    currentTrial =
        0;


    score =
        0;


    reactionTimes =
        [];


    scoreText.innerText =
        "Score: 0";


    nextTrial();

}


// ======================================================
// NEXT TRIAL
// ======================================================

function nextTrial() {

    // --------------------------------------------------
    // End condition
    // --------------------------------------------------

    if (
        currentTrial >=
        TOTAL_TRIALS
    ) {

        finishGame();

        return;

    }


    currentTrial++;


    waitingForNext =
        false;


    trialText.innerText =
        `Trial ${currentTrial} / ${TOTAL_TRIALS}`;


    // --------------------------------------------------
    // Remove previous orbs
    // --------------------------------------------------

    removeOrbs();


    // --------------------------------------------------
    // Select target
    // --------------------------------------------------

    targetColor =
        COLOR_NAMES[
            Math.floor(
                Math.random() *
                COLOR_NAMES.length
            )
        ];


    instructionTitle.innerText =
        `🎯 CATCH THE ${targetColor} ORB`;


    instructionText.innerText =
        "Tap the correct glowing orb.";


    // --------------------------------------------------
    // Create orbs
    // --------------------------------------------------

    createOrbs();


    // --------------------------------------------------
    // Start reaction timer
    // --------------------------------------------------

    trialStartTime =
        performance.now();

}


// ======================================================
// REMOVE ORBS
// ======================================================

function removeOrbs() {

    if (!gameGroup) {

        return;

    }


    const objects = [];


    gameGroup.children.forEach(
        child => {

            if (
                child.userData &&
                child.userData.orb
            ) {

                objects.push(
                    child
                );

            }

        }
    );


    objects.forEach(
        object => {

            gameGroup.remove(
                object
            );


            if (
                object.geometry
            ) {

                object.geometry.dispose();

            }


            if (
                object.material
            ) {

                object.material.dispose();

            }

        }
    );

}


// ======================================================
// CREATE ORBS
// ======================================================

function createOrbs() {

    const positions = [];


    // --------------------------------------------------
    // Create target first
    // --------------------------------------------------

    createOrb(
        targetColor,
        true,
        positions
    );


    // --------------------------------------------------
    // Create distractors
    // --------------------------------------------------

    for (
        let i = 1;
        i < ORB_COUNT;
        i++
    ) {

        let color;


        do {

            color =
                COLOR_NAMES[
                    Math.floor(
                        Math.random() *
                        COLOR_NAMES.length
                    )
                ];

        }

        while (
            color ===
            targetColor
        );


        createOrb(
            color,
            false,
            positions
        );

    }

}


// ======================================================
// CREATE SINGLE ORB
// ======================================================

function createOrb(
    colorName,
    target,
    positions
) {

    let x;
    let z;

    let valid = false;


    // --------------------------------------------------
    // Find non-overlapping position
    // --------------------------------------------------

    for (
        let attempt = 0;
        attempt < 100;
        attempt++
    ) {

        x =
            -0.45 +
            Math.random() *
            0.90;


        z =
            -0.45 +
            Math.random() *
            0.90;


        valid = true;


        for (
            const position
            of positions
        ) {

            const dx =
                x -
                position.x;


            const dz =
                z -
                position.z;


            const distance =
                Math.sqrt(
                    dx * dx +
                    dz * dz
                );


            if (
                distance < 0.20
            ) {

                valid = false;

                break;

            }

        }


        if (valid) {

            break;

        }

    }


    positions.push({
        x,
        z
    });


    // --------------------------------------------------
    // Sphere
    // --------------------------------------------------

    const geometry =
        new THREE.SphereGeometry(

            target
                ? 0.085
                : 0.065,

            32,
            32

        );


    const material =
        new THREE.MeshStandardMaterial({

            color:
                COLORS[colorName],

            emissive:
                COLORS[colorName],

            emissiveIntensity:
                target
                    ? 1.2
                    : 0.35,

            roughness:
                0.2,

            metalness:
                0.15

        });


    const orb =
        new THREE.Mesh(
            geometry,
            material
        );


    // --------------------------------------------------
    // Position
    // --------------------------------------------------

    orb.position.set(

        x,

        target
            ? 0.15
            : 0.12,

        z

    );


    // --------------------------------------------------
    // User data
    // --------------------------------------------------

    orb.userData.orb =
        true;


    orb.userData.color =
        colorName;


    orb.userData.target =
        target;


    gameGroup.add(
        orb
    );

}


// ======================================================
// CHECK TARGET
// ======================================================

function checkTarget(event) {

    if (
        !event ||
        !event.inputSource
    ) {

        console.warn(
            "No XR input source."
        );

        return;

    }


    const frame =
        event.frame;


    if (!frame) {

        console.warn(
            "No XR frame available."
        );

        return;

    }


    // --------------------------------------------------
    // Use the actual mobile XR target ray
    // --------------------------------------------------

    const targetRaySpace =
        event.inputSource
            .targetRaySpace;


    if (!targetRaySpace) {

        console.warn(
            "No target ray space."
        );

        return;

    }


    const xrReferenceSpace =
        renderer.xr
            .getReferenceSpace();


    if (!xrReferenceSpace) {

        console.warn(
            "No XR reference space."
        );

        return;

    }


    const pose =
        frame.getPose(
            targetRaySpace,
            xrReferenceSpace
        );


    if (!pose) {

        console.warn(
            "Could not obtain target ray pose."
        );

        return;

    }


    // --------------------------------------------------
    // Create ray
    // --------------------------------------------------

    const origin =
        new THREE.Vector3();


    const direction =
        new THREE.Vector3();


    origin.setFromMatrixPosition(
        pose.transform.matrix
    );


    direction.set(
        0,
        0,
        -1
    );


    direction.applyQuaternion(
        new THREE.Quaternion()
            .setFromRotationMatrix(
                pose.transform.matrix
            )
    );


    direction.normalize();


    const raycaster =
        new THREE.Raycaster();


    raycaster.set(
        origin,
        direction
    );


    // --------------------------------------------------
    // Collect orbs
    // --------------------------------------------------

    const orbs = [];


    gameGroup.children.forEach(
        child => {

            if (
                child.userData &&
                child.userData.orb
            ) {

                orbs.push(
                    child
                );

            }

        }
    );


    // --------------------------------------------------
    // Ray intersection
    // --------------------------------------------------

    const intersections =
        raycaster.intersectObjects(
            orbs,
            false
        );


    if (
        intersections.length === 0
    ) {

        console.log(
            "No orb selected."
        );

        return;

    }


    const selected =
        intersections[0].object;


    processAnswer(
        selected
    );

}


// ======================================================
// PROCESS ANSWER
// ======================================================

function processAnswer(
    selected
) {

    if (
        waitingForNext
    ) {

        return;

    }


    waitingForNext =
        true;


    // --------------------------------------------------
    // Reaction time
    // --------------------------------------------------

    const reaction =
        (
            performance.now()
            -
            trialStartTime
        ) / 1000;


    reactionTimes.push(
        reaction
    );


    // --------------------------------------------------
    // Check answer
    // --------------------------------------------------

    const correct =
        selected.userData.color ===
        targetColor;


    if (correct) {

        score++;


        scoreText.innerText =
            `Score: ${score}`;


        instructionTitle.innerText =
            "✅ CORRECT";


        instructionText.innerText =
            `Reaction time: ${
                reaction.toFixed(2)
            } seconds`;


        // Make selected orb grow

        selected.scale.setScalar(
            2
        );

    }

    else {

        instructionTitle.innerText =
            "❌ WRONG";


        instructionText.innerText =
            `You tapped ${
                selected.userData.color
            }. Find ${
                targetColor
            }.`;

    }


    // --------------------------------------------------
    // Next trial
    // --------------------------------------------------

    setTimeout(
        () => {

            nextTrial();

        },
        650
    );

}


// ======================================================
// FINISH GAME
// ======================================================

function finishGame() {

    gameStarted =
        false;


    removeOrbs();


    // --------------------------------------------------
    // Accuracy
    // --------------------------------------------------

    const accuracy =
        (
            score /
            TOTAL_TRIALS
        ) * 100;


    // --------------------------------------------------
    // Average reaction
    // --------------------------------------------------

    const average =
        reactionTimes.length > 0

            ? reactionTimes.reduce(
                (sum, value) =>
                    sum + value,
                0
            ) /
            reactionTimes.length

            : 0;


    // --------------------------------------------------
    // Fastest
    // --------------------------------------------------

    const fastest =
        reactionTimes.length > 0

            ? Math.min(
                ...reactionTimes
            )

            : 0;


    // --------------------------------------------------
    // Display results
    // --------------------------------------------------

    accuracyElement.innerText =
        `${accuracy.toFixed(0)}%`;


    correctElement.innerText =
        `${score} / ${TOTAL_TRIALS}`;


    averageElement.innerText =
        `${average.toFixed(2)} s`;


    fastestElement.innerText =
        `${fastest.toFixed(2)} s`;


    resultScreen.style.display =
        "block";


    instruction.style.display =
        "none";


    gameInfo.style.display =
        "none";

}


// ======================================================
// HIT TEST
// ======================================================

function updateHitTest(frame) {

    // --------------------------------------------------
    // Safety checks
    // --------------------------------------------------

    if (
        !hitTestReady ||
        !hitTestSource ||
        !localFloorSpace ||
        placed
    ) {

        return;

    }


    // --------------------------------------------------
    // Get hit-test results
    // --------------------------------------------------

    const results =
        frame.getHitTestResults(
            hitTestSource
        );


    // --------------------------------------------------
    // No surface
    // --------------------------------------------------

    if (
        results.length === 0
    ) {

        reticle.visible =
            false;


        instructionTitle.innerText =
            "🔍 SCANNING FOR SURFACE";


        instructionText.innerText =
            "Move your phone slowly over a textured floor or table.";


        return;

    }


    // --------------------------------------------------
    // Surface found
    // --------------------------------------------------

    const hit =
        results[0];


    const pose =
        hit.getPose(
            localFloorSpace
        );


    if (!pose) {

        reticle.visible =
            false;

        return;

    }


    // --------------------------------------------------
    // Update reticle
    // --------------------------------------------------

    reticle.visible =
        true;


    reticle.matrix.fromArray(
        pose.transform.matrix
    );


    // --------------------------------------------------
    // UI
    // --------------------------------------------------

    instructionTitle.innerText =
        "🟢 SURFACE FOUND";


    instructionText.innerText =
        "Tap the screen to place the game.";

}


// ======================================================
// RENDER LOOP
// ======================================================

function render(
    time,
    frame
) {

    // --------------------------------------------------
    // Hit test
    // --------------------------------------------------

    if (frame) {

        updateHitTest(
            frame
        );

    }


    // --------------------------------------------------
    // Animate orbs
    // --------------------------------------------------

    if (gameGroup) {

        gameGroup.children.forEach(
            object => {

                if (
                    object.userData &&
                    object.userData.orb
                ) {

                    object.rotation.y +=
                        0.025;


                    const base =
                        object.userData.target
                            ? 0.15
                            : 0.12;


                    object.position.y =
                        base +
                        Math.sin(
                            time * 0.003 +
                            object.position.x * 5
                        ) * 0.015;

                }

            }
        );

    }


    // --------------------------------------------------
    // Render
    // --------------------------------------------------

    renderer.render(
        scene,
        camera
    );

}


// ======================================================
// SESSION END
// ======================================================

function onSessionEnd() {

    console.log(
        "AR session ended."
    );


    hitTestSource =
        null;


    viewerSpace =
        null;


    localFloorSpace =
        null;


    hitTestReady =
        false;


    xrSession =
        null;


    placed =
        false;


    gameStarted =
        false;


    waitingForNext =
        false;


    // --------------------------------------------------
    // Remove game
    // --------------------------------------------------

    if (gameGroup) {

        scene.remove(
            gameGroup
        );


        gameGroup =
            null;

    }


    // --------------------------------------------------
    // Reset UI
    // --------------------------------------------------

    startScreen.style.display =
        "block";


    instruction.style.display =
        "none";


    gameInfo.style.display =
        "none";


    startButton.disabled =
        false;


    errorMessage.innerText =
        "";

}


// ======================================================
// RESTART
// ======================================================

function restartGame() {

    resultScreen.style.display =
        "none";


    // If an XR session is still active,
    // don't create another one.

    if (
        xrSession
    ) {

        placed = false;

        gameStarted = false;

        waitingForNext = false;

        currentTrial = 0;

        score = 0;

        reactionTimes = [];


        if (gameGroup) {

            scene.remove(
                gameGroup
            );

            gameGroup =
                null;

        }


        reticle.visible =
            false;


        instruction.style.display =
            "block";


        instructionTitle.innerText =
            "🔍 SCANNING FOR SURFACE";


        instructionText.innerText =
            "Move your phone slowly over a floor or table.";


        gameInfo.style.display =
            "none";


        return;

    }


    startAR();

}


// ======================================================
// RESIZE
// ======================================================

function onResize() {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;


    camera.updateProjectionMatrix();


    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

}


// ======================================================
// SHOW ERROR
// ======================================================

function showError(message) {

    errorMessage.innerText =
        message;

}