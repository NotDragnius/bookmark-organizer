document.addEventListener('DOMContentLoaded', async () => {
    // Testing Auth Check
    const userJson = localStorage.getItem('sifted_test_user');

    if (!userJson) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userJson);

    // Logout Button
    document.getElementById('logout-btn').addEventListener('click', async () => {
        localStorage.removeItem('sifted_test_user');
        window.location.href = 'index.html';
    });

    // 3. State
    let queue = [];
    let currentBookmark = null;

    // Elements
    const loadingEl = document.getElementById('loading');
    const emptyStateEl = document.getElementById('empty-state');
    const cardEl = document.getElementById('triage-card');

    const uiTitle = document.getElementById('b-title');
    const uiUrl = document.getElementById('b-url');
    const uiDate = document.getElementById('b-date');
    const uiSummary = document.getElementById('b-summary');
    const uiTags = document.getElementById('b-tags');
    const tagInput = document.getElementById('add-tag');

    // Load initial queue
    await fetchQueue();

    async function fetchQueue() {
        loadingEl.style.display = 'block';
        cardEl.style.display = 'none';
        emptyStateEl.style.display = 'none';

        const { data, error } = await supabaseClient
            .from('bookmarks')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        loadingEl.style.display = 'none';

        if (error) {
            console.error('Error fetching bookmarks', error);
            // Show some error state
            return;
        }

        queue = data || [];
        showNext();
    }

    function showNext() {
        if (queue.length === 0) {
            currentBookmark = null;
            cardEl.style.display = 'none';
            emptyStateEl.style.display = 'block';
            return;
        }

        currentBookmark = queue[0];

        uiTitle.textContent = currentBookmark.title || 'Untitled Bookmark';
        uiUrl.href = currentBookmark.url;
        uiDate.textContent = new Date(currentBookmark.created_at).toLocaleDateString();
        uiSummary.value = currentBookmark.ai_summary || '';

        let domain = '';
        try { domain = new URL(currentBookmark.url).hostname; } catch (e) { }
        const iconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
        const uiIcon = document.getElementById('b-icon');
        if (iconUrl) {
            uiIcon.src = iconUrl;
            uiIcon.style.display = 'block';
        } else {
            uiIcon.style.display = 'none';
        }

        renderTags(currentBookmark.tags || []);

        emptyStateEl.style.display = 'none';
        cardEl.style.display = 'flex';
    }

    function renderTags(tags) {
        uiTags.innerHTML = '';
        tags.forEach((tag, index) => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag dismissible';
            tagEl.textContent = tag;
            tagEl.onclick = () => {
                currentBookmark.tags.splice(index, 1);
                renderTags(currentBookmark.tags);
            };
            uiTags.appendChild(tagEl);
        });
    }

    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = tagInput.value.trim();
            if (val && currentBookmark) {
                if (!currentBookmark.tags) currentBookmark.tags = [];
                currentBookmark.tags.push(val);
                renderTags(currentBookmark.tags);
                tagInput.value = '';
            }
        }
    });

    // Render Preset Tags
    const presetTags = ['Video', 'Article', 'Tutorial', 'Game', 'Idea', 'Tool', 'Inspiration'];
    const presetTagsEl = document.getElementById('preset-tags');
    presetTags.forEach((tag) => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.type = 'button';
        btn.style.padding = '0.2rem 0.6rem';
        btn.style.fontSize = '0.8rem';
        btn.textContent = '+ ' + tag;
        btn.onclick = () => {
            if (currentBookmark) {
                if (!currentBookmark.tags) currentBookmark.tags = [];
                // Prevent duplicate tags case-insensitively
                if (!currentBookmark.tags.some(t => t.toLowerCase() === tag.toLowerCase())) {
                    currentBookmark.tags.push(tag);
                    renderTags(currentBookmark.tags);
                }
            }
        };
        presetTagsEl.appendChild(btn);
    });

    // Actions
    document.getElementById('btn-skip').addEventListener('click', () => {
        if (!currentBookmark) return;
        // Move to end of queue without updating DB (so it shows later)
        const item = queue.shift();
        queue.push(item);
        showNext();
    });

    document.getElementById('btn-confirm').addEventListener('click', async () => {
        if (!currentBookmark) return;

        // Save updates and set status to 'sorted'
        const updatedSummary = uiSummary.value;
        const updatedTags = currentBookmark.tags || [];

        // Optimistic UI update
        const item = queue.shift();
        showNext();

        const { error } = await supabaseClient
            .from('bookmarks')
            .update({
                status: 'sorted',
                ai_summary: updatedSummary,
                tags: updatedTags
            })
            .eq('id', item.id);

        if (error) {
            console.error('Failed to update bookmark', error);
            // In a real app, you might want to add it back to the queue or show an error
        }
    });

    document.getElementById('btn-post').addEventListener('click', async () => {
        if (!currentBookmark) return;

        const updatedSummary = uiSummary.value;
        const updatedTags = currentBookmark.tags || [];

        // 1. Set as sorted in private table
        // 2. Create in community table

        const item = queue.shift();
        showNext(); // Optimistic

        await supabaseClient.from('bookmarks').update({ status: 'sorted', ai_summary: updatedSummary, tags: updatedTags }).eq('id', item.id);

        const { error } = await supabaseClient.from('community_posts').insert({
            author_id: user.id,
            url: item.url,
            title: item.title,
            description: updatedSummary,
            tags: updatedTags,
            likes: 0
        });

        if (error) {
            console.error('Failed to share to community', error);
        }
    });
});
