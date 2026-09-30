// ==========================================
// AR COGNITIVE LAB
// MARKERLESS CAMERA AR
// ==========================================


const camera =
    document.getElementById("camera");

const startScreen =
    document.getElementById("startScreen");

const testScreen =
    document.getElementById("testScreen");

const resultScreen =
    document.getElementById("resultScreen");

const startButton =
    document.getElementById("startButton");

const restartButton =
    document.getElementById("restartButton");

const circle =
    document.getElementById("circle");

const word =
    document.getElementById("word");

const trialInfo =
    document.getElementById("trialInfo");

const feedback =
    document.getElementById("feedback");

const finalAccuracy =
    document.getElementById("finalAccuracy");

const finalTime =
    document.getElementById("finalTime");

const finalCorrect =
    document.getElementById("finalCorrect");

const answerButtons =
    document.querySelectorAll(".answer");


// ==========================================
// TEST VARIABLES
// ==========================================

const totalTrials = 5;

let currentTrial = 0;

let correctAnswers = 0;

let reactionTimes = [];

let currentCorrectColor = "";

let trialStartTime = 0;

let cameraStream = null;


// ==========================================
// COLORS
// ==========================================

const colors = {

    red: "#ef4444",

    blue: "#3b82f6",

    green: "#22c55e"

};


// ==========================================
// WORDS
// ==========================================

const colorWords = {

    red: "RED",

    blue: "BLUE",

    green: "GREEN"

};


// ==========================================
// START CAMERA
// ==========================================

async function startCamera() {

    try {

        cameraStream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {

                        facingMode: {
                            ideal: "environment"
                        }

                    },

                    audio: false

                });


        camera.srcObject =
            cameraStream;


        console.log(
            "Camera started"
        );


        startScreen.style.display =
            "none";

        testScreen.style.display =
            "block";


        startTest();


    }

    catch (error) {

        console.error(error);


        alert(
            "Camera permission is required. " +
            "Please allow camera access and reload the page."
        );

    }

}


// ==========================================
// START TEST
// ==========================================

function startTest() {

    currentTrial = 0;

    correctAnswers = 0;

    reactionTimes = [];

    feedback.innerText = "";

    nextTrial();

}


// ==========================================
// NEXT TRIAL
// ==========================================

function nextTrial() {

    currentTrial++;


    if (
        currentTrial >
        totalTrials
    ) {

        finishTest();

        return;

    }


    trialInfo.innerText =
        `Trial ${currentTrial} / ${totalTrials}`;


    feedback.innerText = "";


    // ===============================
    // RANDOM WORD
    // ===============================

    const wordColors =
        Object.keys(colors);


    const randomWord =
        wordColors[
            Math.floor(
                Math.random() *
                wordColors.length
            )
        ];


    // ===============================
    // RANDOM INK COLOR
    // ===============================

    const randomInk =
        wordColors[
            Math.floor(
                Math.random() *
                wordColors.length
            )
        ];


    // Correct answer is INK color

    currentCorrectColor =
        randomInk;


    // ===============================
    // DISPLAY VIRTUAL AR OBJECT
    // ===============================

    word.innerText =
        colorWords[randomWord];


    word.style.color =
        colors[randomInk];


    circle.style.background =
        colors[randomInk];


    // ===============================
    // START REACTION TIMER
    // ===============================

    trialStartTime =
        performance.now();

}


// ==========================================
// USER ANSWER
// ==========================================

answerButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                const selectedColor =
                    button.dataset.color;


                // ==========================
                // REACTION TIME
                // ==========================

                const reactionTime =
                    (
                        performance.now()
                        -
                        trialStartTime
                    ) / 1000;


                reactionTimes.push(
                    reactionTime
                );


                // ==========================
                // CHECK ANSWER
                // ==========================

                if (
                    selectedColor ===
                    currentCorrectColor
                ) {

                    correctAnswers++;


                    feedback.innerText =
                        "✅ Correct!";

                }

                else {

                    feedback.innerText =
                        "❌ Incorrect!";

                }


                // ==========================
                // CHANGE COMPONENT
                // ==========================

                setTimeout(
                    () => {

                        nextTrial();

                    },

                    700
                );

            }
        );

    }
);


// ==========================================
// FINISH TEST
// ==========================================

function finishTest() {


    testScreen.style.display =
        "none";


    resultScreen.style.display =
        "block";


    // ===============================
    // ACCURACY
    // ===============================

    const accuracy =
        (
            correctAnswers /
            totalTrials
        ) * 100;


    // ===============================
    // AVERAGE REACTION TIME
    // ===============================

    const totalReactionTime =
        reactionTimes.reduce(
            (sum, value) =>
                sum + value,
            0
        );


    const averageReactionTime =
        totalReactionTime /
        reactionTimes.length;


    // ===============================
    // DISPLAY RESULTS
    // ===============================

    finalAccuracy.innerText =
        `Accuracy: ${accuracy.toFixed(0)}%`;


    finalTime.innerText =
        `Average Reaction Time: ${averageReactionTime.toFixed(2)} seconds`;


    finalCorrect.innerText =
        `Correct Responses: ${correctAnswers}/${totalTrials}`;

}


// ==========================================
// RESTART
// ==========================================

restartButton.addEventListener(
    "click",
    () => {

        resultScreen.style.display =
            "none";

        testScreen.style.display =
            "block";

        startTest();

    }
);


// ==========================================
// START BUTTON
// ==========================================

startButton.addEventListener(
    "click",
    startCamera
);