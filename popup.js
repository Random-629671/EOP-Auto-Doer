const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Start automation
document.getElementById("start-button").addEventListener("click", async () => {
    addLogEntry("Start button clicked.");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => window.postMessage({ type: "START_AUTOMATION" }, "*")
    });
});

// One-click automation
document.getElementById("one-click").addEventListener("click", async () => {
    addLogEntry("One-click started.");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => window.postMessage({ type: "ONE_CLICK" }, "*")
    });
});

// Stop automation
document.getElementById("stop").addEventListener("click", async () => {
    addLogEntry("Stop button clicked.");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => window.postMessage({ type: "STOP" }, "*")
    });
});

document.getElementById("emergency").addEventListener("click", async () => {
    addLogEntry("EMERGENCY STOPPING.");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => window.postMessage({ type: "EMERGENCY" }, "*")
    });
});

const logContainer = document.getElementById('log-container');
const logs = new Set(); // Use a Set to avoid duplicates

function addLogEntry(message) {
    if (!logs.has(message)) { // Check if the log is already present
        logs.add(message); // Add to the set

        const logEntry = document.createElement('div');
        logEntry.textContent = message;
        logContainer.prepend(logEntry);
    }
}

document.getElementById("clear").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: async () => {
            window.postMessage({ type: "CLEAR" }, "*");
        }
    });
    
    // Clear the displayed logs
    logContainer.innerHTML = '';
    logs.clear(); // Reset the Set used for log entries
});

// Listen for messages from the content script
window.addEventListener("message", (event) => {
    if (event.data.type === "LOG") {
        addLogEntry(event.data.message); // Add log entry from the content script
    }
});

// Fetch existing logs from local storage when the popup opens
document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get({ logs: [] }, (data) => {
        data.logs.forEach(log => addLogEntry(log));
    });
});

// Optional: To keep updating the log display every few seconds
setInterval(() => {
    chrome.storage.local.get({ logs: [] }, (data) => {
        data.logs.reverse().forEach(log => addLogEntry(log)); // This should still be unique due to the Set
    });
}, 100);
