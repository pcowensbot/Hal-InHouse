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
    // Remove active class from all themes
    const themes = ['lightTheme', 'darkTheme', 'darkPurpleTheme', 'darkGreenTheme', 'darkBlackTheme', 'darkRedTheme'];
    themes.forEach(t => {
        const element = document.getElementById(t);
        if (element) element.classList.remove('active');
    });

    // Add active class to selected theme
    const themeMap = {
        'light': 'lightTheme',
        'dark': 'darkTheme',
        'dark-purple': 'darkPurpleTheme',
        'dark-green': 'darkGreenTheme',
        'dark-black': 'darkBlackTheme',
        'dark-red': 'darkRedTheme'
    };

    const activeTheme = document.getElementById(themeMap[theme]);
    if (activeTheme) activeTheme.classList.add('active');
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
    // Use user-specific key to prevent avatar conflicts between users
    const savedAvatar = localStorage.getItem(`hal_avatar_${user.id}`);
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
        // Use user-specific key to prevent avatar conflicts between users
        localStorage.setItem(`hal_avatar_${user.id}`, avatarData);
        loadAvatar();

        // In a real app, you'd upload this to the server
        // For now, we're just storing it in localStorage
        showMessage('Avatar updated successfully!', 'success');
    };
    reader.readAsDataURL(file);
}

// Remove avatar
function removeAvatar() {
    // Use user-specific key to prevent avatar conflicts between users
    localStorage.removeItem(`hal_avatar_${user.id}`);
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
        if (!localStorage.getItem(`hal_avatar_${user.id}`)) {
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

// Initialize
initTheme();
loadAvatar();
