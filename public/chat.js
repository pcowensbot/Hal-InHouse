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
    sidebar.classList.toggle('collapsed');
}

// Auto-resize textarea
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
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
let currentConversationId = null;
let conversations = [];

// Initialize
document.getElementById('userName').textContent = user.firstName;

// Show dashboard button for parents
if (user.role === 'PARENT') {
    document.getElementById('dashboardBtn').style.display = 'block';
}

// Initialize theme
initTheme();

// Load conversations
async function loadConversations() {
    try {
        conversations = await apiCall('/api/chat/conversations');
        renderConversations();
    } catch (error) {
        console.error('Failed to load conversations:', error);
    }
}

function renderConversations() {
    const list = document.getElementById('conversationList');

    if (conversations.length === 0) {
        list.innerHTML = '<div class="empty-state">No conversations yet</div>';
        return;
    }

    list.innerHTML = conversations.map(conv => `
        <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}"
             onclick="loadConversation('${conv.id}')">
            <div class="conversation-info">
                <div class="conversation-title">${conv.title}</div>
                <div class="conversation-date">${formatDate(conv.updatedAt)}</div>
            </div>
            <div class="conversation-actions">
                <button class="rename-conversation-btn"
                        onclick="event.stopPropagation(); renameConversation('${conv.id}')"
                        title="Rename conversation">✏️</button>
                <button class="star-conversation-btn ${conv.starred ? 'starred' : ''}"
                        onclick="event.stopPropagation(); toggleStar('${conv.id}', ${!conv.starred})"
                        title="${conv.starred ? 'Unstar' : 'Star'} conversation">
                    ${conv.starred ? '⭐' : '☆'}
                </button>
                <button class="delete-conversation-btn"
                        onclick="event.stopPropagation(); deleteConversation('${conv.id}')"
                        title="Delete conversation">×</button>
            </div>
        </div>
    `).join('');
}

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

// Load conversation
async function loadConversation(id) {
    try {
        currentConversationId = id;
        const conversation = await apiCall(`/api/chat/conversations/${id}`);

        document.getElementById('chatTitle').textContent = conversation.title;
        document.getElementById('welcomeMessage').style.display = 'none';
        document.getElementById('inputArea').style.display = 'block';

        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';

        for (const msg of conversation.messages) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.role}`;
            messageDiv.dataset.messageId = msg.id;

            if (msg.role === 'assistant') {
                messageDiv.innerHTML = `
                    <div class="message-content">${formatMessage(msg.content)}</div>
                    <div class="message-footer">
                        <div class="message-time">${new Date(msg.createdAt).toLocaleTimeString()}</div>
                        <button class="star-message-btn" onclick="starMessage('${msg.id}')" title="Save to Knowledge Base">⭐</button>
                    </div>
                `;
            } else {
                messageDiv.innerHTML = `
                    <div class="message-content">${formatMessage(msg.content)}</div>
                    <div class="message-time">${new Date(msg.createdAt).toLocaleTimeString()}</div>
                `;
            }

            messagesDiv.appendChild(messageDiv);
        }

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        renderConversations();
    } catch (error) {
        console.error('Failed to load conversation:', error);
        alert('Failed to load conversation');
    }
}

// Toggle star on conversation
async function toggleStar(id, starred) {
    try {
        await apiCall(`/api/chat/conversations/${id}/star`, {
            method: 'PATCH',
            body: JSON.stringify({ starred }),
        });

        // Update local state
        const conv = conversations.find(c => c.id === id);
        if (conv) {
            conv.starred = starred;
        }

        // Re-sort and re-render
        await loadConversations();
    } catch (error) {
        console.error('Failed to toggle star:', error);
        alert('Failed to star conversation: ' + error.message);
    }
}

// Delete conversation
async function deleteConversation(id) {
    if (!confirm('Are you sure you want to delete this chat?')) {
        return;
    }

    try {
        await apiCall(`/api/chat/conversations/${id}`, {
            method: 'DELETE',
        });

        // Remove from local state
        conversations = conversations.filter(c => c.id !== id);

        // If deleting current conversation, clear the chat
        if (currentConversationId === id) {
            currentConversationId = null;
            document.getElementById('chatTitle').textContent = 'HAL';
            document.getElementById('welcomeMessage').style.display = 'flex';
            document.getElementById('inputArea').style.display = 'none';
            document.getElementById('messages').innerHTML = '';
        }

        // Re-render conversations
        renderConversations();
    } catch (error) {
        console.error('Failed to delete conversation:', error);
        alert('Failed to delete conversation: ' + error.message);
    }
}

// New chat
document.getElementById('newChatBtn').addEventListener('click', async () => {
    try {
        const conversation = await apiCall('/api/chat/conversations', {
            method: 'POST',
            body: JSON.stringify({ title: 'New Chat' }),
        });
        
        conversations.unshift(conversation);
        await loadConversation(conversation.id);
    } catch (error) {
        console.error('Failed to create conversation:', error);
        alert('Failed to create new chat');
    }
});

// Send message
document.getElementById('messageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentConversationId) {
        alert('Please select or create a conversation first');
        return;
    }

    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;

    // Clear input and reset height
    input.value = '';
    input.style.height = 'auto';
    
    // Add user message to UI immediately
    const messagesDiv = document.getElementById('messages');
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user';
    userMessageDiv.innerHTML = `
        <div class="message-content">${formatMessage(content)}</div>
        <div class="message-time">${new Date().toLocaleTimeString()}</div>
    `;
    messagesDiv.appendChild(userMessageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant loading';
    loadingDiv.innerHTML = `
        <div class="message-content">Thinking...</div>
    `;
    messagesDiv.appendChild(loadingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
        const response = await apiCall(`/api/chat/conversations/${currentConversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });

        // Remove loading indicator
        loadingDiv.remove();

        // Add assistant message
        const assistantMessageDiv = document.createElement('div');
        assistantMessageDiv.className = 'message assistant';
        assistantMessageDiv.dataset.messageId = response.assistantMessage.id;
        assistantMessageDiv.innerHTML = `
            <div class="message-content">${formatMessage(response.assistantMessage.content)}</div>
            <div class="message-footer">
                <div class="message-time">${new Date(response.assistantMessage.createdAt).toLocaleTimeString()}</div>
                <button class="star-message-btn" onclick="starMessage('${response.assistantMessage.id}')" title="Save to Knowledge Base">⭐</button>
            </div>
        `;
        messagesDiv.appendChild(assistantMessageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // Reload conversations to update sidebar
        await loadConversations();
    } catch (error) {
        loadingDiv.remove();
        console.error('Failed to send message:', error);
        alert('Failed to send message: ' + error.message);
    }
});

// Auto-resize textarea on input
document.getElementById('messageInput').addEventListener('input', function() {
    autoResizeTextarea(this);
});

// Enter to send (Shift+Enter for new line)
document.getElementById('messageInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('messageForm').dispatchEvent(new Event('submit'));
    }
});

// Profile button
document.getElementById('profileBtn').addEventListener('click', () => {
    window.location.href = '/profile.html';
});

// Dashboard button (for parents)
document.getElementById('dashboardBtn')?.addEventListener('click', () => {
    window.location.href = '/parent.html';
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('hal_token');
    localStorage.removeItem('hal_user');
    window.location.href = '/';
});

// Utility
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

// Image generation functions
function openImageModal() {
    document.getElementById('imageModal').style.display = 'flex';
    document.getElementById('imagePrompt').focus();
    // Reset form and results
    document.getElementById('imageForm').reset();
    document.getElementById('imageResult').style.display = 'none';
    document.getElementById('imageLoading').style.display = 'none';
}

function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
}

// New Image button click handler
document.getElementById('newImageBtn').addEventListener('click', openImageModal);

// Image form submission
document.getElementById('imageForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const prompt = document.getElementById('imagePrompt').value.trim();
    if (!prompt) return;

    // Show loading state
    document.getElementById('imageLoading').style.display = 'block';
    document.getElementById('imageResult').style.display = 'none';
    document.getElementById('generateBtn').disabled = true;
    document.getElementById('generateBtn').textContent = 'Generating...';

    try {
        const response = await apiCall('/api/image/generate', {
            method: 'POST',
            body: JSON.stringify({ prompt }),
        });

        // Show the generated image
        document.getElementById('generatedImage').src = response.image_url;
        document.getElementById('imagePromptDisplay').textContent = `Prompt: "${response.prompt}"`;
        document.getElementById('imageLoading').style.display = 'none';
        document.getElementById('imageResult').style.display = 'block';

    } catch (error) {
        console.error('Image generation failed:', error);
        document.getElementById('imageLoading').style.display = 'none';
        alert('Failed to generate image: ' + error.message);
    } finally {
        document.getElementById('generateBtn').disabled = false;
        document.getElementById('generateBtn').textContent = 'Generate Image';
    }
});

// Close modal on background click
document.getElementById('imageModal').addEventListener('click', (e) => {
    if (e.target.id === 'imageModal') {
        closeImageModal();
    }
});

// Star a message
async function starMessage(messageId) {
    const title = prompt('Give this a title for your Knowledge Base:');
    if (!title) return; // User cancelled

    const note = prompt('Add any notes (optional):') || '';

    try {
        await apiCall('/api/knowledge/notes', {
            method: 'POST',
            body: JSON.stringify({
                messageId,
                title,
                note,
            }),
        });

        alert('✅ Saved to Knowledge Base!');
    } catch (error) {
        console.error('Failed to star message:', error);
        alert('Failed to save: ' + error.message);
    }
}

// Rename conversation
async function renameConversation(id) {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;

    const newTitle = prompt('Enter new title:', conv.title);
    if (!newTitle || newTitle === conv.title) return;

    try {
        await apiCall(`/api/chat/conversations/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ title: newTitle }),
        });

        // Update local state
        conv.title = newTitle;
        if (currentConversationId === id) {
            document.getElementById('chatTitle').textContent = newTitle;
        }
        renderConversations();
    } catch (error) {
        console.error('Failed to rename conversation:', error);
        alert('Failed to rename: ' + error.message);
    }
}

// Load conversations on start
loadConversations();
