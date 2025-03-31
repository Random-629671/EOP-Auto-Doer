const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let isAutoRunning = false;
let isEmergency = false;
let urlChanged;

async function fillInputsWithText(text = "luv u") {
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
    console.log("Init worker");
    const worker = await Tesseract.createWorker("eng", {
        corePath: chrome.runtime.getURL('lib/tesseract-core.wasm.js'),
        workerPath: chrome.runtime.getURL('lib/worker.min.js'),
        langPath: chrome.runtime.getURL('lib/traineddata/')
    });

    console.log("Set param");
    await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'-., /?!",
        user_defined_dpi: 400,
        tessedit_pageseg_mode: 7,
    });
    
    for (const input of allInputs) {
        if (isEmergency) return;
        index++;
        console.log("Processing input", index);
        const backgroundStyle = input.style.backgroundImage;

        if (backgroundStyle && backgroundStyle.startsWith('url("data:image/png;base64,')) {
            const base64Image = backgroundStyle.slice(27, -2);
            const preprocessImage = await preprocess(base64Image);

            try {
                const { data: { text } } = await worker.recognize(preprocessImage);
                let temp = text.trim();
                
                //temp fix for OCR error
                if (temp) {
                    switch (temp) {
                        case "Cc": 
                            temp = "C";
                            break;
                        case "Itis":
                            temp = "It is";
                            break;
                        default:
                            break;
                    }
                }
                
                words.push(temp);
                logger("Input number " + index + " filled with text: " + temp);
                await delay(160);
            } catch (error) {
                logger("Cannot OCR place number " + index);
                words.push("error");
                logger(error);
            }
        } else {
            logger("Place number " + index + " is not base64 image type");
            words.push("error");
        }
    }
    await worker.terminate();
    return words;
}

async function preprocess(base64) {
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.src = `data:image/png;base64,${base64}`;
        img.onload = function () {
            let canvas = document.createElement("canvas");
            let ctx = canvas.getContext("2d");

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let pixel = imageData.data;
            let width = canvas.width;
            let height = canvas.height;

            for (let i = 0; i < pixel.length; i ++) {
                pixel[i] += 10;
            }

            ctx.putImageData(imageData, 0, 0);

            let gapThreshold = 3;
            let extraSpacing = 5;
            let columnIsEmpty = new Array(width).fill(true);

            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    let index = (y * width + x) * 4;
                    if (pixel[index] === 0) {
                        columnIsEmpty[x] = false;
                        break;
                    }
                }
            }

            let newCanvas = document.createElement("canvas");
            let newCtx = newCanvas.getContext("2d");

            let newWidth = width;
            let extraColumns = [];
            for (let x = 0; x < width; x++) {
                if (columnIsEmpty[x]) {
                    let gapSize = 0;
                    while (x + gapSize < width && columnIsEmpty[x + gapSize]) {
                        gapSize++;
                    }
                    if (gapSize >= gapThreshold) {
                        extraColumns.push({ x, size: extraSpacing });
                        newWidth += extraSpacing;
                    }
                    x += gapSize - 1;
                }
            }

            newCanvas.width = newWidth;
            newCanvas.height = height;

            let newX = 0;
            for (let x = 0; x < width; x++) {
                if (extraColumns.some(col => col.x === x)) {
                    newX += extraSpacing;
                }
                newCtx.drawImage(canvas, x, 0, 1, height, newX, 0, 1, height);
                newX++;
            }

            let oldData = newCanvas.toDataURL(base64);
            console.log(oldData);
            let processedData = newCanvas.toDataURL("image/png");
            console.log(processedData);
            console.log("Preprocessing success!");

            resolve(processedData);
        };

        img.onerror = function () {
            console.log("Image failed to load.");
            reject("Image failed to load");
        };
    });
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
    const captchabutton = document.querySelector(".fa.fa-close");
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
        logger("Dupplicate calling detected! Returning...");
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
            logger("We failed to continue. Please do it by yourself in 10 secs!");
            await delay(10000);
            if (urlChanged != true) {
                isAutoRunning = false;
                return;
            }
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
        urlChanged = false;
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
        logger("Emergency completed");
    }
});
