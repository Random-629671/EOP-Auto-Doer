chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "LOG") {
        chrome.storage.local.get({ logs: [] }, (data) => {
            var logs = data.logs;
            logs.push(request.message);
            chrome.storage.local.set({ logs: logs });
        });
    }
});