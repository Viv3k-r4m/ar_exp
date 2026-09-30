import * as THREE from
    "three";


// ======================================================
// THREE.JS
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
// AR GAME
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

const COLOR_NAMES =
    Object.keys(COLORS);


// ======================================================
// HTML ELEMENTS
// ======================================================

const startScreen =
    document.getElementById(
        "startScreen"
    );

const startButton =
    document.getElementById(
        "startButton"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );

const instruction =
    document.getElementById(
        "instruction"
    );

const instructionTitle =
    document.getElementById(
        "instructionTitle"
    );

const instructionText =
    document.getElementById(
        "instructionText"
    );

const gameInfo =
    document.getElementById(
        "gameInfo"
    );

const trialText =
    document.getElementById(
        "trialText"
    );

const scoreText =
    document.getElementById(
        "scoreText"
    );

const resultScreen =
    document.getElementById(
        "resultScreen"
    );

const accuracyElement =
    document.getElementById(
        "accuracy"
    );

const correctElement =
    document.getElementById(
        "correct"
    );

const averageElement =
    document.getElementById(
        "average"
    );

const fastestElement =
    document.getElementById(
        "fastest"
    );

const restartButton =
    document.getElementById(
        "restartButton"
    );


// ======================================================
// INITIALIZE
// ======================================================

init();


function init() {

    scene =
        new THREE.Scene();


    camera =
        new THREE.PerspectiveCamera(
            70,
            window.innerWidth /
            window.innerHeight,
            0.01,
            20
        );


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


    /*
     * Use local-floor as the main
     * world reference space.
     */

    renderer.xr.setReferenceSpaceType(
        "local-floor"
    );


    document.body.appendChild(
        renderer.domElement
    );


    // Lighting

    const ambient =
        new THREE.HemisphereLight(
            0xffffff,
            0x444444,
            2
        );

    scene.add(
        ambient
    );


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

    scene.add(
        light
    );


    // Reticle

    createReticle();


    // XR controller

    controller =
        renderer.xr.getController(0);


    controller.addEventListener(
        "select",
        onSelect
    );


    scene.add(
        controller
    );


    window.addEventListener(
        "resize",
        onResize
    );


    renderer.setAnimationLoop(
        render
    );


    checkARSupport();

}


// ======================================================
// CHECK WEBXR
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

        }

    }

    catch (error) {

        console.error(error);

        disableAR(
            "Unable to check AR support."
        );

    }

}


// ======================================================
// DISABLE BUTTON
// ======================================================

function disableAR(
    message
) {

    startButton.disabled =
        true;

    startButton.style.opacity =
        "0.5";

    errorMessage.innerText =
        message;

}


// ======================================================
// RETICLE
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


    scene.add(
        reticle
    );

}


// ======================================================
// START AR
// ======================================================

async function startAR() {

    errorMessage.innerText =
        "";


    try {

        /*
         * Request AR session.
         */

        xrSession =
            await navigator.xr
                .requestSession(
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


        /*
         * Give session to Three.js.
         */

        await renderer.xr.setSession(
            xrSession
        );


        /*
         * IMPORTANT:
         *
         * Request reference spaces ONCE.
         */

        viewerSpace =
            await xrSession
                .requestReferenceSpace(
                    "viewer"
                );


        try {

            localFloorSpace =
                await xrSession
                    .requestReferenceSpace(
                        "local-floor"
                    );

        }

        catch {

            /*
             * Fallback.
             */

            localFloorSpace =
                await xrSession
                    .requestReferenceSpace(
                        "local"
                    );

        }


        /*
         * IMPORTANT:
         *
         * Request hit test source ONCE.
         */

        hitTestSource =
            await xrSession
                .requestHitTestSource({

                    space:
                        viewerSpace

                });


        hitTestReady =
            true;


        /*
         * Reset state.
         */

        placed = false;

        gameStarted = false;

        currentTrial = 0;

        score = 0;

        reactionTimes = [];


        /*
         * UI
         */

        startScreen.style.display =
            "none";


        instruction.style.display =
            "block";


        gameInfo.style.display =
            "none";


        instructionTitle.innerText =
            "🔍 FIND A SURFACE";


        instructionText.innerText =
            "Slowly move your phone over " +
            "the floor or a table.";


        /*
         * Session end
         */

        xrSession.addEventListener(
            "end",
            onSessionEnd
        );


    }

    catch (error) {

        console.error(
            "AR ERROR:",
            error
        );


        showError(
            getReadableError(
                error
            )
        );

    }

}


// ======================================================
// READABLE ERROR
// ======================================================

function getReadableError(
    error
) {

    if (
        error.name ===
        "NotAllowedError"
    ) {

        return (
            "AR permission was denied. " +
            "Allow camera/motion access and try again."
        );

    }


    if (
        error.name ===
        "NotSupportedError"
    ) {

        return (
            "This device does not support " +
            "the required AR features."
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


    return (
        "Could not start AR: " +
        error.message
    );

}


// ======================================================
// SCREEN TAP / XR SELECT
// ======================================================

function onSelect() {

    /*
     * First tap:
     * place the AR game.
     */

    if (!placed) {

        if (
            !reticle.visible
        ) {

            instructionTitle.innerText =
                "❗ NO SURFACE FOUND";

            instructionText.innerText =
                "Move your phone slowly " +
                "over a textured floor or table.";

            return;

        }


        placeGame();

        return;

    }


    /*
     * Game tap.
     */

    if (
        gameStarted &&
        !waitingForNext
    ) {

        checkTarget();

    }

}


// ======================================================
// PLACE GAME
// ======================================================

function placeGame() {

    placed = true;


    /*
     * Save reticle matrix
     * BEFORE hiding it.
     */

    const placementMatrix =
        reticle.matrix.clone();


    reticle.visible =
        false;


    /*
     * Create game group.
     */

    gameGroup =
        new THREE.Group();


    /*
     * Convert matrix to position.
     */

    gameGroup.position.setFromMatrixPosition(
        placementMatrix
    );


    /*
     * Keep arena level.
     */

    gameGroup.rotation.set(
        0,
        0,
        0
    );


    scene.add(
        gameGroup
    );


    createArena();


    instructionTitle.innerText =
        "🎯 AR GAME READY";


    instructionText.innerText =
        "Find and tap the requested orb.";


    gameInfo.style.display =
        "flex";


    setTimeout(
        startGame,
        500
    );

}


// ======================================================
// ARENA
// ======================================================

function createArena() {

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


    /*
     * Outer ring.
     */

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

    gameStarted = true;

    currentTrial = 0;

    score = 0;

    reactionTimes = [];


    scoreText.innerText =
        "Score: 0";


    nextTrial();

}


// ======================================================
// NEXT TRIAL
// ======================================================

function nextTrial() {

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


    removeOrbs();


    /*
     * Select target.
     */

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


    createOrbs();


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


            object.geometry.dispose();

            object.material.dispose();

        }
    );

}


// ======================================================
// CREATE ORBS
// ======================================================

function createOrbs() {

    const positions = [];


    /*
     * Create target first.
     */

    createOrb(
        targetColor,
        true,
        positions
    );


    /*
     * Create distractors.
     */

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
// CREATE ORB
// ======================================================

function createOrb(
    colorName,
    target,
    positions
) {

    let x;

    let z;

    let valid = false;


    /*
     * Find a position without
     * excessive overlap.
     */

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


    /*
     * Sphere.
     */

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

            roughness: 0.2,

            metalness: 0.15

        });


    const orb =
        new THREE.Mesh(
            geometry,
            material
        );


    orb.position.set(
        x,
        target
            ? 0.15
            : 0.12,
        z
    );


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

function checkTarget() {

    /*
     * On a phone,
     * XR select gives us the
     * target ray from the screen tap.
     */

    const ray =
        new THREE.Raycaster();


    const origin =
        new THREE.Vector3();


    const direction =
        new THREE.Vector3();


    /*
     * Controller target-ray
     * world transform.
     */

    controller.getWorldPosition(
        origin
    );


    direction.set(
        0,
        0,
        -1
    );


    direction.applyQuaternion(
        controller.quaternion
    );


    ray.set(
        origin,
        direction
    );


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


    const intersections =
        ray.intersectObjects(
            orbs,
            false
        );


    if (
        intersections.length === 0
    ) {

        return;

    }


    const selected =
        intersections[0].object;


    processAnswer(
        selected
    );

}


// ======================================================
// ANSWER
// ======================================================

function processAnswer(
    selected
) {

    waitingForNext =
        true;


    const reaction =
        (
            performance.now()
            -
            trialStartTime
        ) / 1000;


    reactionTimes.push(
        reaction
    );


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


        /*
         * Make target grow.
         */

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


    setTimeout(
        () => {

            nextTrial();

        },
        650
    );

}


// ======================================================
// RESULT
// ======================================================

function finishGame() {

    gameStarted =
        false;


    removeOrbs();


    const accuracy =
        (
            score /
            TOTAL_TRIALS
        ) * 100;


    const average =
        reactionTimes.reduce(
            (sum, value) =>
                sum + value,
            0
        )
        /
        reactionTimes.length;


    const fastest =
        Math.min(
            ...reactionTimes
        );


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
// HIT TEST FRAME
// ======================================================

function updateHitTest(
    frame
) {

    if (
        !hitTestReady ||
        !hitTestSource ||
        !localFloorSpace ||
        placed
    ) {

        return;

    }


    const results =
        frame.getHitTestResults(
            hitTestSource
        );


    if (
        results.length === 0
    ) {

        reticle.visible =
            false;

        instructionTitle.innerText =
            "🔍 FIND A SURFACE";

        instructionText.innerText =
            "Move your phone slowly " +
            "over the floor or table.";

        return;

    }


    const hit =
        results[0];


    /*
     * IMPORTANT:
     *
     * Pose is calculated against
     * localFloorSpace.
     */

    const pose =
        hit.getPose(
            localFloorSpace
        );


    if (!pose) {

        reticle.visible =
            false;

        return;

    }


    reticle.visible =
        true;


    reticle.matrix.fromArray(
        pose.transform.matrix
    );


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

    if (frame) {

        updateHitTest(
            frame
        );

    }


    /*
     * Animate orbs.
     */

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


    renderer.render(
        scene,
        camera
    );

}


// ======================================================
// SESSION END
// ======================================================

function onSessionEnd() {

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


    if (gameGroup) {

        scene.remove(
            gameGroup
        );

        gameGroup = null;

    }


    startScreen.style.display =
        "block";


    instruction.style.display =
        "none";


    gameInfo.style.display =
        "none";

}


// ======================================================
// RESTART
// ======================================================

restartButton.addEventListener(
    "click",
    () => {

        resultScreen.style.display =
            "none";


        startAR();

    }
);


// ======================================================
// START
// ======================================================

startButton.addEventListener(
    "click",
    startAR
);


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
// ERROR
// ======================================================

function showError(
    message
) {

    errorMessage.innerText =
        message;

}