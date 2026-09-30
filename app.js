import * as THREE from "three";

// ============================================================
// AR COGNITIVE LAB
// One-Trial Markerless AR Sphere Counting Task
// ============================================================

// ------------------------------------------------------------
// DOM ELEMENTS
// ------------------------------------------------------------

const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const errorMessage = document.getElementById("errorMessage");

const instruction = document.getElementById("instruction");
const instructionTitle = document.getElementById("instructionTitle");
const instructionText = document.getElementById("instructionText");

const gameInfo = document.getElementById("gameInfo");
const trialText = document.getElementById("trialText");
const scoreText = document.getElementById("scoreText");

const answerPanel = document.getElementById("answerPanel");
const questionText = document.getElementById("questionText");
const answerInput = document.getElementById("answerInput");
const submitAnswerButton = document.getElementById("submitAnswer");

const resultScreen = document.getElementById("resultScreen");


// ------------------------------------------------------------
// THREE.JS VARIABLES
// ------------------------------------------------------------

let scene;
let camera;
let renderer;

let reticle;
let controller;

let xrSession = null;

let viewerSpace = null;
let localFloorSpace = null;
let hitTestSource = null;

let hitTestReady = false;
let surfaceDetected = false;
let gamePlaced = false;

let gameGroup = null;


// ------------------------------------------------------------
// GAME VARIABLES
// ------------------------------------------------------------

const TOTAL_SPHERES = 12;

let targetColor = null;
let correctAnswer = 0;

let trialStartTime = 0;
let trialFinished = false;

let userAnswer = 0;
let reactionTime = 0;
let isCorrect = false;


// ------------------------------------------------------------
// COLORS
// ------------------------------------------------------------

const COLORS = [
    {
        name: "RED",
        hex: 0xff3333
    },
    {
        name: "BLUE",
        hex: 0x3388ff
    },
    {
        name: "GREEN",
        hex: 0x33dd66
    },
    {
        name: "YELLOW",
        hex: 0xffff33
    }
];


// ============================================================
// INITIALIZATION
// ============================================================

init();


// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------

function init() {

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
    );

    // Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.xr.enabled = true;

    renderer.xr.setReferenceSpaceType("local");

    document.body.appendChild(renderer.domElement);


    // --------------------------------------------------------
    // LIGHTING
    // --------------------------------------------------------

    const ambientLight = new THREE.HemisphereLight(
        0xffffff,
        0x444444,
        2
    );

    scene.add(ambientLight);


    const directionalLight = new THREE.DirectionalLight(
        0xffffff,
        1.5
    );

    directionalLight.position.set(
        2,
        4,
        2
    );

    scene.add(directionalLight);


    // --------------------------------------------------------
    // RETICLE
    // --------------------------------------------------------

    createReticle();


    // --------------------------------------------------------
    // CONTROLLER
    // Used ONLY to place the game.
    // Spheres are NOT touch-selectable.
    // --------------------------------------------------------

    controller = renderer.xr.getController(0);

    controller.addEventListener(
        "select",
        onXRSelect
    );

    scene.add(controller);


    // --------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------

    startButton.addEventListener(
        "click",
        startAR
    );

    submitAnswerButton.addEventListener(
        "click",
        submitAnswer
    );

    answerInput.addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {

                event.preventDefault();

                submitAnswer();
            }
        }
    );


    window.addEventListener(
        "resize",
        onWindowResize
    );


    // --------------------------------------------------------
    // CHECK AR SUPPORT
    // --------------------------------------------------------

    checkARSupport();
}


// ============================================================
// CHECK WEBXR SUPPORT
// ============================================================

async function checkARSupport() {

    if (!navigator.xr) {

        showError(
            "WebXR is not available. Please use Chrome on a compatible Android device."
        );

        return;
    }

    try {

        const supported =
            await navigator.xr.isSessionSupported(
                "immersive-ar"
            );

        if (!supported) {

            showError(
                "Immersive AR is not supported on this device/browser."
            );

            return;
        }

        startButton.disabled = false;

    } catch (error) {

        console.error(
            "AR support check failed:",
            error
        );

        showError(
            "Could not check AR support."
        );
    }
}


// ============================================================
// START AR
// ============================================================

async function startAR() {

    try {

        startButton.disabled = true;

        errorMessage.style.display = "none";

        instruction.style.display = "block";

        instructionTitle.textContent =
            "Starting AR...";

        instructionText.textContent =
            "Allow camera access if requested.";


        // ----------------------------------------------------
        // REQUEST XR SESSION
        // ----------------------------------------------------

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
                        root: document.body
                    }
                }
            );


        // ----------------------------------------------------
        // CONNECT XR SESSION
        // ----------------------------------------------------

        await renderer.xr.setSession(
            xrSession
        );


        // ----------------------------------------------------
        // REFERENCE SPACES
        // ----------------------------------------------------

        viewerSpace =
            await xrSession.requestReferenceSpace(
                "viewer"
            );


        try {

            localFloorSpace =
                await xrSession.requestReferenceSpace(
                    "local-floor"
                );

        } catch (error) {

            console.log(
                "local-floor unavailable, using local"
            );

            localFloorSpace =
                await xrSession.requestReferenceSpace(
                    "local"
                );
        }


        renderer.xr.setReferenceSpace(
            localFloorSpace
        );


        // ----------------------------------------------------
        // HIT TEST SOURCE
        // ----------------------------------------------------

        hitTestSource =
            await xrSession.requestHitTestSource({
                space: viewerSpace
            });


        hitTestReady = true;


        // ----------------------------------------------------
        // XR SESSION END
        // ----------------------------------------------------

        xrSession.addEventListener(
            "end",
            onXRSessionEnd
        );


        // ----------------------------------------------------
        // UI
        // ----------------------------------------------------

        startScreen.style.display = "none";

        instruction.style.display = "block";

        instructionTitle.textContent =
            "Find a surface";

        instructionText.textContent =
            "Move your phone slowly until the reticle appears on a flat surface.";


        // ----------------------------------------------------
        // XR RENDER LOOP
        // ----------------------------------------------------

        renderer.setAnimationLoop(
            renderXR
        );


    } catch (error) {

        console.error(
            "Failed to start AR:",
            error
        );

        showError(
            "Unable to start AR: " +
            error.message
        );

        startButton.disabled = false;
    }
}


// ============================================================
// CREATE RETICLE
// ============================================================

function createReticle() {

    reticle = new THREE.Mesh(

        new THREE.RingGeometry(
            0.08,
            0.1,
            32
        ),

        new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        })

    );

    reticle.rotation.x =
        -Math.PI / 2;

    reticle.matrixAutoUpdate = false;

    reticle.visible = false;

    scene.add(reticle);
}


// ============================================================
// XR SELECT
// Tap screen / select controller
// ONLY USED TO PLACE THE GAME
// ============================================================

function onXRSelect() {

    if (!xrSession) {
        return;
    }

    if (gamePlaced) {
        return;
    }

    if (!reticle.visible) {
        return;
    }

    placeGame();
}


// ============================================================
// PLACE GAME
// ============================================================

function placeGame() {

    if (gamePlaced) {
        return;
    }

    if (!reticle.visible) {
        return;
    }


    gamePlaced = true;


    // --------------------------------------------------------
    // CREATE GAME GROUP
    // --------------------------------------------------------

    gameGroup =
        new THREE.Group();


    scene.add(
        gameGroup
    );


    // --------------------------------------------------------
    // PLACE GROUP AT RETICLE
    // --------------------------------------------------------

    gameGroup.matrixAutoUpdate = false;

    gameGroup.matrix.copy(
        reticle.matrix
    );


    // --------------------------------------------------------
    // HIDE RETICLE
    // --------------------------------------------------------

    reticle.visible = false;


    // --------------------------------------------------------
    // UPDATE UI
    // --------------------------------------------------------

    instruction.style.display = "none";

    gameInfo.style.display = "flex";

    trialText.textContent =
        "Trial 1 / 1";

    scoreText.textContent =
        "Counting";


    // --------------------------------------------------------
    // START ONE TRIAL
    // --------------------------------------------------------

    startTrial();
}


// ============================================================
// START ONE TRIAL
// ============================================================

function startTrial() {

    trialFinished = false;

    userAnswer = 0;

    reactionTime = 0;

    isCorrect = false;


    // --------------------------------------------------------
    // SELECT RANDOM TARGET COLOR
    // --------------------------------------------------------

    targetColor =
        COLORS[
            Math.floor(
                Math.random() * COLORS.length
            )
        ];


    // --------------------------------------------------------
    // RANDOM TARGET COUNT
    // 2 TO 6
    // --------------------------------------------------------

    correctAnswer =
        Math.floor(
            Math.random() * 5
        ) + 2;


    console.log(
        "Target color:",
        targetColor.name
    );

    console.log(
        "Correct answer:",
        correctAnswer
    );


    // --------------------------------------------------------
    // CREATE SPHERES
    // --------------------------------------------------------

    createSphereField();


    // --------------------------------------------------------
    // QUESTION
    // --------------------------------------------------------

    questionText.textContent =
        `How many ${targetColor.name} spheres?`;


    // --------------------------------------------------------
    // RESET INPUT
    // --------------------------------------------------------

    answerInput.value = "";

    answerInput.disabled = false;


    // --------------------------------------------------------
    // SHOW ANSWER PANEL
    // --------------------------------------------------------

    answerPanel.style.display =
        "block";


    // --------------------------------------------------------
    // START TIMER
    // --------------------------------------------------------

    trialStartTime =
        performance.now();


    // --------------------------------------------------------
    // FOCUS INPUT
    // --------------------------------------------------------

    setTimeout(
        function() {

            answerInput.focus();

        },
        300
    );
}


// ============================================================
// CREATE SPHERE FIELD
// ============================================================

function createSphereField() {

    // Remove previous spheres
    while (
        gameGroup.children.length > 0
    ) {

        const object =
            gameGroup.children[0];

        gameGroup.remove(
            object
        );


        if (object.geometry) {

            object.geometry.dispose();

        }

        if (object.material) {

            object.material.dispose();

        }
    }


    // --------------------------------------------------------
    // GENERATE POSITIONS FIRST
    // This prevents spheres from overlapping.
    // --------------------------------------------------------

    const positions = [];


    for (
        let i = 0;
        i < TOTAL_SPHERES;
        i++
    ) {

        let position;

        let valid = false;


        while (!valid) {

            position =
                new THREE.Vector3(

                    (Math.random() - 0.5) * 1.8,

                    0.08 +
                    Math.random() * 0.15,

                    (Math.random() - 0.5) * 1.2

                );


            valid = true;


            // Check distance from existing spheres
            for (
                const existing of positions
            ) {

                if (
                    position.distanceTo(
                        existing
                    ) < 0.20
                ) {

                    valid = false;

                    break;
                }
            }
        }


        positions.push(
            position
        );
    }


    // --------------------------------------------------------
    // RANDOM TARGET POSITIONS
    // --------------------------------------------------------

    const targetIndices = [];


    while (
        targetIndices.length <
        correctAnswer
    ) {

        const index =
            Math.floor(
                Math.random() *
                TOTAL_SPHERES
            );


        if (
            !targetIndices.includes(
                index
            )
        ) {

            targetIndices.push(
                index
            );
        }
    }


    // --------------------------------------------------------
    // CREATE SPHERES
    // --------------------------------------------------------

    for (
        let i = 0;
        i < TOTAL_SPHERES;
        i++
    ) {

        const isTarget =
            targetIndices.includes(
                i
            );


        let color;


        if (isTarget) {

            color =
                targetColor.hex;

        } else {

            color =
                getRandomDistractorColor();
        }


        createSphere(
            positions[i],
            color
        );
    }
}


// ============================================================
// DISTRACTOR COLORS
// ============================================================

function getRandomDistractorColor() {

    const distractorColors = [

        0xff8844,

        0xaa44ff,

        0x44ddff,

        0xff66aa,

        0xffffff

    ];


    return distractorColors[
        Math.floor(
            Math.random() *
            distractorColors.length
        )
    ];
}


// ============================================================
// CREATE ONE SPHERE
// ============================================================

function createSphere(
    position,
    color
) {

    const geometry =
        new THREE.SphereGeometry(
            0.065,
            32,
            32
        );


    const material =
        new THREE.MeshStandardMaterial({

            color: color,

            emissive: color,

            emissiveIntensity: 0.20,

            roughness: 0.35,

            metalness: 0.1
        });


    const sphere =
        new THREE.Mesh(
            geometry,
            material
        );


    sphere.position.copy(
        position
    );


    // Save original position
    // for animation.
    sphere.userData.baseY =
        position.y;


    sphere.userData.phase =
        Math.random() *
        Math.PI *
        2;


    gameGroup.add(
        sphere
    );
}


// ============================================================
// SUBMIT ANSWER
// ============================================================

function submitAnswer() {

    // Don't allow multiple submissions
    if (trialFinished) {

        return;
    }


    // --------------------------------------------------------
    // READ INPUT
    // --------------------------------------------------------

    const value =
        answerInput.value.trim();


    // --------------------------------------------------------
    // EMPTY INPUT
    // --------------------------------------------------------

    if (value === "") {

        questionText.textContent =
            "Please enter a number.";

        answerInput.focus();

        return;
    }


    // --------------------------------------------------------
    // CONVERT TO NUMBER
    // --------------------------------------------------------

    const parsedAnswer =
        Number(value);


    // --------------------------------------------------------
    // VALIDATE
    // --------------------------------------------------------

    if (
        !Number.isInteger(
            parsedAnswer
        ) ||
        parsedAnswer < 0
    ) {

        questionText.textContent =
            "Please enter a valid number.";

        answerInput.value = "";

        answerInput.focus();

        return;
    }


    // --------------------------------------------------------
    // SAVE ANSWER
    // --------------------------------------------------------

    userAnswer =
        parsedAnswer;


    // --------------------------------------------------------
    // CALCULATE REACTION TIME
    // --------------------------------------------------------

    reactionTime =
        (
            performance.now() -
            trialStartTime
        ) / 1000;


    // --------------------------------------------------------
    // CHECK ANSWER
    // --------------------------------------------------------

    isCorrect =
        userAnswer ===
        correctAnswer;


    trialFinished = true;


    console.log(
        "User answer:",
        userAnswer
    );

    console.log(
        "Correct answer:",
        correctAnswer
    );

    console.log(
        "Reaction time:",
        reactionTime.toFixed(2),
        "seconds"
    );

    console.log(
        "Correct:",
        isCorrect
    );


    // --------------------------------------------------------
    // DISABLE INPUT
    // --------------------------------------------------------

    answerInput.disabled = true;


    submitAnswerButton.disabled = true;


    // --------------------------------------------------------
    // HIDE ANSWER PANEL
    // --------------------------------------------------------

    answerPanel.style.display =
        "none";


    // --------------------------------------------------------
    // SHOW RESULT
    // --------------------------------------------------------

    showResult();
}


// ============================================================
// SHOW RESULT
// ============================================================

function showResult() {

    // Hide game info
    gameInfo.style.display =
        "none";


    // Show result screen
    resultScreen.style.display =
        "block";


    // --------------------------------------------------------
    // ACCURACY
    // --------------------------------------------------------

    const accuracy =
        isCorrect
            ? 100
            : 0;


    // --------------------------------------------------------
    // UPDATE RESULT ELEMENTS
    // --------------------------------------------------------

    const accuracyElement =
        document.getElementById(
            "accuracy"
        );

    const correctCountElement =
        document.getElementById(
            "correctCount"
        );

    const averageReactionElement =
        document.getElementById(
            "averageReaction"
        );

    const fastestReactionElement =
        document.getElementById(
            "fastestReaction"
        );


    if (accuracyElement) {

        accuracyElement.textContent =
            accuracy + "%";
    }


    if (correctCountElement) {

        correctCountElement.textContent =
            isCorrect
                ? "1 / 1"
                : "0 / 1";
    }


    if (averageReactionElement) {

        averageReactionElement.textContent =
            reactionTime.toFixed(2) +
            " s";
    }


    if (fastestReactionElement) {

        fastestReactionElement.textContent =
            reactionTime.toFixed(2) +
            " s";
    }


    // --------------------------------------------------------
    // SCORE
    // --------------------------------------------------------

    scoreText.textContent =
        isCorrect
            ? "Correct!"
            : "Incorrect";


    console.log(
        "========== FINAL RESULT =========="
    );

    console.log(
        "Target:",
        targetColor.name
    );

    console.log(
        "Correct answer:",
        correctAnswer
    );

    console.log(
        "User answer:",
        userAnswer
    );

    console.log(
        "Accuracy:",
        accuracy + "%"
    );

    console.log(
        "Reaction time:",
        reactionTime.toFixed(2) +
        " seconds"
    );

    console.log(
        "=================================="
    );
}


// ============================================================
// ANIMATION / XR RENDER LOOP
// ============================================================

function renderXR(
    timestamp,
    frame
) {

    if (
        frame &&
        hitTestSource &&
        hitTestReady &&
        !gamePlaced
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


                if (!surfaceDetected) {

                    surfaceDetected = true;


                    instructionTitle.textContent =
                        "Surface found";

                    instructionText.textContent =
                        "Tap the screen to place the spheres.";

                }
            }


        } else {

            reticle.visible =
                false;


            surfaceDetected =
                false;


            instructionTitle.textContent =
                "Find a surface";

            instructionText.textContent =
                "Move your phone slowly over a flat surface.";
        }
    }


    // --------------------------------------------------------
    // ANIMATE SPHERES
    // --------------------------------------------------------

    if (
        gameGroup &&
        gamePlaced
    ) {

        gameGroup.children.forEach(
            function(object, index) {

                if (
                    object.userData.baseY ===
                    undefined
                ) {

                    return;
                }


                const baseY =
                    object.userData.baseY;


                const phase =
                    object.userData.phase;


                object.position.y =
                    baseY +
                    Math.sin(
                        timestamp * 0.002 +
                        phase
                    ) * 0.008;


                object.rotation.y +=
                    0.01;

            }
        );
    }


    // --------------------------------------------------------
    // RENDER
    // --------------------------------------------------------

    renderer.render(
        scene,
        camera
    );
}


// ============================================================
// XR SESSION END
// ============================================================

function onXRSessionEnd() {

    console.log(
        "XR session ended."
    );


    xrSession = null;

    hitTestSource = null;

    viewerSpace = null;

    localFloorSpace = null;

    hitTestReady = false;

    surfaceDetected = false;

    gamePlaced = false;


    renderer.setAnimationLoop(
        null
    );


    // Hide AR UI
    instruction.style.display =
        "none";

    gameInfo.style.display =
        "none";

    answerPanel.style.display =
        "none";


    // Show start screen
    startScreen.style.display =
        "block";


    startButton.disabled =
        false;
}


// ============================================================
// RESTART
// ============================================================

const restartButton =
    document.getElementById(
        "restartButton"
    );


if (restartButton) {

    restartButton.addEventListener(
        "click",
        function() {

            location.reload();

        }
    );
}


// ============================================================
// ERROR HANDLING
// ============================================================

function showError(message) {

    errorMessage.textContent =
        message;

    errorMessage.style.display =
        "block";
}


// ============================================================
// WINDOW RESIZE
// ============================================================

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