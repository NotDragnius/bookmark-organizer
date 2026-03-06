document.addEventListener('DOMContentLoaded', () => {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const userInfo = document.getElementById('user-info');
    const loginBtn = document.getElementById('login-btn');

    chrome.storage.local.get(['userId', 'email'], (data) => {
        if (data.userId) {
            statusDot.className = 'status-indicator status-green';
            statusText.textContent = 'Connected';
            userInfo.textContent = `Logged in as: ${data.email || 'User'}`;
            loginBtn.textContent = 'Go to Dashboard';
            loginBtn.href = "https://notdragnius.github.io/bookmark-organizer/#dashboard";
        } else {
            statusDot.className = 'status-indicator status-red';
            statusText.textContent = 'Disconnected';
            userInfo.textContent = 'Log in via the web dashboard to sync your session.';
            loginBtn.textContent = 'Log In';
            loginBtn.href = "https://notdragnius.github.io/bookmark-organizer/#login";
        }
    });
});
