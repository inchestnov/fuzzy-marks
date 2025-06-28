// FIXME: fix deprecated
chrome.commands.onCommand.addListener((command) => {
    if (command === "open_popup") {
        chrome.action.openPopup();
    }
})
