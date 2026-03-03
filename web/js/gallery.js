document.addEventListener('DOMContentLoaded', async () => {
    // Testing Auth Check
    const userJson = localStorage.getItem('sifted_test_user');

    if (!userJson) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userJson);

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('sifted_test_user');
        window.location.href = 'index.html';
    });

    let allBookmarks = [];
    const gridEl = document.getElementById('bookmarks-grid');
    const loadingEl = document.getElementById('loading');
    const emptyStateEl = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');

    await fetchLibrary();

    async function fetchLibrary() {
        loadingEl.style.display = 'block';
        gridEl.style.display = 'none';

        const { data, error } = await supabaseClient
            .from('bookmarks')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'sorted')
            .order('created_at', { ascending: false });

        loadingEl.style.display = 'none';

        if (error) {
            console.error('Error fetching library', error);
            return;
        }

        allBookmarks = data || [];
        renderGrid(allBookmarks);
    }

    function renderGrid(bookmarks) {
        gridEl.innerHTML = '';

        if (bookmarks.length === 0) {
            emptyStateEl.style.display = 'block';
            gridEl.style.display = 'none';
            return;
        }

        emptyStateEl.style.display = 'none';
        gridEl.style.display = 'grid';

        bookmarks.forEach(bm => {
            const card = document.createElement('div');
            card.className = 'glass-card gallery-card';

            const tagsHtml = (bm.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
            const dateStr = new Date(bm.created_at).toLocaleDateString();

            let domain = '';
            try { domain = new URL(bm.url).hostname; } catch (e) { }
            const iconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
            const iconHtml = iconUrl ? `<img src="${iconUrl}" class="bookmark-icon" alt="icon">` : '';

            card.innerHTML = `
                <div style="display: flex; flex-direction: column; height: 100%;">
                    <div style="margin-bottom: 1rem;">
                        <a href="${bm.url}" target="_blank" class="bookmark-link">
                            <div class="title-row" style="margin-bottom: 0.5rem;">
                                ${iconHtml}
                                <h3 style="font-size: 1.25rem; margin: 0;">${bm.title || 'Untitled'}</h3>
                            </div>
                        </a>
                        <span class="date-badge">${dateStr}</span>
                    </div>
                    
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem; flex-grow: 1;">
                        ${bm.ai_summary || 'No summary available.'}
                    </p>
                    
                    <div class="tags" style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--surface-border);">
                        ${tagsHtml}
                    </div>
                </div>
            `;
            gridEl.appendChild(card);
        });
    }

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();

        if (!term) {
            renderGrid(allBookmarks);
            return;
        }

        const filtered = allBookmarks.filter(bm => {
            const titleMatch = (bm.title || '').toLowerCase().includes(term);
            const summaryMatch = (bm.ai_summary || '').toLowerCase().includes(term);

            // Defensively handle tags format from DB bounds
            let tagsArray = [];
            if (Array.isArray(bm.tags)) {
                tagsArray = bm.tags;
            } else if (typeof bm.tags === 'string') {
                tagsArray = bm.tags.replace(/^{|}$/g, '').split(',') || [];
            }

            const tagMatch = tagsArray.some(t =>
                t && typeof t === 'string' && t.toLowerCase().includes(term)
            );

            return titleMatch || summaryMatch || tagMatch;
        });

        renderGrid(filtered);
    });
});
