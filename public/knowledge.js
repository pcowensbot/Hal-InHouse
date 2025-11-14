// Check authentication
const token = localStorage.getItem('hal_token');
const user = JSON.parse(localStorage.getItem('hal_user'));

if (!token || !user) {
    window.location.href = '/';
}

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('hal_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('hal_theme', newTheme);
    updateThemeIcon(newTheme);
}

// Sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.toggle('collapsed');
    overlay.classList.toggle('collapsed');
}

// Close sidebar on mobile when clicking overlay
function closeSidebarOnMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        overlay.classList.add('collapsed');
    }
}

// API helper
async function apiCall(endpoint, options = {}) {
    const response = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('hal_token');
        localStorage.removeItem('hal_user');
        window.location.href = '/';
        return;
    }

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }
    return data;
}

// State
let books = [];
let allNotes = [];
let currentView = 'inbox';
let currentBookId = null;

// Initialize
document.getElementById('userName').textContent = user.firstName;

// Show dashboard button for parents
if (user.role === 'PARENT') {
    document.getElementById('dashboardBtn').style.display = 'block';
}

// Initialize theme
initTheme();

// Load data
async function loadBooks() {
    try {
        books = await apiCall('/api/knowledge/books');
        renderBooksList();
    } catch (error) {
        console.error('Failed to load books:', error);
    }
}

async function loadNotes(bookId = null) {
    try {
        const endpoint = bookId
            ? `/api/knowledge/notes?bookId=${bookId}`
            : '/api/knowledge/notes';
        allNotes = await apiCall(endpoint);

        if (currentView === 'inbox') {
            renderInbox();
        } else if (currentView === 'bookDetail' && currentBookId) {
            renderBookDetail(currentBookId);
        }
    } catch (error) {
        console.error('Failed to load notes:', error);
    }
}

// Render functions
function renderInbox() {
    const inboxNotes = allNotes.filter(note => !note.bookId);
    const container = document.getElementById('inboxNotes');
    const countBadge = document.getElementById('inboxCount');

    countBadge.textContent = inboxNotes.length;

    if (inboxNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📥</div>
                <h3>Inbox is empty</h3>
                <p>Star messages in your chats to save them here!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = inboxNotes.map(note => createNoteCard(note)).join('');
}

function renderBooksList() {
    const container = document.getElementById('booksList');

    if (books.length === 0) {
        container.innerHTML = '<div class="empty-state">No books yet</div>';
        return;
    }

    container.innerHTML = books.map(book => `
        <div class="conversation-item" onclick="showBookDetail('${book.id}')">
            <div class="conversation-title">📚 ${escapeHtml(book.name)}</div>
            <div class="conversation-preview">${book._count.notes} notes</div>
        </div>
    `).join('');
}

function renderBooksGrid() {
    const container = document.getElementById('booksGrid');

    if (books.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <h3>No books yet</h3>
                <p>Create your first book to organize your knowledge!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = books.map(book => `
        <div class="book-card" onclick="showBookDetail('${book.id}')">
            <div class="book-card-icon">📚</div>
            <div class="book-card-title">${escapeHtml(book.name)}</div>
            <div class="book-card-description">
                ${book.description ? escapeHtml(book.description) : 'No description'}
            </div>
            <div class="book-card-footer">
                <span class="book-card-notes-count">${book._count.notes} notes</span>
                <span class="book-card-date">${formatDate(book.updatedAt)}</span>
            </div>
        </div>
    `).join('');
}

function renderBookDetail(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    document.getElementById('bookDetailTitle').textContent = book.name;
    document.getElementById('bookDetailDescription').textContent =
        book.description || 'No description';

    const bookNotes = allNotes.filter(note => note.bookId === bookId);
    const container = document.getElementById('bookNotes');

    if (bookNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>No notes in this book</h3>
                <p>Move notes from your inbox to organize them here!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = bookNotes.map(note => createNoteCard(note)).join('');
}

function createNoteCard(note) {
    const hasCustomNote = note.note && note.note.trim();
    const displayContent = hasCustomNote ? note.note : note.message.content;
    const truncatedContent = displayContent.length > 200
        ? displayContent.substring(0, 200) + '...'
        : displayContent;

    return `
        <div class="note-card" onclick="showNoteModal('${note.id}')">
            <div class="note-card-header">
                <div class="note-card-title">
                    ${note.title ? escapeHtml(note.title) : 'Untitled Note'}
                </div>
            </div>
            <div class="note-card-content">
                ${escapeHtml(truncatedContent)}
            </div>
            <div class="note-card-meta">
                <span class="note-card-source">
                    From: ${escapeHtml(note.message.conversation.title)}
                </span>
                <span class="note-card-date">${formatDate(note.createdAt)}</span>
            </div>
        </div>
    `;
}

// View management
function showView(viewName) {
    currentView = viewName;

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === viewName) {
            btn.classList.add('active');
        }
    });

    // Hide all views
    document.getElementById('inboxView').style.display = 'none';
    document.getElementById('booksView').style.display = 'none';
    document.getElementById('bookDetailView').style.display = 'none';
    document.getElementById('booksList').style.display = 'none';

    // Show selected view
    if (viewName === 'inbox') {
        document.getElementById('viewTitle').textContent = '📥 Inbox';
        document.getElementById('inboxView').style.display = 'block';
        loadNotes();
    } else if (viewName === 'books') {
        document.getElementById('viewTitle').textContent = '📚 All Books';
        document.getElementById('booksView').style.display = 'block';
        document.getElementById('booksList').style.display = 'block';
        renderBooksGrid();
    }
}

function showBookDetail(bookId) {
    currentView = 'bookDetail';
    currentBookId = bookId;

    const book = books.find(b => b.id === bookId);
    if (!book) return;

    document.getElementById('viewTitle').textContent = `📚 ${book.name}`;
    document.getElementById('inboxView').style.display = 'none';
    document.getElementById('booksView').style.display = 'none';
    document.getElementById('bookDetailView').style.display = 'block';

    loadNotes(bookId);
    renderBookDetail(bookId);
}

// Book management
function openNewBookModal() {
    document.getElementById('newBookModal').style.display = 'flex';
    document.getElementById('bookName').value = '';
    document.getElementById('bookDescription').value = '';
}

function closeNewBookModal() {
    document.getElementById('newBookModal').style.display = 'none';
}

async function createBook(name, description) {
    try {
        await apiCall('/api/knowledge/books', {
            method: 'POST',
            body: JSON.stringify({ name, description }),
        });

        await loadBooks();
        closeNewBookModal();
    } catch (error) {
        alert('Failed to create book: ' + error.message);
    }
}

function openEditBookModal() {
    const book = books.find(b => b.id === currentBookId);
    if (!book) return;

    document.getElementById('editBookId').value = book.id;
    document.getElementById('editBookName').value = book.name;
    document.getElementById('editBookDescription').value = book.description || '';
    document.getElementById('editBookModal').style.display = 'flex';
}

function closeEditBookModal() {
    document.getElementById('editBookModal').style.display = 'none';
}

async function updateBook(id, name, description) {
    try {
        await apiCall(`/api/knowledge/books/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, description }),
        });

        await loadBooks();
        closeEditBookModal();

        // Refresh current view
        if (currentView === 'bookDetail') {
            showBookDetail(currentBookId);
        }
    } catch (error) {
        alert('Failed to update book: ' + error.message);
    }
}

async function deleteBook() {
    if (!currentBookId) return;

    const book = books.find(b => b.id === currentBookId);
    const confirmMsg = book._count.notes > 0
        ? `Delete "${book.name}"? All ${book._count.notes} notes will be moved to your inbox.`
        : `Delete "${book.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
        await apiCall(`/api/knowledge/books/${currentBookId}`, {
            method: 'DELETE',
        });

        await loadBooks();
        await loadNotes();
        showView('books');
    } catch (error) {
        alert('Failed to delete book: ' + error.message);
    }
}

// Note management
function showNoteModal(noteId) {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;

    const modal = document.getElementById('noteModal');
    const detailContainer = document.getElementById('noteDetail');

    detailContainer.innerHTML = `
        <div class="note-detail">
            <div class="note-detail-section">
                <h3>Title</h3>
                <div class="note-detail-title">
                    ${note.title ? escapeHtml(note.title) : 'Untitled Note'}
                </div>
            </div>

            ${note.note ? `
                <div class="note-detail-section">
                    <h3>Your Notes</h3>
                    <div class="note-detail-content">
                        ${escapeHtml(note.note)}
                    </div>
                </div>
            ` : ''}

            <div class="note-detail-section">
                <h3>Original Message</h3>
                <div class="note-detail-message">
                    ${escapeHtml(note.message.content)}
                </div>
            </div>

            <div class="note-detail-section">
                <h3>Metadata</h3>
                <div class="note-detail-meta">
                    <div class="note-detail-meta-item">
                        <strong>From Conversation</strong>
                        <span>${escapeHtml(note.message.conversation.title)}</span>
                    </div>
                    <div class="note-detail-meta-item">
                        <strong>Current Book</strong>
                        <span>${note.book ? escapeHtml(note.book.name) : 'Inbox (unorganized)'}</span>
                    </div>
                    <div class="note-detail-meta-item">
                        <strong>Saved On</strong>
                        <span>${formatDate(note.createdAt)}</span>
                    </div>
                    <div class="note-detail-meta-item">
                        <strong>Model Used</strong>
                        <span>${note.message.modelUsed}</span>
                    </div>
                </div>
            </div>

            <div class="note-detail-section">
                <h3>Actions</h3>
                <div class="note-detail-actions">
                    <div class="form-group">
                        <label>Move to Book</label>
                        <select id="noteBookSelect" class="form-control">
                            <option value="">Inbox (unorganized)</option>
                            ${books.map(book => `
                                <option value="${book.id}" ${note.bookId === book.id ? 'selected' : ''}>
                                    ${escapeHtml(book.name)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="moveNote('${note.id}')">
                        💾 Save Location
                    </button>
                    <button class="btn btn-danger" onclick="deleteNote('${note.id}')">
                        🗑️ Delete Note
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function closeNoteModal() {
    document.getElementById('noteModal').style.display = 'none';
}

async function moveNote(noteId) {
    const bookId = document.getElementById('noteBookSelect').value || null;

    try {
        await apiCall(`/api/knowledge/notes/${noteId}`, {
            method: 'PUT',
            body: JSON.stringify({ bookId }),
        });

        await loadBooks();
        await loadNotes(currentBookId);
        closeNoteModal();

        // Refresh current view
        if (currentView === 'inbox') {
            renderInbox();
        } else if (currentView === 'bookDetail') {
            renderBookDetail(currentBookId);
        }
    } catch (error) {
        alert('Failed to move note: ' + error.message);
    }
}

async function deleteNote(noteId) {
    if (!confirm('Delete this note permanently?')) return;

    try {
        await apiCall(`/api/knowledge/notes/${noteId}`, {
            method: 'DELETE',
        });

        await loadBooks();
        await loadNotes(currentBookId);
        closeNoteModal();

        // Refresh current view
        if (currentView === 'inbox') {
            renderInbox();
        } else if (currentView === 'bookDetail') {
            renderBookDetail(currentBookId);
        }
    } catch (error) {
        alert('Failed to delete note: ' + error.message);
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return date.toLocaleDateString();
}

// Event listeners
document.getElementById('newBookBtn').addEventListener('click', openNewBookModal);
document.getElementById('editBookBtn').addEventListener('click', openEditBookModal);
document.getElementById('deleteBookBtn').addEventListener('click', deleteBook);
document.getElementById('backToBooksBtn').addEventListener('click', () => showView('books'));

document.getElementById('newBookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('bookName').value;
    const description = document.getElementById('bookDescription').value;
    await createBook(name, description);
});

document.getElementById('editBookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editBookId').value;
    const name = document.getElementById('editBookName').value;
    const description = document.getElementById('editBookDescription').value;
    await updateBook(id, name, description);
});

// Navigation buttons
document.getElementById('chatBtn').addEventListener('click', () => {
    window.location.href = '/chat.html';
});

document.getElementById('dashboardBtn')?.addEventListener('click', () => {
    window.location.href = '/parent.html';
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('hal_token');
    localStorage.removeItem('hal_user');
    window.location.href = '/';
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeNewBookModal();
        closeEditBookModal();
        closeNoteModal();
    }
});

// Initialize
loadBooks();
loadNotes();
