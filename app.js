import * as THREE from "three";


// ======================================================
// AR COGNITIVE LAB
// MARKERLESS WEBXR
// SPHERE COUNTING TASK
// ======================================================


// ======================================================
// THREE.JS
// ======================================================

let scene;
let camera;
let renderer;

let reticle;

let xrSession = null;

let viewerSpace = null;
let localFloorSpace = null;

let hitTestSource = null;

let hitTestReady = false;


// ======================================================
// GAME
// ======================================================

let gameGroup = null;

let placed = false;

let gameStarted = false;

let waitingForNext = false;

let currentTrial = 0;

let score = 0;

let targetColor = "";

let correctAnswer = 0;

let trialStartTime = 0;

let reactionTimes = [];

const TOTAL_TRIALS = 10;


// ======================================================
// SPHERE SETTINGS
// ======================================================

const TOTAL_SPHERES = 12;


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
// HTML
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

const answerPanel =
    document.getElementById(
        "answerPanel"
    );

const questionText =
    document.getElementById(
        "questionText"
    );

const answerInput =
    document.getElementById(
        "answerInput"
    );

const submitAnswer =
    document.getElementById(
        "submitAnswer"
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

    // --------------------------------------------------
    // SCENE
    // --------------------------------------------------

    scene =
        new THREE.Scene();


    // --------------------------------------------------
    // CAMERA
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
    // RENDERER
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


    // IMPORTANT

    renderer.xr.setReferenceSpaceType(
        "local"
    );


    document.body.appendChild(
        renderer.domElement
    );


    // --------------------------------------------------
    // LIGHTING
    // --------------------------------------------------

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


    // --------------------------------------------------
    // RETICLE
    // --------------------------------------------------

    createReticle();


    // --------------------------------------------------
    // EVENTS
    // --------------------------------------------------

    window.addEventListener(
        "resize",
        onResize
    );


    startButton.addEventListener(
        "click",
        startAR
    );


    submitAnswer.addEventListener(
        "click",
        submitUserAnswer
    );


    restartButton.addEventListener(
        "click",
        restartGame
    );


    answerInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                submitUserAnswer();

            }

        }
    );


    // --------------------------------------------------
    // RENDER LOOP
    // --------------------------------------------------

    renderer.setAnimationLoop(
        render
    );


    // --------------------------------------------------
    // CHECK AR
    // --------------------------------------------------

    checkARSupport();

}


// ======================================================
// WEBXR SUPPORT
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
                "Immersive AR is not supported."
            );

            return;

        }


        console.log(
            "✓ immersive-ar supported"
        );


    }

    catch (error) {

        console.error(
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


    startButton.disabled =
        true;


    try {

        instructionTitle.innerText =
            "📱 STARTING AR";


        instructionText.innerText =
            "Opening camera and AR...";


        // ------------------------------------------------
        // REQUEST AR
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


        // ------------------------------------------------
        // THREE.JS SESSION
        // ------------------------------------------------

        await renderer.xr.setSession(
            xrSession
        );


        // ------------------------------------------------
        // VIEWER SPACE
        // ------------------------------------------------

        viewerSpace =
            await xrSession
                .requestReferenceSpace(
                    "viewer"
                );


        // ------------------------------------------------
        // LOCAL FLOOR
        // ------------------------------------------------

        try {

            localFloorSpace =
                await xrSession
                    .requestReferenceSpace(
                        "local-floor"
                    );

        }

        catch {

            localFloorSpace =
                await xrSession
                    .requestReferenceSpace(
                        "local"
                    );

        }


        // ------------------------------------------------
        // SYNCHRONIZE THREE.JS
        // ------------------------------------------------

        renderer.xr.setReferenceSpace(
            localFloorSpace
        );


        // ------------------------------------------------
        // HIT TEST
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
            "✓ Hit-test ready"
        );


        // ------------------------------------------------
        // RESET GAME
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


        answerPanel.style.display =
            "none";


        instructionTitle.innerText =
            "🔍 SCANNING FOR SURFACE";


        instructionText.innerText =
            "Move your phone slowly over a floor or table.";


        // ------------------------------------------------
        // SESSION END
        // ------------------------------------------------

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
// ERROR
// ======================================================

function getReadableError(error) {

    if (
        error.name ===
        "NotAllowedError"
    ) {

        return (
            "AR permission was denied."
        );

    }


    if (
        error.name ===
        "NotSupportedError"
    ) {

        return (
            "This device/browser does not support AR."
        );

    }


    if (
        error.name ===
        "SecurityError"
    ) {

        return (
            "AR requires HTTPS."
        );

    }


    return (
        "Could not start AR: " +
        (
            error.message ||
            error.name
        )
    );

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
    // SAVE POSITION
    // --------------------------------------------------

    const placementMatrix =
        reticle.matrix.clone();


    reticle.visible =
        false;


    // --------------------------------------------------
    // GAME GROUP
    // --------------------------------------------------

    gameGroup =
        new THREE.Group();


    gameGroup.position.setFromMatrixPosition(
        placementMatrix
    );


    gameGroup.rotation.set(
        0,
        0,
        0
    );


    scene.add(
        gameGroup
    );


    // --------------------------------------------------
    // START
    // --------------------------------------------------

    instructionTitle.innerText =
        "🧠 COUNT THE SPHERES";


    instructionText.innerText =
        "Look carefully at the spheres.";


    gameInfo.style.display =
        "flex";


    setTimeout(
        startGame,
        700
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


    removeSpheres();


    // --------------------------------------------------
    // SELECT COLOR
    // --------------------------------------------------

    targetColor =
        COLOR_NAMES[
            Math.floor(
                Math.random() *
                COLOR_NAMES.length
            )
        ];


    // --------------------------------------------------
    // CREATE SPHERES
    // --------------------------------------------------

    correctAnswer =
        createSphereField();


    // --------------------------------------------------
    // QUESTION
    // --------------------------------------------------

    questionText.innerText =
        `How many ${targetColor} spheres?`;


    instructionTitle.innerText =
        `🔎 COUNT THE ${targetColor} SPHERES`;


    instructionText.innerText =
        "Observe the AR scene and count carefully.";


    // --------------------------------------------------
    // ANSWER UI
    // --------------------------------------------------

    answerInput.value =
        "";


    answerPanel.style.display =
        "block";


    // --------------------------------------------------
    // TIMER
    // --------------------------------------------------

    trialStartTime =
        performance.now();


    // Focus after a short delay

    setTimeout(
        () => {

            answerInput.focus();

        },
        300
    );

}


// ======================================================
// CREATE SPHERE FIELD
// ======================================================

function createSphereField() {

    const positions = [];

    let targetCount = 0;


    // --------------------------------------------------
    // Decide target count
    // --------------------------------------------------

    targetCount =
        2 +
        Math.floor(
            Math.random() * 5
        );


    // 2 to 6 target-color spheres


    // --------------------------------------------------
    // Create target spheres
    // --------------------------------------------------

    for (
        let i = 0;
        i < targetCount;
        i++
    ) {

        createSphere(
            targetColor,
            positions
        );

    }


    // --------------------------------------------------
    // Create distractors
    // --------------------------------------------------

    const distractorCount =
        TOTAL_SPHERES -
        targetCount;


    for (
        let i = 0;
        i < distractorCount;
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


        createSphere(
            color,
            positions
        );

    }


    // --------------------------------------------------
    // Shuffle spheres
    // --------------------------------------------------

    shuffleSpheres();


    return targetCount;

}


// ======================================================
// CREATE SPHERE
// ======================================================

function createSphere(
    colorName,
    positions
) {

    let x;
    let z;

    let valid = false;


    // --------------------------------------------------
    // Find position
    // --------------------------------------------------

    for (
        let attempt = 0;
        attempt < 100;
        attempt++
    ) {

        x =
            -0.50 +
            Math.random() *
            1.00;


        z =
            -0.50 +
            Math.random() *
            1.00;


        valid =
            true;


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
                distance < 0.15
            ) {

                valid =
                    false;

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
    // SPHERE
    // --------------------------------------------------

    const geometry =
        new THREE.SphereGeometry(

            0.065,

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
                0.65,

            roughness:
                0.20,

            metalness:
                0.15

        });


    const sphere =
        new THREE.Mesh(

            geometry,

            material

        );


    sphere.position.set(

        x,

        0.12 +
        Math.random() *
        0.12,

        z

    );


    sphere.userData.color =
        colorName;


    sphere.userData.sphere =
        true;


    gameGroup.add(
        sphere
    );

}


// ======================================================
// SHUFFLE SPHERES
// ======================================================

function shuffleSpheres() {

    const spheres = [];


    gameGroup.children.forEach(
        child => {

            if (
                child.userData &&
                child.userData.sphere
            ) {

                spheres.push(
                    child
                );

            }

        }
    );


    // Randomly change positions
    // to avoid target color being grouped.

    spheres.forEach(
        sphere => {

            sphere.position.x =
                -0.50 +
                Math.random() *
                1.00;


            sphere.position.z =
                -0.50 +
                Math.random() *
                1.00;

        }
    );

}


// ======================================================
// REMOVE SPHERES
// ======================================================

function removeSpheres() {

    if (!gameGroup) {

        return;

    }


    const objects = [];


    gameGroup.children.forEach(
        child => {

            if (
                child.userData &&
                child.userData.sphere
            ) {

                objects.push(
                    child
                );

            }

        }
    );


    objects.forEach(
        sphere => {

            gameGroup.remove(
                sphere
            );


            sphere.geometry.dispose();


            sphere.material.dispose();

        }
    );

}


// ======================================================
// SUBMIT ANSWER
// ======================================================

function submitUserAnswer() {

    if (
        !gameStarted ||
        waitingForNext
    ) {

        return;

    }


    const value =
        answerInput.value.trim();


    if (
        value === ""
    ) {

        instructionTitle.innerText =
            "⚠️ ENTER AN ANSWER";


        instructionText.innerText =
            "Enter the number of spheres you counted.";

        return;

    }


    const answer =
        parseInt(
            value,
            10
        );


    if (
        Number.isNaN(answer)
    ) {

        return;

    }


    waitingForNext =
        true;


    // --------------------------------------------------
    // REACTION TIME
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
    // CHECK
    // --------------------------------------------------

    const correct =
        answer ===
        correctAnswer;


    if (correct) {

        score++;


        scoreText.innerText =
            `Score: ${score}`;


        instructionTitle.innerText =
            "✅ CORRECT";


        instructionText.innerText =
            `There were ${correctAnswer} ${targetColor} spheres. ` +
            `Reaction time: ${reaction.toFixed(2)} s`;

    }

    else {

        instructionTitle.innerText =
            "❌ INCORRECT";


        instructionText.innerText =
            `Correct answer: ${correctAnswer}. ` +
            `You entered: ${answer}`;

    }


    // --------------------------------------------------
    // Hide answer
    // --------------------------------------------------

    answerPanel.style.display =
        "none";


    // --------------------------------------------------
    // Next trial
    // --------------------------------------------------

    setTimeout(
        () => {

            nextTrial();

        },
        1200
    );

}


// ======================================================
// FINISH GAME
// ======================================================

function finishGame() {

    gameStarted =
        false;


    removeSpheres();


    // --------------------------------------------------
    // ACCURACY
    // --------------------------------------------------

    const accuracy =
        (
            score /
            TOTAL_TRIALS
        ) * 100;


    // --------------------------------------------------
    // AVERAGE
    // --------------------------------------------------

    const average =
        reactionTimes.length > 0

            ? reactionTimes.reduce(
                (
                    sum,
                    value
                ) =>
                    sum + value,
                0
            )
            /
            reactionTimes.length

            : 0;


    // --------------------------------------------------
    // FASTEST
    // --------------------------------------------------

    const fastest =
        reactionTimes.length > 0

            ? Math.min(
                ...reactionTimes
            )

            : 0;


    // --------------------------------------------------
    // DISPLAY
    // --------------------------------------------------

    accuracyElement.innerText =
        `${accuracy.toFixed(0)}%`;


    correctElement.innerText =
        `${score} / ${TOTAL_TRIALS}`;


    averageElement.innerText =
        `${average.toFixed(2)} s`;


    fastestElement.innerText =
        `${fastest.toFixed(2)} s`;


    answerPanel.style.display =
        "none";


    instruction.style.display =
        "none";


    gameInfo.style.display =
        "none";


    resultScreen.style.display =
        "block";

}


// ======================================================
// HIT TEST
// ======================================================

function updateHitTest(frame) {

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


    // --------------------------------------------------
    // NO SURFACE
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
    // SURFACE FOUND
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
    // RETICLE
    // --------------------------------------------------

    reticle.visible =
        true;


    reticle.matrix.fromArray(
        pose.transform.matrix
    );


    instructionTitle.innerText =
        "🟢 SURFACE FOUND";


    instructionText.innerText =
        "Tap the screen to place the AR spheres.";

}


// ======================================================
// SCREEN TAP TO PLACE
// ======================================================

window.addEventListener(
    "click",
    event => {

        if (
            !xrSession ||
            placed ||
            !reticle.visible
        ) {

            return;

        }


        // Ignore UI buttons

        if (
            event.target.tagName ===
            "BUTTON" ||
            event.target.tagName ===
            "INPUT"
        ) {

            return;

        }


        placeGame();

    }
);


// ======================================================
// RENDER
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


    // --------------------------------------------------
    // Animate spheres
    // --------------------------------------------------

    if (gameGroup) {

        gameGroup.children.forEach(
            object => {

                if (
                    object.userData &&
                    object.userData.sphere
                ) {

                    object.rotation.y +=
                        0.02;


                    const base =
                        object.position.y;


                    object.position.y =
                        base +
                        Math.sin(
                            time * 0.003 +
                            object.position.x * 5
                        ) * 0.0008;

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


    if (gameGroup) {

        scene.remove(
            gameGroup
        );


        gameGroup =
            null;

    }


    startScreen.style.display =
        "block";


    instruction.style.display =
        "none";


    gameInfo.style.display =
        "none";


    answerPanel.style.display =
        "none";


    startButton.disabled =
        false;

}


// ======================================================
// RESTART
// ======================================================

function restartGame() {

    resultScreen.style.display =
        "none";


    if (xrSession) {

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


        answerPanel.style.display =
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
// ERROR DISPLAY
// ======================================================

function showError(message) {

    errorMessage.innerText =
        message;

}