// Check authentication
const token = localStorage.getItem('hal_token');
const user = JSON.parse(localStorage.getItem('hal_user'));

if (!token || !user) {
    window.location.href = '/';
}

// Check access - allow if user is PARENT, SUPER_ADMIN, isSystemAdmin, or has management permissions
const hasAdminAccess = user.role === 'PARENT' || user.role === 'SUPER_ADMIN' || user.isSystemAdmin ||
    (user.permissions && (user.permissions.canManageUsers || user.permissions.canManageGroups || user.permissions.canManageSystem));

if (!hasAdminAccess) {
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
    const customization = JSON.parse(localStorage.getItem('hal_customization') || '{}');

    // Set avatar content
    if (user.avatar) {
        sidebarAvatar.innerHTML = `<img src="${user.avatar}" alt="Avatar">`;
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
    } else if (tabName === 'groups') {
        loadGroups();
    } else if (tabName === 'roles') {
        loadRoles();
    } else if (tabName === 'invites') {
        loadInvites();
        loadRolesAndGroupsForInvite();
    } else if (tabName === 'search') {
        loadSearchUsers();
    } else if (tabName === 'devices') {
        loadDevices();
    } else if (tabName === 'admin') {
        loadAdminData();
    }
}

// Load users for search filter
async function loadSearchUsers() {
    try {
        const users = await apiCall('/api/parent/users');
        const userOptions = users.map(u => `<option value="${u.id}">${u.firstName}</option>`).join('');
        document.getElementById('searchUserFilter').innerHTML = '<option value="">All Users</option>' + userOptions;
    } catch (error) {
        console.error('Failed to load users for search:', error);
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
                                <div class="msg-content">${formatMessage(msg.content)}</div>
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
            const avatarContent = u.avatar
                ? `<img src="${u.avatar}" alt="${u.firstName}">`
                : u.firstName.charAt(0).toUpperCase();

            // Use custom role if available, otherwise legacy role
            let roleText = u.customRole ? u.customRole.name : u.role;
            const roleColor = u.customRole?.color || (u.isSystemAdmin ? '#dc2626' : '#6b7280');

            // Get group memberships
            const groupBadges = (u.groupMemberships || []).map(gm => `
                <span class="badge" style="background: ${gm.group.color || '#3b82f6'}; font-size: 11px;">
                    ${gm.group.name}${gm.isGroupAdmin ? ' (Admin)' : ''}
                </span>
            `).join('');

            // Don't show action buttons for current user
            const isCurrentUser = u.id === user.id;
            const actionButtons = !isCurrentUser
                ? `<button onclick="openUserEdit('${u.id}')" class="btn btn-sm btn-secondary" title="Edit User">
                       ✏️ Edit
                   </button>
                   <button onclick="openApiLimits('${u.id}', '${escapeHtml(u.firstName)}')" class="btn btn-sm btn-secondary" title="API Limits">
                       📊 API Limits
                   </button>
                   <button onclick="toggleUserStatus('${u.id}')" class="btn btn-sm ${u.isActive ? 'btn-secondary' : 'btn-primary'}">
                       ${u.isActive ? 'Disable' : 'Enable'}
                   </button>
                   <button onclick="showDeleteUserModal('${u.id}', '${u.firstName}', '${u.email}', 'archive')" class="btn btn-sm btn-secondary" title="Archive & Delete">
                       🗄️ Archive
                   </button>
                   <button onclick="showDeleteUserModal('${u.id}', '${u.firstName}', '${u.email}', 'complete')" class="btn btn-sm btn-danger" title="Delete Completely">
                       🗑️ Delete
                   </button>`
                : '<span style="color: var(--text-light); font-size: 14px;">Your account</span>';

            return `
                <div class="user-card ${!u.isActive ? 'user-disabled' : ''}">
                    <div class="user-avatar">${avatarContent}</div>
                    <div class="user-details">
                        <div class="user-name">
                            ${u.firstName}
                            ${u.isSystemAdmin ? '<span style="color: #dc2626; margin-left: 8px; font-size: 12px;">(System Admin)</span>' : ''}
                            ${!u.isActive ? '<span style="color: var(--danger); margin-left: 8px;">(Disabled)</span>' : ''}
                        </div>
                        <div class="user-email">${u.email}</div>
                        <div class="user-meta">
                            <span class="badge" style="background: ${roleColor};">${roleText}</span>
                            ${groupBadges}
                            <span>${u._count.conversations} conversations</span>
                        </div>
                    </div>
                    <div class="user-actions">
                        ${actionButtons}
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

// Toggle user active status (enable/disable)
async function toggleUserStatus(userId) {
    try {
        const response = await apiCall(`/api/parent/users/${userId}/toggle-status`, {
            method: 'PATCH',
        });

        alert(response.message);
        await loadUsers(); // Reload the users list
    } catch (error) {
        console.error('Failed to toggle user status:', error);
        alert('Failed to update user status: ' + error.message);
    }
}

// ========== API Limits Management ==========

let currentApiLimitsUserId = null;

async function openApiLimits(userId, userName) {
    currentApiLimitsUserId = userId;
    document.getElementById('apiLimitsUserName').textContent = userName;

    try {
        const data = await apiCall(`/api/parent/users/${userId}/api-limits`);

        // Populate form fields
        document.getElementById('apiLimitDaily').value = data.apiLimitDaily ?? '';
        document.getElementById('apiLimitMonthly').value = data.apiLimitMonthly ?? '';

        // Show current usage
        const dailyUsage = data.apiCallsToday || 0;
        const monthlyUsage = data.apiCallsMonth || 0;
        const dailyLimit = data.apiLimitDaily;
        const monthlyLimit = data.apiLimitMonthly;

        document.getElementById('apiUsageDaily').textContent = dailyLimit
            ? `${dailyUsage} / ${dailyLimit} (${Math.round(dailyUsage / dailyLimit * 100)}%)`
            : `${dailyUsage} (unlimited)`;

        document.getElementById('apiUsageMonthly').textContent = monthlyLimit
            ? `${monthlyUsage} / ${monthlyLimit} (${Math.round(monthlyUsage / monthlyLimit * 100)}%)`
            : `${monthlyUsage} (unlimited)`;

        // Show device info
        const devicesHtml = data.devices.length > 0
            ? data.devices.map(d => `
                <div class="device-info-row">
                    <span>${escapeHtml(d.name)}</span>
                    <span>${d.requestCount} requests</span>
                    <span>${d.lastUsedAt ? new Date(d.lastUsedAt).toLocaleDateString() : 'Never'}</span>
                </div>
            `).join('')
            : '<p class="placeholder">No devices</p>';

        document.getElementById('apiLimitsDevices').innerHTML = devicesHtml;

        // Last reset times
        document.getElementById('apiResetDaily').textContent = data.apiLimitResetDay
            ? new Date(data.apiLimitResetDay).toLocaleString()
            : 'Never';
        document.getElementById('apiResetMonthly').textContent = data.apiLimitResetMonth
            ? new Date(data.apiLimitResetMonth).toLocaleString()
            : 'Never';

        document.getElementById('apiLimitsModal').style.display = 'flex';
    } catch (error) {
        console.error('Failed to load API limits:', error);
        alert('Failed to load API limits: ' + error.message);
    }
}

function closeApiLimits() {
    document.getElementById('apiLimitsModal').style.display = 'none';
    currentApiLimitsUserId = null;
}

async function saveApiLimits() {
    if (!currentApiLimitsUserId) return;

    try {
        const apiLimitDaily = document.getElementById('apiLimitDaily').value;
        const apiLimitMonthly = document.getElementById('apiLimitMonthly').value;

        await apiCall(`/api/parent/users/${currentApiLimitsUserId}/api-limits`, {
            method: 'PATCH',
            body: JSON.stringify({
                apiLimitDaily: apiLimitDaily === '' ? null : parseInt(apiLimitDaily),
                apiLimitMonthly: apiLimitMonthly === '' ? null : parseInt(apiLimitMonthly),
            }),
        });

        alert('API limits saved successfully');
        closeApiLimits();
    } catch (error) {
        console.error('Failed to save API limits:', error);
        alert('Failed to save API limits: ' + error.message);
    }
}

async function resetApiUsage(type) {
    if (!currentApiLimitsUserId) return;

    const typeName = type === 'daily' ? 'daily' : 'monthly';
    if (!confirm(`Reset ${typeName} usage counter to 0?`)) return;

    try {
        await apiCall(`/api/parent/users/${currentApiLimitsUserId}/api-limits/reset`, {
            method: 'POST',
            body: JSON.stringify({
                resetDaily: type === 'daily',
                resetMonthly: type === 'monthly',
            }),
        });

        // Reload the modal
        const userName = document.getElementById('apiLimitsUserName').textContent;
        await openApiLimits(currentApiLimitsUserId, userName);
    } catch (error) {
        console.error('Failed to reset API usage:', error);
        alert('Failed to reset API usage: ' + error.message);
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
                    <div class="result-content">${highlightText(formatMessage(msg.content), query)}</div>
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

// Format message with code blocks and inline code
function formatMessage(text) {
    // Escape HTML first
    let formatted = escapeHtml(text);

    // Replace code blocks (```language\ncode\n```)
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Replace inline code (`code`)
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert newlines to <br> for text outside of code blocks
    // Split by <pre> tags to avoid affecting code blocks
    const parts = formatted.split(/(<pre>[\s\S]*?<\/pre>)/);
    formatted = parts.map((part, i) => {
        if (i % 2 === 0) {
            // Not a code block, convert newlines
            return part.replace(/\n/g, '<br>');
        }
        return part;
    }).join('');

    return formatted;
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
            // Separate active/pending from used invites
            const activeInvites = invites.filter(i => !i.usedAt);
            const usedInvites = invites.filter(i => i.usedAt);

            const renderInviteCard = (invite) => {
                const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
                const isUsed = invite.usedAt !== null;
                const status = isUsed ? 'Used' : isExpired ? 'Expired' : invite.isActive ? 'Active' : 'Inactive';
                const statusClass = isUsed ? 'used' : isExpired ? 'expired' : invite.isActive ? 'active' : 'inactive';

                // Role and group badges
                const roleBadge = invite.assignedRole
                    ? `<span class="badge" style="background: ${invite.assignedRole.color || '#6b7280'};">${invite.assignedRole.name}</span>`
                    : '';
                const groupBadge = invite.assignedGroup
                    ? `<span class="badge" style="background: ${invite.assignedGroup.color || '#3b82f6'};">${invite.assignedGroup.name}${invite.makeGroupAdmin ? ' (Admin)' : ''}</span>`
                    : '';

                return `
                    <div class="invite-card ${statusClass}">
                        <div class="invite-header">
                            <div class="invite-code-display">${invite.code}</div>
                            <span class="badge badge-${statusClass}">${status}</span>
                        </div>
                        <div class="invite-role-info">
                            ${roleBadge}
                            ${groupBadge}
                        </div>
                        <div class="invite-details">
                            <div><strong>Created:</strong> ${new Date(invite.createdAt).toLocaleString()}${invite.createdBy ? ` by ${invite.createdBy.firstName}` : ''}</div>
                            ${invite.expiresAt ? `<div><strong>Expires:</strong> ${new Date(invite.expiresAt).toLocaleString()}</div>` : '<div><strong>Expires:</strong> Never</div>'}
                            ${invite.emailedTo ? `<div><strong>Emailed to:</strong> ${invite.emailedTo}</div>` : ''}
                            ${invite.emailedAt ? `<div><strong>Emailed on:</strong> ${new Date(invite.emailedAt).toLocaleString()}</div>` : ''}
                            ${isUsed ? `<div><strong>Used by:</strong> ${invite.usedBy ? invite.usedBy.firstName + ' (' + invite.usedBy.email + ')' : 'Unknown'}</div>` : ''}
                            ${isUsed ? `<div><strong>Used on:</strong> ${new Date(invite.usedAt).toLocaleString()}</div>` : ''}
                        </div>
                        ${!isUsed && invite.isActive ? `
                            <div class="invite-actions">
                                <button onclick="copyInviteCode('${invite.code}')" class="btn btn-sm btn-primary">📋 Copy Code</button>
                                <button onclick="emailInviteCode('${invite.id}', '${invite.code}')" class="btn btn-sm btn-primary">📧 Email Code</button>
                                <button onclick="openEditInvite('${invite.id}')" class="btn btn-sm btn-secondary">✏️ Edit</button>
                                <button onclick="deactivateInvite('${invite.id}')" class="btn btn-sm btn-secondary">❌ Deactivate</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            };

            let html = '';

            // Render active/pending invites
            if (activeInvites.length > 0) {
                html += activeInvites.map(renderInviteCard).join('');
            } else {
                html += '<p class="placeholder">No pending invite codes</p>';
            }

            // Render used invites in collapsible section
            if (usedInvites.length > 0) {
                html += `
                    <div class="collapsible-section">
                        <div class="collapsible-header" onclick="toggleActivatedCodes()">
                            <span class="collapsible-arrow" id="activatedCodesArrow">▶</span>
                            <h3>Activated Codes (${usedInvites.length})</h3>
                        </div>
                        <div class="collapsible-content" id="activatedCodesContent" style="display: none;">
                            ${usedInvites.map(renderInviteCard).join('')}
                        </div>
                    </div>
                `;
            }

            invitesDiv.innerHTML = html;
        }
    } catch (error) {
        console.error('Failed to load invites:', error);
        alert('Failed to load invite codes: ' + error.message);
    }
}

// Toggle activated codes collapsible section
function toggleActivatedCodes() {
    const content = document.getElementById('activatedCodesContent');
    const arrow = document.getElementById('activatedCodesArrow');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.textContent = '▼';
    } else {
        content.style.display = 'none';
        arrow.textContent = '▶';
    }
}

// Generate new invite code
async function generateInvite() {
    try {
        const roleId = document.getElementById('inviteRoleSelect').value;
        const groupId = document.getElementById('inviteGroupSelect').value;
        const makeGroupAdmin = document.getElementById('inviteMakeGroupAdmin')?.checked || false;
        const expireDays = document.getElementById('inviteExpireDays').value;

        if (!roleId) {
            alert('Please select a role for this invite code');
            return;
        }

        const body = { roleId };
        if (groupId) {
            body.groupId = groupId;
            body.makeGroupAdmin = makeGroupAdmin;
        }
        if (expireDays) {
            body.expiresInDays = parseInt(expireDays);
        }

        const invite = await apiCall('/api/parent/invites', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        // Clear inputs
        document.getElementById('inviteExpireDays').value = '';
        document.getElementById('inviteRoleSelect').value = '';
        document.getElementById('inviteGroupSelect').value = '';
        if (document.getElementById('inviteMakeGroupAdmin')) {
            document.getElementById('inviteMakeGroupAdmin').checked = false;
        }

        // Show success message with code
        const roleInfo = invite.assignedRole ? ` with role "${invite.assignedRole.name}"` : '';
        const groupInfo = invite.assignedGroup ? ` and will join group "${invite.assignedGroup.name}"` : '';
        alert(`Invite code generated successfully!\n\nCode: ${invite.code}${roleInfo}${groupInfo}\n\nShare this code with the new member.`);

        // Reload invites
        loadInvites();
    } catch (error) {
        console.error('Failed to generate invite:', error);
        alert('Failed to generate invite code: ' + error.message);
    }
}

// Load roles and groups for invite form
async function loadRolesAndGroupsForInvite() {
    try {
        const [roles, groups] = await Promise.all([
            apiCall('/api/parent/roles'),
            apiCall('/api/parent/groups'),
        ]);

        // Populate role select
        const roleSelect = document.getElementById('inviteRoleSelect');
        roleSelect.innerHTML = '<option value="">Select a role...</option>' +
            roles.map(r => `<option value="${r.id}" style="color: ${r.color};">${r.name}</option>`).join('');

        // Populate group select
        const groupSelect = document.getElementById('inviteGroupSelect');
        groupSelect.innerHTML = '<option value="">No group assignment</option>' +
            groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');

        // Show/hide group admin toggle when group is selected
        groupSelect.addEventListener('change', () => {
            const groupAdminToggle = document.getElementById('groupAdminToggle');
            groupAdminToggle.style.display = groupSelect.value ? 'block' : 'none';
        });
    } catch (error) {
        console.error('Failed to load roles/groups for invite:', error);
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

// Edit invite code - store current invite being edited
let editingInviteId = null;

async function openEditInvite(inviteId) {
    editingInviteId = inviteId;

    try {
        // Load roles and groups for the dropdowns
        const [roles, groups, invites] = await Promise.all([
            apiCall('/api/parent/roles'),
            apiCall('/api/parent/groups'),
            apiCall('/api/parent/invites'),
        ]);

        // Find the specific invite
        const invite = invites.find(i => i.id === inviteId);
        if (!invite) {
            alert('Invite not found');
            return;
        }

        // Populate role select
        const roleSelect = document.getElementById('editInviteRole');
        roleSelect.innerHTML = '<option value="">No role assigned</option>' +
            roles.map(r => `<option value="${r.id}" ${invite.roleId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');

        // Populate group select
        const groupSelect = document.getElementById('editInviteGroup');
        groupSelect.innerHTML = '<option value="">No group assignment</option>' +
            groups.map(g => `<option value="${g.id}" ${invite.groupId === g.id ? 'selected' : ''}>${g.name}</option>`).join('');

        // Set group admin checkbox
        document.getElementById('editInviteGroupAdmin').checked = invite.makeGroupAdmin || false;

        // Show/hide group admin toggle based on group selection
        document.getElementById('editGroupAdminToggle').style.display = invite.groupId ? 'block' : 'none';

        // Show modal
        document.getElementById('editInviteModal').style.display = 'flex';
    } catch (error) {
        console.error('Failed to load invite for editing:', error);
        alert('Failed to load invite: ' + error.message);
    }
}

function closeEditInvite() {
    document.getElementById('editInviteModal').style.display = 'none';
    editingInviteId = null;
}

function onEditInviteGroupChange() {
    const groupId = document.getElementById('editInviteGroup').value;
    document.getElementById('editGroupAdminToggle').style.display = groupId ? 'block' : 'none';
    if (!groupId) {
        document.getElementById('editInviteGroupAdmin').checked = false;
    }
}

async function saveEditInvite() {
    if (!editingInviteId) return;

    try {
        const roleId = document.getElementById('editInviteRole').value || null;
        const groupId = document.getElementById('editInviteGroup').value || null;
        const makeGroupAdmin = document.getElementById('editInviteGroupAdmin').checked;

        await apiCall(`/api/parent/invites/${editingInviteId}`, {
            method: 'PATCH',
            body: JSON.stringify({ roleId, groupId, makeGroupAdmin }),
        });

        closeEditInvite();
        loadInvites();
        alert('Invite code updated successfully');
    } catch (error) {
        console.error('Failed to update invite:', error);
        alert('Failed to update invite: ' + error.message);
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

// ========== Device Management ==========

// Load devices
async function loadDevices() {
    try {
        const devices = await apiCall('/api/devices');
        const devicesList = document.getElementById('devicesList');

        if (devices.length === 0) {
            devicesList.innerHTML = '<p class="placeholder">No devices linked yet. Create one to get started!</p>';
            return;
        }

        devicesList.innerHTML = devices.map(device => `
            <div class="device-card">
                <div class="device-info">
                    <div class="device-name">${escapeHtml(device.name)}</div>
                    ${device.description ? `<div class="device-description">${escapeHtml(device.description)}</div>` : ''}
                    <div class="device-meta">
                        <span>📊 ${device.requestCount} requests</span>
                        <span>🕒 Last used: ${device.lastUsedAt ? new Date(device.lastUsedAt).toLocaleString() : 'Never'}</span>
                        <span>📅 Created: ${new Date(device.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="device-actions">
                    <button onclick="openDeviceHistory('${device.id}', '${escapeHtml(device.name)}')" class="btn btn-primary btn-sm">📜 History</button>
                    <button onclick="deleteDevice('${device.id}')" class="btn btn-secondary btn-sm">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load devices:', error);
        document.getElementById('devicesList').innerHTML = '<p class="error">Failed to load devices</p>';
    }
}

// Show create device modal
function showCreateDeviceModal() {
    document.getElementById('createDeviceModal').style.display = 'flex';
    document.getElementById('deviceName').value = '';
    document.getElementById('deviceDescription').value = '';
    document.getElementById('createDeviceError').textContent = '';
}

// Close create device modal
function closeCreateDeviceModal() {
    document.getElementById('createDeviceModal').style.display = 'none';
}

// Create device
document.getElementById('createDeviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('deviceName').value.trim();
    const description = document.getElementById('deviceDescription').value.trim();
    const errorDiv = document.getElementById('createDeviceError');

    if (!name) {
        errorDiv.textContent = 'Device name is required';
        return;
    }

    try {
        const result = await apiCall('/api/devices', {
            method: 'POST',
            body: JSON.stringify({ name, description }),
        });

        // Close create modal
        closeCreateDeviceModal();

        // Show API key modal
        document.getElementById('generatedApiKey').textContent = result.apiKey;
        document.getElementById('apiKeyModal').style.display = 'flex';

        // Reload devices
        loadDevices();
    } catch (error) {
        console.error('Failed to create device:', error);
        errorDiv.textContent = error.message || 'Failed to create device';
    }
});

// Close API key modal
function closeApiKeyModal() {
    document.getElementById('apiKeyModal').style.display = 'none';
}

// Copy API key
function copyApiKey() {
    const apiKey = document.getElementById('generatedApiKey').textContent;
    navigator.clipboard.writeText(apiKey).then(() => {
        const btn = document.getElementById('copyApiKeyBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy API key');
    });
}

// Delete device
async function deleteDevice(deviceId) {
    if (!confirm('Are you sure you want to delete this device? This will revoke its API key.')) {
        return;
    }

    try {
        await apiCall(`/api/devices/${deviceId}`, {
            method: 'DELETE',
        });

        loadDevices();
    } catch (error) {
        console.error('Failed to delete device:', error);
        alert('Failed to delete device: ' + error.message);
    }
}

// ========== Device History ==========

let currentHistoryDeviceId = null;
let historyCurrentPage = 1;
let historySortBy = 'createdAt';
let historySortOrder = 'desc';

async function openDeviceHistory(deviceId, deviceName) {
    currentHistoryDeviceId = deviceId;
    historyCurrentPage = 1;

    document.getElementById('historyDeviceName').textContent = deviceName;
    document.getElementById('historySearch').value = '';
    document.getElementById('historyStatus').value = '';
    document.getElementById('historyStartDate').value = '';
    document.getElementById('historyEndDate').value = '';
    document.getElementById('historySortBy').value = 'createdAt';
    document.getElementById('historySortOrder').value = 'desc';

    document.getElementById('deviceHistoryModal').style.display = 'flex';
    await loadDeviceHistory();
}

function closeDeviceHistory() {
    document.getElementById('deviceHistoryModal').style.display = 'none';
    currentHistoryDeviceId = null;
}

async function loadDeviceHistory() {
    if (!currentHistoryDeviceId) return;

    const search = document.getElementById('historySearch').value;
    const status = document.getElementById('historyStatus').value;
    const startDate = document.getElementById('historyStartDate').value;
    const endDate = document.getElementById('historyEndDate').value;
    historySortBy = document.getElementById('historySortBy').value;
    historySortOrder = document.getElementById('historySortOrder').value;

    const params = new URLSearchParams({
        page: historyCurrentPage,
        limit: 25,
        sortBy: historySortBy,
        sortOrder: historySortOrder,
    });

    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    try {
        const result = await apiCall(`/api/devices/${currentHistoryDeviceId}/history?${params}`);
        renderHistoryTable(result.logs, result.pagination);
    } catch (error) {
        console.error('Failed to load device history:', error);
        document.getElementById('historyTableBody').innerHTML =
            '<tr><td colspan="7" class="error">Failed to load history</td></tr>';
    }
}

function renderHistoryTable(logs, pagination) {
    const tbody = document.getElementById('historyTableBody');

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="placeholder">No API requests found</td></tr>';
        document.getElementById('historyPagination').innerHTML = '';
        return;
    }

    tbody.innerHTML = logs.map(log => {
        const statusClass = log.status >= 400 ? 'error-status' : 'success-status';
        const promptPreview = log.prompt ? (log.prompt.length > 50 ? log.prompt.substring(0, 50) + '...' : log.prompt) : '-';
        const responsePreview = log.response ? (log.response.length > 50 ? log.response.substring(0, 50) + '...' : log.response) : (log.error || '-');

        return `
            <tr onclick="showLogDetails('${log.id}')" class="clickable-row" data-log='${JSON.stringify(log).replace(/'/g, "&#39;")}'>
                <td>${new Date(log.createdAt).toLocaleString()}</td>
                <td><code>${log.method} ${log.endpoint}</code></td>
                <td>${log.model || '-'}</td>
                <td class="prompt-cell" title="${escapeHtml(log.prompt || '')}">${escapeHtml(promptPreview)}</td>
                <td class="response-cell" title="${escapeHtml(log.response || log.error || '')}">${escapeHtml(responsePreview)}</td>
                <td class="${statusClass}">${log.status}</td>
                <td>${log.durationMs ? log.durationMs + 'ms' : '-'}</td>
            </tr>
        `;
    }).join('');

    // Render pagination
    const { page, totalPages, total } = pagination;
    let paginationHtml = `<span>Page ${page} of ${totalPages} (${total} total)</span>`;

    if (totalPages > 1) {
        paginationHtml += '<div class="pagination-buttons">';
        if (page > 1) {
            paginationHtml += `<button onclick="goToHistoryPage(${page - 1})" class="btn btn-sm btn-secondary">Previous</button>`;
        }
        if (page < totalPages) {
            paginationHtml += `<button onclick="goToHistoryPage(${page + 1})" class="btn btn-sm btn-secondary">Next</button>`;
        }
        paginationHtml += '</div>';
    }

    document.getElementById('historyPagination').innerHTML = paginationHtml;
}

function goToHistoryPage(page) {
    historyCurrentPage = page;
    loadDeviceHistory();
}

function showLogDetails(logId) {
    // Find the clicked row and get the log data
    const row = document.querySelector(`tr[data-log*='"id":"${logId}"']`);
    if (!row) return;

    const log = JSON.parse(row.dataset.log.replace(/&#39;/g, "'"));

    document.getElementById('logDetailTime').textContent = new Date(log.createdAt).toLocaleString();
    document.getElementById('logDetailEndpoint').textContent = `${log.method} ${log.endpoint}`;
    document.getElementById('logDetailModel').textContent = log.model || 'N/A';
    document.getElementById('logDetailStatus').textContent = log.status;
    document.getElementById('logDetailStatus').className = log.status >= 400 ? 'error-status' : 'success-status';
    document.getElementById('logDetailDuration').textContent = log.durationMs ? `${log.durationMs}ms` : 'N/A';
    document.getElementById('logDetailTokens').textContent = log.tokenCount || 'N/A';
    document.getElementById('logDetailPrompt').textContent = log.prompt || 'No prompt';
    document.getElementById('logDetailResponse').textContent = log.response || log.error || 'No response';

    document.getElementById('logDetailModal').style.display = 'flex';
}

function closeLogDetail() {
    document.getElementById('logDetailModal').style.display = 'none';
}

async function clearDeviceHistory() {
    if (!currentHistoryDeviceId) return;

    if (!confirm('Are you sure you want to clear all API history for this device? This cannot be undone.')) {
        return;
    }

    try {
        await apiCall(`/api/devices/${currentHistoryDeviceId}/history`, {
            method: 'DELETE',
        });

        await loadDeviceHistory();
        alert('History cleared successfully');
    } catch (error) {
        console.error('Failed to clear history:', error);
        alert('Failed to clear history: ' + error.message);
    }
}

// ========== Admin Section ==========

// Load admin data
async function loadAdminData() {
    await Promise.all([
        loadHardwareInfo(),
        loadDiskUsage(),
        loadModels(),
        loadGPUAssignments(),
        loadMaintenanceSettings(),
    ]);
}

// Load hardware information
async function loadHardwareInfo() {
    try {
        const hardware = await apiCall('/api/admin/hardware');
        const hardwareDiv = document.getElementById('hardwareInfo');

        let html = '';

        // GPUs
        if (hardware.gpus && hardware.gpus.length > 0) {
            hardware.gpus.forEach(gpu => {
                html += `
                    <div class="hardware-card">
                        <h3>🎮 GPU ${gpu.id}</h3>
                        <div class="hardware-detail">
                            <strong>Model</strong>
                            <div class="hardware-value">${gpu.name}</div>
                        </div>
                        <div class="gpu-vram">
                            <div><strong>VRAM Total:</strong> ${gpu.vramTotal} MB (${(gpu.vramTotal / 1024).toFixed(1)} GB)</div>
                            <div><strong>VRAM Free:</strong> ${gpu.vramFree} MB (${(gpu.vramFree / 1024).toFixed(1)} GB)</div>
                        </div>
                    </div>
                `;
            });
        }

        // RAM
        if (hardware.ram) {
            html += `
                <div class="hardware-card">
                    <h3>💾 System RAM</h3>
                    <div class="hardware-detail">
                        <strong>Total</strong>
                        <div class="hardware-value">${(hardware.ram.total / 1024).toFixed(1)} GB</div>
                    </div>
                    <div class="hardware-detail">
                        <strong>Available</strong>
                        <div class="hardware-value">${(hardware.ram.available / 1024).toFixed(1)} GB</div>
                    </div>
                </div>
            `;
        }

        // CPU
        if (hardware.cpu && hardware.cpu.model) {
            html += `
                <div class="hardware-card">
                    <h3>⚡ CPU</h3>
                    <div class="hardware-detail">
                        <strong>Model</strong>
                        <div class="hardware-value">${hardware.cpu.model}</div>
                    </div>
                    <div class="hardware-detail">
                        <strong>Cores</strong>
                        <div class="hardware-value">${hardware.cpu.cores}</div>
                    </div>
                </div>
            `;
        }

        if (!html) {
            html = '<p class="placeholder">Hardware information not available</p>';
        }

        hardwareDiv.innerHTML = html;

        // Show recommendations in model library based on hardware
        showHardwareRecommendations(hardware);
    } catch (error) {
        console.error('Failed to load hardware info:', error);
        document.getElementById('hardwareInfo').innerHTML = '<p class="error">Failed to load hardware information</p>';
    }
}

// Show hardware-based model recommendations
function showHardwareRecommendations(hardware) {
    const recommendedDiv = document.getElementById('recommendedModels');

    if (!hardware.gpus || hardware.gpus.length === 0) {
        recommendedDiv.innerHTML = `
            <h3>💡 Recommended for CPU</h3>
            <p>No GPU detected. Here are lightweight models that run well on CPU:</p>
            <div class="recommended-list">
                <div class="recommended-model">
                    <span><strong>phi3:mini</strong> - 2.3GB</span>
                    <button onclick="pullModel('phi3:mini')" class="btn btn-sm btn-secondary">Download</button>
                </div>
                <div class="recommended-model">
                    <span><strong>gemma2:2b</strong> - 1.6GB</span>
                    <button onclick="pullModel('gemma2:2b')" class="btn btn-sm btn-secondary">Download</button>
                </div>
                <div class="recommended-model">
                    <span><strong>llama3.2:3b</strong> - 2GB</span>
                    <button onclick="pullModel('llama3.2:3b')" class="btn btn-sm btn-secondary">Download</button>
                </div>
            </div>
        `;
        return;
    }

    const maxVram = Math.max(...hardware.gpus.map(g => g.vramTotal));
    const vramGB = maxVram / 1024;

    let recommendations = [];
    if (vramGB >= 24) {
        recommendations = [
            { name: 'llama3.1:70b', size: '40GB', desc: 'Best reasoning and capabilities' },
            { name: 'qwen2.5:72b', size: '41GB', desc: 'Top-tier model for complex tasks' },
            { name: 'llama3.1:8b', size: '4.7GB', desc: 'Fast responses' },
        ];
    } else if (vramGB >= 16) {
        recommendations = [
            { name: 'llama3.1:70b', size: '40GB', desc: 'Powerful 70B model (with quantization)' },
            { name: 'llama3.1:8b', size: '4.7GB', desc: 'Great all-around model' },
            { name: 'mistral:7b', size: '4.1GB', desc: 'Efficient and capable' },
        ];
    } else if (vramGB >= 8) {
        recommendations = [
            { name: 'llama3.1:8b', size: '4.7GB', desc: 'Best for 8GB VRAM' },
            { name: 'mistral:7b', size: '4.1GB', desc: 'Efficient alternative' },
            { name: 'qwen2.5-coder:7b', size: '4.7GB', desc: 'For coding tasks' },
        ];
    } else if (vramGB >= 4) {
        recommendations = [
            { name: 'llama3.2:3b', size: '2GB', desc: 'Fast and lightweight' },
            { name: 'phi3:mini', size: '2.3GB', desc: 'Capable small model' },
            { name: 'gemma2:2b', size: '1.6GB', desc: 'Very lightweight' },
        ];
    }

    recommendedDiv.innerHTML = `
        <h3>💡 Recommended for Your ${vramGB.toFixed(0)}GB VRAM</h3>
        <p>Based on your ${hardware.gpus[0].name}, these models will run smoothly:</p>
        <div class="recommended-list">
            ${recommendations.map(model => `
                <div class="recommended-model">
                    <span><strong>${model.name}</strong> - ${model.size} - ${model.desc}</span>
                    <button onclick="pullModel('${model.name}')" class="btn btn-sm btn-secondary">Download</button>
                </div>
            `).join('')}
        </div>
    `;
}

// Load disk usage
async function loadDiskUsage() {
    try {
        const usage = await apiCall('/api/admin/disk-usage');
        const diskDiv = document.getElementById('diskUsage');

        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const usagePercent = ((usage.used / usage.total) * 100).toFixed(1);

        let html = `
            <div class="disk-total">
                <strong>Total Disk:</strong> ${formatBytes(usage.total)} |
                <strong>Used:</strong> ${formatBytes(usage.used)} (${usagePercent}%) |
                <strong>Available:</strong> ${formatBytes(usage.available)}
            </div>
            <div class="disk-breakdown">
        `;

        if (usage.breakdown) {
            for (const [key, data] of Object.entries(usage.breakdown)) {
                const percent = usage.total > 0 ? ((data.bytes / usage.total) * 100).toFixed(1) : 0;
                const countInfo = data.count !== undefined ? ` (${data.count} items)` : '';

                html += `
                    <div class="disk-item">
                        <div class="disk-item-info">
                            <div class="disk-item-label">${data.label}${countInfo}</div>
                            <div class="disk-item-size">${formatBytes(data.bytes)}</div>
                        </div>
                        <div class="disk-item-bar">
                            <div class="disk-item-fill" style="width: ${percent}%"></div>
                        </div>
                        <div class="disk-item-percent">${percent}%</div>
                    </div>
                `;
            }
        }

        html += '</div>';
        diskDiv.innerHTML = html;
    } catch (error) {
        console.error('Failed to load disk usage:', error);
        document.getElementById('diskUsage').innerHTML = '<p class="error">Failed to load disk usage</p>';
    }
}

// Load models
async function loadModels() {
    try {
        const [models, defaultModelData] = await Promise.all([
            apiCall('/api/admin/models'),
            apiCall('/api/admin/settings/default-model'),
        ]);

        const modelsDiv = document.getElementById('modelsList');
        const select = document.getElementById('defaultModelSelect');

        // Populate default model dropdown
        select.innerHTML = models.map(m =>
            `<option value="${m.name}" ${m.name === defaultModelData.defaultModel ? 'selected' : ''}>${m.name}</option>`
        ).join('');

        if (models.length === 0) {
            modelsDiv.innerHTML = '<p class="placeholder">No models installed yet. Use the Model Library to download one!</p>';
            return;
        }

        modelsDiv.innerHTML = models.map(model => {
            const sizeGB = (model.size / (1024 * 1024 * 1024)).toFixed(2);
            const modifiedDate = new Date(model.modified_at).toLocaleDateString();

            return `
                <div class="model-card">
                    <div class="model-info">
                        <div class="model-name">${model.name}</div>
                        <div class="model-details">
                            <span>📦 ${sizeGB} GB</span>
                            <span>📅 Modified: ${modifiedDate}</span>
                            ${model.details?.parameter_size ? `<span>⚙️ ${model.details.parameter_size}</span>` : ''}
                        </div>
                    </div>
                    <div class="model-actions-btns">
                        <button onclick="deleteModel('${model.name}')" class="btn btn-secondary btn-sm">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to load models:', error);
        document.getElementById('modelsList').innerHTML = '<p class="error">Failed to load models</p>';
    }
}

// Set default model
async function setDefaultModel() {
    const select = document.getElementById('defaultModelSelect');
    const model = select.value;

    try {
        await apiCall('/api/admin/settings/default-model', {
            method: 'POST',
            body: JSON.stringify({ model }),
        });

        alert(`✅ Default model set to: ${model}`);
    } catch (error) {
        console.error('Failed to set default model:', error);
        alert('Failed to set default model: ' + error.message);
    }
}

// Refresh models list
async function refreshModels() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>🔄 Loading...</span>';
    btn.disabled = true;

    await loadModels();

    btn.innerHTML = originalText;
    btn.disabled = false;
}

// Show model library
function showModelLibrary() {
    document.getElementById('modelLibraryModal').style.display = 'flex';
}

// Close model library
function closeModelLibrary() {
    document.getElementById('modelLibraryModal').style.display = 'none';
}

// Pull/download a model
async function pullModel(modelName) {
    const confirmed = confirm(`Download model: ${modelName}?\n\nThis may take several minutes depending on the model size and your internet connection.`);

    if (!confirmed) return;

    try {
        // Disable the button
        const allButtons = document.querySelectorAll(`button[onclick="pullModel('${modelName}')"]`);
        allButtons.forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '⏳ Downloading...';
        });

        await apiCall('/api/admin/models/pull', {
            method: 'POST',
            body: JSON.stringify({ name: modelName }),
        });

        alert(`✅ Model ${modelName} downloaded successfully!`);

        // Reload models list
        await loadModels();

        // Close modal
        closeModelLibrary();
    } catch (error) {
        console.error('Failed to pull model:', error);
        alert(`Failed to download model: ${error.message}`);

        // Re-enable buttons
        const allButtons = document.querySelectorAll(`button[onclick="pullModel('${modelName}')"]`);
        allButtons.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = 'Download';
        });
    }
}

// Delete a model
async function deleteModel(modelName) {
    const confirmed = confirm(`Are you sure you want to delete model: ${modelName}?\n\nThis will free up disk space but you'll need to re-download it if you want to use it again.`);

    if (!confirmed) return;

    try {
        await apiCall(`/api/admin/models/${encodeURIComponent(modelName)}`, {
            method: 'DELETE',
        });

        alert(`✅ Model ${modelName} deleted successfully!`);
        await loadModels();
    } catch (error) {
        console.error('Failed to delete model:', error);
        alert(`Failed to delete model: ${error.message}`);
    }
}

// ========== Maintenance Mode ==========

// Load maintenance settings
async function loadMaintenanceSettings() {
    try {
        const settings = await apiCall('/api/admin/settings/maintenance');

        // Update form fields
        document.getElementById('maintenanceEnabled').checked = settings.enabled || false;
        document.getElementById('maintenanceStart').value = settings.startHour || 2;
        document.getElementById('maintenanceEnd').value = settings.endHour || 6;
        document.getElementById('maintenanceGPUs').value = settings.gpus || 'both';
        document.getElementById('maintenanceMessage').value = settings.message || '';

        // Show/hide schedule section based on enabled state
        const scheduleDiv = document.getElementById('maintenanceSchedule');
        if (settings.enabled) {
            scheduleDiv.style.display = 'block';
            await updateMaintenanceStatus();
        } else {
            scheduleDiv.style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to load maintenance settings:', error);
    }
}

// Update maintenance settings
async function updateMaintenanceSettings() {
    const enabled = document.getElementById('maintenanceEnabled').checked;
    const startHour = parseInt(document.getElementById('maintenanceStart').value);
    const endHour = parseInt(document.getElementById('maintenanceEnd').value);
    const gpus = document.getElementById('maintenanceGPUs').value;
    const message = document.getElementById('maintenanceMessage').value;

    // Show/hide schedule section
    const scheduleDiv = document.getElementById('maintenanceSchedule');
    if (enabled) {
        scheduleDiv.style.display = 'block';
    } else {
        scheduleDiv.style.display = 'none';
    }

    try {
        await apiCall('/api/admin/settings/maintenance', {
            method: 'POST',
            body: JSON.stringify({
                enabled,
                startHour,
                endHour,
                gpus,
                message: message || null,
            }),
        });

        // Update status display
        if (enabled) {
            await updateMaintenanceStatus();
        }
    } catch (error) {
        console.error('Failed to update maintenance settings:', error);
        alert('Failed to save maintenance settings: ' + error.message);
    }
}

// Update maintenance status display
async function updateMaintenanceStatus() {
    try {
        const status = await apiCall('/api/admin/maintenance/status');
        const statusDiv = document.getElementById('maintenanceStatus');

        let html = '';

        if (status.inMaintenance) {
            const eta = new Date(status.nextAvailable);
            html = `
                <div class="alert alert-warning">
                    <strong>⚠️ System Currently in Maintenance</strong><br>
                    Users are seeing a maintenance page.<br>
                    System will be available again at: ${eta.toLocaleTimeString()}
                </div>
            `;
        } else if (status.maintenanceWindow) {
            html = `
                <div class="alert alert-info">
                    <strong>ℹ️ In Maintenance Window</strong><br>
                    Currently using ${status.gpusInMaintenance} for training.<br>
                    ${status.gpusAvailable !== 'none' ? `Chats are still available using ${status.gpusAvailable}.` : 'All GPUs in use.'}
                </div>
            `;
        } else {
            const start = status.startHour || 2;
            const end = status.endHour || 6;
            const formatHour = (hour) => {
                const period = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                return `${displayHour}:00 ${period}`;
            };

            html = `
                <div class="alert alert-success">
                    <strong>✅ System Available</strong><br>
                    Next maintenance window: ${formatHour(start)} - ${formatHour(end)}
                </div>
            `;
        }

        statusDiv.innerHTML = html;
    } catch (error) {
        console.error('Failed to update maintenance status:', error);
        document.getElementById('maintenanceStatus').innerHTML = `
            <div class="alert alert-error">
                Failed to check maintenance status
            </div>
        `;
    }
}

// Delete user functionality
let deleteUserData = null;

function showDeleteUserModal(userId, userName, userEmail, deleteType) {
    deleteUserData = { userId, userName, userEmail, deleteType };
    const modal = document.getElementById('deleteUserModal');
    const message = document.getElementById('deleteUserMessage');

    if (deleteType === 'archive') {
        message.innerHTML = `You are about to delete <strong>${userName}</strong> (${userEmail}).<br><br>All conversations will be downloaded as a backup file before deletion. This action cannot be undone.`;
    } else {
        message.innerHTML = `You are about to permanently delete <strong>${userName}</strong> (${userEmail}).<br><br>ALL data will be deleted with no backup. This action cannot be undone.`;
    }

    document.getElementById('deleteUserPassword').value = '';
    document.getElementById('deleteUserError').textContent = '';
    modal.classList.add('active');
}

function closeDeleteUserModal() {
    const modal = document.getElementById('deleteUserModal');
    modal.classList.remove('active');
    deleteUserData = null;
}

async function confirmDeleteUser() {
    const password = document.getElementById('deleteUserPassword').value;
    const errorDiv = document.getElementById('deleteUserError');

    if (!password) {
        errorDiv.textContent = 'Please enter your password';
        return;
    }

    errorDiv.textContent = '';

    try {
        const response = await apiCall('/api/parent/delete-user', {
            method: 'POST',
            body: JSON.stringify({
                targetUserId: deleteUserData.userId,
                deleteType: deleteUserData.deleteType,
                password: password
            })
        });

        if (response.success) {
            // If archive type, download the data
            if (deleteUserData.deleteType === 'archive' && response.archive) {
                downloadUserArchive(response.archive);
            }

            closeDeleteUserModal();
            alert(`User ${deleteUserData.userName} has been deleted successfully.`);
            await loadUsers(); // Reload the user list
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Failed to delete user';
    }
}

function downloadUserArchive(archiveData) {
    const dataStr = JSON.stringify(archiveData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = 'hal-archive-' + archiveData.user.email + '-' + timestamp + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ========== GPU Service Assignment ==========

// Load GPU assignments
async function loadGPUAssignments() {
    try {
        const settings = await apiCall('/api/admin/settings');

        // Set GPU assignments
        document.getElementById('chatGPU').value = settings.chatGPU || '';
        document.getElementById('imageGenGPU').value = settings.imageGenGPU || '';
        document.getElementById('knowledgeBaseGPU').value = settings.knowledgeBaseGPU || '';

        // Set enable/disable toggles
        document.getElementById('imageGenEnabled').checked = settings.imageGenEnabled || false;
        document.getElementById('knowledgeBaseEnabled').checked = settings.knowledgeBaseEnabled !== false; // Default true

        // Toggle GPU selects based on enabled state
        const imageGenGPUGroup = document.getElementById('imageGenGPUGroup');
        imageGenGPUGroup.style.display = settings.imageGenEnabled ? 'block' : 'none';

        const knowledgeBaseGPUGroup = document.getElementById('knowledgeBaseGPUGroup');
        knowledgeBaseGPUGroup.style.display = (settings.knowledgeBaseEnabled !== false) ? 'block' : 'none';
    } catch (error) {
        console.error('Failed to load GPU assignments:', error);
    }
}

// Toggle GPU select visibility for Image Gen
function toggleImageGenGPU() {
    const imageGenEnabled = document.getElementById('imageGenEnabled').checked;
    const imageGenGPUGroup = document.getElementById('imageGenGPUGroup');
    imageGenGPUGroup.style.display = imageGenEnabled ? 'block' : 'none';
}

// Toggle GPU select visibility for Knowledge Base
function toggleKnowledgeBaseGPU() {
    const knowledgeBaseEnabled = document.getElementById('knowledgeBaseEnabled').checked;
    const knowledgeBaseGPUGroup = document.getElementById('knowledgeBaseGPUGroup');
    knowledgeBaseGPUGroup.style.display = knowledgeBaseEnabled ? 'block' : 'none';
}

// Update GPU assignments
async function updateGPUAssignments() {
    const saveBtn = document.getElementById('gpuSaveBtn');
    const saveStatus = document.getElementById('gpuSaveStatus');
    const imageGenEnabled = document.getElementById('imageGenEnabled').checked;
    const knowledgeBaseEnabled = document.getElementById('knowledgeBaseEnabled').checked;

    // Show saving state
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Saving...';
    saveStatus.textContent = '';
    saveStatus.className = 'save-status';

    try {
        await apiCall('/api/admin/settings/gpu', {
            method: 'POST',
            body: JSON.stringify({
                chatGPU: document.getElementById('chatGPU').value || null,
                imageGenEnabled,
                imageGenGPU: imageGenEnabled ? (document.getElementById('imageGenGPU').value || null) : null,
                knowledgeBaseEnabled,
                knowledgeBaseGPU: knowledgeBaseEnabled ? (document.getElementById('knowledgeBaseGPU').value || null) : null,
            }),
        });

        // Show success
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save GPU Assignments';
        saveStatus.textContent = '✓ Saved successfully';
        saveStatus.className = 'save-status success';

        // Clear success message after 3 seconds
        setTimeout(() => {
            saveStatus.textContent = '';
        }, 3000);

        console.log('GPU assignments updated successfully');
    } catch (error) {
        console.error('Failed to update GPU assignments:', error);

        // Show error
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save GPU Assignments';
        saveStatus.textContent = '✗ Failed to save: ' + error.message;
        saveStatus.className = 'save-status error';
    }
}

// ========== GROUP MANAGEMENT ==========

// Load groups
async function loadGroups() {
    try {
        const groups = await apiCall('/api/parent/groups');

        const groupsDiv = document.getElementById('groupsList');
        if (groups.length === 0) {
            groupsDiv.innerHTML = '<p class="placeholder">No groups created yet. Create one above!</p>';
            return;
        }

        groupsDiv.innerHTML = groups.map(g => `
            <div class="group-card" style="border-left: 4px solid ${g.color || '#3b82f6'};">
                <div class="group-info">
                    <div class="group-name" style="color: ${g.color || '#3b82f6'};">${g.name}</div>
                    ${g.description ? `<div class="group-description">${g.description}</div>` : ''}
                    <div class="group-meta">
                        <span>${g._count?.members || 0} members</span>
                    </div>
                </div>
                <div class="group-actions">
                    <button onclick="openGroupDetails('${g.id}')" class="btn btn-sm btn-primary">Manage Members</button>
                    <button onclick="deleteGroup('${g.id}')" class="btn btn-sm btn-danger">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load groups:', error);
        document.getElementById('groupsList').innerHTML = '<p class="error">Failed to load groups</p>';
    }
}

// Create group
async function createGroup() {
    const name = document.getElementById('newGroupName').value.trim();
    const description = document.getElementById('newGroupDescription').value.trim();
    const color = document.getElementById('newGroupColor').value;

    if (!name) {
        alert('Please enter a group name');
        return;
    }

    try {
        await apiCall('/api/parent/groups', {
            method: 'POST',
            body: JSON.stringify({ name, description, color }),
        });

        // Clear inputs
        document.getElementById('newGroupName').value = '';
        document.getElementById('newGroupDescription').value = '';
        document.getElementById('newGroupColor').value = '#3b82f6';

        // Reload groups
        loadGroups();
    } catch (error) {
        console.error('Failed to create group:', error);
        alert('Failed to create group: ' + error.message);
    }
}

// Delete group
async function deleteGroup(groupId) {
    if (!confirm('Delete this group? Members will be removed from it.')) {
        return;
    }

    try {
        await apiCall(`/api/parent/groups/${groupId}`, {
            method: 'DELETE',
        });

        loadGroups();
    } catch (error) {
        console.error('Failed to delete group:', error);
        alert('Failed to delete group: ' + error.message);
    }
}

// Current group being edited
let currentGroupId = null;

// Open group details modal
async function openGroupDetails(groupId) {
    currentGroupId = groupId;

    try {
        const [group, allUsers] = await Promise.all([
            apiCall(`/api/parent/groups/${groupId}`),
            apiCall('/api/parent/users'),
        ]);

        document.getElementById('groupDetailsTitle').textContent = group.name;

        // Show members
        const membersDiv = document.getElementById('groupMembers');
        if (group.members.length === 0) {
            membersDiv.innerHTML = '<p class="placeholder">No members yet</p>';
        } else {
            membersDiv.innerHTML = group.members.map(m => `
                <div class="group-member-item">
                    <div class="member-info">
                        <span class="member-name">${m.user.firstName}</span>
                        <span class="member-email">${m.user.email}</span>
                        ${m.isGroupAdmin ? '<span class="badge badge-primary" style="font-size: 10px;">Admin</span>' : ''}
                    </div>
                    <div class="member-actions">
                        <button onclick="toggleGroupAdmin('${m.userId}', ${!m.isGroupAdmin})" class="btn btn-sm btn-secondary">
                            ${m.isGroupAdmin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                        <button onclick="removeFromGroup('${m.userId}')" class="btn btn-sm btn-danger">Remove</button>
                    </div>
                </div>
            `).join('');
        }

        // Populate add member select (exclude current members)
        const memberIds = group.members.map(m => m.userId);
        const nonMembers = allUsers.filter(u => !memberIds.includes(u.id));
        const addMemberSelect = document.getElementById('addMemberSelect');
        addMemberSelect.innerHTML = '<option value="">Select a user...</option>' +
            nonMembers.map(u => `<option value="${u.id}">${u.firstName} (${u.email})</option>`).join('');

        document.getElementById('groupDetailsModal').style.display = 'flex';
    } catch (error) {
        console.error('Failed to load group details:', error);
        alert('Failed to load group details: ' + error.message);
    }
}

// Close group details modal
function closeGroupDetails() {
    document.getElementById('groupDetailsModal').style.display = 'none';
    currentGroupId = null;
}

// Add member to group
async function addMemberToGroup() {
    const userId = document.getElementById('addMemberSelect').value;
    const isGroupAdmin = document.getElementById('addMemberAsAdmin').checked;

    if (!userId) {
        alert('Please select a user');
        return;
    }

    try {
        await apiCall(`/api/parent/groups/${currentGroupId}/members`, {
            method: 'POST',
            body: JSON.stringify({ userId, isGroupAdmin }),
        });

        // Reload group details
        openGroupDetails(currentGroupId);
        loadGroups();
    } catch (error) {
        console.error('Failed to add member:', error);
        alert('Failed to add member: ' + error.message);
    }
}

// Remove member from group
async function removeFromGroup(userId) {
    if (!confirm('Remove this user from the group?')) {
        return;
    }

    try {
        await apiCall(`/api/parent/groups/${currentGroupId}/members/${userId}`, {
            method: 'DELETE',
        });

        openGroupDetails(currentGroupId);
        loadGroups();
    } catch (error) {
        console.error('Failed to remove member:', error);
        alert('Failed to remove member: ' + error.message);
    }
}

// Toggle group admin status
async function toggleGroupAdmin(userId, makeAdmin) {
    try {
        await apiCall(`/api/parent/groups/${currentGroupId}/members/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({ isGroupAdmin: makeAdmin, canViewAll: makeAdmin }),
        });

        openGroupDetails(currentGroupId);
    } catch (error) {
        console.error('Failed to update member:', error);
        alert('Failed to update member: ' + error.message);
    }
}

// ========== ROLE MANAGEMENT ==========

// Load roles
async function loadRoles() {
    try {
        const roles = await apiCall('/api/parent/roles');

        const rolesDiv = document.getElementById('rolesList');
        if (roles.length === 0) {
            rolesDiv.innerHTML = '<p class="placeholder">No roles defined yet</p>';
            return;
        }

        rolesDiv.innerHTML = roles.map(r => {
            const permissions = [];
            if (r.canManageUsers) permissions.push('Users');
            if (r.canManageGroups) permissions.push('Groups');
            if (r.canManageRoles) permissions.push('Roles');
            if (r.canViewAllConvos) permissions.push('View All');
            if (r.canManageSystem) permissions.push('System');
            if (r.canCreateInvites) permissions.push('Invites');
            if (r.canDeleteConvos) permissions.push('Delete');

            return `
                <div class="role-card" style="border-left: 4px solid ${r.color || '#6b7280'};">
                    <div class="role-info">
                        <div class="role-name" style="color: ${r.color || '#6b7280'};">
                            ${r.name}
                            ${r.isSystem ? '<span class="badge badge-secondary" style="font-size: 10px; margin-left: 8px;">System</span>' : ''}
                        </div>
                        ${r.description ? `<div class="role-description">${r.description}</div>` : ''}
                        <div class="role-permissions">
                            ${permissions.length > 0 ? permissions.map(p => `<span class="perm-badge">${p}</span>`).join('') : '<span style="color: var(--text-secondary);">No special permissions</span>'}
                        </div>
                        <div class="role-meta">
                            <span>${r._count?.users || 0} users</span>
                        </div>
                    </div>
                    <div class="role-actions">
                        ${!r.isSystem ? `<button onclick="deleteRole('${r.id}')" class="btn btn-sm btn-danger">Delete</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to load roles:', error);
        document.getElementById('rolesList').innerHTML = '<p class="error">Failed to load roles</p>';
    }
}

// Create role
async function createRole() {
    const name = document.getElementById('newRoleName').value.trim();
    const description = document.getElementById('newRoleDescription').value.trim();
    const color = document.getElementById('newRoleColor').value;

    if (!name) {
        alert('Please enter a role name');
        return;
    }

    const permissions = {
        canManageUsers: document.getElementById('perm_canManageUsers').checked,
        canManageGroups: document.getElementById('perm_canManageGroups').checked,
        canManageRoles: document.getElementById('perm_canManageRoles').checked,
        canViewAllConvos: document.getElementById('perm_canViewAllConvos').checked,
        canManageSystem: document.getElementById('perm_canManageSystem').checked,
        canCreateInvites: document.getElementById('perm_canCreateInvites').checked,
        canDeleteConvos: document.getElementById('perm_canDeleteConvos').checked,
    };

    try {
        await apiCall('/api/parent/roles', {
            method: 'POST',
            body: JSON.stringify({ name, description, color, ...permissions }),
        });

        // Clear inputs
        document.getElementById('newRoleName').value = '';
        document.getElementById('newRoleDescription').value = '';
        document.getElementById('newRoleColor').value = '#6b7280';
        document.querySelectorAll('.permissions-grid input[type="checkbox"]').forEach(cb => cb.checked = false);

        loadRoles();
    } catch (error) {
        console.error('Failed to create role:', error);
        alert('Failed to create role: ' + error.message);
    }
}

// Delete role
async function deleteRole(roleId) {
    if (!confirm('Delete this role? Users with this role will need to be reassigned.')) {
        return;
    }

    try {
        await apiCall(`/api/parent/roles/${roleId}`, {
            method: 'DELETE',
        });

        loadRoles();
    } catch (error) {
        console.error('Failed to delete role:', error);
        alert('Failed to delete role: ' + error.message);
    }
}

// ========== USER EDITING ==========

let currentEditUserId = null;

// Open user edit modal
async function openUserEdit(userId) {
    currentEditUserId = userId;

    try {
        const [users, roles, groups] = await Promise.all([
            apiCall('/api/parent/users'),
            apiCall('/api/parent/roles'),
            apiCall('/api/parent/groups'),
        ]);

        const editUser = users.find(u => u.id === userId);
        if (!editUser) {
            alert('User not found');
            return;
        }

        document.getElementById('userEditTitle').textContent = `Edit ${editUser.firstName}`;

        // Populate role select
        const roleSelect = document.getElementById('userEditRole');
        roleSelect.innerHTML = roles.map(r =>
            `<option value="${r.id}" ${r.id === editUser.roleId ? 'selected' : ''}>${r.name}</option>`
        ).join('');

        // Show current group memberships
        const userGroupsDiv = document.getElementById('userGroupsList');
        const userGroupIds = (editUser.groupMemberships || []).map(gm => gm.group.id);

        userGroupsDiv.innerHTML = groups.map(g => {
            const membership = editUser.groupMemberships?.find(gm => gm.group.id === g.id);
            const isMember = !!membership;

            return `
                <div class="user-group-item">
                    <label class="toggle-label">
                        <input type="checkbox" data-group-id="${g.id}" ${isMember ? 'checked' : ''}>
                        <span style="color: ${g.color || '#3b82f6'};">${g.name}</span>
                    </label>
                    ${isMember ? `
                        <label class="toggle-label" style="margin-left: 20px;">
                            <input type="checkbox" data-group-admin="${g.id}" ${membership.isGroupAdmin ? 'checked' : ''}>
                            <span>Group Admin</span>
                        </label>
                    ` : ''}
                </div>
            `;
        }).join('');

        document.getElementById('userEditModal').style.display = 'flex';
    } catch (error) {
        console.error('Failed to open user edit:', error);
        alert('Failed to load user data: ' + error.message);
    }
}

// Close user edit modal
function closeUserEdit() {
    document.getElementById('userEditModal').style.display = 'none';
    currentEditUserId = null;
}

// Save user changes
async function saveUserChanges() {
    const roleId = document.getElementById('userEditRole').value;

    try {
        // Update role
        await apiCall(`/api/parent/users/${currentEditUserId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ roleId }),
        });

        // Update group memberships
        const groupCheckboxes = document.querySelectorAll('#userGroupsList input[data-group-id]');
        for (const cb of groupCheckboxes) {
            const groupId = cb.dataset.groupId;
            const shouldBeMember = cb.checked;
            const adminCb = document.querySelector(`input[data-group-admin="${groupId}"]`);
            const isAdmin = adminCb?.checked || false;

            // Get current membership status
            const users = await apiCall('/api/parent/users');
            const editUser = users.find(u => u.id === currentEditUserId);
            const currentMembership = editUser?.groupMemberships?.find(gm => gm.group.id === groupId);

            if (shouldBeMember && !currentMembership) {
                // Add to group
                await apiCall(`/api/parent/groups/${groupId}/members`, {
                    method: 'POST',
                    body: JSON.stringify({ userId: currentEditUserId, isGroupAdmin: isAdmin }),
                });
            } else if (!shouldBeMember && currentMembership) {
                // Remove from group
                await apiCall(`/api/parent/groups/${groupId}/members/${currentEditUserId}`, {
                    method: 'DELETE',
                });
            } else if (shouldBeMember && currentMembership && currentMembership.isGroupAdmin !== isAdmin) {
                // Update admin status
                await apiCall(`/api/parent/groups/${groupId}/members/${currentEditUserId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ isGroupAdmin: isAdmin }),
                });
            }
        }

        closeUserEdit();
        loadUsers();
        alert('User updated successfully');
    } catch (error) {
        console.error('Failed to save user changes:', error);
        alert('Failed to save changes: ' + error.message);
    }
}

// Load overview on start
loadOverview();
