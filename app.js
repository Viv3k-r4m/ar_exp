/*
========================================================
 AR COGNITIVE LAB
 Markerless WebXR AR Sphere Counting Experiment

 FINAL VERSION
 - 1 Trial
 - 12 spheres
 - Random target color
 - Target count: 2-6
 - Numeric answer
 - Accuracy
 - Reaction time
 - Mobile optimized
 - True markerless WebXR AR
========================================================
*/

import * as THREE from "three";


// ======================================================
// DOM ELEMENTS
// ======================================================

const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const errorMessage = document.getElementById("errorMessage");

const instruction = document.getElementById("instruction");
const instructionTitle =
    document.getElementById("instructionTitle");
const instructionText =
    document.getElementById("instructionText");

const gameInfo = document.getElementById("gameInfo");
const trialText = document.getElementById("trialText");
const scoreText = document.getElementById("scoreText");

const answerPanel = document.getElementById("answerPanel");
const questionText = document.getElementById("questionText");
const answerInput = document.getElementById("answerInput");
const submitAnswerButton =
    document.getElementById("submitAnswer");

const resultScreen =
    document.getElementById("resultScreen");

const restartButton =
    document.getElementById("restartButton");


// Result dashboard
const accuracyElement =
    document.getElementById("accuracy");

const correctElement =
    document.getElementById("correct");

const averageElement =
    document.getElementById("average");

const fastestElement =
    document.getElementById("fastest");


// ======================================================
// EXPERIMENT SETTINGS
// ======================================================

const TOTAL_TRIALS = 1;

const TOTAL_SPHERES = 12;

const MIN_TARGET_COUNT = 2;
const MAX_TARGET_COUNT = 6;


// Sphere size
const SPHERE_RADIUS = 0.065;


// ======================================================
// THREE.JS VARIABLES
// ======================================================

let renderer;
let scene;
let camera;

let controller;

let hitTestSource = null;
let viewerSpace = null;
let localFloorSpace = null;

let reticle;
let gameGroup;

let xrSession = null;


// ======================================================
// GAME STATE
// ======================================================

let gamePlaced = false;

let trialNumber = 0;

let score = 0;

let targetColorName = "";

let targetColorValue = 0xffffff;

let correctAnswer = 0;

let trialStartTime = 0;

let reactionTime = 0;

let answerSubmitted = false;


// ======================================================
// COLORS
// ======================================================

const TARGET_COLORS = [

    {
        name: "RED",
        value: 0xff3333
    },

    {
        name: "BLUE",
        value: 0x3388ff
    },

    {
        name: "GREEN",
        value: 0x22cc66
    },

    {
        name: "YELLOW",
        value: 0xffcc22
    }

];


// Distractor colors
const DISTRACTOR_COLORS = [

    0xff8800, // orange
    0xaa44ff, // purple
    0x00cccc, // cyan
    0xff55aa, // pink
    0xffffff  // white

];


// ======================================================
// START
// ======================================================

startButton.addEventListener(
    "click",
    startAR
);


// ======================================================
// RESTART
// ======================================================

if (restartButton) {

    restartButton.addEventListener(
        "click",
        () => {

            window.location.reload();

        }
    );

}


// ======================================================
// ANSWER SUBMISSION
// ======================================================

submitAnswerButton.addEventListener(
    "click",
    submitAnswer
);


// Press Enter to submit
answerInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            event.preventDefault();

            submitAnswer();

        }

    }
);


// ======================================================
// CHECK WEBXR SUPPORT
// ======================================================

async function checkARSupport() {

    if (!navigator.xr) {

        throw new Error(
            "WebXR is not supported by this browser."
        );

    }


    const supported =
        await navigator.xr.isSessionSupported(
            "immersive-ar"
        );


    if (!supported) {

        throw new Error(
            "Markerless AR is not supported on this device/browser."
        );

    }

}


// ======================================================
// START AR
// ======================================================

async function startAR() {

    try {

        errorMessage.textContent = "";

        startButton.disabled = true;

        startButton.textContent =
            "CHECKING AR...";


        await checkARSupport();


        initializeThree();


        const sessionInit = {

            requiredFeatures: [

                "hit-test"

            ],

            optionalFeatures: [

                "local-floor",
                "dom-overlay"

            ],

            domOverlay: {

                root: document.body

            }

        };


        xrSession =
            await navigator.xr.requestSession(
                "immersive-ar",
                sessionInit
            );


        setupXRSession(xrSession);


    }
    catch (error) {

        console.error(
            "AR START ERROR:",
            error
        );


        startButton.disabled = false;

        startButton.textContent =
            "START AR";


        errorMessage.textContent =
            error.message ||
            "Unable to start AR.";

    }

}


// ======================================================
// INITIALIZE THREE.JS
// ======================================================

function initializeThree() {

    // --------------------------------------------------
    // Scene
    // --------------------------------------------------

    scene = new THREE.Scene();


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

            antialias: false,

            alpha: true,

            powerPreference:
                "high-performance"

        });


    // Mobile optimization
    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            1.5
        )
    );


    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );


    renderer.xr.enabled = true;


    renderer.xr.setReferenceSpaceType(
        "local"
    );


    renderer.domElement.style.position =
        "fixed";

    renderer.domElement.style.left = "0";
    renderer.domElement.style.top = "0";

    renderer.domElement.style.width =
        "100%";

    renderer.domElement.style.height =
        "100%";


    document.body.appendChild(
        renderer.domElement
    );


    // --------------------------------------------------
    // Lighting
    // --------------------------------------------------

    const hemisphereLight =
        new THREE.HemisphereLight(
            0xffffff,
            0x444444,
            1.5
        );


    scene.add(
        hemisphereLight
    );


    // --------------------------------------------------
    // Game group
    // --------------------------------------------------

    gameGroup =
        new THREE.Group();


    gameGroup.visible = false;


    scene.add(
        gameGroup
    );


    // --------------------------------------------------
    // Reticle
    // --------------------------------------------------

    createReticle();


    // --------------------------------------------------
    // Controller
    // --------------------------------------------------

    controller =
        renderer.xr.getController(0);


    controller.addEventListener(
        "select",
        onXRSelect
    );


    scene.add(
        controller
    );


    // --------------------------------------------------
    // Resize
    // --------------------------------------------------

    window.addEventListener(
        "resize",
        onWindowResize
    );

}


// ======================================================
// RETICLE
// ======================================================

function createReticle() {

    const geometry =
        new THREE.RingGeometry(
            0.07,
            0.085,
            16
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


    reticle.visible = false;


    scene.add(
        reticle
    );

}


// ======================================================
// XR SESSION SETUP
// ======================================================

async function setupXRSession(session) {

    try {

        instruction.style.display =
            "block";

        instructionTitle.textContent =
            "Starting AR";

        instructionText.textContent =
            "Preparing surface detection...";


        // ------------------------------------------------
        // Viewer reference space
        // ------------------------------------------------

        viewerSpace =
            await session.requestReferenceSpace(
                "viewer"
            );


        // ------------------------------------------------
        // Hit test source
        // ------------------------------------------------

        hitTestSource =
            await session.requestHitTestSource({

                space: viewerSpace

            });


        // ------------------------------------------------
        // Local floor reference space
        // ------------------------------------------------

        try {

            localFloorSpace =
                await session.requestReferenceSpace(
                    "local-floor"
                );

        }
        catch (error) {

            console.warn(
                "local-floor unavailable, using local",
                error
            );


            localFloorSpace =
                await session.requestReferenceSpace(
                    "local"
                );

        }


        // ------------------------------------------------
        // Tell Three.js which reference space to use
        // ------------------------------------------------

        renderer.xr.setReferenceSpaceType(
            "local-floor"
        );


        // ------------------------------------------------
        // Session end
        // ------------------------------------------------

        session.addEventListener(
            "end",
            onSessionEnd
        );


        // ------------------------------------------------
        // Start rendering
        // ------------------------------------------------

        renderer.xr.setSession(
            session
        );


        renderer.setAnimationLoop(
            renderXR
        );


        instructionTitle.textContent =
            "Find a Surface";

        instructionText.textContent =
            "Move your phone slowly across the floor or table.";


        startScreen.style.display =
            "none";


        gameInfo.style.display =
            "flex";


        trialText.textContent =
            "Trial 1 / 1";

        scoreText.textContent =
            "Score: 0";


    }
    catch (error) {

        console.error(
            "XR SESSION ERROR:",
            error
        );


        errorMessage.textContent =
            "Could not initialize AR.";

    }

}


// ======================================================
// SESSION END
// ======================================================

function onSessionEnd() {

    hitTestSource = null;

    viewerSpace = null;

    localFloorSpace = null;

    xrSession = null;

    gamePlaced = false;


    if (renderer) {

        renderer.setAnimationLoop(
            null
        );

    }

}


// ======================================================
// XR SELECT
// ======================================================

function onXRSelect() {

    // Already placed
    if (gamePlaced) {

        return;

    }


    if (
        !reticle ||
        !reticle.visible
    ) {

        return;

    }


    // --------------------------------------------------
    // Place the experiment
    // --------------------------------------------------

    gameGroup.matrix.copy(
        reticle.matrix
    );


    gameGroup.matrixAutoUpdate =
        false;


    gameGroup.visible = true;


    gamePlaced = true;


    reticle.visible = false;


    // --------------------------------------------------
    // Start trial
    // --------------------------------------------------

    startTrial();


    instruction.style.display =
        "none";

}


// ======================================================
// START TRIAL
// ======================================================

function startTrial() {

    trialNumber = 1;

    score = 0;

    answerSubmitted = false;


    trialText.textContent =
        "Trial 1 / 1";


    scoreText.textContent =
        "Score: 0";


    // --------------------------------------------------
    // Select target color
    // --------------------------------------------------

    const targetIndex =
        Math.floor(
            Math.random() *
            TARGET_COLORS.length
        );


    const target =
        TARGET_COLORS[
            targetIndex
        ];


    targetColorName =
        target.name;


    targetColorValue =
        target.value;


    // --------------------------------------------------
    // Select target count
    // --------------------------------------------------

    correctAnswer =
        randomInteger(
            MIN_TARGET_COUNT,
            MAX_TARGET_COUNT
        );


    // --------------------------------------------------
    // Create spheres
    // --------------------------------------------------

    createSphereField();


    // --------------------------------------------------
    // Show question
    // --------------------------------------------------

    questionText.textContent =
        `How many ${targetColorName} spheres?`;


    answerInput.value = "";

    answerInput.disabled = false;

    submitAnswerButton.disabled = false;


    answerPanel.style.display =
        "block";


    // --------------------------------------------------
    // Start reaction timer
    // --------------------------------------------------

    trialStartTime =
        performance.now();


    // Focus input
    setTimeout(
        () => {

            try {

                answerInput.focus();

            }
            catch (error) {

                console.log(
                    "Input focus unavailable."
                );

            }

        },
        300
    );

}


// ======================================================
// CREATE SPHERE FIELD
// ======================================================

function createSphereField() {

    // Remove old spheres
    while (
        gameGroup.children.length > 0
    ) {

        const child =
            gameGroup.children[0];


        if (child.geometry) {

            child.geometry.dispose();

        }


        if (child.material) {

            if (
                Array.isArray(
                    child.material
                )
            ) {

                child.material.forEach(
                    material => {

                        material.dispose();

                    }
                );

            }
            else {

                child.material.dispose();

            }

        }


        gameGroup.remove(
            child
        );

    }


    // --------------------------------------------------
    // Generate positions
    // --------------------------------------------------

    const positions = [];

    const minDistance = 0.20;

    const maxAttempts = 200;


    for (
        let i = 0;
        i < TOTAL_SPHERES;
        i++
    ) {

        let position = null;

        let attempts = 0;


        while (
            !position &&
            attempts < maxAttempts
        ) {

            attempts++;


            const x =
                (Math.random() - 0.5) *
                1.4;


            const z =
                (Math.random() - 0.5) *
                0.9;


            const candidate =
                new THREE.Vector3(
                    x,
                    0.10,
                    z
                );


            let valid = true;


            for (
                const existing
                of positions
            ) {

                if (
                    candidate.distanceTo(
                        existing
                    ) < minDistance
                ) {

                    valid = false;

                    break;

                }

            }


            if (valid) {

                position =
                    candidate;

            }

        }


        // Fallback if random placement
        // reaches the attempt limit
        if (!position) {

            position =
                new THREE.Vector3(

                    ((i % 4) - 1.5) *
                    0.30,

                    0.10,

                    (Math.floor(i / 4) - 1) *
                    0.30

                );

        }


        positions.push(
            position
        );

    }


    // --------------------------------------------------
    // Randomly select target sphere indices
    // --------------------------------------------------

    const indices =
        Array.from(
            {
                length:
                    TOTAL_SPHERES
            },
            (_, index) => index
        );


    shuffleArray(
        indices
    );


    const targetIndices =
        new Set(
            indices.slice(
                0,
                correctAnswer
            )
        );


    // --------------------------------------------------
    // Create spheres
    // --------------------------------------------------

    for (
        let i = 0;
        i < TOTAL_SPHERES;
        i++
    ) {

        const isTarget =
            targetIndices.has(i);


        let color;


        if (isTarget) {

            color =
                targetColorValue;

        }
        else {

            color =
                DISTRACTOR_COLORS[
                    Math.floor(
                        Math.random() *
                        DISTRACTOR_COLORS.length
                    )
                ];

        }


        // Lower geometry complexity
        const geometry =
            new THREE.SphereGeometry(
                SPHERE_RADIUS,
                16,
                16
            );


        // Basic material is much cheaper
        // than StandardMaterial on mobile
        const material =
            new THREE.MeshBasicMaterial({

                color: color

            });


        const sphere =
            new THREE.Mesh(
                geometry,
                material
            );


        sphere.position.copy(
            positions[i]
        );


        gameGroup.add(
            sphere
        );

    }

}


// ======================================================
// SUBMIT ANSWER
// ======================================================

function submitAnswer() {

    if (answerSubmitted) {

        return;

    }


    const value =
        answerInput.value.trim();


    // Empty answer
    if (value === "") {

        answerInput.focus();

        return;

    }


    const userAnswer =
        Number(value);


    // Invalid number
    if (
        !Number.isFinite(
            userAnswer
        )
    ) {

        answerInput.focus();

        return;

    }


    // --------------------------------------------------
    // Reaction time
    // --------------------------------------------------

    reactionTime =
        (
            performance.now() -
            trialStartTime
        ) / 1000;


    // --------------------------------------------------
    // Check answer
    // --------------------------------------------------

    const isCorrect =
        userAnswer === correctAnswer;


    answerSubmitted = true;


    if (isCorrect) {

        score = 1;

    }
    else {

        score = 0;

    }


    // --------------------------------------------------
    // Update game info
    // --------------------------------------------------

    scoreText.textContent =
        `Score: ${score}`;


    // --------------------------------------------------
    // Disable answer controls
    // --------------------------------------------------

    answerInput.disabled = true;

    submitAnswerButton.disabled = true;


    answerPanel.style.display =
        "none";


    // --------------------------------------------------
    // Show result
    // --------------------------------------------------

    showResult(
        isCorrect
    );

}


// ======================================================
// SHOW RESULT
// ======================================================

function showResult(
    isCorrect
) {

    // --------------------------------------------------
    // Accuracy
    // --------------------------------------------------

    const accuracy =
        isCorrect
            ? 100
            : 0;


    // --------------------------------------------------
    // Dashboard
    // --------------------------------------------------

    if (accuracyElement) {

        accuracyElement.textContent =
            `${accuracy}%`;

    }


    if (correctElement) {

        correctElement.textContent =
            isCorrect
                ? "1 / 1"
                : "0 / 1";

    }


    if (averageElement) {

        averageElement.textContent =
            `${reactionTime.toFixed(2)} s`;

    }


    if (fastestElement) {

        fastestElement.textContent =
            `${reactionTime.toFixed(2)} s`;

    }


    // --------------------------------------------------
    // Hide AR game UI
    // --------------------------------------------------

    gameInfo.style.display =
        "none";


    instruction.style.display =
        "none";


    // --------------------------------------------------
    // Show result
    // --------------------------------------------------

    resultScreen.style.display =
        "block";


    // --------------------------------------------------
    // Log experiment result
    // --------------------------------------------------

    console.log(
        "===== AR COGNITIVE RESULT ====="
    );


    console.log(
        "Target color:",
        targetColorName
    );


    console.log(
        "Correct answer:",
        correctAnswer
    );


    console.log(
        "User answer:",
        Number(answerInput.value)
    );


    console.log(
        "Correct:",
        isCorrect
    );


    console.log(
        "Accuracy:",
        accuracy + "%"
    );


    console.log(
        "Reaction time:",
        reactionTime.toFixed(2),
        "seconds"
    );

}


// ======================================================
// RANDOM INTEGER
// ======================================================

function randomInteger(
    min,
    max
) {

    return Math.floor(
        Math.random() *
        (max - min + 1)
    ) + min;

}


// ======================================================
// SHUFFLE ARRAY
// ======================================================

function shuffleArray(
    array
) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        [
            array[i],
            array[j]
        ] = [
            array[j],
            array[i]
        ];

    }

}


// ======================================================
// RESIZE
// ======================================================

function onWindowResize() {

    if (!camera || !renderer) {

        return;

    }


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
// XR RENDER LOOP
// ======================================================

function renderXR(
    timestamp,
    frame
) {

    if (
        !renderer ||
        !scene ||
        !camera
    ) {

        return;

    }


    // ==================================================
    // SURFACE DETECTION
    // ==================================================

    if (
        !gamePlaced &&
        hitTestSource &&
        frame &&
        localFloorSpace
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
                    localFloorSpace
                );


            if (pose) {

                reticle.visible =
                    true;


                reticle.matrix.fromArray(
                    pose.transform.matrix
                );


                instructionTitle.textContent =
                    "Surface Found";


                instructionText.textContent =
                    "Tap the screen to place the spheres.";

            }

        }
        else {

            reticle.visible =
                false;


            instructionTitle.textContent =
                "Find a Surface";


            instructionText.textContent =
                "Move your phone slowly across a floor or table.";

        }

    }


    // ==================================================
    // RENDER
    // ==================================================

    renderer.render(
        scene,
        camera
    );

}


// ======================================================
// PAGE VISIBILITY
// ======================================================

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden
        ) {

            console.log(
                "AR page hidden."
            );

        }

    }
);


// ======================================================
// INITIAL MESSAGE
// ======================================================

console.log(
    "AR Cognitive Lab loaded."
);

console.log(
    "Mode: Markerless WebXR AR"
);

console.log(
    "Trials: 1"
);

console.log(
    "Spheres: 12"
);