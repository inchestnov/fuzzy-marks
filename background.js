// FIXME: fix deprecated
chrome.commands.onCommand.addListener((command) => {
    if (command === "open_bookmarks_navigator") {
        chrome.action.openPopup();
    }
})