import * as THREE from
    "three";


// ============================================
// GLOBAL VARIABLES
// ============================================

let camera;

let scene;

let renderer;

let controller;

let reticle;

let xrSession = null;

let hitTestSource = null;

let hitTestSourceRequested = false;

let referenceSpace = null;


// AR game group

let gameGroup = null;


// ============================================
// GAME VARIABLES
// ============================================

const TOTAL_TRIALS = 10;

const ORB_COUNT = 6;

let currentTrial = 0;

let score = 0;

let targetColor = "";

let trialStartTime = 0;

let reactionTimes = [];

let gameStarted = false;

let placed = false;

let waitingForNext = false;


// ============================================
// COLORS
// ============================================

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


// ============================================
// HTML ELEMENTS
// ============================================

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


// ============================================
// INITIALIZE THREE.JS
// ============================================

init();


function init() {


    // -------------------------------
    // Scene
    // -------------------------------

    scene =
        new THREE.Scene();


    // -------------------------------
    // Camera
    // -------------------------------

    camera =
        new THREE.PerspectiveCamera(
            70,
            window.innerWidth /
            window.innerHeight,
            0.01,
            20
        );


    // -------------------------------
    // Renderer
    // -------------------------------

    renderer =
        new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: false
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


    renderer.xr.setReferenceSpaceType(
        "local-floor"
    );


    document.body.appendChild(
        renderer.domElement
    );


    // -------------------------------
    // Lighting
    // -------------------------------

    const ambientLight =
        new THREE.HemisphereLight(
            0xffffff,
            0x444444,
            2
        );


    scene.add(
        ambientLight
    );


    const directionalLight =
        new THREE.DirectionalLight(
            0xffffff,
            2
        );


    directionalLight.position.set(
        2,
        4,
        2
    );


    scene.add(
        directionalLight
    );


    // -------------------------------
    // Reticle
    // -------------------------------

    createReticle();


    // -------------------------------
    // Controller
    // -------------------------------

    controller =
        renderer.xr.getController(0);


    controller.addEventListener(
        "select",
        onSelect
    );


    scene.add(
        controller
    );


    // -------------------------------
    // Resize
    // -------------------------------

    window.addEventListener(
        "resize",
        onWindowResize
    );


    // -------------------------------
    // Render
    // -------------------------------

    renderer.setAnimationLoop(
        render
    );


    // -------------------------------
    // Check WebXR
    // -------------------------------

    checkARSupport();

}


// ============================================
// CHECK AR SUPPORT
// ============================================

async function checkARSupport() {

    if (!navigator.xr) {

        startButton.disabled =
            true;

        errorMessage.innerText =
            "WebXR AR is not supported " +
            "by this browser/device.";

        return;

    }


    try {

        const supported =
            await navigator.xr.isSessionSupported(
                "immersive-ar"
            );


        if (!supported) {

            startButton.disabled =
                true;

            errorMessage.innerText =
                "This device/browser does not " +
                "support immersive AR.";

        }

    }

    catch (error) {

        console.error(error);

        startButton.disabled =
            true;

        errorMessage.innerText =
            "Unable to check AR support.";

    }

}


// ============================================
// CREATE RETICLE
// ============================================

function createReticle() {

    reticle =
        new THREE.Mesh(

            new THREE.RingGeometry(
                0.08,
                0.10,
                32
            ),

            new THREE.MeshBasicMaterial({
                color: 0x00ff88
            })

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


// ============================================
// START AR
// ============================================

async function startAR() {

    errorMessage.innerText = "";


    if (!navigator.xr) {

        showError(
            "WebXR is not supported."
        );

        return;

    }


    try {

        xrSession =
            await navigator.xr.requestSession(
                "immersive-ar",
                {

                    requiredFeatures: [
                        "hit-test",
                        "local-floor"
                    ],

                    optionalFeatures: [
                        "dom-overlay"
                    ],

                    domOverlay: {
                        root:
                            document.body
                    }

                }
            );


        renderer.xr.setSession(
            xrSession
        );


        /*
         * Reset
         */

        placed = false;

        gameStarted = false;

        hitTestSourceRequested =
            false;


        /*
         * UI
         */

        startScreen.style.display =
            "none";


        instruction.style.display =
            "block";


        instructionTitle.innerText =
            "Find a surface";


        instructionText.innerText =
            "Move your phone slowly " +
            "until the green reticle appears.";


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
            "AR start error:",
            error
        );


        showError(
            "Unable to start AR. " +
            "Make sure camera permission " +
            "is allowed and try again."
        );

    }

}


// ============================================
// AR SELECT EVENT
// ============================================

function onSelect() {


    /*
     * First tap:
     * Place the AR game.
     */

    if (!placed) {

        if (
            !reticle.visible
        ) {

            return;

        }


        placeGame();

        return;

    }


    /*
     * After placement:
     * Check whether user tapped
     * an AR target.
     */

    if (gameStarted) {

        checkTargetTap();

    }

}


// ============================================
// PLACE GAME
// ============================================

function placeGame() {

    placed = true;


    /*
     * Hide reticle
     */

    reticle.visible =
        false;


    /*
     * Create game group
     */

    gameGroup =
        new THREE.Group();


    /*
     * Place group exactly
     * where reticle was.
     */

    gameGroup.position.setFromMatrixPosition(
        reticle.matrix
    );


    gameGroup.rotation.set(
        0,
        0,
        0
    );


    scene.add(
        gameGroup
    );


    /*
     * Create subtle platform
     */

    createArena();


    /*
     * UI
     */

    instructionTitle.innerText =
        "AR GAME READY";


    instructionText.innerText =
        "Tap the requested orb.";


    gameInfo.style.display =
        "flex";


    /*
     * Start game
     */

    setTimeout(
        () => {

            startGame();

        },
        700
    );

}


// ============================================
// CREATE ARENA
// ============================================

function createArena() {


    const geometry =
        new THREE.CylinderGeometry(
            0.7,
            0.7,
            0.025,
            48
        );


    const material =
        new THREE.MeshStandardMaterial({

            color: 0x16213e,

            transparent: true,

            opacity: 0.75,

            roughness: 0.5,

            metalness: 0.2

        });


    const platform =
        new THREE.Mesh(
            geometry,
            material
        );


    platform.position.y =
        0.015;


    gameGroup.add(
        platform
    );


    /*
     * Ring around arena
     */

    const ring =
        new THREE.Mesh(

            new THREE.TorusGeometry(
                0.7,
                0.015,
                16,
                64
            ),

            new THREE.MeshBasicMaterial({
                color: 0x00ddff
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


// ============================================
// START GAME
// ============================================

function startGame() {

    currentTrial = 0;

    score = 0;

    reactionTimes = [];

    gameStarted = true;

    scoreText.innerText =
        "Score: 0";


    nextTrial();

}


// ============================================
// NEXT TRIAL
// ============================================

function nextTrial() {

    if (
        currentTrial >=
        TOTAL_TRIALS
    ) {

        finishGame();

        return;

    }


    currentTrial++;

    waitingForNext = false;


    trialText.innerText =
        `Trial ${currentTrial} / ${TOTAL_TRIALS}`;


    /*
     * Remove previous orbs
     */

    removeOrbs();


    /*
     * Random target
     */

    targetColor =
        COLOR_NAMES[
            Math.floor(
                Math.random() *
                COLOR_NAMES.length
            )
        ];


    instructionTitle.innerText =
        `CATCH THE ${targetColor} ORB`;


    instructionText.innerText =
        "Tap the correct glowing orb";


    /*
     * Create new objects
     */

    createOrbs();


    /*
     * Start timer
     */

    trialStartTime =
        performance.now();

}


// ============================================
// REMOVE ORBS
// ============================================

function removeOrbs() {

    if (!gameGroup) {

        return;

    }


    const remove = [];


    gameGroup.children.forEach(
        object => {

            if (
                object.userData &&
                object.userData.isOrb
            ) {

                remove.push(
                    object
                );

            }

        }
    );


    remove.forEach(
        object => {

            gameGroup.remove(
                object
            );


            object.geometry.dispose();

            object.material.dispose();

        }
    );

}


// ============================================
// CREATE ORBS
// ============================================

function createOrbs() {


    const positions = [];


    /*
     * Target is first
     */

    createOrb(
        targetColor,
        true,
        positions
    );


    /*
     * Distractors
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


// ============================================
// CREATE ONE ORB
// ============================================

function createOrb(
    colorName,
    isTarget,
    positions
) {


    /*
     * Find non-overlapping position
     */

    let x;

    let z;

    let valid = false;


    for (
        let attempt = 0;
        attempt < 100;
        attempt++
    ) {

        x =
            -0.48 +
            Math.random() *
            0.96;


        z =
            -0.48 +
            Math.random() *
            0.96;


        valid = true;


        for (
            const p of positions
        ) {

            const dx =
                x - p.x;

            const dz =
                z - p.z;


            const distance =
                Math.sqrt(
                    dx * dx +
                    dz * dz
                );


            if (
                distance < 0.23
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
     * Sphere
     */

    const geometry =
        new THREE.SphereGeometry(
            0.07,
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
                isTarget
                    ? 0.9
                    : 0.35,

            metalness: 0.15,

            roughness: 0.25

        });


    const orb =
        new THREE.Mesh(
            geometry,
            material
        );


    orb.position.set(
        x,
        0.13,
        z
    );


    /*
     * Target is slightly larger
     */

    const scale =
        isTarget
            ? 1.3
            : 1;


    orb.scale.set(
        scale,
        scale,
        scale
    );


    /*
     * Metadata for interaction
     */

    orb.userData.isOrb =
        true;


    orb.userData.color =
        colorName;


    orb.userData.isTarget =
        isTarget;


    /*
     * Add to scene
     */

    gameGroup.add(
        orb
    );


    /*
     * Animate
     */

    orb.userData.baseY =
        orb.position.y;

}


// ============================================
// CHECK TARGET
// ============================================

function checkTargetTap() {


    if (
        waitingForNext
    ) {

        return;

    }


    /*
     * WebXR select event
     *
     * Use controller ray to determine
     * where the user tapped.
     */

    const tempMatrix =
        new THREE.Matrix4();


    tempMatrix.identity()
        .extractRotation(
            controller.matrixWorld
        );


    const raycaster =
        new THREE.Raycaster();


    raycaster.ray.origin
        .setFromMatrixPosition(
            controller.matrixWorld
        );


    raycaster.ray.direction
        .set(
            0,
            0,
            -1
        )
        .applyMatrix4(
            tempMatrix
        );


    const orbs = [];


    gameGroup.children.forEach(
        object => {

            if (
                object.userData &&
                object.userData.isOrb
            ) {

                orbs.push(
                    object
                );

            }

        }
    );


    const hits =
        raycaster.intersectObjects(
            orbs,
            false
        );


    if (
        hits.length === 0
    ) {

        return;

    }


    const selected =
        hits[0].object;


    processAnswer(
        selected
    );

}


// ============================================
// PROCESS ANSWER
// ============================================

function processAnswer(
    selected
) {


    waitingForNext = true;


    /*
     * Reaction time
     */

    const reaction =
        (
            performance.now()
            -
            trialStartTime
        ) / 1000;


    reactionTimes.push(
        reaction
    );


    /*
     * Check target
     */

    const correct =
        selected.userData.color ===
        targetColor;


    if (correct) {

        score++;

        scoreText.innerText =
            `Score: ${score}`;


        /*
         * Visual effect
         */

        selected.material.emissiveIntensity =
            3;


        selected.scale.multiplyScalar(
            1.8
        );


        instructionTitle.innerText =
            "✓ CORRECT";


        instructionText.innerText =
            `${reaction.toFixed(2)} seconds`;

    }

    else {

        instructionTitle.innerText =
            "✕ WRONG";


        instructionText.innerText =
            `That was ${selected.userData.color}. ` +
            `Find ${targetColor}.`;

    }


    /*
     * Next component
     */

    setTimeout(
        () => {

            nextTrial();

        },
        700
    );

}


// ============================================
// FINISH GAME
// ============================================

function finishGame() {

    gameStarted = false;


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


// ============================================
// HIT TEST
// ============================================

async function requestHitTestSource(
    frame
) {


    if (
        hitTestSourceRequested
    ) {

        return;

    }


    const session =
        renderer.xr.getSession();


    if (!session) {

        return;

    }


    referenceSpace =
        await session.requestReferenceSpace(
            "viewer"
        );


    hitTestSource =
        await session.requestHitTestSource({
            space:
                referenceSpace
        });


    hitTestSourceRequested =
        true;


    session.addEventListener(
        "end",
        () => {

            hitTestSourceRequested =
                false;

            hitTestSource =
                null;

            referenceSpace =
                null;

        }
    );

}


// ============================================
// RENDER
// ============================================

function render(
    timestamp,
    frame
) {


    if (frame) {

        const session =
            renderer.xr.getSession();


        /*
         * Request hit test
         */

        requestHitTestSource(
            frame
        );


        /*
         * Surface detection
         */

        if (
            hitTestSource &&
            referenceSpace &&
            !placed
        ) {

            const hitTestResults =
                frame.getHitTestResults(
                    hitTestSource
                );


            if (
                hitTestResults.length > 0
            ) {

                const hit =
                    hitTestResults[0];


                const pose =
                    hit.getPose(
                        renderer
                            .xr
                            .getReferenceSpace()
                    );


                if (pose) {

                    reticle.visible =
                        true;


                    reticle.matrix.fromArray(
                        pose.transform.matrix
                    );

                }

            }

            else {

                reticle.visible =
                    false;

            }

        }

    }


    /*
     * Animate AR objects
     */

    if (gameGroup) {

        gameGroup.children.forEach(
            object => {

                if (
                    object.userData &&
                    object.userData.isOrb
                ) {

                    object.rotation.y +=
                        0.02;


                    object.position.y =
                        object.userData.baseY
                        +
                        Math.sin(
                            timestamp *
                            0.003
                            +
                            object.position.x
                            * 5
                        )
                        * 0.015;

                }

            }
        );

    }


    renderer.render(
        scene,
        camera
    );

}


// ============================================
// SESSION END
// ============================================

function onSessionEnd() {

    xrSession =
        null;


    hitTestSource =
        null;


    hitTestSourceRequested =
        false;


    placed =
        false;


    gameStarted =
        false;


    startScreen.style.display =
        "block";


    instruction.style.display =
        "none";


    gameInfo.style.display =
        "none";

}


// ============================================
// RESTART
// ============================================

restartButton.addEventListener(
    "click",
    () => {

        resultScreen.style.display =
            "none";


        if (
            navigator.xr
        ) {

            startAR();

        }

    }
);


// ============================================
// START BUTTON
// ============================================

startButton.addEventListener(
    "click",
    () => {

        startAR();

    }
);


// ============================================
// ERROR
// ============================================

function showError(
    message
) {

    errorMessage.innerText =
        message;

}


// ============================================
// RESIZE
// ============================================

function onWindowResize() {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;


    camera.updateProjectionMatrix();


    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

}