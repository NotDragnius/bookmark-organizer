// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'https://lzulkhmjjmofcizazdxk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_On2i52EToTlED7YhBp5HCg_VYfvFJiG';

// Ensure the supabase client object is available globally
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- GLOBAL STATE ---
let currentUser = null;

function checkAuth() {
    const userJson = localStorage.getItem('sifted_test_user');
    if (userJson) {
        currentUser = JSON.parse(userJson);
        document.body.classList.add('logged-in');
        
        // Update landing CTA if user is logged in
        const ctaBtn = document.getElementById('landing-cta');
        if (ctaBtn) {
            ctaBtn.textContent = 'Go to Dashboard';
            ctaBtn.href = '#dashboard';
        }
        return true;
    } else {
        currentUser = null;
        document.body.classList.remove('logged-in');
        
        const ctaBtn = document.getElementById('landing-cta');
        if (ctaBtn) {
            ctaBtn.textContent = 'Start Triaging Now';
            ctaBtn.href = '#signup';
        }
        return false;
    }
}


// --- SPA ROUTER ---
const router = () => {
    let hash = window.location.hash || '#landing';
    
    // Auth guards
    const isAuth = checkAuth();
    if (!isAuth && ['#dashboard', '#gallery', '#setup'].includes(hash)) {
        window.location.hash = '#login';
        return;
    }
    if (isAuth && ['#login', '#signup'].includes(hash)) {
        window.location.hash = '#dashboard';
        return;
    }

    // Hide all sections, show active
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    const activeSection = document.querySelector(hash);
    if (activeSection) {
        activeSection.classList.add('active');
    } else {
        // Fallback
        document.querySelector('#landing').classList.add('active');
        window.location.hash = '#landing';
    }

    // Unmount / Mount logic
    if (hash === '#dashboard') initDashboard();
    if (hash === '#gallery') initGallery();
    if (hash === '#setup') initSetup();
};

window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
    initAuth();
    initGlobalEvents();
    router();
});


// --- GLOBAL EVENTS ---
function initGlobalEvents() {
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('sifted_test_user');
        window.location.hash = '#landing';
        router();
    });
}


// --- AUTH LOGIC (login.html / signup.html / auth.js) ---
function initAuth() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const errorDiv = document.getElementById('login-error');

            errorDiv.textContent = '';

            // Testing bypass
            const { data, error } = await supabaseClient
                .from('testing_users')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !data) {
                errorDiv.textContent = "Test user not found. Please sign up first.";
            } else {
                localStorage.setItem('sifted_test_user', JSON.stringify({
                    id: data.id,
                    email: data.email
                }));
                window.location.hash = '#setup';
                router();
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const errorDiv = document.getElementById('signup-error');
            const successDiv = document.getElementById('signup-success');

            errorDiv.textContent = '';
            successDiv.textContent = '';

            // Testing bypass
            const { data, error } = await supabaseClient
                .from('testing_users')
                .insert([{ email }])
                .select()
                .single();

            if (error) {
                errorDiv.textContent = error.message;
            } else {
                successDiv.textContent = 'Test User created! Logging in automatically...';
                localStorage.setItem('sifted_test_user', JSON.stringify({
                    id: data.id,
                    email: data.email
                }));
                setTimeout(() => {
                    window.location.hash = '#setup';
                    router();
                }, 1500);
            }
        });
    }
}


// --- SETUP LOGIC (setup.html / setup.js) ---
function initSetup() {
    const EXTENSION_ID = 'pafbjllnljcdmehjfpdcaponeadiglpn';
    const statusText = document.getElementById('handshake-status');
    const downloadBtn = document.getElementById('download-ext');

    // Replace old listener to avoid duplicates if re-injected
    const newBtn = downloadBtn.cloneNode(true);
    downloadBtn.replaceWith(newBtn);

    newBtn.addEventListener('click', (e) => {
        alert("In a real environment, this would download the extension source code or redirect to the Chrome Web Store.");
        tryHandshake();
    });

    async function tryHandshake() {
        if (!window.chrome || !window.chrome.runtime || !window.chrome.runtime.sendMessage) {
            statusText.textContent = "Waiting for extension to be installed...";
            return;
        }

        try {
            window.chrome.runtime.sendMessage(EXTENSION_ID, {
                action: "set_session",
                userId: currentUser.id,
                email: currentUser.email
            }, (response) => {
                if (window.chrome.runtime.lastError) {
                    statusText.textContent = "Extension not found or failed to connect.";
                } else if (response && response.success) {
                    statusText.textContent = "Extension connected successfully! Redirecting...";
                    statusText.style.color = "#10b981"; 
                    setTimeout(() => {
                        window.location.hash = '#dashboard';
                    }, 1500);
                }
            });
        } catch (err) {
            console.error("Handshake error", err);
        }
    }

    setTimeout(tryHandshake, 500);
}


// --- DASHBOARD LOGIC (dashboard.html / dashboard.js) ---
let dashQueue = [];
let currentBookmark = null;

function initDashboard() {
    dashQueue = [];
    currentBookmark = null;
    dashFetchQueue();
    setupDashboardEvents();
    setupPresetTags();
}

let dashEventsSetup = false;
function setupDashboardEvents() {
    if(dashEventsSetup) return;
    dashEventsSetup = true;

    const tagInput = document.getElementById('add-tag');
    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = tagInput.value.trim();
            if (val && currentBookmark) {
                if (!currentBookmark.tags) currentBookmark.tags = [];
                currentBookmark.tags.push(val);
                renderDashTags(currentBookmark.tags);
                tagInput.value = '';
            }
        }
    });

    document.getElementById('btn-skip').addEventListener('click', () => {
        if (!currentBookmark) return;
        const item = dashQueue.shift();
        dashQueue.push(item);
        dashShowNext();
    });

    document.getElementById('btn-confirm').addEventListener('click', async () => {
        if (!currentBookmark) return;
        const updatedSummary = document.getElementById('b-summary').value;
        const updatedTags = currentBookmark.tags || [];

        const item = dashQueue.shift();
        dashShowNext();

        const { error } = await supabaseClient
            .from('bookmarks')
            .update({
                status: 'sorted',
                ai_summary: updatedSummary,
                tags: updatedTags
            })
            .eq('id', item.id);

        if (error) console.error('Failed to update bookmark', error);
    });

    document.getElementById('btn-post').addEventListener('click', async () => {
        if (!currentBookmark) return;
        const updatedSummary = document.getElementById('b-summary').value;
        const updatedTags = currentBookmark.tags || [];

        const item = dashQueue.shift();
        dashShowNext(); 

        await supabaseClient.from('bookmarks').update({ status: 'sorted', ai_summary: updatedSummary, tags: updatedTags }).eq('id', item.id);

        const { error } = await supabaseClient.from('community_posts').insert({
            author_id: currentUser.id,
            url: item.url,
            title: item.title,
            description: updatedSummary,
            tags: updatedTags,
            likes: 0
        });

        if (error) console.error('Failed to share to community', error);
    });
}

function setupPresetTags() {
    const presetTagsEl = document.getElementById('preset-tags');
    if(presetTagsEl.children.length > 0) return; // already populated

    const presetTags = ['Video', 'Article', 'Tutorial', 'Game', 'Idea', 'Tool', 'Inspiration'];
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
                if (!currentBookmark.tags.some(t => t.toLowerCase() === tag.toLowerCase())) {
                    currentBookmark.tags.push(tag);
                    renderDashTags(currentBookmark.tags);
                }
            }
        };
        presetTagsEl.appendChild(btn);
    });
}

async function dashFetchQueue() {
    const loadingEl = document.getElementById('dash-loading');
    const emptyStateEl = document.getElementById('dash-empty-state');
    const cardEl = document.getElementById('triage-card');

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
        return;
    }

    dashQueue = data || [];
    dashShowNext();
}

function dashShowNext() {
    const cardEl = document.getElementById('triage-card');
    const emptyStateEl = document.getElementById('dash-empty-state');
    const uiTitle = document.getElementById('b-title');
    const uiUrl = document.getElementById('b-url');
    const uiDate = document.getElementById('b-date');
    const uiSummary = document.getElementById('b-summary');
    const uiIcon = document.getElementById('b-icon');

    if (dashQueue.length === 0) {
        currentBookmark = null;
        cardEl.style.display = 'none';
        emptyStateEl.style.display = 'block';
        return;
    }

    currentBookmark = dashQueue[0];

    uiTitle.textContent = currentBookmark.title || 'Untitled Bookmark';
    uiUrl.href = currentBookmark.url;
    uiDate.textContent = new Date(currentBookmark.created_at).toLocaleDateString();
    uiSummary.value = currentBookmark.ai_summary || '';

    let domain = '';
    try { domain = new URL(currentBookmark.url).hostname; } catch (e) { }
    const iconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
    
    if (iconUrl) {
        uiIcon.src = iconUrl;
        uiIcon.style.display = 'block';
    } else {
        uiIcon.style.display = 'none';
    }

    renderDashTags(currentBookmark.tags || []);

    emptyStateEl.style.display = 'none';
    cardEl.style.display = 'flex';
}

function renderDashTags(tags) {
    const uiTags = document.getElementById('b-tags');
    uiTags.innerHTML = '';
    tags.forEach((tag, index) => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag dismissible';
        tagEl.textContent = tag;
        tagEl.onclick = () => {
            currentBookmark.tags.splice(index, 1);
            renderDashTags(currentBookmark.tags);
        };
        uiTags.appendChild(tagEl);
    });
}


// --- GALLERY LOGIC (gallery.html / gallery.js) ---
let allBookmarks = [];

function initGallery() {
    setupGalleryEvents();
    fetchLibrary();
}

let galleryEventsSetup = false;
function setupGalleryEvents() {
    if(galleryEventsSetup) return;
    galleryEventsSetup = true;

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();

        if (!term) {
            renderGalleryGrid(allBookmarks);
            return;
        }

        const filtered = allBookmarks.filter(bm => {
            const titleMatch = (bm.title || '').toLowerCase().includes(term);
            const summaryMatch = (bm.ai_summary || '').toLowerCase().includes(term);

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

        renderGalleryGrid(filtered);
    });
}

async function fetchLibrary() {
    const loadingEl = document.getElementById('gallery-loading');
    const gridEl = document.getElementById('bookmarks-grid');
    const emptyStateEl = document.getElementById('gallery-empty-state');

    loadingEl.style.display = 'block';
    gridEl.style.display = 'none';
    emptyStateEl.style.display = 'none';

    const { data, error } = await supabaseClient
        .from('bookmarks')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('status', 'sorted')
        .order('created_at', { ascending: false });

    loadingEl.style.display = 'none';

    if (error) {
        console.error('Error fetching library', error);
        return;
    }

    allBookmarks = data || [];
    renderGalleryGrid(allBookmarks);
}

function renderGalleryGrid(bookmarks) {
    const gridEl = document.getElementById('bookmarks-grid');
    const emptyStateEl = document.getElementById('gallery-empty-state');

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
