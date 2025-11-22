// Knowledge Base Management

// API helper
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('hal_token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    const response = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    });

    if (response.status === 401) {
        localStorage.removeItem('hal_token');
        window.location.href = '/';
        return;
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

// Check authentication
const token = localStorage.getItem('hal_token');
if (!token) {
    window.location.href = '/';
}

// Get user info
const user = JSON.parse(localStorage.getItem('hal_user'));
document.getElementById('userName').textContent = user.firstName;

// State
let currentBookId = null;
let allBooks = [];
let allNotes = [];
let importData = null;

// Initialize
loadBooks();
loadNotes();
loadTrainingCount();
initTheme();
loadCustomization();
loadSidebarAvatar();
initMobileSidebar();
setupAutoCollapse();

// ========== Books Management ==========

async function loadBooks() {
    try {
        allBooks = await apiCall('/api/knowledge/books');
        renderBooks();
        populateBookFilters();
    } catch (error) {
        console.error('Failed to load books:', error);
    }
}

function renderBooks() {
    const booksDiv = document.getElementById('booksList');

    if (allBooks.length === 0) {
        booksDiv.innerHTML = '<p class="placeholder-sm">No books yet. Create one!</p>';
        return;
    }

    booksDiv.innerHTML = allBooks.map(book => `
        <div class="book-item ${currentBookId === book.id ? 'active' : ''} ${book.markedForTraining ? 'marked-for-training' : ''}"
             onclick="selectBook('${book.id}')">
            <div class="book-info">
                <div class="book-name">${escapeHtml(book.name)}</div>
                <div class="book-count">${book._count.notes} notes</div>
            </div>
            <div class="book-actions" onclick="event.stopPropagation()">
                <button onclick="toggleBookTraining('${book.id}')"
                        class="btn-icon-only ${book.markedForTraining ? 'active' : ''}"
                        title="${book.markedForTraining ? 'Remove from training' : 'Mark for AI training'}">
                    🧠
                </button>
                <button onclick="exportBook('${book.id}')" class="btn-icon-only" title="Export book">📤</button>
                <button onclick="deleteBook('${book.id}')" class="btn-icon-only" title="Delete book">🗑️</button>
            </div>
        </div>
    `).join('');
}

function populateBookFilters() {
    const filterSelect = document.getElementById('bookFilter');
    const editBookSelect = document.getElementById('editNoteBook');

    const bookOptions = allBooks.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('');

    filterSelect.innerHTML = '<option value="">All Books</option>' + bookOptions;
    editBookSelect.innerHTML = '<option value="">No Book (Loose Note)</option>' + bookOptions;
}

function selectBook(bookId) {
    if (currentBookId === bookId) {
        currentBookId = null;
    } else {
        currentBookId = bookId;
    }
    renderBooks();
    filterNotes();
}

function showCreateBookModal() {
    document.getElementById('createBookModal').style.display = 'flex';
    document.getElementById('bookName').value = '';
    document.getElementById('bookDescription').value = '';
    document.getElementById('createBookError').textContent = '';
}

function closeCreateBookModal() {
    document.getElementById('createBookModal').style.display = 'none';
}

document.getElementById('createBookForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('bookName').value.trim();
    const description = document.getElementById('bookDescription').value.trim();
    const errorDiv = document.getElementById('createBookError');

    try {
        await apiCall('/api/knowledge/books', {
            method: 'POST',
            body: JSON.stringify({ name, description }),
        });

        closeCreateBookModal();
        await loadBooks();
        alert('✅ Book created!');
    } catch (error) {
        console.error('Failed to create book:', error);
        errorDiv.textContent = error.message || 'Failed to create book';
    }
});

async function deleteBook(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!confirm(`Delete book "${book.name}"? This will also delete all notes in it.`)) {
        return;
    }

    try {
        await apiCall(`/api/knowledge/books/${bookId}`, {
            method: 'DELETE',
        });

        await loadBooks();
        if (currentBookId === bookId) {
            currentBookId = null;
            loadNotes();
        }
    } catch (error) {
        console.error('Failed to delete book:', error);
        alert('Failed to delete book: ' + error.message);
    }
}

// ========== Notes Management ==========

async function loadNotes() {
    try {
        const bookId = currentBookId || document.getElementById('bookFilter').value;
        const url = bookId ? `/api/knowledge/notes?bookId=${bookId}` : '/api/knowledge/notes';
        allNotes = await apiCall(url);
        renderNotes();

        if (allNotes.length === 0) {
            document.getElementById('welcomeMessage').style.display = 'block';
            document.getElementById('notesList').style.display = 'none';
        } else {
            document.getElementById('welcomeMessage').style.display = 'none';
            document.getElementById('notesList').style.display = 'grid';
        }
    } catch (error) {
        console.error('Failed to load notes:', error);
    }
}

function renderNotes() {
    const notesDiv = document.getElementById('notesList');

    if (allNotes.length === 0) {
        notesDiv.innerHTML = '';
        return;
    }

    notesDiv.innerHTML = allNotes.map(note => `
        <div class="note-card ${note.markedForTraining ? 'marked-for-training' : ''}">
            <div class="note-header">
                <div class="note-title">${note.title ? escapeHtml(note.title) : 'Untitled'}</div>
                <div class="note-actions">
                    <button onclick="toggleNoteTraining('${note.id}')"
                            class="btn-icon-only ${note.markedForTraining ? 'active' : ''}"
                            title="${note.markedForTraining ? 'Remove from training' : 'Mark for AI training'}">
                        🧠
                    </button>
                    <button onclick="editNote('${note.id}')" class="btn-icon-only" title="Edit note">✏️</button>
                    <button onclick="deleteNote('${note.id}')" class="btn-icon-only" title="Delete note">🗑️</button>
                </div>
            </div>
            ${note.note ? `<div class="note-content">${escapeHtml(note.note)}</div>` : ''}
            <div class="note-message">
                <div class="message-role">${note.message.role === 'user' ? 'You' : 'HAL'}:</div>
                <div class="message-text">${formatMessage(note.message.content)}</div>
            </div>
            <div class="note-footer">
                <span class="note-book">${note.book ? '📚 ' + escapeHtml(note.book.name) : '📄 Loose note'}</span>
                <span class="note-date">${new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
    `).join('');
}

function filterNotes() {
    const selectedBookId = document.getElementById('bookFilter').value;
    if (selectedBookId !== currentBookId) {
        currentBookId = selectedBookId || null;
        renderBooks();
    }
    loadNotes();
}

function editNote(noteId) {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;

    document.getElementById('editNoteId').value = note.id;
    document.getElementById('editNoteTitle').value = note.title || '';
    document.getElementById('editNoteContent').value = note.note || '';
    document.getElementById('editNoteBook').value = note.bookId || '';
    document.getElementById('editNoteModal').style.display = 'flex';
}

function closeEditNoteModal() {
    document.getElementById('editNoteModal').style.display = 'none';
}

document.getElementById('editNoteForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const noteId = document.getElementById('editNoteId').value;
    const title = document.getElementById('editNoteTitle').value.trim();
    const note = document.getElementById('editNoteContent').value.trim();
    const bookId = document.getElementById('editNoteBook').value || null;

    try {
        await apiCall(`/api/knowledge/notes/${noteId}`, {
            method: 'PUT',
            body: JSON.stringify({ title, note, bookId }),
        });

        closeEditNoteModal();
        await loadNotes();
    } catch (error) {
        console.error('Failed to update note:', error);
        alert('Failed to update note: ' + error.message);
    }
});

async function deleteNote(noteId) {
    if (!confirm('Delete this note from your Knowledge Base?')) {
        return;
    }

    try {
        await apiCall(`/api/knowledge/notes/${noteId}`, {
            method: 'DELETE',
        });

        await loadNotes();
        await loadTrainingCount();
    } catch (error) {
        console.error('Failed to delete note:', error);
        alert('Failed to delete note: ' + error.message);
    }
}

// ========== Training Markers ==========

async function toggleNoteTraining(noteId) {
    try {
        await apiCall(`/api/knowledge/notes/${noteId}/toggle-training`, {
            method: 'POST',
        });

        await loadNotes();
        await loadTrainingCount();
    } catch (error) {
        console.error('Failed to toggle training mark:', error);
        alert('Failed to toggle training mark');
    }
}

async function toggleBookTraining(bookId) {
    try {
        await apiCall(`/api/knowledge/books/${bookId}/toggle-training`, {
            method: 'POST',
        });

        await loadBooks();
        await loadTrainingCount();
    } catch (error) {
        console.error('Failed to toggle book training mark:', error);
        alert('Failed to toggle training mark');
    }
}

async function loadTrainingCount() {
    try {
        const count = await apiCall('/api/knowledge/training/count');

        if (count.totalSamples > 0) {
            document.getElementById('trainingBadge').style.display = 'flex';
            document.getElementById('trainingCount').textContent = count.totalSamples;
        } else {
            document.getElementById('trainingBadge').style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to load training count:', error);
    }
}

// ========== Search ==========

let searchTimeout = null;

function handleSearchKeyup(event) {
    clearTimeout(searchTimeout);

    if (event.key === 'Enter') {
        performSearch();
        return;
    }

    searchTimeout = setTimeout(() => {
        performSearch();
    }, 500);
}

async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();

    if (!query) {
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('notesList').style.display = allNotes.length > 0 ? 'grid' : 'none';
        document.getElementById('welcomeMessage').style.display = allNotes.length === 0 ? 'block' : 'none';
        return;
    }

    try {
        const results = await apiCall(`/api/knowledge/search?q=${encodeURIComponent(query)}`);

        document.getElementById('notesList').style.display = 'none';
        document.getElementById('welcomeMessage').style.display = 'none';
        document.getElementById('searchResults').style.display = 'block';

        const resultsDiv = document.getElementById('searchResults');

        if (results.length === 0) {
            resultsDiv.innerHTML = '<p class="placeholder">No results found for "' + escapeHtml(query) + '"</p>';
        } else {
            resultsDiv.innerHTML = `
                <h3>Search Results (${results.length})</h3>
                <div class="notes-list">
                    ${results.map(note => `
                        <div class="note-card ${note.markedForTraining ? 'marked-for-training' : ''}">
                            <div class="note-header">
                                <div class="note-title">${note.title ? escapeHtml(note.title) : 'Untitled'}</div>
                                <div class="note-actions">
                                    <button onclick="toggleNoteTraining('${note.id}')"
                                            class="btn-icon-only ${note.markedForTraining ? 'active' : ''}"
                                            title="${note.markedForTraining ? 'Remove from training' : 'Mark for AI training'}">
                                        🧠
                                    </button>
                                </div>
                            </div>
                            ${note.note ? `<div class="note-content">${highlightSearchTerm(escapeHtml(note.note), query)}</div>` : ''}
                            <div class="note-message">
                                <div class="message-role">${note.message.role === 'user' ? 'You' : 'HAL'}:</div>
                                <div class="message-text">${highlightSearchTerm(formatMessage(note.message.content), query)}</div>
                            </div>
                            <div class="note-footer">
                                <span class="note-book">${note.book ? '📚 ' + escapeHtml(note.book.name) : '📄 Loose note'}</span>
                                <span class="note-date">${new Date(note.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Search failed:', error);
    }
}

function highlightSearchTerm(text, term) {
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// ========== Export / Import ==========

async function exportBook(bookId) {
    try {
        const token = localStorage.getItem('hal_token');
        window.open(`/api/knowledge/books/${bookId}/export?token=${token}`, '_blank');
    } catch (error) {
        console.error('Failed to export book:', error);
        alert('Failed to export book');
    }
}

function showImportModal() {
    document.getElementById('importModal').style.display = 'flex';
    document.getElementById('importFile').value = '';
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importError').textContent = '';
    document.getElementById('importBtn').disabled = true;
    importData = null;
}

function closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            importData = JSON.parse(e.target.result);

            // Validate
            if (!importData.version || !importData.book || !importData.notes) {
                throw new Error('Invalid file format');
            }

            // Show preview
            document.getElementById('importBookName').textContent = importData.book.name;
            document.getElementById('importNoteCount').textContent = importData.notes.length;
            document.getElementById('importExportedBy').textContent = importData.exportedBy;
            document.getElementById('importPreview').style.display = 'block';
            document.getElementById('importBtn').disabled = false;
            document.getElementById('importError').textContent = '';
        } catch (error) {
            document.getElementById('importError').textContent = 'Invalid file format';
            document.getElementById('importBtn').disabled = true;
        }
    };
    reader.readAsText(file);
}

async function confirmImport() {
    if (!importData) return;

    try {
        const result = await apiCall('/api/knowledge/books/import', {
            method: 'POST',
            body: JSON.stringify(importData),
        });

        closeImportModal();
        await loadBooks();
        await loadNotes();
        alert(`✅ Imported "${result.book.name}" with ${result.imported} notes!`);
    } catch (error) {
        console.error('Failed to import book:', error);
        document.getElementById('importError').textContent = error.message || 'Failed to import book';
    }
}

// ========== Utilities ==========

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format message with code blocks and inline code
function formatMessage(text) {
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    const parts = formatted.split(/(<pre>[\s\S]*?<\/pre>)/);
    formatted = parts.map((part, i) => {
        if (i % 2 === 0) {
            return part.replace(/\n/g, '<br>');
        }
        return part;
    }).join('');
    return formatted;
}

// ========== Theme & UI ==========

function initTheme() {
    const savedTheme = localStorage.getItem('hal_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.textContent = theme === 'dark' || theme.startsWith('dark-') ? '☀️' : '🌙';
    });
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' || currentTheme.startsWith('dark-') ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('hal_theme', newTheme);
    updateThemeIcon(newTheme);
}

// Load and apply customization
function loadCustomization() {
    const saved = localStorage.getItem('hal_customization');
    if (saved) {
        const customization = JSON.parse(saved);

        // Font family
        if (customization.fontFamily && customization.fontFamily !== 'system') {
            document.body.style.fontFamily = customization.fontFamily;
        }

        // Font size
        const fontSizeScales = [0.9, 1.0, 1.1];
        if (customization.fontSize !== undefined) {
            document.documentElement.style.fontSize = `${fontSizeScales[customization.fontSize] * 16}px`;
        }

        // Accent color
        if (customization.accentColor) {
            document.documentElement.style.setProperty('--primary', customization.accentColor);
            const darkerColor = adjustColorBrightness(customization.accentColor, -20);
            document.documentElement.style.setProperty('--primary-dark', darkerColor);
        }
    }
}

// Helper function to adjust color brightness
function adjustColorBrightness(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

function loadSidebarAvatar() {
    const avatarDiv = document.getElementById('sidebarAvatar');
    const customization = JSON.parse(localStorage.getItem('hal_customization') || '{}');

    // Set avatar content
    if (user.avatar) {
        avatarDiv.innerHTML = `<img src="${user.avatar}" alt="${user.firstName}">`;
    } else {
        avatarDiv.textContent = user.firstName.charAt(0).toUpperCase();
    }

    // Apply border customization
    if (customization.avatarBorderStyle && customization.avatarBorderStyle !== 'none' && customization.avatarBorderWidth > 0) {
        if (customization.avatarBorderStyle === 'gradient') {
            avatarDiv.style.background = 'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)';
            avatarDiv.style.padding = `${customization.avatarBorderWidth}px`;
            avatarDiv.style.border = '';
        } else {
            avatarDiv.style.border = `${customization.avatarBorderWidth}px ${customization.avatarBorderStyle} ${customization.avatarBorderColor || '#2563eb'}`;
            avatarDiv.style.background = '';
            avatarDiv.style.padding = '';
        }
    }
}

// ========== Mobile Sidebar ==========

function initMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('mobileBackdrop');

    if (window.innerWidth <= 480) {
        sidebar.classList.add('collapsed');
    }
}

function setupAutoCollapse() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('mobileBackdrop');

    backdrop.addEventListener('click', closeSidebar);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('mobileBackdrop');
    const body = document.body;

    sidebar.classList.toggle('collapsed');

    if (window.innerWidth <= 480) {
        if (sidebar.classList.contains('collapsed')) {
            backdrop.classList.remove('active');
            body.classList.remove('sidebar-open');
        } else {
            backdrop.classList.add('active');
            body.classList.add('sidebar-open');
        }
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('mobileBackdrop');
    const body = document.body;

    sidebar.classList.add('collapsed');
    backdrop.classList.remove('active');
    body.classList.remove('sidebar-open');
}

// ========== Navigation ==========

document.getElementById('chatBtn').addEventListener('click', () => {
    window.location.href = '/chat.html';
});

document.getElementById('profileBtn').addEventListener('click', () => {
    window.location.href = '/profile.html';
});

if (user.role === 'PARENT') {
    document.getElementById('dashboardBtn').style.display = 'block';
    document.getElementById('dashboardBtn').addEventListener('click', () => {
        window.location.href = '/parent.html';
    });
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('hal_token');
    localStorage.removeItem('hal_user');
    window.location.href = '/';
});
