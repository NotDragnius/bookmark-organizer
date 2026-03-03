document.addEventListener('DOMContentLoaded', async () => {
    // Testing Auth Check
    const userJson = localStorage.getItem('sifted_test_user');

    if (!userJson) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userJson);

    const EXTENSION_ID = 'pafbjllnljcdmehjfpdcaponeadiglpn'; // Must be filled after extension is loaded to Chrome
    const statusText = document.getElementById('handshake-status');
    const downloadBtn = document.getElementById('download-ext');

    downloadBtn.addEventListener('click', (e) => {
        // Here we'd typically link to a .zip or store page
        alert("In a real environment, this would download the extension source code or redirect to the Chrome Web Store.");
        // Try handshake anyway just to test if locally installed
        tryHandshake();
    });

    // Try auto-handshake
    async function tryHandshake() {
        if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
            statusText.textContent = "Waiting for extension to be installed...";
            return;
        }

        try {
            chrome.runtime.sendMessage(EXTENSION_ID, {
                action: "set_session",
                userId: user.id,
                email: user.email
            }, (response) => {
                if (chrome.runtime.lastError) {
                    statusText.textContent = "Extension not found or failed to connect.";
                } else if (response && response.success) {
                    statusText.textContent = "Extension connected successfully! Redirecting...";
                    statusText.style.color = "#10b981"; // Success green green
                    setTimeout(() => window.location.href = 'dashboard.html', 1500);
                }
            });
        } catch (err) {
            console.error("Handshake error", err);
        }
    }

    // Attempt immediately in case already installed
    setTimeout(tryHandshake, 500);
});
