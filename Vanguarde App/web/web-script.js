const EXTENSION_ID = "PASTE_YOUR_EXTENSION_ID_HERE";
let queue = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchQueue();
    document.getElementById('confirm-btn').addEventListener('click', handleConfirm);
    document.getElementById('skip-btn').addEventListener('click', () => {
        queue.push(queue.shift());
        updateUI();
    });
});

function fetchQueue() {
    chrome.runtime.sendMessage(EXTENSION_ID, { action: "get_queue" }, (response) => {
        if (response && response.bookmarks) {
            queue = response.bookmarks;
            updateUI();
        } else {
            document.getElementById('bookmark-title').innerText = "Extension Not Connected";
        }
    });
}

function updateUI() {
    if (queue.length === 0) return;
    const item = queue[0];
    document.getElementById('count-remaining').innerText = queue.length;
    document.getElementById('bookmark-title').innerText = item.title;
    document.getElementById('bookmark-url').innerText = item.url;
    document.getElementById('bookmark-icon').src = `https://www.google.com/s2/favicons?domain=${item.url}&sz=64`;
    const category = suggestCategory(item.url, item.title);
    document.getElementById('tag-suggestions').innerHTML = `<span class="tag">📁 ${category}</span>`;
}

function suggestCategory(url, title) {
    const text = (url + title).toLowerCase();
    if (url.includes("youtube.com")) return "Video";
    if (text.includes("github") || text.includes("code")) return "Dev";
    return "Misc";
}

function handleConfirm() {
    const item = queue[0];
    const category = suggestCategory(item.url, item.title);
    chrome.runtime.sendMessage(EXTENSION_ID, { 
        action: "move_bookmark", 
        id: item.id, 
        category: category 
    }, (response) => {
        if (response.success) {
            queue.shift();
            updateUI();
        }
    });
}