const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let isAutoRunning = false;
let isRunFinished = false;

async function fillInputsWithText(text = "a") {
    const inputs = document.querySelectorAll('input.danw.dinline[type="text"]:not([disabled])');
    let numofinput = 0;
    inputs.forEach(input => {
        numofinput++;
        input.value = text;
    });
    logger("Found " + numofinput + " input(s).");
}

async function clickButton(selector, buttonname) {
    const button = document.querySelector(selector);
    if (button) {
        button.click();
        logger("Clicked \"" + buttonname + "\" button!");
    } else {
        logger("Button " + buttonname + " not found!");
    }
}

async function performOCR() {
    const words = [];
    const allInputs = document.querySelectorAll('input.danw.dinline[type="text"]');
    let index = 0;
    
    for (const input of allInputs) {
        index++;
        const backgroundStyle = input.style.backgroundImage;

        if (backgroundStyle && backgroundStyle.startsWith('url("data:image/png;base64,')) {
            const base64Image = backgroundStyle.slice(27, -2);

            try {
                const result = await Tesseract.recognize(`data:image/png;base64,${base64Image}`, 'eng');
                const text = result.data.text.trim();
                words.push(text);
            } catch (error) {
                logger("Cannot OCR place number " + index);
                words.push("");
            }
        } else {
            logger("Place number " + index + " is not base64 image type");
            words.push("");
        }
    }
    return words;
}

async function fillInputsWithWords(words) {
    const inputs = document.querySelectorAll('input.danw.dinline[type="text"]');
    inputs.forEach((input, index) => {
        input.value = words[index] || "";
    });
    logger("Filled with answer");
}

async function textTask(isdelay) {
    await fillInputsWithText();
    await delay(3000);
    await clickButton("button.btn.btn-info.dnut", "complete")
    if (isdelay) await delay(30000);
    await clickButton("button.btn.btn-danger.dnut", "answer")
    await delay(3000);
    const words = await performOCR();
    await delay(3000);
    await clickButton("button.btn.dnut.btn-primary", "retry")
    await delay(2000);
    await fillInputsWithWords(words);
    await delay(3000);
    await clickButton("button.btn.btn-info.dnut", "complete");
}

async function multichoiceTask() {
    const questions = document.querySelectorAll('.ques');
    if (!questions) {
        logger("Cannot found question!");
        return;
    }

    for (const question of questions) {
        const options = question.querySelectorAll('.dchk');
        if (!options) {
            logger("Found question but cannot found choice!");
            return;
        }
        const firstOption = options[0];
        if (firstOption) {
            const clickableElement = firstOption.querySelector('label');
            if (clickableElement) {
                clickableElement.click();
            }
        }
    }

    await clickButton("button.btn.btn-info.dnut", "complete");
    await delay(3000);

    let allGreen = false;
    let checkedtime = 0;

    while (!allGreen) {
        allGreen = true;
        checkedtime++;
        let prechecked = false;

        for (let question of questions) {
            const options = question.querySelectorAll('.dchk');
            let questionHasRed = false;

            for (let option of options) {
                const label = option.querySelector('label');
                if (label && label.style.color === 'red') {
                    questionHasRed = true;
                    break;
                }
            }

            if (questionHasRed) {
                for (let i = checkedtime; i < options.length; i++) {
                    const nextOption = options[i];
                    const nextClickableElement = nextOption.querySelector('label');
                    if (nextClickableElement) {
                        nextClickableElement.click();
                        break;
                    }
                }
                allGreen = false;
            }
            await delay(1000);
            if (!prechecked && (checkedtime >= options.length)) {
                checkedtime = 0;
                prechecked = true;
            }
        }

        await clickButton("button.btn.btn-info.dnut", "complete");
        await delay(3000);
    }
}

async function vocabTask() {
    const rows = document.querySelectorAll('.row');
    
    for (const row of rows) {
        const audioButtons = row.querySelectorAll('.fa.fa-play-circle.daudio');
        for (const button of audioButtons) {
            button.click();
            await delay(2000); // Wait for the audio to start playing
        }
    }
    
    await delay(4000);
    await clickButton("button.btn.btn-info.dnut", "complete");
}

async function chooseWordTask() {
    console.log("started func");
    const dansElements = document.querySelectorAll('.dans');
    if (dansElements.length === 0) return;
    
    for (const dans of dansElements) {
        const dtitle = dans.querySelector('.dtitle');
        dtitle.click();
        if (!dtitle.style.border === '1px dotted red') {
            await delay(5000);
            chooseWordTask();
            break;
        }
        await delay(5000);
    }
}

async function checkType() {
    if (document.querySelectorAll('input.danw.dinline[type="text"]').length > 0) {
        logger("Text fill task found! Trying to process...");
        return 1;
    } else if (document.querySelectorAll('.dchk').length > 0) {
        logger("Multichoice task found! Trying to process...");
        return 2;
    } else if (document.querySelectorAll('.row').length > 2) {
        logger("Vocabulary task found! Trying to process...");
        return 3;
    } else if (document.querySelectorAll('.dans').length > 1) {
        logger("Choose word task found! Trying to precess...");
        return 4;
    } else if (document.querySelector("button.btn.btn-info.dnut")) {
        logger("Read task found! Skipping...");
        await delay(5000);
        await clickButton("button.btn.btn-info.dnut", "complete");
        return 16;
    } else return 0;
}

async function checkPopup() {
    const skipbutton = document.querySelector("btn btn-secondary");
    if (skipbutton) {/*
        notify("A weird popup appear, extension stopped..." +
               "\nWe tried to close it but you still need to check by yourself", "A wild popup appear");*/
        logger("Stopped by popup");
        return true;
    }
    await delay(1000);
    return false;
}

async function logger(message, time) {
    var currentTime = time;
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp} - ${message}`;

    // Save the log to chrome storage
    chrome.storage.local.get({ logs: [] }, async (data) => {
        var logs = data.logs;
        logs.push(logEntry);
        await chrome.storage.local.set({ logs: logs });
    });

    // Send log to popup
    window.postMessage({ type: "LOG", message: logEntry }, "*");
}

function notify(message, title) {
    chrome.notifications.create({
        type: 'basic',
        title: `${title}`,
        message: `${message}`
    });
}

async function checkSuccess() {
    let currentPage = location.href;
    let webChanged = false;
    for (let i = 0; i < 15; i++) {
        if (currentPage != location.href) {
            currectpage = location.href;
            webChanged = true;
            break;
        }
        await delay(500);
    }
    if (!webChanged) {
        logger("Completed a cycle but web didn't change?!" +
               "Maybe we failed to continue, lagging or something unexpected");
        //notify("Failed to continue", "Failed...");
        return false;
    }
    return true;
}         

async function start() {
    if (isAutoRunning) {
        logger("Dupplicate calling detected!");
        return;
    }
    await delay(2000);
    isAutoRunning = true;
    while (isAutoRunning) {
        isRunFinished = false;
        let hasPopup = await checkPopup();
        if (hasPopup) {
            isRunFinished = true;
            await stop();
        }
        let type = await checkType();
        if (type == 1) await textTask(true);
        else if (type == 2) await multichoiceTask();
        else if (type == 3) await vocabTask();
        else if (type == 4) await chooseWordTask();
        else {
            logger("Unsupported question type, manual work required");
            isRunFinished = true;
            await stop();
        }
        isRunFinished = true;
        let success = await checkSuccess();
        if (!success) await stop();
        await delay(16000);
    }
    return;
}

async function wait() {
    return new Promise(async (resolve) => {
        while(!isRunFinished) {
            if (isRunFinished) resolve();
            await delay(100);
        }
    });
}

async function stop() {
    await delay(1000);
    isAutoRunning = false;
    await wait();
    return;
}

window.addEventListener("message", async (event) => {
    if (event.data.type === "START_AUTOMATION") {
        logger("Running...");
        start();
    }
    
    if (event.data.type === "ONE_CLICK") {
        logger("One-time automation started... " + "Make sure you have passed 30 secs before continue!");
        let hasPopup = await checkPopup();
        if (hasPopup) return;
        let type = await checkType();
        if (type == 1) await textTask(false);
        else if (type == 2) await multichoiceTask();
        else if (type == 3) await vocabTask();
        else if (type == 4) await chooseWordTask();
        else if (type == 0) logger("Unsupported question type, manual work required");
        await delay(1000);
    }
    
    if (event.data.type === "STOP") {
        if (isAutoRunning) {
            logger("Stopping");
            await stop();
            logger("Stopped");
        } else {
            logger("Not running");
        }
    }
    
    if (event.data.type === "CLEAR") {
        await chrome.storage.local.set({ logs: [] });
    }
});