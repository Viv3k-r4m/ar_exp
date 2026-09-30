// ============================================
// AR COGNITIVE LAB
// CATCH THE TARGET
// ============================================


// --------------------------------------------
// ELEMENTS
// --------------------------------------------

const camera =
    document.getElementById("camera");

const startScreen =
    document.getElementById("startScreen");

const gameScreen =
    document.getElementById("gameScreen");

const resultScreen =
    document.getElementById("resultScreen");

const startButton =
    document.getElementById("startButton");

const restartButton =
    document.getElementById("restartButton");

const cameraError =
    document.getElementById("cameraError");

const orbContainer =
    document.getElementById("orbContainer");

const targetInstruction =
    document.getElementById(
        "targetInstruction"
    );

const trialText =
    document.getElementById("trialText");

const scoreText =
    document.getElementById("scoreText");

const feedback =
    document.getElementById("feedback");


// Results

const accuracyResult =
    document.getElementById(
        "accuracyResult"
    );

const correctResult =
    document.getElementById(
        "correctResult"
    );

const reactionResult =
    document.getElementById(
        "reactionResult"
    );

const fastestResult =
    document.getElementById(
        "fastestResult"
    );


// --------------------------------------------
// GAME SETTINGS
// --------------------------------------------

const TOTAL_TRIALS = 10;

const NUMBER_OF_ORBS = 7;


// --------------------------------------------
// COLORS
// --------------------------------------------

const COLORS = {

    red: "RED",

    blue: "BLUE",

    green: "GREEN",

    yellow: "YELLOW",

    purple: "PURPLE",

    cyan: "CYAN"

};


// --------------------------------------------
// VARIABLES
// --------------------------------------------

let currentTrial = 0;

let score = 0;

let reactionTimes = [];

let targetColor = "";

let trialStartTime = 0;

let cameraStream = null;

let waitingForNextTrial = false;


// --------------------------------------------
// START CAMERA
// --------------------------------------------

async function startCamera() {

    cameraError.innerText = "";


    // Check browser support

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        cameraError.innerText =
            "Camera API is not available in this browser.";

        return;

    }


    try {

        /*
         * Prefer rear camera.
         *
         * 'ideal' is used rather than
         * 'exact' so that phones with
         * unusual camera configurations
         * can still fall back.
         */

        const constraints = {

            audio: false,

            video: {

                facingMode: {
                    ideal: "environment"
                },

                width: {
                    ideal: 1280
                },

                height: {
                    ideal: 720
                }

            }

        };


        cameraStream =
            await navigator.mediaDevices
                .getUserMedia(
                    constraints
                );


        camera.srcObject =
            cameraStream;


        await camera.play();


        /*
         * Hide start screen
         */

        startScreen.style.display =
            "none";


        /*
         * Show game
         */

        gameScreen.style.display =
            "block";


        /*
         * Start first trial
         */

        startGame();


    }

    catch (error) {

        console.error(
            "Camera error:",
            error
        );


        handleCameraError(
            error
        );

    }

}


// --------------------------------------------
// CAMERA ERROR HANDLER
// --------------------------------------------

function handleCameraError(error) {

    let message =
        "Unable to access camera.";


    if (
        error.name ===
        "NotAllowedError"
    ) {

        message =
            "Camera permission was denied. " +
            "Allow camera access in browser settings " +
            "and reload the page.";

    }


    else if (
        error.name ===
        "NotFoundError"
    ) {

        message =
            "No camera was found on this device.";

    }


    else if (
        error.name ===
        "NotReadableError"
    ) {

        message =
            "Camera is being used by another application.";

    }


    else if (
        error.name ===
        "SecurityError"
    ) {

        message =
            "Camera access was blocked for security reasons.";

    }


    cameraError.innerText =
        message;

}


// --------------------------------------------
// START GAME
// --------------------------------------------

function startGame() {

    currentTrial = 0;

    score = 0;

    reactionTimes = [];

    waitingForNextTrial = false;

    scoreText.innerText =
        "Score: 0";


    nextTrial();

}


// --------------------------------------------
// NEXT TRIAL
// --------------------------------------------

function nextTrial() {

    if (
        currentTrial >=
        TOTAL_TRIALS
    ) {

        finishGame();

        return;

    }


    waitingForNextTrial = false;


    currentTrial++;


    trialText.innerText =
        `Trial ${currentTrial} / ${TOTAL_TRIALS}`;


    feedback.innerText = "";


    /*
     * Generate target
     */

    const colorNames =
        Object.keys(COLORS);


    targetColor =
        colorNames[
            Math.floor(
                Math.random() *
                colorNames.length
            )
        ];


    targetInstruction.innerText =
        `FIND THE ${COLORS[targetColor]} ORB`;


    /*
     * Generate objects
     */

    createOrbs();


    /*
     * Start reaction timer
     */

    trialStartTime =
        performance.now();

}


// --------------------------------------------
// CREATE ORBS
// --------------------------------------------

function createOrbs() {

    orbContainer.innerHTML = "";


    const colorNames =
        Object.keys(COLORS);


    /*
     * Keep track of positions
     * so objects don't overlap too much.
     */

    const positions = [];


    for (
        let i = 0;
        i < NUMBER_OF_ORBS;
        i++
    ) {


        let x;

        let y;

        let validPosition = false;


        /*
         * Generate a position that is
         * reasonably separated.
         */

        for (
            let attempt = 0;
            attempt < 100;
            attempt++
        ) {

            /*
             * Keep objects away from
             * header and bottom controls.
             */

            x =
                12 +
                Math.random() * 76;


            y =
                28 +
                Math.random() * 48;


            validPosition = true;


            for (
                const pos of positions
            ) {

                const dx =
                    x - pos.x;

                const dy =
                    y - pos.y;

                const distance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );


                if (
                    distance < 13
                ) {

                    validPosition =
                        false;

                    break;

                }

            }


            if (validPosition) {

                break;

            }

        }


        positions.push({
            x,
            y
        });


        /*
         * Target gets correct color.
         *
         * Other objects get random
         * non-target colors.
         */

        let color;


        if (i === 0) {

            color =
                targetColor;

        }

        else {

            const otherColors =
                colorNames.filter(
                    c =>
                        c !==
                        targetColor
                );


            color =
                otherColors[
                    Math.floor(
                        Math.random() *
                        otherColors.length
                    )
                ];

        }


        /*
         * Create button
         */

        const orb =
            document.createElement(
                "button"
            );


        orb.className =
            `orb ${color}`;


        /*
         * Make target slightly special
         */

        if (i === 0) {

            orb.classList.add(
                "targetOrb"
            );

        }


        /*
         * Position
         */

        orb.style.left =
            `${x}%`;

        orb.style.top =
            `${y}%`;


        /*
         * Slightly different sizes
         */

        const size =
            58 +
            Math.random() * 25;


        orb.style.width =
            `${size}px`;

        orb.style.height =
            `${size}px`;


        /*
         * Random animation delay
         */

        orb.style.animationDelay =
            `${Math.random() * -2}s`;


        /*
         * IMPORTANT:
         *
         * pointerup works well for
         * touchscreen interaction.
         */

        orb.addEventListener(
            "pointerup",
            function(event) {

                event.preventDefault();

                event.stopPropagation();


                handleOrbTap(
                    color,
                    orb
                );

            }
        );


        orbContainer.appendChild(
            orb
        );

    }

}


// --------------------------------------------
// ORB TAP
// --------------------------------------------

function handleOrbTap(
    selectedColor,
    selectedOrb
) {

    /*
     * Prevent double taps while
     * changing the scene.
     */

    if (waitingForNextTrial) {

        return;

    }


    waitingForNextTrial = true;


    /*
     * Reaction time
     */

    const reactionTime =
        (
            performance.now()
            -
            trialStartTime
        ) / 1000;


    reactionTimes.push(
        reactionTime
    );


    /*
     * Correct?
     */

    const correct =
        selectedColor ===
        targetColor;


    if (correct) {

        score++;


        scoreText.innerText =
            `Score: ${score}`;


        feedback.innerText =
            `✓ CORRECT  ${reactionTime.toFixed(2)}s`;


        feedback.style.color =
            "#4ade80";


        /*
         * Explosion effect
         */

        createExplosion(
            selectedOrb
        );

    }

    else {

        feedback.innerText =
            `✕ WRONG  ${reactionTime.toFixed(2)}s`;


        feedback.style.color =
            "#fb7185";

    }


    /*
     * Change component after
     * the user has answered.
     */

    setTimeout(
        function() {

            nextTrial();

        },

        650
    );

}


// --------------------------------------------
// EXPLOSION EFFECT
// --------------------------------------------

function createExplosion(
    orb
) {

    if (!orb) {

        return;

    }


    /*
     * Make selected orb disappear
     */

    orb.style.transform =
        "translate(-50%, -50%) scale(1.6)";


    orb.style.opacity =
        "0";


    orb.style.transition =
        "all 0.35s ease";


    /*
     * Create particles
     */

    for (
        let i = 0;
        i < 8;
        i++
    ) {

        const particle =
            document.createElement(
                "div"
            );


        particle.style.position =
            "absolute";


        particle.style.left =
            orb.style.left;


        particle.style.top =
            orb.style.top;


        particle.style.width =
            "8px";


        particle.style.height =
            "8px";


        particle.style.borderRadius =
            "50%";


        particle.style.background =
            "white";


        particle.style.pointerEvents =
            "none";


        particle.style.transition =
            "all 0.4s ease";


        orbContainer.appendChild(
            particle
        );


        /*
         * Animate particles
         */

        setTimeout(
            function() {

                const angle =
                    (
                        Math.PI * 2
                        * i
                        / 8
                    );


                const distance =
                    50 +
                    Math.random() * 40;


                const dx =
                    Math.cos(angle)
                    * distance;


                const dy =
                    Math.sin(angle)
                    * distance;


                particle.style.transform =
                    `translate(${dx}px, ${dy}px)`;


                particle.style.opacity =
                    "0";

            },

            20
        );


        setTimeout(
            function() {

                particle.remove();

            },

            500
        );

    }

}


// --------------------------------------------
// FINISH GAME
// --------------------------------------------

function finishGame() {

    gameScreen.style.display =
        "none";


    resultScreen.style.display =
        "flex";


    /*
     * Accuracy
     */

    const accuracy =
        (
            score /
            TOTAL_TRIALS
        ) * 100;


    /*
     * Average reaction time
     */

    let average =
        0;


    if (
        reactionTimes.length > 0
    ) {

        average =
            reactionTimes.reduce(
                (sum, value) =>
                    sum + value,
                0
            )
            /
            reactionTimes.length;

    }


    /*
     * Fastest reaction
     */

    const fastest =
        Math.min(
            ...reactionTimes
        );


    /*
     * Results
     */

    accuracyResult.innerText =
        `${accuracy.toFixed(0)}%`;


    correctResult.innerText =
        `${score} / ${TOTAL_TRIALS}`;


    reactionResult.innerText =
        `${average.toFixed(2)} sec`;


    fastestResult.innerText =
        `${fastest.toFixed(2)} sec`;


    /*
     * Stop camera
     */

    stopCamera();

}


// --------------------------------------------
// STOP CAMERA
// --------------------------------------------

function stopCamera() {

    if (!cameraStream) {

        return;

    }


    cameraStream
        .getTracks()
        .forEach(
            track =>
                track.stop()
        );


    cameraStream = null;

}


// --------------------------------------------
// RESTART
// --------------------------------------------

restartButton.addEventListener(
    "click",
    async function() {

        resultScreen.style.display =
            "none";


        /*
         * Camera has been stopped,
         * so start it again.
         */

        await startCamera();

    }
);


// --------------------------------------------
// START BUTTON
// --------------------------------------------

startButton.addEventListener(
    "click",
    startCamera
);


// --------------------------------------------
// PAGE VISIBILITY
// --------------------------------------------

document.addEventListener(
    "visibilitychange",
    function() {

        /*
         * If user leaves the page,
         * stop camera.
         */

        if (
            document.hidden &&
            cameraStream
        ) {

            stopCamera();

        }

    }
);