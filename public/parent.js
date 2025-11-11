// Check authentication
const token = localStorage.getItem('hal_token');
const user = JSON.parse(localStorage.getItem('hal_user'));

if (!token || !user) {
    window.location.href = '/';
}

if (user.role !== 'PARENT') {
    window.location.href = '/chat.html';
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
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
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

// Initialize
document.getElementById('userName').textContent = user.firstName;
initTheme();

// Tab switching
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(`${tabName}Tab`).classList.add('active');
    event.target.classList.add('active');

    // Load data for tab
    if (tabName === 'overview') {
        loadOverview();
    } else if (tabName === 'conversations') {
        loadAllConversations();
    } else if (tabName === 'deletions') {
        loadPendingDeletions();
    } else if (tabName === 'users') {
        loadUsers();
    }
}

// Load overview stats
async function loadOverview() {
    try {
        const stats = await apiCall('/api/parent/stats');
        
        document.getElementById('statUsers').textContent = stats.userCount;
        document.getElementById('statConversations').textContent = stats.conversationCount;
        document.getElementById('statMessages').textContent = stats.messageCount;
        
        // User stats
        const userStatsDiv = document.getElementById('userStats');
        userStatsDiv.innerHTML = stats.userStats.map(u => `
            <div class="user-stat-card">
                <div class="user-stat-name">${u.firstName}</div>
                <div class="user-stat-value">${u.messageCount} messages</div>
            </div>
        `).join('');
        
        // Recent activity
        const activityDiv = document.getElementById('recentActivity');
        if (stats.recentMessages.length === 0) {
            activityDiv.innerHTML = '<p class="placeholder">No recent activity</p>';
        } else {
            activityDiv.innerHTML = stats.recentMessages.map(msg => `
                <div class="activity-item">
                    <div class="activity-user">${msg.conversation.user.firstName}</div>
                    <div class="activity-content">${escapeHtml(msg.content.substring(0, 100))}${msg.content.length > 100 ? '...' : ''}</div>
                    <div class="activity-time">${formatDate(msg.createdAt)}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load overview:', error);
    }
}

// Load all conversations
async function loadAllConversations() {
    try {
        const userId = document.getElementById('userFilter')?.value || '';
        const url = userId ? `/api/parent/conversations?userId=${userId}` : '/api/parent/conversations';
        const conversations = await apiCall(url);
        
        const convDiv = document.getElementById('allConversations');
        if (conversations.length === 0) {
            convDiv.innerHTML = '<p class="placeholder">No conversations found</p>';
        } else {
            convDiv.innerHTML = conversations.map(conv => `
                <div class="conversation-card" onclick="viewConversation('${conv.id}')">
                    <div class="conv-header">
                        <span class="conv-user">${conv.user.firstName}</span>
                        <span class="conv-date">${formatDate(conv.updatedAt)}</span>
                    </div>
                    <div class="conv-title">${conv.title}</div>
                    <div class="conv-stats">${conv._count.messages} messages</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load conversations:', error);
    }
}

// Load pending deletions
async function loadPendingDeletions() {
    try {
        const deletions = await apiCall('/api/parent/pending-deletions');

        const deletionsDiv = document.getElementById('pendingDeletions');
        if (deletions.length === 0) {
            deletionsDiv.innerHTML = '<p class="placeholder">No pending deletions</p>';
        } else {
            deletionsDiv.innerHTML = deletions.map(conv => `
                <div class="conversation-card deletion-card">
                    <div class="conv-header">
                        <span class="conv-user">${conv.user.firstName}</span>
                        <span class="conv-date">Deleted ${formatDate(conv.deletedAt)}</span>
                    </div>
                    <div class="conv-title">${conv.title}</div>
                    <div class="conv-stats">${conv._count.messages} messages</div>
                    <div class="deletion-actions">
                        <button onclick="viewConversation('${conv.id}')" class="btn btn-sm btn-secondary">👁️ View</button>
                        <button onclick="restoreConversation('${conv.id}')" class="btn btn-sm btn-primary">↩️ Restore</button>
                        <button onclick="permanentlyDeleteConversation('${conv.id}')" class="btn btn-sm" style="background: var(--danger);">🗑️ Delete Forever</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load pending deletions:', error);
    }
}

// Restore conversation
async function restoreConversation(id) {
    if (!confirm('Restore this conversation? It will be returned to the user.')) {
        return;
    }

    try {
        await apiCall(`/api/parent/conversations/${id}/restore`, {
            method: 'POST',
        });

        alert('Conversation restored successfully');
        loadPendingDeletions();
    } catch (error) {
        console.error('Failed to restore conversation:', error);
        alert('Failed to restore conversation: ' + error.message);
    }
}

// Permanently delete conversation
async function permanentlyDeleteConversation(id) {
    if (!confirm('⚠️ PERMANENTLY DELETE this conversation?\n\nThis action CANNOT be undone. All messages will be lost forever.')) {
        return;
    }

    if (!confirm('Are you absolutely sure? This is your final warning.')) {
        return;
    }

    try {
        await apiCall(`/api/parent/conversations/${id}/permanent`, {
            method: 'DELETE',
        });

        alert('Conversation permanently deleted');
        loadPendingDeletions();
    } catch (error) {
        console.error('Failed to permanently delete conversation:', error);
        alert('Failed to delete conversation: ' + error.message);
    }
}

// View conversation details
async function viewConversation(id) {
    try {
        const conversation = await apiCall(`/api/chat/conversations/${id}`);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${conversation.title}</h2>
                    <button onclick="this.closest('.modal').remove()" class="close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="conv-meta">
                        <strong>User:</strong> ${conversation.user.firstName} | 
                        <strong>Started:</strong> ${new Date(conversation.createdAt).toLocaleString()}
                    </div>
                    <div class="messages-view">
                        ${conversation.messages.map(msg => `
                            <div class="message-item ${msg.role}">
                                <div class="msg-role">${msg.role === 'user' ? conversation.user.firstName : 'HAL'}</div>
                                <div class="msg-content">${escapeHtml(msg.content)}</div>
                                <div class="msg-time">${new Date(msg.createdAt).toLocaleString()}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Failed to view conversation:', error);
        alert('Failed to load conversation details');
    }
}

// Load users
async function loadUsers() {
    try {
        const users = await apiCall('/api/parent/users');
        
        const usersDiv = document.getElementById('usersList');
        usersDiv.innerHTML = users.map(u => {
            const savedAvatar = localStorage.getItem('hal_avatar');
            const avatarContent = savedAvatar 
                ? `<img src="${savedAvatar}" alt="${u.firstName}">` 
                : u.firstName.charAt(0).toUpperCase();
            
            return `
                <div class="user-card">
                    <div class="user-avatar">${avatarContent}</div>
                    <div class="user-details">
                        <div class="user-name">${u.firstName}</div>
                        <div class="user-email">${u.email}</div>
                        <div class="user-meta">
                            <span class="badge ${u.role === 'PARENT' ? 'badge-primary' : 'badge-secondary'}">${u.role}</span>
                            <span>${u._count.conversations} conversations</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Populate user filters
        const userOptions = users.map(u => `<option value="${u.id}">${u.firstName}</option>`).join('');
        document.getElementById('userFilter').innerHTML = '<option value="">All Users</option>' + userOptions;
        document.getElementById('searchUserFilter').innerHTML = '<option value="">All Users</option>' + userOptions;
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Search messages
async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const userId = document.getElementById('searchUserFilter').value;
    
    if (!query) {
        alert('Please enter a search term');
        return;
    }
    
    try {
        const url = `/api/parent/search?q=${encodeURIComponent(query)}${userId ? `&userId=${userId}` : ''}`;
        const results = await apiCall(url);
        
        const resultsDiv = document.getElementById('searchResults');
        if (results.length === 0) {
            resultsDiv.innerHTML = '<p class="placeholder">No results found</p>';
        } else {
            resultsDiv.innerHTML = results.map(msg => `
                <div class="search-result-item">
                    <div class="result-header">
                        <span class="result-user">${msg.conversation.user.firstName}</span>
                        <span class="result-date">${new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <div class="result-content">${highlightText(escapeHtml(msg.content), query)}</div>
                    <button onclick="viewConversation('${msg.conversationId}')" class="btn btn-sm">View Conversation</button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Search failed:', error);
        alert('Search failed: ' + error.message);
    }
}

// Search on Enter
document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// Highlight search terms
function highlightText(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Profile button
document.getElementById('profileBtn').addEventListener('click', () => {
    window.location.href = '/profile.html';
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('hal_token');
    localStorage.removeItem('hal_user');
    window.location.href = '/';
});

// Go to chat
document.getElementById('chatBtn').addEventListener('click', () => {
    window.location.href = '/chat.html';
});

// Load overview on start
loadOverview();
