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

// Mobile detection
function isMobile() {
    return window.innerWidth <= 480;
}

// Sidebar toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('mobileBackdrop');

    if (isMobile()) {
        // On mobile, toggle between hidden and visible
        const isOpen = !sidebar.classList.contains('collapsed');

        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    } else {
        // On desktop, just toggle collapsed state
        sidebar.classList.toggle('collapsed');
    }
}

function openSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('mobileBackdrop');

    sidebar.classList.remove('collapsed');

    if (isMobile()) {
        backdrop.classList.add('active');
        document.body.classList.add('sidebar-open');
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('mobileBackdrop');

    sidebar.classList.add('collapsed');
    backdrop.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}

// Auto-collapse sidebar on mobile on page load
function initMobileSidebar() {
    if (isMobile()) {
        closeSidebar();
    }

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (isMobile()) {
                closeSidebar();
            } else {
                // On desktop, remove mobile-specific classes
                const backdrop = document.getElementById('mobileBackdrop');
                backdrop.classList.remove('active');
                document.body.classList.remove('sidebar-open');
            }
        }, 250);
    });
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

// Load sidebar avatar
function loadSidebarAvatar() {
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const savedAvatar = localStorage.getItem('hal_avatar');
    const customization = JSON.parse(localStorage.getItem('hal_customization') || '{}');

    // Set avatar content
    if (savedAvatar) {
        sidebarAvatar.innerHTML = `<img src="${savedAvatar}" alt="Avatar">`;
    } else {
        sidebarAvatar.textContent = user.firstName.charAt(0).toUpperCase();
    }

    // Apply border customization
    if (customization.avatarBorderStyle && customization.avatarBorderStyle !== 'none' && customization.avatarBorderWidth > 0) {
        if (customization.avatarBorderStyle === 'gradient') {
            sidebarAvatar.style.background = 'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)';
            sidebarAvatar.style.padding = `${customization.avatarBorderWidth}px`;
            sidebarAvatar.style.border = '';
        } else {
            sidebarAvatar.style.border = `${customization.avatarBorderWidth}px ${customization.avatarBorderStyle} ${customization.avatarBorderColor || '#2563eb'}`;
            sidebarAvatar.style.background = '';
            sidebarAvatar.style.padding = '';
        }
    }

    // Make avatar clickable to go to profile
    sidebarAvatar.onclick = () => {
        window.location.href = '/profile.html';
    };
    sidebarAvatar.title = 'Go to Profile Settings';
}

// Auto-collapse sidebar on mobile when clicking nav items
function setupAutoCollapse() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (isMobile()) {
                setTimeout(() => closeSidebar(), 100);
            }
        });
    });
}

// Initialize
document.getElementById('userName').textContent = user.firstName;
initTheme();
loadCustomization();
loadSidebarAvatar();
initMobileSidebar();
setupAutoCollapse();

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
    } else if (tabName === 'invites') {
        loadInvites();
    } else if (tabName === 'knowledge') {
        loadKnowledgeTab();
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

// ===== INVITE CODE MANAGEMENT =====

// Load email template from localStorage
function loadEmailTemplate() {
    const savedSubject = localStorage.getItem('hal_email_subject');
    const savedMessage = localStorage.getItem('hal_email_message');

    if (savedSubject) {
        document.getElementById('emailSubject').value = savedSubject;
    }
    if (savedMessage) {
        document.getElementById('emailMessage').value = savedMessage;
    }
}

// Save email template to localStorage
function saveEmailTemplate() {
    const subject = document.getElementById('emailSubject').value;
    const message = document.getElementById('emailMessage').value;

    localStorage.setItem('hal_email_subject', subject);
    localStorage.setItem('hal_email_message', message);

    alert('Email template saved!');
}

// Load all invite codes
async function loadInvites() {
    try {
        const invites = await apiCall('/api/parent/invites');

        // Load email template if on invites tab
        loadEmailTemplate();

        const invitesDiv = document.getElementById('invitesList');
        if (invites.length === 0) {
            invitesDiv.innerHTML = '<p class="placeholder">No invite codes generated yet</p>';
        } else {
            invitesDiv.innerHTML = invites.map(invite => {
                const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
                const isUsed = invite.usedAt !== null;
                const status = isUsed ? 'Used' : isExpired ? 'Expired' : invite.isActive ? 'Active' : 'Inactive';
                const statusClass = isUsed ? 'used' : isExpired ? 'expired' : invite.isActive ? 'active' : 'inactive';

                return `
                    <div class="invite-card ${statusClass}">
                        <div class="invite-header">
                            <div class="invite-code-display">${invite.code}</div>
                            <span class="badge badge-${statusClass}">${status}</span>
                        </div>
                        <div class="invite-details">
                            <div><strong>Created:</strong> ${new Date(invite.createdAt).toLocaleString()}</div>
                            ${invite.expiresAt ? `<div><strong>Expires:</strong> ${new Date(invite.expiresAt).toLocaleString()}</div>` : '<div><strong>Expires:</strong> Never</div>'}
                            ${invite.emailedTo ? `<div><strong>Emailed to:</strong> ${invite.emailedTo}</div>` : ''}
                            ${invite.emailedAt ? `<div><strong>Emailed on:</strong> ${new Date(invite.emailedAt).toLocaleString()}</div>` : ''}
                            ${isUsed ? `<div><strong>Used by:</strong> ${invite.usedByUser ? invite.usedByUser.firstName + ' (' + invite.usedByUser.email + ')' : 'Unknown'}</div>` : ''}
                            ${isUsed ? `<div><strong>Used on:</strong> ${new Date(invite.usedAt).toLocaleString()}</div>` : ''}
                        </div>
                        ${!isUsed && invite.isActive ? `
                            <div class="invite-actions">
                                <button onclick="copyInviteCode('${invite.code}')" class="btn btn-sm btn-primary">📋 Copy Code</button>
                                <button onclick="emailInviteCode('${invite.id}', '${invite.code}')" class="btn btn-sm btn-primary">📧 Email Code</button>
                                <button onclick="deactivateInvite('${invite.id}')" class="btn btn-sm btn-secondary">❌ Deactivate</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Failed to load invites:', error);
        alert('Failed to load invite codes: ' + error.message);
    }
}

// Generate new invite code
async function generateInvite() {
    try {
        const expireDays = document.getElementById('inviteExpireDays').value;

        const body = {};
        if (expireDays) {
            body.expiresInDays = parseInt(expireDays);
        }

        const invite = await apiCall('/api/parent/invites', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        // Clear input
        document.getElementById('inviteExpireDays').value = '';

        // Show success message with code
        alert(`Invite code generated successfully!\n\nCode: ${invite.code}\n\nShare this code with the new family member.`);

        // Reload invites
        loadInvites();
    } catch (error) {
        console.error('Failed to generate invite:', error);
        alert('Failed to generate invite code: ' + error.message);
    }
}

// Copy invite code to clipboard
async function copyInviteCode(code) {
    try {
        await navigator.clipboard.writeText(code);
        alert(`Invite code "${code}" copied to clipboard!`);
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert(`Invite code "${code}" copied to clipboard!`);
    }
}

// Deactivate an invite code
async function deactivateInvite(id) {
    if (!confirm('Deactivate this invite code? It will no longer be usable.')) {
        return;
    }

    try {
        await apiCall(`/api/parent/invites/${id}`, {
            method: 'DELETE',
        });

        alert('Invite code deactivated successfully');
        loadInvites();
    } catch (error) {
        console.error('Failed to deactivate invite:', error);
        alert('Failed to deactivate invite code: ' + error.message);
    }
}

// Email an invite code
async function emailInviteCode(inviteId, code) {
    const email = prompt('Enter the email address to send this invite code to:');

    if (!email) {
        return; // User cancelled
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }

    try {
        // Get email template
        const subject = document.getElementById('emailSubject').value;
        let message = document.getElementById('emailMessage').value;

        // Replace placeholders
        const currentUrl = window.location.origin;
        message = message.replace(/{CODE}/g, code);
        message = message.replace(/{URL}/g, currentUrl);

        // Create mailto link with pre-filled content
        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

        // Mark invite as emailed in database
        await apiCall(`/api/parent/invites/${inviteId}/email`, {
            method: 'POST',
            body: JSON.stringify({ email }),
        });

        // Open email client
        window.location.href = mailtoLink;

        // Reload invites to show updated info
        setTimeout(() => {
            loadInvites();
        }, 500);
    } catch (error) {
        console.error('Failed to email invite:', error);
        alert('Failed to record email: ' + error.message);
    }
}

// ============================================
// Knowledge Base Tab
// ============================================

let knowledgeData = { books: [], notes: [], stats: null };

async function loadKnowledgeTab() {
    await loadFamilyKnowledge();
}

async function loadFamilyKnowledge() {
    try {
        const userId = document.getElementById('knowledgeUserFilter').value;
        const endpoint = userId ? `?userId=${userId}` : '';

        const [stats, books, notes] = await Promise.all([
            apiCall('/api/parent/knowledge/stats'),
            apiCall(`/api/parent/knowledge/books${endpoint}`),
            apiCall(`/api/parent/knowledge/notes${endpoint}`),
        ]);

        knowledgeData = { stats, books, notes };

        // Populate user filter if not already done
        const userFilter = document.getElementById('knowledgeUserFilter');
        if (userFilter.options.length === 1) {
            stats.userStats.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.firstName;
                userFilter.appendChild(option);
            });
        }

        renderKnowledgeStats();
        filterKnowledgeView();
    } catch (error) {
        console.error('Failed to load knowledge:', error);
        document.getElementById('knowledgeContent').innerHTML =
            '<p class="placeholder">Failed to load knowledge base</p>';
    }
}

function renderKnowledgeStats() {
    const { stats } = knowledgeData;
    const container = document.getElementById('knowledgeStats');

    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${stats.totalBooks}</div>
            <div class="stat-label">Total Books</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.totalNotes}</div>
            <div class="stat-label">Total Notes</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.userStats.filter(u => u._count.starredNotes > 0).length}</div>
            <div class="stat-label">Active Users</div>
        </div>
    `;
}

function filterKnowledgeView() {
    const typeFilter = document.getElementById('knowledgeTypeFilter').value;
    const { books, notes } = knowledgeData;

    let html = '';

    if (typeFilter === 'all' || typeFilter === 'books') {
        html += renderBooksSection(books);
    }

    if (typeFilter === 'all' || typeFilter === 'notes') {
        html += renderNotesSection(notes);
    }

    document.getElementById('knowledgeContent').innerHTML = html || '<p class="placeholder">No data to display</p>';
}

function renderBooksSection(books) {
    if (books.length === 0) {
        return '<h2>📚 Books</h2><p class="placeholder">No books found</p>';
    }

    return `
        <h2>📚 Books (${books.length})</h2>
        <div class="books-grid" style="margin-bottom: 40px;">
            ${books.map(book => `
                <div class="book-card">
                    <div class="book-card-icon">📚</div>
                    <div class="book-card-title">${escapeHtml(book.name)}</div>
                    <div class="book-card-description">
                        ${book.description ? escapeHtml(book.description) : 'No description'}
                    </div>
                    <div class="book-card-footer">
                        <span class="book-card-notes-count">${book._count.notes} notes</span>
                        <span>${escapeHtml(book.user.firstName)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderNotesSection(notes) {
    // Group notes by user
    const notesByUser = {};
    notes.forEach(note => {
        const userName = note.user.firstName;
        if (!notesByUser[userName]) {
            notesByUser[userName] = [];
        }
        notesByUser[userName].push(note);
    });

    if (notes.length === 0) {
        return '<h2>📝 Notes</h2><p class="placeholder">No notes found</p>';
    }

    return `
        <h2>📝 Notes (${notes.length})</h2>
        ${Object.entries(notesByUser).map(([userName, userNotes]) => `
            <div style="margin-bottom: 30px;">
                <h3 style="color: var(--text); margin-bottom: 16px;">${userName}'s Notes (${userNotes.length})</h3>
                <div class="notes-grid">
                    ${userNotes.map(note => createKnowledgeNoteCard(note)).join('')}
                </div>
            </div>
        `).join('')}
    `;
}

function createKnowledgeNoteCard(note) {
    const hasCustomNote = note.note && note.note.trim();
    const displayContent = hasCustomNote ? note.note : note.message.content;
    const truncatedContent = displayContent.length > 200
        ? displayContent.substring(0, 200) + '...'
        : displayContent;

    return `
        <div class="note-card">
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
                    ${note.book ? '📚 ' + escapeHtml(note.book.name) : '📥 Inbox'}
                </span>
                <span class="note-card-date">${formatDate(note.createdAt)}</span>
            </div>
        </div>
    `;
}

// Load overview on start
loadOverview();
