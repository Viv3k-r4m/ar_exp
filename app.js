let currentSequence = "";
let startTime = 0;

const startButton = document.getElementById("startButton");
const submitButton = document.getElementById("submitButton");

const sequence = document.getElementById("sequence");
const answer = document.getElementById("answer");
const result = document.getElementById("result");
const instruction = document.getElementById("instruction");

const marker = document.getElementById("hiroMarker");


// ================================
// MARKER DETECTION
// ================================

marker.addEventListener("markerFound", function () {

    instruction.innerText =
        "✅ Marker detected! You can start the test.";

    sequence.innerText =
        "Ready";

});


marker.addEventListener("markerLost", function () {

    instruction.innerText =
        "📷 Point the camera at the Hiro marker.";

    sequence.innerText =
        "Waiting for marker...";

});


// ================================
// RANDOM MEMORY SEQUENCE
// ================================

function generateSequence(length = 5) {

    let value = "";

    for (let i = 0; i < length; i++) {

        value += Math.floor(Math.random() * 10);

    }

    return value;
}


// ================================
// START TEST
// ================================

startButton.addEventListener("click", function () {

    currentSequence = generateSequence(5);

    answer.value = "";

    result.innerHTML = "";

    sequence.innerText = currentSequence;

    instruction.innerText =
        "🧠 Memorize the sequence!";


    // Show sequence for 3 seconds

    setTimeout(function () {

        sequence.innerText = "?????";

        instruction.innerText =
            "Enter the sequence you remember.";

        startTime = performance.now();

    }, 3000);

});


// ================================
// SUBMIT ANSWER
// ================================

submitButton.addEventListener("click", function () {

    const userAnswer =
        answer.value.trim();

    if (currentSequence === "") {

        result.innerText =
            "Start the memory test first.";

        return;

    }


    const reactionTime =
        ((performance.now() - startTime) / 1000)
        .toFixed(2);


    if (userAnswer === currentSequence) {

        result.innerHTML =
            "✅ Correct!<br>" +
            "Reaction Time: " +
            reactionTime +
            " seconds";

    }

    else {

        result.innerHTML =
            "❌ Incorrect!<br>" +
            "Correct sequence: " +
            currentSequence +
            "<br>" +
            "Reaction Time: " +
            reactionTime +
            " seconds";

    }

});