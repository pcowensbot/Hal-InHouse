// Check authentication
const token = localStorage.getItem('hal_token');
const user = JSON.parse(localStorage.getItem('hal_user'));

if (!token || !user) {
    window.location.href = '/';
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

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('hal_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeSelection(savedTheme);
}

function updateThemeSelection(theme) {
    document.getElementById('lightTheme').classList.toggle('active', theme === 'light');
    document.getElementById('darkTheme').classList.toggle('active', theme === 'dark');
}

function selectTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hal_theme', theme);
    updateThemeSelection(theme);
}

// Initialize page
document.getElementById('userName').textContent = user.firstName;
document.getElementById('displayName').value = user.firstName;
document.getElementById('displayEmail').value = user.email;
document.getElementById('displayRole').value = user.role;

// Show dashboard link for parents
if (user.role === 'PARENT') {
    document.getElementById('dashboardLink').style.display = 'block';
}

// Load avatar
function loadAvatar() {
    const savedAvatar = localStorage.getItem('hal_avatar');
    const avatarPreview = document.getElementById('avatarPreview');
    
    if (savedAvatar) {
        avatarPreview.innerHTML = `<img src="${savedAvatar}" alt="Avatar">`;
    } else {
        avatarPreview.innerHTML = user.firstName.charAt(0).toUpperCase();
    }
}

// Handle avatar upload
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const avatarData = e.target.result;
        localStorage.setItem('hal_avatar', avatarData);
        loadAvatar();
        
        // In a real app, you'd upload this to the server
        // For now, we're just storing it in localStorage
        showMessage('Avatar updated successfully!', 'success');
    };
    reader.readAsDataURL(file);
}

// Remove avatar
function removeAvatar() {
    localStorage.removeItem('hal_avatar');
    loadAvatar();
    showMessage('Avatar removed', 'success');
}

// Update profile
async function updateProfile() {
    const firstName = document.getElementById('displayName').value.trim();
    
    if (!firstName) {
        showMessage('Name cannot be empty', 'error');
        return;
    }

    try {
        // In a real app, you'd send this to the server
        // For now, we'll just update localStorage
        user.firstName = firstName;
        localStorage.setItem('hal_user', JSON.stringify(user));
        document.getElementById('userName').textContent = firstName;
        showMessage('Profile updated successfully!', 'success');
        
        // Reload avatar with new initial
        if (!localStorage.getItem('hal_avatar')) {
            loadAvatar();
        }
    } catch (error) {
        showMessage('Failed to update profile: ' + error.message, 'error');
    }
}

// Change password
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const errorDiv = document.getElementById('passwordError');
    errorDiv.textContent = '';
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        errorDiv.textContent = 'New passwords do not match';
        return;
    }
    
    if (newPassword.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        return;
    }
    
    try {
        // Call the backend API to change password
        await apiCall('/api/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        
        // Clear form
        document.getElementById('passwordForm').reset();
        errorDiv.style.color = 'var(--success)';
        errorDiv.textContent = 'Password changed successfully!';
        
        setTimeout(() => {
            errorDiv.textContent = '';
            errorDiv.style.color = 'var(--danger)';
        }, 3000);
    } catch (error) {
        errorDiv.textContent = error.message;
    }
});

// Show message helper
function showMessage(message, type) {
    const messageDiv = document.getElementById('profileMessage');
    messageDiv.textContent = message;
    messageDiv.style.color = type === 'success' ? 'var(--success)' : 'var(--danger)';
    
    setTimeout(() => {
        messageDiv.textContent = '';
    }, 3000);
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('hal_token');
    localStorage.removeItem('hal_user');
    window.location.href = '/';
});

// Mobile detection and sidebar functions
function isMobile() {
    return window.innerWidth <= 480;
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('mobileBackdrop');

    if (isMobile()) {
        const isOpen = !sidebar.classList.contains('collapsed');
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    } else {
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

function initMobileSidebar() {
    if (isMobile()) {
        closeSidebar();
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (isMobile()) {
                closeSidebar();
            } else {
                const backdrop = document.getElementById('mobileBackdrop');
                backdrop.classList.remove('active');
                document.body.classList.remove('sidebar-open');
            }
        }, 250);
    });
}

// Customization state
let customization = {
    fontFamily: 'system',
    fontSize: 1, // 0 = small, 1 = medium, 2 = large
    accentColor: '#2563eb',
    avatarBorderStyle: 'none',
    avatarBorderWidth: 0,
    avatarBorderColor: '#2563eb'
};

// Font size labels
const fontSizeLabels = ['Small', 'Medium', 'Large'];
const fontSizeScales = [0.9, 1.0, 1.1];

// Load customization from localStorage
function loadCustomization() {
    const saved = localStorage.getItem('hal_customization');
    if (saved) {
        customization = { ...customization, ...JSON.parse(saved) };
    }
    applyCustomization();
    updateCustomizationUI();
}

// Apply customization to the page
function applyCustomization() {
    // Font family
    if (customization.fontFamily !== 'system') {
        document.body.style.fontFamily = customization.fontFamily;
    } else {
        document.body.style.fontFamily = '';
    }

    // Font size
    document.documentElement.style.fontSize = `${fontSizeScales[customization.fontSize] * 16}px`;

    // Accent color
    document.documentElement.style.setProperty('--primary', customization.accentColor);
    const darkerColor = adjustColorBrightness(customization.accentColor, -20);
    document.documentElement.style.setProperty('--primary-dark', darkerColor);

    // Avatar border
    updateAvatarBorderDisplay();
}

// Update UI to reflect current customization
function updateCustomizationUI() {
    // Font family dropdown
    document.getElementById('fontFamily').value = customization.fontFamily;

    // Font size display
    document.getElementById('fontSizeDisplay').textContent = fontSizeLabels[customization.fontSize];

    // Accent color
    document.querySelectorAll('.color-option[data-color]').forEach(option => {
        option.classList.toggle('selected', option.dataset.color === customization.accentColor);
    });

    // Avatar border
    document.getElementById('avatarBorderStyle').value = customization.avatarBorderStyle;
    document.getElementById('avatarBorderWidth').value = customization.avatarBorderWidth;
    document.getElementById('borderWidthDisplay').textContent = customization.avatarBorderWidth + 'px';

    // Show/hide border color selector
    const showBorderColor = customization.avatarBorderStyle !== 'none' && customization.avatarBorderStyle !== 'gradient';
    document.getElementById('borderColorGroup').style.display = showBorderColor ? 'block' : 'none';

    // Border color selection
    if (showBorderColor) {
        document.querySelectorAll('.color-option[data-border-color]').forEach(option => {
            option.classList.toggle('selected', option.dataset.borderColor === customization.avatarBorderColor);
        });
    }
}

// Update font family
function updateFontFamily() {
    customization.fontFamily = document.getElementById('fontFamily').value;
    applyCustomization();
}

// Adjust font size
function adjustFontSize(delta) {
    customization.fontSize = Math.max(0, Math.min(2, customization.fontSize + delta));
    document.getElementById('fontSizeDisplay').textContent = fontSizeLabels[customization.fontSize];
    applyCustomization();
}

// Select accent color
function selectAccentColor(color) {
    customization.accentColor = color;
    document.querySelectorAll('.color-option[data-color]').forEach(option => {
        option.classList.toggle('selected', option.dataset.color === color);
    });
    applyCustomization();
}

// Select border color
function selectBorderColor(color) {
    customization.avatarBorderColor = color;
    document.querySelectorAll('.color-option[data-border-color]').forEach(option => {
        option.classList.toggle('selected', option.dataset.borderColor === color);
    });
    updateAvatarBorderDisplay();
}

// Update avatar border
function updateAvatarBorder() {
    customization.avatarBorderStyle = document.getElementById('avatarBorderStyle').value;
    customization.avatarBorderWidth = parseInt(document.getElementById('avatarBorderWidth').value);
    document.getElementById('borderWidthDisplay').textContent = customization.avatarBorderWidth + 'px';

    const showBorderColor = customization.avatarBorderStyle !== 'none' && customization.avatarBorderStyle !== 'gradient';
    document.getElementById('borderColorGroup').style.display = showBorderColor ? 'block' : 'none';

    updateAvatarBorderDisplay();
}

// Apply border to avatar preview
function updateAvatarBorderDisplay() {
    const avatarPreview = document.getElementById('avatarPreview');

    if (customization.avatarBorderStyle === 'none' || customization.avatarBorderWidth === 0) {
        avatarPreview.style.border = '';
        avatarPreview.classList.remove('avatar-gradient-border');
    } else if (customization.avatarBorderStyle === 'gradient') {
        avatarPreview.classList.add('avatar-gradient-border');
        avatarPreview.style.border = '';
    } else {
        avatarPreview.classList.remove('avatar-gradient-border');
        avatarPreview.style.border = `${customization.avatarBorderWidth}px ${customization.avatarBorderStyle} ${customization.avatarBorderColor}`;
    }
}

// Save customization
function saveCustomization() {
    localStorage.setItem('hal_customization', JSON.stringify(customization));
    const messageDiv = document.getElementById('customizationMessage');
    messageDiv.textContent = '✓ Customization saved successfully!';
    setTimeout(() => {
        messageDiv.textContent = '';
    }, 3000);
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

    // Avatar is already on profile page, so just make it clickable for consistency
    sidebarAvatar.style.cursor = 'default';
    sidebarAvatar.title = 'Your Profile';
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
initTheme();
loadAvatar();
loadSidebarAvatar();
initMobileSidebar();
loadCustomization();
setupAutoCollapse();
