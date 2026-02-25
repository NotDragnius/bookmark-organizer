// Listener for messages from your external website
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.action === "get_queue") {
        handleGetQueue(sendResponse);
        return true; // Keep channel open for async response
    }
    if (request.action === "move_bookmark") {
        handleMove(request.id, request.category, sendResponse);
        return true;
    }
});

async function handleGetQueue(sendResponse) {
    const folders = await chrome.bookmarks.search({ title: "To Sort" });
    const toSortFolder = folders.find(f => !f.url);
    if (!toSortFolder) {
        sendResponse({ error: "To Sort folder not found" });
        return;
    }
    const children = await chrome.bookmarks.getChildren(toSortFolder.id);
    sendResponse({ bookmarks: children.filter(c => c.url) });
}

async function handleMove(bookmarkId, category, sendResponse) {
    const results = await chrome.bookmarks.search({ title: category });
    let targetFolder = results.find(f => !f.url);
    
    if (!targetFolder) {
        targetFolder = await chrome.bookmarks.create({ parentId: '2', title: category });
    }
    
    await chrome.bookmarks.move(bookmarkId, { parentId: targetFolder.id });
    sendResponse({ success: true });
}