const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let isAutoRunning = false;
let isEmergency = false;
let urlChanged;

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
    if (isEmergency) return;
    logger("OCR is working");
    const words = [];
    const allInputs = document.querySelectorAll('input.danw.dinline[type="text"]');
    let index = 0;
    const worker = await Tesseract.createWorker("eng", 1, {
        corePath: chrome.runtime.getURL('lib/tesseract-core.wasm.js'),
        workerPath: chrome.runtime.getURL('lib/worker.min.js'),
        langPath: chrome.runtime.getURL('lib/traineddata/')
    });
    
    for (const input of allInputs) {
        if (isEmergency) return;
        index++;
        const backgroundStyle = input.style.backgroundImage;

        if (backgroundStyle && backgroundStyle.startsWith('url("data:image/png;base64,')) {
            const base64Image = backgroundStyle.slice(27, -2);

            try {
                const { data: { text } } = await worker.recognize(`data:image/png;base64,${base64Image}`);
                let temp = text.trim();
                if (temp == "Cc") temp = "C";
                words.push(temp);
                logger("Input number " + index + " filled with text: " + temp);
            } catch (error) {
                logger("Cannot OCR place number " + index);
                words.push("error");
            }
        } else {
            logger("Place number " + index + " is not base64 image type");
            words.push("error");
        }
    }
    await worker.terminate();
    return words;
}

async function fillInputsWithWords(words) {
    const inputs = document.querySelectorAll('input.danw.dinline[type="text"]');
    inputs.forEach((input, index) => {
        input.value = words[index] || "";
    });
    logger("Filled with answer");
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

async function textTask(isdelay) {
    await fillInputsWithText();
    if (isEmergency || urlChanged == true) return;
    await delay(3000);
    await clickButton("button.btn.btn-info.dnut", "complete");
    if (isEmergency || urlChanged == true) return;
    if (isdelay) {
        await delay(9000);
        logger("We are still running");
        await delay(9000);
        logger("We are still running");
        await delay(9000);
        logger("We are still running");
    }
    await clickButton("button.btn.btn-danger.dnut", "answer");
    if (isEmergency || urlChanged == true) return;
    await delay(3000);
    const words = await performOCR();
    if (isEmergency || urlChanged == true) return;
    await delay(3000);
    await clickButton("button.btn.dnut.btn-primary", "retry");
    if (isEmergency || urlChanged == true) return;
    await delay(2000);
    await fillInputsWithWords(words);
    if (isEmergency || urlChanged == true) return;
    await delay(3000);
    await clickButton("button.btn.btn-info.dnut", "complete");
}

async function multichoiceTask() {
    if (isEmergency || urlChanged == true) return;
    const questions = document.querySelectorAll('.ques');
    if (!questions) {
        logger("Cannot found question!");
        return;
    }

    for (const question of questions) {
        if (isEmergency || urlChanged == true) return;
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
        await delay(160);
    }

    await clickButton("button.btn.btn-info.dnut", "complete");
    if (isEmergency || urlChanged == true) return;
    await delay(3000);

    let allGreen = false;
    let checkedtime = 0;

    while (!allGreen) {
        if (isEmergency || urlChanged == true) return;
        allGreen = true;
        checkedtime++;
        let prechecked = false;

        for (let question of questions) {
            if (isEmergency || urlChanged == true) return;
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
                if (isEmergency || urlChanged == true) return;
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
            await delay(160);
            if (!prechecked && (checkedtime >= options.length)) {
                checkedtime = 0;
                prechecked = true;
            }
        }

        await clickButton("button.btn.btn-info.dnut", "complete");
        if (isEmergency || urlChanged == true) return;
        await delay(3000);
    }
}

async function vocabTask() {
    if (isEmergency || urlChanged == true) return;
    const rows = document.querySelectorAll('.row');
    
    for (const row of rows) {
        if (isEmergency || urlChanged == true) return;
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
    if (isEmergency || urlChanged == true) return;
    const qidContainers = document.querySelectorAll('[id^="qid"]');
    
    for (const qidx of qidContainers) {
        if (isEmergency || urlChanged == true) return;
        const dansElements = qidx.querySelectorAll(".dans");
        await delay(2000);
    
        for (const dans of dansElements) {
            if (isEmergency || urlChanged == true) return;
            const dtitle = dans.querySelector('.dtitle');
            dtitle.click();
            await delay(1000);
            if (dans.style.border !== '1px dotted red') {
                await delay(5000);
                break;
            }
        }
    }
}

async function checkPopup() {
    const skipbutton = document.querySelector(".button.btn.btn-secondary");
    if (skipbutton) {/*
        notify("A weird popup appear, extension stopped..." +
               "\nWe tried to close it but you still need to check by yourself", "A wild popup appear");*/
        logger("Stopped by popup");
        return true;
    }
    await delay(1000);
    return false;
}

async function logger(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp} - ${message}`;

    // Save the log to chrome storage
    chrome.storage.local.get({ logs: [] }, async (data) => {
        const logs = data.logs || [];
        if (!logs.includes(logEntry)) { // Avoid duplicate logs
            logs.push(logEntry);
            await chrome.storage.local.set({ logs: logs });
        }

        // Send log to popup
        window.postMessage({ type: "LOG", message: logEntry }, "*");
    });
}

function notify(message, title) {
    chrome.notifications.create({
        type: 'basic',
        title: `${title}`,
        message: `${message}`
    });
}

function checkSuccess(timeout) {
    urlChanged = false;
    let currentPage = location.href;
    let localtimeout = timeout;
    const checkInterval = setInterval(() => {
        localtimeout -= 500;
        if (location.href != currentPage) {
            clearInterval(checkInterval);
            logger("Web url changed");
            urlChanged = true;
            return;
        }
        if (localtimeout <= 0) {
            clearInterval(checkInterval);
            logger("Timed out");
            return;
        }
    }, 500);
}     

async function start() {
    if (isAutoRunning) {
        logger("Dupplicate calling detected!");
        return;
    }
    if (isEmergency) return;
    await delay(2000);
    isAutoRunning = true;
    while (isAutoRunning) {
        checkSuccess(160000);
        if (isEmergency) return;
        let hasPopup = await checkPopup();
        if (hasPopup) {
            await stop();
        }
        if (isEmergency) return;
        let type = await checkType();
        if (isEmergency) return;
        if (type == 1) await textTask(true);
        else if (type == 2) await multichoiceTask();
        else if (type == 3) await vocabTask();
        else if (type == 4) await chooseWordTask();
        else if (type == 0) {
            logger("Unsupported question type, manual work required");
            await stop();
        }
        if (isEmergency) return;
        await delay(6100);
        if (urlChanged != true) {
            logger("We failed to continue");
            return;
        }
        logger("A task completed");
        await delay(4444);
    }
    return;
}

async function stop() {
    isAutoRunning = false;
    await delay(30000);
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
        if (isEmergency) return;
        if (hasPopup) return;
        let type = await checkType();
        if (isEmergency) return;
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
        logger("Log cleared");
    }
    
    if (event.data.type === "EMERGENCY") {
        logger("Emergency case");
        isEmergency = true;
        isRunFinished = true;
        isAutoRunning = false;
        await delay(10000);
        isEmergency = false;
    }
});
