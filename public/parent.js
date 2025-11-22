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
    } else if (tabName === 'invites') {
        loadInvites();
    } else if (tabName === 'devices') {
        loadDevices();
    } else if (tabName === 'admin') {
        loadAdminData();
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

            // Determine role display text
            let roleText = u.role;
            if (u.role === 'SUPER_ADMIN') roleText = 'Super Admin';
            else if (u.role === 'PARENT') roleText = 'Parent';
            else if (u.role === 'CHILD') roleText = 'Child';

            // Determine role badge class
            const badgeClass = (u.role === 'SUPER_ADMIN' || u.role === 'PARENT') ? 'badge-primary' : 'badge-secondary';

            // Don't show toggle button for current user
            const isCurrentUser = u.id === user.id;
            const toggleButton = !isCurrentUser
                ? `<button onclick="toggleUserStatus('${u.id}')" class="btn btn-sm ${u.isActive ? 'btn-secondary' : 'btn-primary'}">
                       ${u.isActive ? 'Disable' : 'Enable'}
                   </button>`
                : '';

            return `
                <div class="user-card ${!u.isActive ? 'user-disabled' : ''}">
                    <div class="user-avatar">${avatarContent}</div>
                    <div class="user-details">
                        <div class="user-name">
                            ${u.firstName}
                            ${!u.isActive ? '<span style="color: var(--danger); margin-left: 8px;">(Disabled)</span>' : ''}
                        </div>
                        <div class="user-email">${u.email}</div>
                        <div class="user-meta">
                            <span class="badge ${badgeClass}">${roleText}</span>
                            <span>${u._count.conversations} conversations</span>
                        </div>
                    </div>
                    <div class="user-actions">
                        ${toggleButton}
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

// ========== Admin Section ==========

// Load admin data
async function loadAdminData() {
    await Promise.all([
        loadHardwareInfo(),
        loadDiskUsage(),
        loadModels(),
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

// Load overview on start
loadOverview();
