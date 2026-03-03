document.addEventListener('DOMContentLoaded', () => {
    const userJson = localStorage.getItem('sifted_test_user');
    if (userJson) {
        // User is logged in, update the UI
        const nav = document.querySelector('header nav');
        if (nav) {
            nav.style.display = 'flex';
            nav.style.gap = '1rem';
            nav.innerHTML = `
                <a href="dashboard.html" class="btn btn-secondary">Dashboard</a>
                <a href="gallery.html" class="btn btn-primary">My Library</a>
            `;
        }

        const ctaBtn = document.querySelector('.cta-group a');
        if (ctaBtn) {
            ctaBtn.textContent = 'Go to Dashboard';
            ctaBtn.href = 'dashboard.html';
        }
    }
});
