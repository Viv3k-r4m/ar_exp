let currentSequence = "";
let startTime = 0;

const startButton =
    document.getElementById("startButton");

const submitButton =
    document.getElementById("submitButton");

const sequence =
    document.getElementById("sequence");

const answer =
    document.getElementById("answer");

const result =
    document.getElementById("result");

const instruction =
    document.getElementById("instruction");


/*
    Generate random memory sequence
*/

function generateSequence(length = 5) {

    let result = "";

    for (let i = 0; i < length; i++) {

        result += Math.floor(Math.random() * 10);

    }

    return result;
}


/*
    Start cognitive test
*/

startButton.addEventListener("click", () => {

    currentSequence = generateSequence(5);

    answer.value = "";

    result.innerText = "";

    instruction.innerText =
        "Memorize the sequence!";

    sequence.innerText =
        currentSequence;


    /*
        Show sequence for 3 seconds
    */

    setTimeout(() => {

        sequence.innerText =
            "?????";

        instruction.innerText =
            "Enter the sequence you remember.";

        startTime = performance.now();

    }, 3000);

});


/*
    Submit answer
*/

submitButton.addEventListener("click", () => {

    const userAnswer =
        answer.value.trim();

    const reactionTime =
        ((performance.now() - startTime) / 1000)
        .toFixed(2);


    if (userAnswer === currentSequence) {

        result.innerHTML =
            "✅ Correct!<br>" +
            "Reaction Time: " +
            reactionTime +
            " seconds";

    } else {

        result.innerHTML =
            "❌ Incorrect.<br>" +
            "Correct sequence: " +
            currentSequence +
            "<br>" +
            "Reaction Time: " +
            reactionTime +
            " seconds";

    }

});