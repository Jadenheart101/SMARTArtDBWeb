// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';

// Helper function to get current user ID
function getCurrentUserId() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    return currentUser ? currentUser.id : null;
}

// Editing session management
let editingHeartbeatInterval = null;

async function startEditingSession(projectId) {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
        await fetch(`${API_BASE_URL}/projects/${projectId}/editing/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId })
        });
        
        // Start heartbeat to keep session alive
        if (editingHeartbeatInterval) {
            clearInterval(editingHeartbeatInterval);
        }
        editingHeartbeatInterval = setInterval(async () => {
            try {
                await fetch(`${API_BASE_URL}/projects/${projectId}/editing/heartbeat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user_id: userId })
                });
            } catch (error) {
                console.error('Error sending editing heartbeat:', error);
            }
        }, 60000); // Send heartbeat every minute
        
        console.log('📝 Started editing session for project', projectId);
    } catch (error) {
        console.error('Error starting editing session:', error);
    }
}

async function endEditingSession(projectId) {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
        // Clear heartbeat
        if (editingHeartbeatInterval) {
            clearInterval(editingHeartbeatInterval);
            editingHeartbeatInterval = null;
        }
        
        await fetch(`${API_BASE_URL}/projects/${projectId}/editing/end`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId })
        });
        
        console.log('✅ Ended editing session for project', projectId);
    } catch (error) {
        console.error('Error ending editing session:', error);
    }
}

// Global DOM elements (will be populated after components load)
let galleryGrid, galleryLoading;

// Hero Section Functions
function exploreArt() {
    document.getElementById('gallery').scrollIntoView({
        behavior: 'smooth'
    });
}

function viewAPI() {
    window.open('/api', '_blank');
}

function openApiDocs() {
    window.open('/api', '_blank');
}

// API Functions
async function fetchFromAPI(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        console.log(`Making API request to: ${url}`);
        
        const config = {
            method: 'GET',
            ...options
        };
        
        const response = await fetch(url, config);
        
        if (!response.ok) {
            console.error(`API request failed: ${response.status} ${response.statusText} for ${url}`);
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`API response from ${endpoint}:`, data);
        return data;
    } catch (error) {
        console.error(`API Error for endpoint ${endpoint}:`, error);
        return { success: false, error: error.message };
    }
}

// Load Gallery Data
async function loadGallery() {
    try {
        // Get gallery elements (they should be loaded by now)
        galleryGrid = document.getElementById('galleryGrid');
        galleryLoading = document.querySelector('.gallery-loading');
        
        if (!galleryGrid || !galleryLoading) {
            console.error('Gallery elements not found');
            return;
        }
        
        galleryLoading.style.display = 'block';
        
        // Check user permissions
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const isAdmin = currentUser && currentUser.isAdmin;
        
        // Fetch artworks from API
        const artResponse = await fetchFromAPI('/art');
        // Only admins can see user data in gallery
        const usersResponse = isAdmin ? await fetchFromAPI('/users') : { success: true, data: [] };
        const projectsResponse = await fetchFromAPI('/projects');
        
        // Clear loading
        galleryLoading.style.display = 'none';
        
        // Create gallery items
        const galleryItems = [];
        
        // Add artworks
        if (artResponse.success && artResponse.data.length > 0) {
            artResponse.data.slice(0, 3).forEach(artwork => {
                galleryItems.push(createGalleryItem(
                    'artwork',
                    artwork.ArtName || 'Untitled Artwork',
                    `By ${artwork.ArtistName || 'Unknown Artist'}`,
                    'fas fa-palette',
                    artwork.Date || 'Date unknown'
                ));
            });
        }
        
        // Add users
        if (usersResponse.success && usersResponse.data.length > 0) {
            usersResponse.data.slice(0, 2).forEach(user => {
                galleryItems.push(createGalleryItem(
                    'user',
                    user.UserName || 'Unknown User',
                    `${user.isAdmin ? 'Administrator' : 'User'}`,
                    'fas fa-user',
                    `User ID: ${user.UserID}`
                ));
            });
        }
        
        // Add projects
        if (projectsResponse.success && projectsResponse.data.length > 0) {
            projectsResponse.data.slice(0, 2).forEach(project => {
                galleryItems.push(createGalleryItem(
                    'project',
                    project.ProjectName || 'Untitled Project',
                    `Status: ${project.Approved ? 'Approved' : 'Pending'}`,
                    'fas fa-project-diagram',
                    project.DateCreated || 'Date unknown'
                ));
            });
        }
        
        // If no data, show placeholder
        if (galleryItems.length === 0) {
            galleryItems.push(
                createGalleryItem(
                    'placeholder',
                    'No Data Available',
                    'Start by adding some artworks, users, or projects via the API',
                    'fas fa-info-circle',
                    'Get started with our API'
                )
            );
        }
        
        // Render gallery items
        galleryGrid.innerHTML = galleryItems.join('');
        
    } catch (error) {
        console.error('Error loading gallery:', error);
        galleryLoading.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading gallery. Please ensure the API server is running.</p>
        `;
    }
}

// Create Gallery Item HTML
function createGalleryItem(type, title, subtitle, icon, extra) {
    const colors = {
        artwork: '#6366f1',
        user: '#10b981',
        project: '#f59e0b',
        placeholder: '#64748b'
    };
    
    return `
        <div class="gallery-item">
            <div class="gallery-item-header" style="background: ${colors[type]};">
                <i class="${icon}"></i>
                <h3>${title}</h3>
            </div>
            <div class="gallery-item-content">
                <p><strong>${subtitle}</strong></p>
                <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.5rem;">${extra}</p>
            </div>
        </div>
    `;
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.backdropFilter = 'blur(10px)';
    } else {
        navbar.style.background = '#fff';
        navbar.style.backdropFilter = 'none';
    }
});

// Auth Modal Functions
function openLoginModal() {
    if (window.authModal) {
        window.authModal.style.display = 'block';
        switchToLogin();
    }
}

function closeAuthModal() {
    if (window.authModal) {
        window.authModal.style.display = 'none';
        clearAuthForms();
    }
}

function switchToLogin() {
    if (window.loginForm && window.signupForm) {
        window.loginForm.classList.add('active');
        window.signupForm.classList.remove('active');
    }
}

function switchToSignup() {
    if (window.signupForm && window.loginForm) {
        window.signupForm.classList.add('active');
        window.loginForm.classList.remove('active');
    }
}

function clearAuthForms() {
    if (window.loginFormElement) {
        window.loginFormElement.reset();
    }
    if (window.signupFormElement) {
        window.signupFormElement.reset();
    }
}

// Update navigation for logged in user
function updateNavForLoggedInUser(user) {
    const authButton = document.querySelector('.navbar .btn-auth');
    if (authButton) {
        authButton.innerHTML = `<i class="fas fa-user-circle"></i> ${user.UserName}`;
        authButton.onclick = showUserMenu; // Keep the user menu for the main header
        
        // Show dashboard navigation link
        const dashboardNav = document.getElementById('dashboard-nav');
        if (dashboardNav) {
            dashboardNav.style.display = 'block';
        }
        
        // Add admin panel if user is admin
        if (user.isAdmin) {
            addAdminPanel();
        }
    }
}

// Add admin panel to navigation
function addAdminPanel() {
    const navMenu = document.querySelector('.nav-menu');
    const adminItem = document.createElement('li');
    adminItem.className = 'nav-item';
    adminItem.innerHTML = `
        <button class="btn btn-admin" onclick="openAdminPanel()">
            <i class="fas fa-cog"></i> Admin
        </button>
    `;
    
    // Insert before the login button
    const loginItem = navMenu.querySelector('li:last-child');
    navMenu.insertBefore(adminItem, loginItem);
}

// Remove admin panel from navigation
function removeAdminPanel() {
    const adminButton = document.querySelector('.btn-admin');
    if (adminButton) {
        adminButton.parentElement.remove();
    }
}

// Open admin panel
function openAdminPanel() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) {
        showNotification('Admin access required', 'error');
        return;
    }
    
    // Admin-only panel with enhanced security checks
    const adminAction = prompt(`Admin Panel - ${currentUser.username}\n\nSelect an action:\n1. Create Admin User\n2. View All Users\n3. Cancel\n\nEnter 1, 2, or 3:`);
    
    switch(adminAction) {
        case '1':
            createAdminUser();
            break;
        case '2':
            // Double-check admin status before showing all users
            if (currentUser.isAdmin) {
                showAllUsers();
            } else {
                showNotification('Admin access required to view all users', 'error');
            }
            break;
        case '3':
        default:
            // Cancel or invalid input
            break;
    }
}

// Create admin user (admin only)
async function createAdminUser() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    // Security check: Only admins can create admin users
    if (!currentUser || !currentUser.isAdmin) {
        showNotification('Admin access required to create admin users', 'error');
        return;
    }
    
    const username = prompt('Enter username for new admin:');
    if (!username) return;
    
    const password = prompt('Enter password for new admin:');
    if (!password) return;
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        // Check if username already exists (admin can see all users for this check)
        const usersResponse = await fetchFromAPI('/users');
        if (usersResponse.success) {
            const existingUser = usersResponse.data.find(u => u.UserName === username);
            if (existingUser) {
                showNotification('Username already exists', 'error');
                return;
            }
        }
        
        // Create new admin user
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                UserName: username,
                Password: password,
                isAdmin: 1  // Admin can create admin accounts
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Admin user '${username}' created successfully!`, 'success');
        } else {
            showNotification(result.message || 'Failed to create admin user', 'error');
        }
    } catch (error) {
        console.error('Create admin error:', error);
        showNotification('Failed to create admin user', 'error');
    }
}

// Show all users (admin only)
async function showAllUsers() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    // Security check: Only admins can view all users
    if (!currentUser || !currentUser.isAdmin) {
        showNotification('Admin access required to view all users', 'error');
        return;
    }
    
    try {
        const usersResponse = await fetchFromAPI('/users');
        if (usersResponse.success) {
            const usersList = usersResponse.data.map(user => 
                `${user.UserName} (ID: ${user.UserID}) - ${user.isAdmin ? 'Admin' : 'User'}`
            ).join('\n');
            
            alert(`All Users (Admin View):\n\n${usersList}`);
        } else {
            showNotification('Failed to fetch users', 'error');
        }
    } catch (error) {
        console.error('Fetch users error:', error);
        showNotification('Failed to fetch users', 'error');
    }
}

// Show user menu (logout option)
function showUserMenu() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        const confirmLogout = confirm(`Logged in as ${currentUser.username}${currentUser.isAdmin ? ' (Admin)' : ''}\n\nWould you like to logout?`);
        if (confirmLogout) {
            logout();
        }
    }
}

// Logout function
function logout() {
    localStorage.removeItem('currentUser');
    const authButton = document.querySelector('.navbar .btn-auth');
    const mainNavbar = document.querySelector('.navbar');
    
    if (authButton) {
        authButton.innerHTML = '<i class="fas fa-user"></i> Login';
        authButton.onclick = openLoginModal;
    }
    
    // Hide dashboard navigation link
    const dashboardNav = document.getElementById('dashboard-nav');
    if (dashboardNav) {
        dashboardNav.style.display = 'none';
    }
    
    // Remove admin panel if it exists
    removeAdminPanel();
    
    // Hide dashboard and show main website
    hideDashboard();
    
    // Ensure main navbar is visible
    if (mainNavbar) {
        mainNavbar.style.display = 'flex';
    }
    
    showNotification('Logged out successfully', 'info');
}

// Check for existing login on page load
function checkExistingLogin() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        updateNavForLoggedInUser(currentUser);
        
        // Show dashboard for logged in users
        showDashboard();
    }
}

// Update API stats
async function updateStats() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const isAdmin = currentUser && currentUser.isAdmin;
        
        const responses = await Promise.all([
            // Only fetch users if admin, otherwise return empty response
            isAdmin ? fetchFromAPI('/users') : Promise.resolve({ success: true, data: [] }),
            // Only fetch artworks if admin for stats purposes
            isAdmin ? fetchFromAPI('/art') : Promise.resolve({ success: true, data: [] }),
            fetchFromAPI('/projects')
        ]);
        
        const [users, art, projects] = responses;
        
        // Update stats in the API section
        const stats = document.querySelectorAll('.stat-number');
        if (stats.length >= 3) {
            // Only show user count to admins
            if (isAdmin && users.success) {
                stats[0].textContent = users.data.length;
                stats[0].parentElement.style.opacity = '1';
                stats[0].parentElement.style.display = 'block';
            } else {
                // Hide user stats for regular users
                stats[0].parentElement.style.display = 'none';
            }
            
            // Only show artwork count to admins
            if (isAdmin && art.success) {
                stats[1].textContent = art.data.length;
                stats[1].parentElement.style.opacity = '1';
                stats[1].parentElement.style.display = 'block';
            } else {
                // Hide artwork stats for regular users
                stats[1].parentElement.style.display = 'none';
            }
            
            // Projects are visible to all users
            stats[2].textContent = projects.success ? projects.data.length : '0';
        }
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Enhanced notification function
function showNotification(message, type = 'info') {
    console.log(`Notification: [${type.toUpperCase()}] ${message}`);
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 2rem;
        background: ${colors[type] || colors.info};
        color: white;
        border-radius: 8px;
        z-index: 2001;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Easter egg - Konami code
let konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
let konamiIndex = 0;

// Close all modals function
function closeAllModals() {
    const modalSelectors = [
        'authModal',
        'createArtworkModal', 
        'createProjectModal',
        'editProjectModal',
        'viewProjectModal',
        'addArtInfoModal',
        'uploadModal',
        'mediaPreviewModal',
        'replaceMediaModal',
        'renameModal'
    ];
    
    modalSelectors.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    });
    
    // Reset body overflow
    document.body.style.overflow = 'auto';
}

document.addEventListener('keydown', (e) => {
    if (e.keyCode === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
            // Easter egg activated
            document.body.style.filter = 'hue-rotate(180deg)';
            setTimeout(() => {
                document.body.style.filter = 'none';
            }, 3000);
            konamiIndex = 0;
        }
    } else {
        konamiIndex = 0;
    }
});

// Initialize page (called after components are loaded)
function initializeApp() {
    console.log('SMARTArt Database Website Loaded');
    
    // Ensure all modals are hidden on page load
    closeAllModals();
    
    // Add global error handler
    window.addEventListener('error', function(event) {
        console.error('Global error caught:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
        
        if (event.message && event.message.includes('endpoint')) {
            showNotification('API endpoint error detected - check console for details', 'error');
        }
    });
    
    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        
        if (event.reason && event.reason.message && event.reason.message.includes('endpoint')) {
            showNotification('API endpoint promise rejection - check console for details', 'error');
        }
    });
    
    // Re-initialize DOM elements after components are loaded
    initializeDOMElements();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check for existing login
    checkExistingLogin();
    
    // Load gallery data
    loadGallery();
    
    // Add some dynamic stats
    updateStats();
}

// Initialize DOM elements after components are loaded
function initializeDOMElements() {
    console.log('Initializing DOM elements...');
    
    // Re-query DOM elements since they're now loaded dynamically
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const contactForm = document.getElementById('contactForm');
    const authModal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginFormElement = document.getElementById('loginFormElement');
    const signupFormElement = document.getElementById('signupFormElement');
    
    // Log which elements are found/missing
    console.log('DOM elements status:', {
        navToggle: !!navToggle,
        navMenu: !!navMenu,
        contactForm: !!contactForm,
        authModal: !!authModal,
        loginForm: !!loginForm,
        signupForm: !!signupForm,
        loginFormElement: !!loginFormElement,
        signupFormElement: !!signupFormElement
    });
    
    // Store in global scope for other functions to use
    window.navToggle = navToggle;
    window.navMenu = navMenu;
    window.contactForm = contactForm;
    window.authModal = authModal;
    window.loginForm = loginForm;
    window.signupForm = signupForm;
    window.loginFormElement = loginFormElement;
    window.signupFormElement = signupFormElement;
}

// Set up event listeners after components are loaded
function setupEventListeners() {
    // Navigation Toggle
    if (window.navToggle) {
        window.navToggle.addEventListener('click', () => {
            window.navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.navMenu) {
                window.navMenu.classList.remove('active');
            }
        });
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Contact Form Handler
    if (window.contactForm) {
        window.contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(window.contactForm);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message')
            };
            
            // Simulate form submission (you can integrate with your API)
            console.log('Contact form submitted:', data);
            
            // Show success message
            showNotification('Thank you for your message! We will get back to you soon.', 'success');
            window.contactForm.reset();
        });
    }

    // Login Form Handler
    if (window.loginFormElement) {
        window.loginFormElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(window.loginFormElement);
            const loginData = {
                username: formData.get('username'),
                password: formData.get('password')
            };
            
            try {
                // Use the dedicated login endpoint
                const loginResponse = await fetchFromAPI('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(loginData)
                });
                
                if (loginResponse.success) {
                    const user = loginResponse.data;
                    
                    // Store user info in localStorage
                    localStorage.setItem('currentUser', JSON.stringify({
                        id: user.UserID,
                        username: user.UserName,
                        isAdmin: user.isAdmin
                    }));
                    
                    showNotification(`Welcome back, ${user.UserName}!`, 'success');
                    closeAuthModal();
                    updateNavForLoggedInUser(user);
                    
                    // Show dashboard after successful login
                    showDashboard();
                } else {
                    showNotification(loginResponse.message || 'Invalid username or password', 'error');
                }
            } catch (error) {
                console.error('Login error:', error);
                showNotification('Login failed. Please try again.', 'error');
            }
        });
    }

    // Sign Up Form Handler
    if (window.signupFormElement) {
        window.signupFormElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(window.signupFormElement);
            const signupData = {
                UserName: formData.get('username'),
                Password: formData.get('password'),
                isAdmin: 0  // Regular users can only create regular accounts
            };
            
            const confirmPassword = formData.get('confirmPassword');
            
            // Validate passwords match
            if (signupData.Password !== confirmPassword) {
                showNotification('Passwords do not match', 'error');
                return;
            }
            
            // Validate password length
            if (signupData.Password.length < 6) {
                showNotification('Password must be at least 6 characters', 'error');
                return;
            }
            
            try {
                // Check if username already exists (for signup validation)
                // Note: This is a necessary security check for user registration
                const usersResponse = await fetchFromAPI('/users');
                if (usersResponse.success) {
                    const existingUser = usersResponse.data.find(u => u.UserName === signupData.UserName);
                    if (existingUser) {
                        showNotification('Username already exists', 'error');
                        return;
                    }
                }
                
                // Create new user
                const response = await fetch(`${API_BASE_URL}/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(signupData)
                });
                
                const result = await response.json();
                      if (result.success) {
                showNotification('Account created successfully!', 'success');
                
                // Auto-login after successful signup
                const newUser = result.data; // Use the user data returned from the backend
                
                localStorage.setItem('currentUser', JSON.stringify({
                    id: newUser.UserID,
                    username: newUser.UserName,
                    isAdmin: newUser.isAdmin
                }));
                
                closeAuthModal();
                updateNavForLoggedInUser(newUser);
                
                // Show dashboard after successful signup
                showDashboard();
            } else {
                    showNotification(result.message || 'Sign up failed', 'error');
                }
            } catch (error) {
                console.error('Sign up error:', error);
                showNotification('Sign up failed. Please try again.', 'error');
            }
        });
    }

    // Dashboard Form Handlers - These are now handled in initializeDashboardEventListeners()
    // after the dashboard content is actually loaded
    
    // Close modals when clicking outside
    const createArtworkModal = document.getElementById('createArtworkModal');
    const createProjectModal = document.getElementById('createProjectModal');
    const editProjectModal = document.getElementById('editProjectModal');
    const viewProjectModal = document.getElementById('viewProjectModal');
    const renameModal = document.getElementById('renameModal');
    const mediaPreviewModal = document.getElementById('mediaPreviewModal');
    
    window.addEventListener('click', (event) => {
        if (event.target === createArtworkModal) {
            closeCreateArtworkModal();
        }
        if (event.target === createProjectModal) {
            closeCreateProjectModal();
        }
        if (event.target === editProjectModal) {
            closeEditProjectModal();
        }
        if (event.target === viewProjectModal) {
            closeViewProjectModal();
        }
        if (event.target === window.authModal) {
            closeAuthModal();
        }
        if (event.target === renameModal) {
            closeRenameModal();
        }
        if (event.target === mediaPreviewModal) {
            closeMediaPreviewModal();
        }
    });
}

// Dashboard Functions
// View Project Modal - displays project details in read-only format
async function viewProject(projectID) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    console.log('🔍 === PROJECT VIEW DEBUG START ===');
    console.log('📊 Viewing project ID:', projectID);

    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectID}`);
        const result = await response.json();
        
        console.log('📊 Project API response:', result);
        
        if (result.success && result.data) {
            const project = result.data;
            
            // Enhanced Debug logging
            console.log('📊 Project data analysis:');
            console.log('  ✅ ProjectName:', project.ProjectName || 'MISSING');
            console.log('  📝 Description:', project.Description ? `"${project.Description}"` : 'NULL/EMPTY');
            console.log('  🖼️ ImageURL:', project.ImageURL || 'NULL/EMPTY');
            console.log('  📅 DateCreated:', project.DateCreated || 'MISSING');
            console.log('  📅 DateModified:', project.DateModified || 'MISSING');
            console.log('  ✅ Approved:', project.Approved);
            console.log('  ⚠️ NeedsReview:', project.NeedsReview);
            console.log('  🔗 ImageID:', project.ImageID || 'NULL');
            
            // Store project ID for potential editing
            window.currentViewingProjectId = projectID;
            
            // Show modal
            const modal = document.getElementById('viewProjectModal');
            if (modal) modal.style.display = 'block';
            document.body.style.overflow = 'hidden';

            // Populate project information
            document.getElementById('viewProjectName').textContent = project.ProjectName || 'Untitled Project';
            
            // Handle description - check for null, undefined, or empty string
            const descriptionElement = document.getElementById('viewProjectDescription');
            if (descriptionElement) {
                const description = project.Description;
                if (description && description.trim() !== '') {
                    descriptionElement.textContent = description;
                    descriptionElement.style.fontStyle = 'normal';
                    descriptionElement.style.color = 'inherit';
                    console.log('📝 Description displayed:', description);
                } else {
                    descriptionElement.textContent = 'No description available';
                    descriptionElement.style.fontStyle = 'italic';
                    descriptionElement.style.color = '#9ca3af';
                    console.log('📝 No description - showing placeholder');
                }
            }
            
            // Set project dates
            document.getElementById('viewProjectCreated').textContent = project.DateCreated || 'Unknown';
            document.getElementById('viewProjectModified').textContent = project.DateModified || 'Unknown';
            
            // Set project status
            const statusElement = document.getElementById('viewProjectStatus');
            let statusClass = 'status-pending';
            let statusLabel = 'Pending';
            if (project.Approved) {
                statusClass = 'status-approved';
                statusLabel = 'Approved';
            } else if (project.NeedsReview) {
                statusClass = 'status-review';
                statusLabel = 'Needs Review';
            }
            statusElement.className = `project-status ${statusClass}`;
            statusElement.textContent = statusLabel;
            console.log('📊 Status set to:', statusLabel);
            
            // Handle admin notes display
            const adminNotesSection = document.getElementById('adminNotesSection');
            const adminNotesContent = document.getElementById('viewProjectAdminNotes');
            
            if (project.admin_notes && project.admin_notes.trim() !== '') {
                // Show admin notes if they exist
                if (adminNotesSection) {
                    adminNotesSection.style.display = 'block';
                    if (adminNotesContent) {
                        adminNotesContent.textContent = project.admin_notes;
                    }
                }
                console.log('📝 Admin notes displayed');
                
                // Update status if project has admin notes but is not approved
                if (!project.Approved && project.admin_notes) {
                    statusElement.className = 'project-status status-review';
                    statusElement.textContent = 'Reviewed, Pending Revisions';
                    console.log('📊 Status updated to: Reviewed, Pending Revisions');
                }
            } else {
                // Hide admin notes section if no notes
                if (adminNotesSection) {
                    adminNotesSection.style.display = 'none';
                }
                console.log('📝 No admin notes to display');
            }
            
            // Handle project image
            const imageContainer = document.getElementById('viewProjectImageContainer');
            const noImageContainer = document.getElementById('viewProjectNoImage');
            
            console.log('🖼️ Image elements found:', { imageContainer: !!imageContainer, noImageContainer: !!noImageContainer });
            console.log('🖼️ Project ImageURL:', project.ImageURL);
            
            if (project.ImageURL && project.ImageURL.trim() !== '') {
                if (imageContainer && noImageContainer) {
                    imageContainer.style.display = 'block';
                    noImageContainer.style.display = 'none';
                    
                    const img = document.getElementById('viewProjectImage');
                    const imgName = document.getElementById('viewProjectImageName');
                    
                    if (img) {
                        img.src = project.ImageURL;
                        img.alt = project.ProjectName || 'Project image';
                        img.onerror = function() {
                            console.error('❌ Failed to load image:', project.ImageURL);
                            imageContainer.style.display = 'none';
                            noImageContainer.style.display = 'block';
                        };
                        console.log('🖼️ Image set:', project.ImageURL);
                    }
                    
                    if (imgName) {
                        imgName.textContent = project.ImageName || 'Project Image';
                    }
                }
            } else {
                if (imageContainer && noImageContainer) {
                    imageContainer.style.display = 'none';
                    noImageContainer.style.display = 'block';
                    console.log('🖼️ No image - showing placeholder');
                }
            }
            
            // Load project topics
            console.log('📋 Loading project topics...');
            await loadProjectTopics(projectID);
            
            // Load art information if project has an image
            if (project.ImageURL) {
                console.log('🎨 Loading art information...');
                await loadProjectArtInfo(project);
            } else {
                console.log('🎨 No image - skipping art info lookup');
            }
            
            // Check if admin is viewing another user's project and adjust interface accordingly
            const isOwnProject = project.user_id === currentUser.id;
            const isAdmin = currentUser.isAdmin;
            
            console.log('🔍 Project ownership check:', {
                projectUserId: project.user_id,
                currentUserId: currentUser.id,
                isOwnProject: isOwnProject,
                isAdmin: isAdmin
            });
            
            // Get the Edit Project button, Add Topic button, and Admin Notes button
            const editProjectBtn = document.querySelector('#viewProjectModal .btn-primary');
            const addTopicBtn = document.getElementById('addTopicBtn');
            const adminNotesBtn = document.getElementById('adminNotesBtn');
            
            // Handle admin notes button visibility
            if (isAdmin && !isOwnProject) {
                // Show admin notes button for admins viewing other users' projects
                if (adminNotesBtn) {
                    adminNotesBtn.style.display = 'inline-block';
                    // Store project ID for admin notes modal
                    window.currentAdminNotesProjectId = projectID;
                }
            } else {
                // Hide admin notes button for non-admins or when viewing own projects
                if (adminNotesBtn) {
                    adminNotesBtn.style.display = 'none';
                }
            }
            
            if (isAdmin && !isOwnProject) {
                // Admin viewing another user's project - show view-only mode
                console.log('🔧 Admin viewing other user\'s project - enabling view-only mode');
                
                if (editProjectBtn) {
                    editProjectBtn.innerHTML = '<i class="fas fa-crown"></i> Admin View Only';
                    editProjectBtn.onclick = function() {
                        showNotification('Admin users can approve/unapprove projects from the admin panel, but cannot edit other users\' projects directly.', 'info');
                    };
                    editProjectBtn.className = 'btn btn-info';
                }
                
                if (addTopicBtn) {
                    addTopicBtn.style.display = 'none';
                }
                
                // Show admin notice
                console.log('ℹ️ Admin view mode activated');
                
            } else {
                // User viewing their own project or regular user - enable editing
                console.log('✏️ Enabling full edit mode');
                
                if (editProjectBtn) {
                    editProjectBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Project';
                    editProjectBtn.onclick = function() {
                        closeViewProjectModal();
                        editProject(window.currentViewingProjectId);
                    };
                    editProjectBtn.className = 'btn btn-primary';
                }
                
                if (addTopicBtn) {
                    addTopicBtn.style.display = 'inline-block';
                }
            }
            
            console.log('🔍 === PROJECT VIEW COMPLETE ===');
            
        } else {
            console.error('❌ Failed to load project:', result);
            showNotification('Failed to load project details', 'error');
        }
    } catch (error) {
        console.error('❌ Error loading project:', error);
        showNotification('Error loading project details', 'error');
    }
}

// Close View Project Modal
function closeViewProjectModal() {
    const modal = document.getElementById('viewProjectModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Function to load art information for a project
async function loadProjectArtInfo(project) {
    console.log('🎨 loadProjectArtInfo called with project:', project);
    
    const artInfoContainer = document.getElementById('viewProjectArtInfo');
    const noArtInfoContainer = document.getElementById('viewProjectNoArtInfo');
    
    console.log('Art info containers found:', { 
        artInfoContainer: !!artInfoContainer, 
        noArtInfoContainer: !!noArtInfoContainer 
    });
    
    if (!artInfoContainer || !noArtInfoContainer) {
        console.warn('❌ Art info containers not found in DOM');
        return;
    }
    
    // Hide both containers initially
    artInfoContainer.style.display = 'none';
    noArtInfoContainer.style.display = 'block';
    
    // Check if project has an image URL
    if (!project.ImageURL || project.ImageURL.trim() === '') {
        console.log('ℹ️ No image URL for project, skipping art info');
        return;
    }
    
    try {
        // Extract media filename from the URL
        // ImageURL format is typically like: /uploads/user_anonymous/images/filename.jpg
        const urlParts = project.ImageURL.split('/');
        const filename = urlParts[urlParts.length - 1];
        
        console.log('🔍 URL parts:', urlParts);
        console.log('📁 Extracted filename:', filename);
        
        if (!filename) {
            console.log('❌ Could not extract filename from ImageURL:', project.ImageURL);
            return;
        }
        
        console.log('🔎 Looking for art info for media:', filename);
        
        // Fetch art information using the media filename
        const apiUrl = `${API_BASE_URL}/art/media/${encodeURIComponent(filename)}`;
        console.log('🌐 API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('📡 Response status:', response.status);
        
        const result = await response.json();
        console.log('📦 API result:', result);
        
        if (result.success && result.data) {
            console.log('✅ Art info found:', result.data);
            
            // Show art info container and hide no-info container
            artInfoContainer.style.display = 'block';
            noArtInfoContainer.style.display = 'none';
            
            // Populate art information
            const artInfo = result.data;
            
            const elements = {
                artistName: document.getElementById('viewArtArtistName'),
                artName: document.getElementById('viewArtArtName'),
                artMedia: document.getElementById('viewArtArtMedia'),
                submitor: document.getElementById('viewArtSubmitor'),
                date: document.getElementById('viewArtDate')
            };
            
            console.log('🎯 Art info elements found:', Object.fromEntries(
                Object.entries(elements).map(([key, el]) => [key, !!el])
            ));
            
            if (elements.artistName) elements.artistName.textContent = artInfo.ArtistName || 'Unknown';
            if (elements.artName) elements.artName.textContent = artInfo.ArtName || 'Unknown';
            if (elements.artMedia) elements.artMedia.textContent = artInfo.ArtMedia || 'Unknown';
            if (elements.submitor) elements.submitor.textContent = artInfo.Submitor || 'Unknown';
            
            // Format the date if available
            if (elements.date) {
                if (artInfo.Date) {
                    const date = new Date(artInfo.Date);
                    elements.date.textContent = date.toLocaleDateString();
                } else {
                    elements.date.textContent = 'Unknown';
                }
            }
            
            // Store the art ID and media filename for editing
            window.currentProjectArtId = artInfo.ArtId;
            window.currentProjectMediaFile = filename;
            
            // Check if this is admin viewing another user's project
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const isAdmin = currentUser && currentUser.isAdmin;
            const isOwnProject = project.user_id === currentUser.id;
            
            // Handle art info edit button visibility
            const editArtBtn = document.querySelector('#viewProjectArtInfo .btn-secondary');
            if (editArtBtn) {
                if (isAdmin && !isOwnProject) {
                    editArtBtn.style.display = 'none';
                    console.log('🔒 Admin view-only: Hiding art info edit button');
                } else {
                    editArtBtn.style.display = 'inline-block';
                    console.log('✏️ Edit mode: Showing art info edit button');
                }
            }
            
            console.log('🎉 Art info successfully displayed!');
            
        } else {
            console.log('ℹ️ No art info found for media:', filename, 'API result:', result);
            // Keep showing the no-art-info container with the option to add
            window.currentProjectMediaFile = filename;
            
            // Check if this is admin viewing another user's project
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const isAdmin = currentUser && currentUser.isAdmin;
            const isOwnProject = project.user_id === currentUser.id;
            
            // Handle add art info button visibility
            const addArtBtn = document.querySelector('#viewProjectNoArtInfo .btn-primary');
            if (addArtBtn) {
                if (isAdmin && !isOwnProject) {
                    addArtBtn.style.display = 'none';
                    console.log('🔒 Admin view-only: Hiding add art info button');
                } else {
                    addArtBtn.style.display = 'inline-block';
                    console.log('✏️ Edit mode: Showing add art info button');
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading art info:', error);
        // Keep showing the no-art-info container
    }
}

// Function to handle editing art info from project view
function editProjectArtInfo() {
    if (window.currentProjectMediaFile) {
        showAddArtInfoModal(window.currentProjectMediaFile);
        closeViewProjectModal();
    }
}

// Function to handle adding art info from project view
function addArtInfoForProject() {
    if (window.currentProjectMediaFile) {
        showAddArtInfoModal(window.currentProjectMediaFile);
        closeViewProjectModal();
    }
}

// Delete Project Function
async function deleteProject(projectID, projectName) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        showNotification('Please log in to delete projects', 'error');
        return;
    }

    // Confirm deletion with user
    const confirmed = confirm(`Are you sure you want to delete the project "${projectName}"?\n\nThis action cannot be undone.`);
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectID}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`Project "${projectName}" deleted successfully`, 'success');
            // Reload dashboard to refresh the projects list
            loadDashboardData();
        } else {
            showNotification(result.message || 'Failed to delete project', 'error');
        }
    } catch (error) {
        console.error('Delete project error:', error);
        showNotification('Failed to delete project', 'error');
    }
}

// Show Edit Project Modal and populate with project data
async function editProject(projectID) {
    // Find the project in the current dashboard data
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Fetch the project details from the API (in case not all fields are loaded)
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectID}`);
        const result = await response.json();
        if (result.success && result.data) {
            const project = result.data;
            // Store project ID for editing
            window.currentEditingProjectId = projectID;
            
            // Start editing session tracking
            await startEditingSession(projectID);
            
            // Show modal
            const modal = document.getElementById('editProjectModal');
            if (modal) modal.style.display = 'block';
            document.body.style.overflow = 'hidden';

            // Populate form fields
            document.getElementById('editProjectName').value = project.ProjectName || '';
            console.log('📝 Loaded ProjectName:', project.ProjectName);
            
            // Populate description if available
            const descInput = document.getElementById('editProjectDescription');
            if (descInput) {
                descInput.value = project.Description || '';
                console.log('📝 Loaded Description:', project.Description, 'into field:', descInput.value);
            }
            
            // Populate ImageID for proper database reference
            const imgInput = document.getElementById('editSelectedImageId');
            if (imgInput && project.ImageID) {
                imgInput.value = project.ImageID;
                console.log('🖼️ Set editSelectedImageId to ImageID:', project.ImageID);
            } else {
                console.log('🔍 No ImageID found or imgInput missing. ImageID:', project.ImageID, 'imgInput:', !!imgInput);
            }
            
            // Show/hide image selection based on whether project has an image
            const thumbnail = document.getElementById('editProjectImageThumbnail');
            const addBtn = document.getElementById('editAddImageBtn');
            const imageButtonText = document.getElementById('editImageButtonText');
            
            console.log('🖼️ Image display logic:', {
                hasImageID: !!project.ImageID,
                hasImageURL: !!project.ImageURL,
                ImageID: project.ImageID,
                ImageURL: project.ImageURL
            });
            
            if (project.ImageID && project.ImageURL) {
                // Project has an image - show thumbnail and update button text
                const thumbnailImg = document.getElementById('editProjectThumbnailImg');
                if (thumbnailImg && thumbnail) {
                    thumbnailImg.src = project.ImageURL;
                    thumbnail.style.display = 'block';
                    console.log('✅ Showing thumbnail with image:', project.ImageURL);
                }
                if (addBtn) {
                    addBtn.style.display = 'none';
                    console.log('🔒 Hiding add image button');
                }
                if (imageButtonText) {
                    imageButtonText.textContent = 'Change Image';
                    console.log('🔄 Updated button text to "Change Image"');
                }
            } else {
                // No image - hide thumbnail and update button text
                if (thumbnail) {
                    thumbnail.style.display = 'none';
                    console.log('🔒 Hiding thumbnail (no image)');
                }
                if (addBtn) {
                    addBtn.style.display = 'block';
                    console.log('✅ Showing add image button');
                }
                if (imageButtonText) {
                    imageButtonText.textContent = 'Add Image';
                    console.log('➕ Updated button text to "Add Image"');
                }
            }
            
            // Load project topics for editing
            await loadEditTopics(projectID);
            
            // Load art information for the project image if it exists
            if (project.ImageID && project.ImageURL) {
                await loadEditProjectArtInfo(project);
            }
            
            // Debug: Check if form actions are present
            setTimeout(() => {
                const formActions = document.querySelector('#editProjectModal .form-actions');
                const saveButton = document.querySelector('#editProjectModal .form-actions button[type="submit"]');
                console.log('Debug - Form actions element:', formActions);
                console.log('Debug - Save button element:', saveButton);
                if (!formActions) {
                    console.error('Form actions not found!');
                }
                if (!saveButton) {
                    console.error('Save button not found!');
                }
            }, 100);
            
        } else {
            showNotification('Failed to load project details', 'error');
        }
    } catch (error) {
        console.error('Error loading project:', error);
        showNotification('Error loading project details', 'error');
    }
}

// Function to load art information for edit project mode
async function loadEditProjectArtInfo(project) {
    console.log('🎨 loadEditProjectArtInfo called with project:', project);
    
    const artInfoContainer = document.getElementById('editProjectArtInfo');
    const noArtInfoContainer = document.getElementById('editProjectNoArtInfo');
    
    console.log('Edit art info containers found:', { 
        artInfoContainer: !!artInfoContainer, 
        noArtInfoContainer: !!noArtInfoContainer 
    });
    
    if (!artInfoContainer || !noArtInfoContainer) {
        console.warn('❌ Edit art info containers not found in DOM');
        return;
    }
    
    // Hide both containers initially
    artInfoContainer.style.display = 'none';
    noArtInfoContainer.style.display = 'block';
    
    // Hide both buttons initially
    const addBtn = document.getElementById('editAddArtInfoBtn');
    const editBtn = document.getElementById('editEditArtInfoBtn');
    if (addBtn) addBtn.style.display = 'none';
    if (editBtn) editBtn.style.display = 'none';
    
    // Check if project has an image URL
    if (!project.ImageURL || project.ImageURL.trim() === '') {
        console.log('ℹ️ No image URL for project, skipping edit art info');
        // Hide both buttons since there's no image
        const addBtn = document.getElementById('editAddArtInfoBtn');
        const editBtn = document.getElementById('editEditArtInfoBtn');
        if (addBtn) addBtn.style.display = 'none';
        if (editBtn) editBtn.style.display = 'none';
        return;
    }
    
    try {
        // Extract media filename from the URL
        const urlParts = project.ImageURL.split('/');
        const filename = urlParts[urlParts.length - 1];
        
        console.log('🔍 Edit mode - URL parts:', urlParts);
        console.log('📁 Edit mode - Extracted filename:', filename);
        
        if (!filename) {
            console.log('❌ Could not extract filename from ImageURL:', project.ImageURL);
            return;
        }
        
        console.log('🔎 Edit mode - Looking for art info for media:', filename);
        
        // Fetch art information using the media filename
        const apiUrl = `${API_BASE_URL}/art/media/${encodeURIComponent(filename)}`;
        console.log('🌐 Edit mode - API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('📡 Edit mode - Response status:', response.status);
        
        const result = await response.json();
        console.log('📦 Edit mode - API result:', result);
        
        if (result.success && result.data) {
            console.log('✅ Edit mode - Art info found:', result.data);
            
            // Show art info container and hide no-info container
            artInfoContainer.style.display = 'block';
            noArtInfoContainer.style.display = 'none';
            
            // Show Edit Art Info button, hide Add Art Info button
            const addBtn = document.getElementById('editAddArtInfoBtn');
            const editBtn = document.getElementById('editEditArtInfoBtn');
            if (addBtn) addBtn.style.display = 'none';
            if (editBtn) editBtn.style.display = 'inline-block';
            
            // Populate art information
            const artInfo = result.data;
            
            const elements = {
                artistName: document.getElementById('editArtArtistName'),
                artName: document.getElementById('editArtArtName'),
                artMedia: document.getElementById('editArtArtMedia'),
                submitor: document.getElementById('editArtSubmitor')
            };
            
            console.log('🎯 Edit mode - Art info elements found:', Object.fromEntries(
                Object.entries(elements).map(([key, el]) => [key, !!el])
            ));
            
            if (elements.artistName) elements.artistName.textContent = artInfo.ArtistName || 'Unknown';
            if (elements.artName) elements.artName.textContent = artInfo.ArtName || 'Unknown';
            if (elements.artMedia) elements.artMedia.textContent = artInfo.ArtMedia || 'Unknown';
            if (elements.submitor) elements.submitor.textContent = artInfo.Submitor || 'Unknown';
            
            // Store the art ID and media filename for editing
            window.currentEditProjectArtId = artInfo.ArtId;
            window.currentEditProjectMediaFile = filename;
            
            console.log('🎉 Edit mode - Art info successfully displayed!');
            
        } else {
            console.log('ℹ️ Edit mode - No art info found for media:', filename, 'API result:', result);
            // Show Add Art Info button, hide Edit Art Info button
            const addBtn = document.getElementById('editAddArtInfoBtn');
            const editBtn = document.getElementById('editEditArtInfoBtn');
            if (addBtn) addBtn.style.display = 'inline-block';
            if (editBtn) editBtn.style.display = 'none';
            // Keep showing the no-art-info container
            window.currentEditProjectMediaFile = filename;
        }
        
    } catch (error) {
        console.error('❌ Edit mode - Error loading art info:', error);
        // Show Add Art Info button, hide Edit Art Info button for error case
        const addBtn = document.getElementById('editAddArtInfoBtn');
        const editBtn = document.getElementById('editEditArtInfoBtn');
        if (addBtn) addBtn.style.display = 'inline-block';
        if (editBtn) editBtn.style.display = 'none';
        // Keep showing the no-art-info container
    }
}

// Function to handle editing art info from edit project mode
function editArtInfoFromProject() {
    if (window.currentEditProjectMediaFile) {
        showAddArtInfoModal(window.currentEditProjectMediaFile);
        // Don't close the edit project modal - user might want to continue editing
    }
}

// Close Edit Project Modal
function closeEditProjectModal() {
    // End editing session if there's an active project being edited
    if (window.currentEditingProjectId) {
        endEditingSession(window.currentEditingProjectId);
        window.currentEditingProjectId = null;
    }
    
    const modal = document.getElementById('editProjectModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Reset form
        const form = document.getElementById('editProjectForm');
        if (form) {
            form.reset();
        }
        
        // Hide image gallery if open
        hideEditImageGallery();
    }
}

// Show edit image gallery
function showEditImageGallery() {
    console.log('🖼️ showEditImageGallery called');
    
    const gallery = document.getElementById('editImageGallery');
    const addBtn = document.getElementById('editAddImageBtn');
    
    console.log('📋 Gallery elements check:', {
        gallery: !!gallery,
        addBtn: !!addBtn
    });
    
    if (!gallery) {
        console.error('❌ editImageGallery element not found in showEditImageGallery');
        showNotification('Image gallery element not found. Please refresh the page.', 'error');
        return;
    }
    
    if (!addBtn) {
        console.error('❌ editAddImageBtn element not found in showEditImageGallery');
        showNotification('Add image button element not found. Please refresh the page.', 'error');
        return;
    }
    
    console.log('✅ Both elements found, showing gallery');
    gallery.style.display = 'block';
    addBtn.style.display = 'none';
    
    // Load user's images
    console.log('📤 Loading edit image gallery');
    loadEditImageGallery();
}

// Hide edit image gallery
function hideEditImageGallery() {
    const gallery = document.getElementById('editImageGallery');
    const addBtn = document.getElementById('editAddImageBtn');
    
    if (gallery && addBtn) {
        gallery.style.display = 'none';
        addBtn.style.display = 'block';
    }
}

// Load images for edit gallery
async function loadEditImageGallery() {
    console.log('📂 loadEditImageGallery started');
    
    const galleryGrid = document.getElementById('editImageGalleryGrid');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    console.log('📋 Gallery load elements check:', {
        galleryGrid: !!galleryGrid,
        currentUser: !!currentUser,
        userId: currentUser?.id
    });
    
    if (!galleryGrid) {
        console.error('❌ editImageGalleryGrid element not found');
        return;
    }
    
    if (!currentUser) {
        console.error('❌ No current user found in localStorage');
        galleryGrid.innerHTML = '<div class="gallery-empty">Please log in to view images</div>';
        return;
    }

    try {
        console.log('📤 Loading images for user:', currentUser.id);
        galleryGrid.innerHTML = '<div class="gallery-loading"><i class="fas fa-spinner fa-spin"></i> Loading images...</div>';
        
        const apiUrl = `${API_BASE_URL}/media/files?userId=${currentUser.id}`;
        console.log('🌐 Making request to:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('📨 Response status:', response.status, response.statusText);
        
        const result = await response.json();
        console.log('📊 API Response:', {
            success: result.success,
            filesCount: result.files?.length,
            message: result.message
        });
        
        if (result.success && result.files) {
            const imageFiles = result.files.filter(file => 
                file.mimeType && file.mimeType.startsWith('image/')
            );
            
            console.log('🖼️ Image files found:', imageFiles.length);
            
            if (imageFiles.length === 0) {
                galleryGrid.innerHTML = '<div class="gallery-empty">No images found. Upload some images first!</div>';
                return;
            }
            
            console.log('🎨 Rendering gallery with', imageFiles.length, 'images');
            galleryGrid.innerHTML = imageFiles.map(file => `
                <div class="gallery-image-item" onclick="selectEditImage('${file.id}', '${file.url}', '${file.customName || file.originalName || file.name}')">
                    <img src="${file.url}" alt="${file.customName || file.originalName || file.name}" loading="lazy">
                    <div class="gallery-image-name">${file.customName || file.originalName || file.name}</div>
                </div>
            `).join('');
            
            console.log('✅ Gallery rendered successfully');
        } else {
            console.error('❌ API request failed:', result.message);
            galleryGrid.innerHTML = '<div class="gallery-empty">Failed to load images</div>';
        }
    } catch (error) {
        console.error('❌ Error loading edit images:', error);
        galleryGrid.innerHTML = '<div class="gallery-empty">Error loading images</div>';
    }
}

// Select image for project
function selectEditImage(imageId, imageUrl, imageName) {
    console.log('🖼️ selectEditImage called with:', { imageId, imageUrl, imageName });
    
    // Set the hidden input value to the imageId (numeric ID for database)
    const hiddenInput = document.getElementById('editSelectedImageId');
    if (hiddenInput) {
        hiddenInput.value = imageId;  // Use imageId instead of filename
        console.log('✅ Set editSelectedImageId to:', imageId);
    }
    
    // Show thumbnail
    const thumbnail = document.getElementById('editProjectImageThumbnail');
    const thumbnailImg = document.getElementById('editProjectThumbnailImg');
    
    if (thumbnail && thumbnailImg) {
        thumbnailImg.src = imageUrl;
        thumbnailImg.alt = imageName;
        thumbnail.style.display = 'block';
        console.log('✅ Showing thumbnail for selected image');
    }
    
    // Update the image management button text
    const imageButtonText = document.getElementById('editImageButtonText');
    if (imageButtonText) {
        imageButtonText.textContent = 'Change Image';
        console.log('🔄 Updated button text to "Change Image"');
    }
    
    // Hide gallery and show add button
    hideEditImageGallery();
    
    // Load art info for the newly selected image
    const projectData = {
        ImageID: imageId,
        ImageURL: imageUrl
    };
    loadEditProjectArtInfo(projectData);
    
    showNotification(`Image "${imageName}" selected for project`, 'success');
}

// Show art info modal for the currently selected image in edit project modal
function showAddArtInfoForSelectedImage() {
    console.log('🎨 showAddArtInfoForSelectedImage called');
    
    const selectedImageInput = document.getElementById('editSelectedImageId');
    if (!selectedImageInput || !selectedImageInput.value) {
        console.warn('🎨 No image selected for this project');
        showNotification('Please select an image first', 'error');
        return;
    }
    
    // Get the image info from the thumbnail display
    const thumbnailImg = document.getElementById('editProjectThumbnailImg');
    if (!thumbnailImg || !thumbnailImg.src) {
        console.warn('🎨 No thumbnail image found');
        showNotification('Please select an image first', 'error');
        return;
    }
    
    console.log('🎨 Selected image details:', {
        imageId: selectedImageInput.value,
        imageSrc: thumbnailImg.src,
        imageAlt: thumbnailImg.alt
    });
    
    // Create image info object for art info modal
    const imageInfo = {
        id: selectedImageInput.value,
        src: thumbnailImg.src,
        name: thumbnailImg.alt || 'Selected Image',
        file_name: thumbnailImg.alt
    };
    
    // Set currentArtInfoImage and show modal
    currentArtInfoImage = imageInfo;
    
    const modal = document.getElementById('addArtInfoModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Update modal content with image info
        updateArtInfoModal();
        checkExistingArtInfo();
    }
}

// Update art info modal with current image information
function updateArtInfoModal() {
    console.log('🎨 updateArtInfoModal called with currentArtInfoImage:', currentArtInfoImage);
    
    if (!currentArtInfoImage) {
        console.warn('🎨 No currentArtInfoImage available for modal update');
        return;
    }
    
    // Update the modal's image display if there's an element for it
    const modalImageDisplay = document.getElementById('artInfoImageDisplay');
    if (modalImageDisplay) {
        modalImageDisplay.innerHTML = `
            <img src="${currentArtInfoImage.src}" alt="${currentArtInfoImage.name}" 
                 style="max-width: 200px; max-height: 150px; object-fit: cover; border-radius: 4px;">
            <p style="margin-top: 8px; font-size: 14px; color: #666;">
                Adding art info for: ${currentArtInfoImage.name}
            </p>
        `;
    }
    
    // Update modal title to include image name
    const modalTitle = document.querySelector('#addArtInfoModal h2');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="fas fa-palette"></i> Add Art Information - ${currentArtInfoImage.name}`;
    }
    
    console.log('🎨 Modal updated with image info');
}

// Change edit project image
function changeEditProjectImage() {
    console.log('🔄 changeEditProjectImage called');
    
    // Check if elements exist before proceeding
    const gallery = document.getElementById('editImageGallery');
    const addBtn = document.getElementById('editAddImageBtn');
    
    console.log('📋 Elements check:', {
        gallery: !!gallery,
        addBtn: !!addBtn,
        galleryDisplay: gallery ? gallery.style.display : 'N/A',
        addBtnDisplay: addBtn ? addBtn.style.display : 'N/A'
    });
    
    if (!gallery) {
        console.error('❌ editImageGallery element not found');
        showNotification('Image gallery not found. Please refresh the page.', 'error');
        return;
    }
    
    if (!addBtn) {
        console.error('❌ editAddImageBtn element not found');
        showNotification('Add image button not found. Please refresh the page.', 'error');
        return;
    }
    
    showEditImageGallery();
}

function showDashboard() {
    const dashboardPlaceholder = document.getElementById('dashboard-placeholder');
    const websiteContent = document.getElementById('website-content');
    const mainNavbar = document.querySelector('.navbar');
    
    // Ensure all modals are closed when showing dashboard
    const mediaPreviewModal = document.getElementById('mediaPreviewModal');
    if (mediaPreviewModal) {
        mediaPreviewModal.style.display = 'none';
    }
    
    if (dashboardPlaceholder && websiteContent) {
        dashboardPlaceholder.style.display = 'block';
        websiteContent.style.display = 'none';
        
        // Hide main navbar when on dashboard
        if (mainNavbar) {
            mainNavbar.style.display = 'none';
        }
        
        // Load dashboard data
        loadDashboardData();
    }
}

function hideDashboard() {
    const dashboardPlaceholder = document.getElementById('dashboard-placeholder');
    const websiteContent = document.getElementById('website-content');
    const mainNavbar = document.querySelector('.navbar');
    
    if (dashboardPlaceholder && websiteContent) {
        dashboardPlaceholder.style.display = 'none';
        websiteContent.style.display = 'block';
        
        // Show main navbar when returning to main site
        if (mainNavbar) {
            mainNavbar.style.display = 'flex';
        }
    }
}

function initializeDashboardEventListeners() {
    console.log('🔧 Initializing dashboard event listeners...');
    
    // Set up art info form event listener
    const addArtInfoForm = document.getElementById('addArtInfoForm');
    if (addArtInfoForm) {
        console.log('✅ Found addArtInfoForm, setting up event listeners');
        
        // Remove any existing event listeners to prevent duplicates
        addArtInfoForm.removeEventListener('submit', handleArtInfoFormSubmit);
        
        // Add the form submit event listener
        addArtInfoForm.addEventListener('submit', handleArtInfoFormSubmit);
        
        // Also add a click listener to the submit button as backup
        const submitButton = addArtInfoForm.querySelector('button[type="submit"]');
        if (submitButton) {
            console.log('✅ Adding click listener to submit button as backup');
            submitButton.removeEventListener('click', handleArtInfoButtonClick);
            submitButton.addEventListener('click', handleArtInfoButtonClick);
        }
        
        console.log('🎯 Art info form event listeners attached successfully');
    } else {
        console.warn('❌ addArtInfoForm not found in DOM');
    }
    
    // Set up replace media form event listener
    const replaceForm = document.getElementById('replaceMediaForm');
    if (replaceForm) {
        console.log('✅ FORM HANDLER: Found replace form, adding submit listener');
        replaceForm.addEventListener('submit', async function(e) {
            console.log('📋 FORM SUBMIT: Replace form submitted');
            e.preventDefault();
            await handleReplaceMedia();
        });
    } else {
        console.log('❌ FORM HANDLER: Replace form not found in dashboard!');
    }
    
    // Set up any other dashboard-specific event listeners here
    
    // Set up edit project form event listener
    const editProjectForm = document.getElementById('editProjectForm');
    if (editProjectForm) {
        console.log('✅ Found editProjectForm, setting up event listeners');
        
        // Remove any existing event listeners to prevent duplicates
        editProjectForm.removeEventListener('submit', handleEditProject);
        
        // Add the form submit event listener
        editProjectForm.addEventListener('submit', handleEditProject);
        
        console.log('🎯 Edit project form event listeners attached successfully');
    } else {
        console.warn('❌ editProjectForm not found in DOM');
    }
    
    // Set up create project form event listener
    const createProjectForm = document.getElementById('createProjectForm');
    if (createProjectForm) {
        console.log('✅ Found createProjectForm, setting up event listeners');
        
        // Remove any existing event listeners to prevent duplicates
        createProjectForm.removeEventListener('submit', handleCreateProject);
        
        // Add the form submit event listener
        createProjectForm.addEventListener('submit', handleCreateProject);
        
        console.log('🎯 Create project form event listeners attached successfully');
    } else {
        console.warn('❌ createProjectForm not found in DOM');
    }
    
    // Set up create artwork form event listener
    const createArtworkForm = document.getElementById('createArtworkForm');
    if (createArtworkForm) {
        console.log('✅ Found createArtworkForm, setting up event listeners');
        
        // Remove any existing event listeners to prevent duplicates
        createArtworkForm.removeEventListener('submit', handleCreateArtwork);
        
        // Add the form submit event listener
        createArtworkForm.addEventListener('submit', handleCreateArtwork);
        
        console.log('🎯 Create artwork form event listeners attached successfully');
    } else {
        console.warn('❌ createArtworkForm not found in DOM');
    }
    
    // ...
}

// Art info form submit handler
function handleArtInfoFormSubmit(e) {
    console.log('🎯 Art info form submit event triggered!');
    e.preventDefault();
    submitArtInfo();
}

// Art info button click handler
function handleArtInfoButtonClick(e) {
    console.log('🎯 Art info submit button clicked!');
    e.preventDefault();
    submitArtInfo();
}

async function loadDashboardData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    
    // Update user info
    const usernameElement = document.getElementById('dashboard-username');
    const userRoleElement = document.getElementById('dashboard-user-role');
    const userSinceElement = document.getElementById('dashboard-user-since');
    
    if (usernameElement) {
        usernameElement.textContent = currentUser.username;
    }
    
    if (userRoleElement) {
        userRoleElement.textContent = currentUser.isAdmin ? 'Administrator' : 'User';
    }
    
    if (userSinceElement) {
        userSinceElement.textContent = new Date().toLocaleDateString();
    }
    
    // Initialize dashboard event listeners after content is loaded
    initializeDashboardEventListeners();
    
    // Load statistics
    try {
        const [usersResponse, artResponse, projectsResponse] = await Promise.all([
            // Only admins should fetch user counts
            currentUser.isAdmin ? fetchFromAPI('/users') : Promise.resolve({ success: true, data: [] }),
            // Only admins should fetch artwork data for statistics
            currentUser.isAdmin ? fetchFromAPI('/art') : Promise.resolve({ success: true, data: [] }),
            fetchFromAPI(`/projects?user_id=${encodeURIComponent(currentUser.id)}`)
        ]);
        
        // Update total counts
        const totalUsersElement = document.getElementById('total-users-count');
        const totalArtworksElement = document.getElementById('total-artworks-count');
        const userArtworksElement = document.getElementById('user-artworks-count');
        const userProjectsElement = document.getElementById('user-projects-count');
        
        // Only show total user count to admins
        if (totalUsersElement) {
            if (currentUser.isAdmin && usersResponse.success) {
                totalUsersElement.textContent = usersResponse.data.length;
                totalUsersElement.parentElement.style.opacity = '1';
                totalUsersElement.parentElement.style.display = 'block';
            } else {
                // Hide the entire stat card for regular users
                totalUsersElement.parentElement.style.display = 'none';
            }
        }
        
        // Only show total artworks to admins
        if (totalArtworksElement) {
            if (currentUser.isAdmin && artResponse.success) {
                totalArtworksElement.textContent = artResponse.data.length;
                totalArtworksElement.parentElement.style.opacity = '1';
                totalArtworksElement.parentElement.style.display = 'block';
            } else {
                // Hide the entire stat card for regular users
                totalArtworksElement.parentElement.style.display = 'none';
            }
        }
        
        // Only show user's artworks to admins (regular users don't need this)
        if (userArtworksElement) {
            if (currentUser.isAdmin && artResponse.success) {
                const userArtworks = artResponse.data.filter(art => 
                    art.Submitor === currentUser.username || art.ArtistName === currentUser.username
                );
                userArtworksElement.textContent = userArtworks.length;
                userArtworksElement.parentElement.style.opacity = '1';
                userArtworksElement.parentElement.style.display = 'block';
            } else {
                // Hide the entire stat card for regular users
                userArtworksElement.parentElement.style.display = 'none';
            }
        }
        
        // Projects are visible to all users
        if (userProjectsElement && projectsResponse.success) {
            userProjectsElement.textContent = projectsResponse.data.length;
        }

        // Display user's projects in the grid
        const userProjectsGrid = document.getElementById('user-projects-grid');
        if (userProjectsGrid) {
            userProjectsGrid.innerHTML = '';
            if (projectsResponse.data.length === 0) {
                userProjectsGrid.innerHTML = `<div class="projects-empty">
                    <div class="projects-empty-icon"><i class="fas fa-folder-open"></i></div>
                    <h4>No Projects Found</h4>
                    <p>You haven't created any projects yet.</p>
                    <button class="btn" onclick="showCreateProjectModal()"><i class="fas fa-folder-plus"></i> Create Project</button>
                </div>`;
            } else {
                projectsResponse.data.forEach(project => {
                    // Determine status class and label
                    let statusClass = 'project-status-pending';
                    let statusLabel = 'Pending';
                    
                    if (project.Approved) {
                        statusClass = 'project-status-approved';
                        statusLabel = 'Approved';
                    } else if (project.admin_notes && project.admin_notes.trim() !== '') {
                        // If project has admin notes but is not approved, show "Reviewed, Pending Revisions"
                        statusClass = 'project-status-review-yellow';
                        statusLabel = 'Reviewed, Pending Revisions';
                    } else if (project.NeedsReview) {
                        statusClass = 'project-status-review-yellow';
                        statusLabel = 'Needs Review';
                    }
                    
                    // Create thumbnail section
                    let thumbnailSection = '';
                    if (project.ImageURL) {
                        thumbnailSection = `
                            <div class="project-card-thumbnail">
                                <img src="${project.ImageURL}" alt="${project.ProjectName}" loading="lazy">
                            </div>
                        `;
                    } else {
                        thumbnailSection = `
                            <div class="project-card-thumbnail project-card-no-image">
                                <i class="fas fa-image"></i>
                                <span>No Image</span>
                            </div>
                        `;
                    }
                    
                    userProjectsGrid.innerHTML += `
                        <div class="project-card">
                            ${thumbnailSection}
                            <div class="project-card-content">
                                <div class="project-card-header">
                                    <h4 class="project-card-title">${project.ProjectName}</h4>
                                    <span class="project-card-status ${statusClass}">${statusLabel}</span>
                                </div>
                                <div class="project-card-description">
                                    ${project.Description ? `<p>${project.Description}</p>` : '<p class="project-no-description">No description available</p>'}
                                </div>
                                <div class="project-card-dates">
                                    <div class="project-card-date"><i class="fas fa-calendar-plus"></i> Created: ${project.DateCreated || '-'} </div>
                                    <div class="project-card-date"><i class="fas fa-calendar-alt"></i> Modified: ${project.DateModified || '-'} </div>
                                </div>
                                <div class="project-card-actions">
                                    <button class="project-card-btn project-card-btn-primary" onclick="viewProject(${project.ProjectID})"><i class="fas fa-eye"></i> View</button>
                                    <button class="project-card-btn project-card-btn-secondary" onclick="editProject(${project.ProjectID})"><i class="fas fa-edit"></i> Edit</button>
                                    <button class="project-card-btn project-card-btn-danger" onclick="deleteProject(${project.ProjectID}, '${project.ProjectName.replace(/'/g, '\\\'')}')" title="Delete Project"><i class="fas fa-trash"></i> Delete</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
    
    // Load admin projects if user is admin
    if (currentUser.isAdmin) {
        loadAdminProjects();
        loadAdminMediaGallery();
        loadAdminUsers();
        showAdminStorageSection();
        showAdminDatabaseSection();
        initializeDatabaseManagement();
    } else {
        // Hide admin sections for regular users
        const adminProjectsSection = document.getElementById('admin-projects-section');
        const adminMediaSection = document.getElementById('admin-media-section');
        const adminUsersSection = document.getElementById('admin-users-section');
        const adminStorageSection = document.getElementById('admin-storage-section');
        const adminDatabaseSection = document.getElementById('admin-database-section');
        if (adminProjectsSection) {
            adminProjectsSection.style.display = 'none';
        }
        if (adminMediaSection) {
            adminMediaSection.style.display = 'none';
        }
        if (adminUsersSection) {
            adminUsersSection.style.display = 'none';
        }
        if (adminStorageSection) {
            adminStorageSection.style.display = 'none';
        }
        if (adminDatabaseSection) {
            adminDatabaseSection.style.display = 'none';
        }
    }
    
    // Initialize media management
    initializeMediaManagement();
}

// Load admin projects - displays all projects in the system for administrators
async function loadAdminProjects() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) return;
    
    const adminSection = document.getElementById('admin-projects-section');
    const adminGrid = document.getElementById('admin-projects-grid');
    const totalProjectsElement = document.getElementById('admin-total-projects');
    const approvedProjectsElement = document.getElementById('admin-approved-projects');
    const pendingProjectsElement = document.getElementById('admin-pending-projects');
    const activeCreatorsElement = document.getElementById('admin-active-creators');
    
    // Show admin section
    if (adminSection) {
        adminSection.style.display = 'block';
    }
    
    try {
        // Load all projects using admin API endpoint
        const response = await fetchFromAPI('/projects?is_admin=true');
        
        if (response.success && response.data) {
            const allProjects = response.data;
            
            // Update admin statistics
            if (totalProjectsElement) {
                totalProjectsElement.textContent = allProjects.length;
            }
            
            if (approvedProjectsElement) {
                const approvedCount = allProjects.filter(p => p.Approved === 1).length;
                approvedProjectsElement.textContent = approvedCount;
            }
            
            if (pendingProjectsElement) {
                const pendingCount = allProjects.filter(p => p.NeedsReview === 1).length;
                pendingProjectsElement.textContent = pendingCount;
            }
            
            if (activeCreatorsElement) {
                const uniqueCreators = new Set(allProjects.map(p => p.creator_name).filter(name => name));
                activeCreatorsElement.textContent = uniqueCreators.size;
            }
            
            // Display projects in admin grid
            if (adminGrid) {
                adminGrid.innerHTML = '';
                
                if (allProjects.length === 0) {
                    adminGrid.innerHTML = `
                        <div class="projects-empty">
                            <div class="projects-empty-icon"><i class="fas fa-crown"></i></div>
                            <h4>No Projects Found</h4>
                            <p>No projects exist in the system yet.</p>
                        </div>
                    `;
                } else {
                    allProjects.forEach(project => {
                        // Determine status class and label
                        let statusClass = 'project-status-pending';
                        let statusLabel = 'Pending';
                        if (project.Approved) {
                            statusClass = 'project-status-approved';
                            statusLabel = 'Approved';
                        } else if (project.NeedsReview) {
                            statusClass = 'project-status-review-yellow';
                            statusLabel = 'Needs Review';
                        }
                        
                        // Create thumbnail section
                        let thumbnailSection = '';
                        if (project.ImageURL) {
                            thumbnailSection = `
                                <div class="project-card-thumbnail">
                                    <img src="${project.ImageURL}" alt="${project.ProjectName}" loading="lazy">
                                </div>
                            `;
                        } else {
                            thumbnailSection = `
                                <div class="project-card-thumbnail project-card-no-image">
                                    <i class="fas fa-image"></i>
                                    <span>No Image</span>
                                </div>
                            `;
                        }
                        
                        adminGrid.innerHTML += `
                            <div class="project-card admin-project-card">
                                ${thumbnailSection}
                                <div class="project-card-content">
                                    <div class="project-card-header">
                                        <h4 class="project-card-title">${project.ProjectName}</h4>
                                        <span class="project-card-status ${statusClass}">${statusLabel}</span>
                                    </div>
                                    <div class="project-card-creator">
                                        <i class="fas fa-user"></i> 
                                        <span>Created by: ${project.creator_name || 'Unknown'}</span>
                                    </div>
                                    <div class="project-card-description">
                                        ${project.Description ? `<p>${project.Description}</p>` : '<p class="project-no-description">No description available</p>'}
                                    </div>
                                    <div class="project-card-dates">
                                        <div class="project-card-date"><i class="fas fa-calendar-plus"></i> Created: ${project.DateCreated || '-'} </div>
                                        <div class="project-card-date"><i class="fas fa-calendar-alt"></i> Modified: ${project.DateModified || '-'} </div>
                                    </div>
                                    <div class="project-card-actions admin-actions">
                                        <button class="project-card-btn project-card-btn-primary" onclick="viewProject(${project.ProjectID})" title="View Project">
                                            <i class="fas fa-eye"></i> View
                                        </button>
                                        <button class="project-card-btn project-card-btn-info" onclick="openAdminNotesModalForProject(${project.ProjectID})" title="Add/Edit Notes for User">
                                            <i class="fas fa-sticky-note"></i> Notes for User
                                        </button>
                                        ${project.Approved === 1 ? 
                                            `<button class="project-card-btn project-card-btn-warning" onclick="adminApproveProject(${project.ProjectID}, '${project.ProjectName.replace(/'/g, '\\\'')}')" title="Unapprove Project">
                                                <i class="fas fa-times-circle"></i> Unapprove
                                            </button>` :
                                            `<button class="project-card-btn project-card-btn-success" onclick="adminApproveProject(${project.ProjectID}, '${project.ProjectName.replace(/'/g, '\\\'')}')" title="Approve Project">
                                                <i class="fas fa-check-circle"></i> Approve
                                            </button>`
                                        }
                                        <button class="project-card-btn project-card-btn-info" onclick="viewCreatorProjects('${project.creator_name}')" title="View Creator's Projects">
                                            <i class="fas fa-user-circle"></i> Creator
                                        </button>
                                        <button class="project-card-btn project-card-btn-danger admin-delete" onclick="adminDeleteProject(${project.ProjectID}, '${project.ProjectName.replace(/'/g, '\\\'')}')" title="Admin Delete">
                                            <i class="fas fa-crown"></i> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }
            }
        } else {
            if (adminGrid) {
                adminGrid.innerHTML = `
                    <div class="projects-error">
                        <div class="projects-error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                        <h4>Error Loading Projects</h4>
                        <p>Failed to load admin project data. Please try again.</p>
                        <button class="btn btn-primary" onclick="refreshAllProjects()">
                            <i class="fas fa-sync-alt"></i> Retry
                        </button>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('Error loading admin projects:', error);
        if (adminGrid) {
            adminGrid.innerHTML = `
                <div class="projects-error">
                    <div class="projects-error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <h4>Error Loading Projects</h4>
                    <p>Network error occurred. Please check your connection.</p>
                    <button class="btn btn-primary" onclick="refreshAllProjects()">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

// Load admin media gallery - displays all media files for all users for administrators
async function loadAdminMediaGallery() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) return;
    
    const adminMediaSection = document.getElementById('admin-media-section');
    const adminMediaGrid = document.getElementById('admin-media-gallery');
    const totalMediaElement = document.getElementById('admin-total-media-count');
    const totalUsersElement = document.getElementById('admin-media-users-count');
    const totalSizeElement = document.getElementById('admin-total-storage');
    const downloadBtn = document.getElementById('download-all-media-btn');
    
    // Show admin media section
    if (adminMediaSection) {
        adminMediaSection.style.display = 'block';
    }
    
    try {
        // Load all media using admin API endpoint
        const response = await fetchFromAPI('/admin/media/all');
        
        if (response.success && response.data) {
            const mediaData = response.data;
            const allMedia = mediaData.media;
            
            // Update admin statistics
            if (totalMediaElement) {
                totalMediaElement.textContent = mediaData.statistics.totalMedia;
            }
            
            if (totalUsersElement) {
                totalUsersElement.textContent = mediaData.statistics.totalUsers;
            }
            
            if (totalSizeElement) {
                const sizeInMB = (mediaData.statistics.totalSize / (1024 * 1024)).toFixed(2);
                totalSizeElement.textContent = `${sizeInMB} MB`;
            }
            
            // Enable download button
            if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.onclick = () => downloadAllMedia();
            }
            
            // Display media in admin grid
            if (adminMediaGrid) {
                adminMediaGrid.innerHTML = '';
                
                if (allMedia.length === 0) {
                    adminMediaGrid.innerHTML = `
                        <div class="media-empty">
                            <div class="media-empty-icon"><i class="fas fa-images"></i></div>
                            <h4>No Media Files Found</h4>
                            <p>No media files exist in the system yet.</p>
                        </div>
                    `;
                } else {
                    allMedia.forEach(media => {
                        const fileExtension = media.file_name.split('.').pop().toLowerCase();
                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension);
                        
                        let mediaPreview = '';
                        if (isImage) {
                            // Add AGGRESSIVE cache busting - unique timestamp per image plus random number
                            const uniqueCacheBuster = Date.now() + Math.random() * 1000 + media.id;
                            const imageUrl = media.file_path.includes('?') ? 
                                `${media.file_path}&v=${uniqueCacheBuster}&bustcache=${Math.random()}` : 
                                `${media.file_path}?v=${uniqueCacheBuster}&bustcache=${Math.random()}`;
                            mediaPreview = `
                                <div class="media-preview">
                                    <img src="${imageUrl}" alt="${media.file_name}" loading="lazy" class="admin-media-thumbnail" onclick="viewMedia('${media.file_path}')" onload="this.style.opacity=1" style="opacity:0;transition:opacity 0.3s">
                                </div>
                            `;
                        } else {
                            mediaPreview = `
                                <div class="media-preview media-file">
                                    <i class="fas fa-file"></i>
                                    <span class="file-extension">${fileExtension.toUpperCase()}</span>
                                </div>
                            `;
                        }
                        
                        const uploadDate = new Date(media.upload_date).toLocaleDateString();
                        const fileSize = media.file_size ? `${(media.file_size / 1024).toFixed(1)} KB` : 'Unknown';
                        
                        adminMediaGrid.innerHTML += `
                            <div class="media-item" data-user-id="${media.user_id}" data-file-type="${fileExtension}">
                                ${mediaPreview}
                                <div class="media-info">
                                    <h5 class="media-title">${media.file_name}</h5>
                                    <div class="media-meta">
                                        <div class="media-user">
                                            <i class="fas fa-user"></i>
                                            <span>${media.username || 'Anonymous'}</span>
                                        </div>
                                        <div class="media-date">
                                            <i class="fas fa-calendar"></i>
                                            <span>${uploadDate}</span>
                                        </div>
                                        <div class="media-size">
                                            <i class="fas fa-file-alt"></i>
                                            <span>${fileSize}</span>
                                        </div>
                                    </div>
                                    <div class="media-actions">
                                        <button class="media-btn view-btn" onclick="viewMedia('${media.file_path}')" title="View Media">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="media-btn download-btn" onclick="downloadMedia('${media.file_path}', '${media.file_name}')" title="Download">
                                            <i class="fas fa-download"></i>
                                        </button>
                                        <button class="media-btn replace-btn" onclick="showReplaceMediaModal(${media.id}, '${media.file_name}', '${media.file_path}')" title="Replace Image">
                                            <i class="fas fa-exchange-alt"></i>
                                        </button>
                                        <button class="media-btn delete-btn" onclick="adminDeleteMedia(${media.id}, '${media.file_name}')" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    
                    // Initialize media filters
                    initializeMediaFilters();
                }
            }
        } else {
            if (adminMediaGrid) {
                adminMediaGrid.innerHTML = `
                    <div class="media-error">
                        <div class="media-error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                        <h4>Error Loading Media</h4>
                        <p>Failed to load admin media data. Please try again.</p>
                        <button class="btn btn-primary" onclick="loadAdminMediaGallery()">
                            <i class="fas fa-sync-alt"></i> Retry
                        </button>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('Error loading admin media gallery:', error);
        if (adminMediaGrid) {
            adminMediaGrid.innerHTML = `
                <div class="media-error">
                    <div class="media-error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <h4>Error Loading Media</h4>
                    <p>Network error occurred. Please check your connection.</p>
                    <button class="btn btn-primary" onclick="loadAdminMediaGallery()">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

// Refresh admin media gallery
function refreshAdminMediaGallery() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) {
        showNotification('Admin access required', 'error');
        return;
    }
    
    loadAdminMediaGallery();
}

// Download all media files and backup JSON as ZIP
async function downloadAllMedia() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) {
        showNotification('Admin access required', 'error');
        return;
    }
    
    const downloadBtn = document.getElementById('download-all-media-btn');
    const originalText = downloadBtn.innerHTML;
    
    try {
        // Show loading state
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing ZIP...';
        downloadBtn.disabled = true;
        
        // Create ZIP download URL
        const zipUrl = '/api/admin/media/download-zip';
        
        // Create invisible link to trigger download
        const link = document.createElement('a');
        link.href = zipUrl;
        link.style.display = 'none';
        
        // Add the link to the body and click it
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        
        showNotification('ZIP download started! Check your downloads folder.', 'success');
        
    } catch (error) {
        console.error('Error downloading media ZIP:', error);
        showNotification('Error occurred during ZIP download', 'error');
    } finally {
        // Restore button state
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    }
}

// Initialize media filters
function initializeMediaFilters() {
    const userFilter = document.getElementById('media-user-filter');
    const typeFilter = document.getElementById('media-type-filter');
    
    if (userFilter) {
        userFilter.addEventListener('change', filterMedia);
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', filterMedia);
    }
}

// Filter media based on user and type selection
function filterMedia() {
    const userFilter = document.getElementById('userFilter');
    const typeFilter = document.getElementById('typeFilter');
    const mediaItems = document.querySelectorAll('.media-item');
    
    const selectedUser = userFilter ? userFilter.value : '';
    const selectedType = typeFilter ? typeFilter.value : '';
    
    mediaItems.forEach(item => {
        const userId = item.dataset.userId;
        const fileType = item.dataset.fileType;
        
        let showItem = true;
        
        if (selectedUser && selectedUser !== userId) {
            showItem = false;
        }
        
        if (selectedType && selectedType !== fileType) {
            showItem = false;
        }
        
        item.style.display = showItem ? 'block' : 'none';
    });
}

// Filter admin media by user (called from HTML)
function filterAdminMediaByUser() {
    filterMedia();
}

// Filter admin media by type (called from HTML)
function filterAdminMediaByType() {
    filterMedia();
}

// View media in modal or new tab
function viewMedia(mediaPath) {
    window.open(mediaPath, '_blank');
}

// Download individual media file
function downloadMedia(mediaPath, fileName) {
    const link = document.createElement('a');
    link.href = mediaPath;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Admin delete media file
async function adminDeleteMedia(mediaId, fileName) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) {
        showNotification('Admin access required', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetchFromAPI(`/admin/media/${mediaId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showNotification('Media file deleted successfully', 'success');
            loadAdminMediaGallery(); // Reload the gallery
        } else {
            showNotification(response.error || 'Failed to delete media file', 'error');
        }
    } catch (error) {
        console.error('Error deleting media:', error);
        showNotification('Error occurred while deleting media', 'error');
    }
}

// Show replace media modal
let currentReplaceMediaId = null;
async function showReplaceMediaModal(mediaId, fileName, filePath) {
    console.log('🔄 REPLACE MODAL: showReplaceMediaModal called');
    console.log('   mediaId:', mediaId, 'type:', typeof mediaId);
    console.log('   fileName:', fileName);
    console.log('   filePath:', filePath);
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        console.log('❌ REPLACE MODAL: No current user found');
        showNotification('Please log in to replace media', 'error');
        return;
    }
    console.log('✅ REPLACE MODAL: Current user:', currentUser.id, currentUser.UserName);

    currentReplaceMediaId = mediaId;
    console.log('📝 REPLACE MODAL: Set currentReplaceMediaId to:', currentReplaceMediaId);
    
    // Update modal with current media info
    console.log('🖼️ REPLACE MODAL: Setting preview image src to:', filePath);
    document.getElementById('currentMediaPreview').src = filePath;
    document.getElementById('currentMediaName').textContent = fileName;
    console.log('📝 REPLACE MODAL: Set media name to:', fileName);
    
    // Get media usage information (admin only)
    try {
        if (currentUser.isAdmin) {
            const response = await fetchFromAPI(`/admin/media/${mediaId}/usage`);
            if (response.success) {
                const usage = response.data;
                let usageText = [];
                
                if (usage.projects > 0) usageText.push(`${usage.projects} project(s)`);
                if (usage.artInfo > 0) usageText.push(`${usage.artInfo} art record(s)`);
                if (usage.cards > 0) usageText.push(`${usage.cards} card(s)`);
                
                document.getElementById('currentMediaUsage').textContent = 
                    usageText.length > 0 ? usageText.join(', ') : 'Not used in any projects or art records';
            } else {
                document.getElementById('currentMediaUsage').textContent = 'Unable to check usage';
            }
        } else {
            document.getElementById('currentMediaUsage').textContent = 'Usage information available to admins only';
        }
    } catch (error) {
        console.error('Error checking media usage:', error);
        document.getElementById('currentMediaUsage').textContent = 'Error checking usage';
    }
    
    // Get owner information (admin only)
    try {
        if (currentUser.isAdmin) {
            const response = await fetchFromAPI(`/admin/media/${mediaId}`);
            if (response.success && response.data) {
                document.getElementById('currentMediaOwner').textContent = 
                    response.data.username || response.data.owner_name || 'Unknown';
            }
        } else {
            document.getElementById('currentMediaOwner').textContent = 'You (Owner)';
        }
    } catch (error) {
        console.error('Error getting media owner:', error);
        document.getElementById('currentMediaOwner').textContent = 'Unknown';
    }
    
    // Show modal
    console.log('👁️ REPLACE MODAL: Showing modal');
    document.getElementById('replaceMediaModal').style.display = 'block';
    console.log('✅ REPLACE MODAL: Modal displayed');
}

// Close replace media modal
function closeReplaceMediaModal() {
    console.log('❌ REPLACE MODAL: Closing modal');
    document.getElementById('replaceMediaModal').style.display = 'none';
    document.getElementById('replaceMediaForm').reset();
    currentReplaceMediaId = null;
    console.log('✅ REPLACE MODAL: Modal closed and form reset');
}

// Replace media file
async function handleReplaceMedia() {
    console.log('🔄 REPLACE HANDLER: handleReplaceMedia started');
    console.log('📝 REPLACE HANDLER: currentReplaceMediaId:', currentReplaceMediaId);
    
    if (!currentReplaceMediaId) {
        console.log('❌ REPLACE HANDLER: No media ID selected');
        showNotification('No media selected for replacement', 'error');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    console.log('👤 REPLACE HANDLER: Current user:', currentUser);
    if (!currentUser) {
        console.log('❌ REPLACE HANDLER: No user logged in');
        showNotification('Please log in to replace media', 'error');
        return;
    }
    
    const fileInput = document.getElementById('replaceMediaFile');
    const replaceBtn = document.getElementById('replaceMediaBtn');
    const progressDiv = document.getElementById('replaceProgress');
    const progressFill = document.getElementById('replaceProgressFill');
    const progressText = document.getElementById('replaceProgressText');
    
    console.log('📋 REPLACE HANDLER: Form elements found:');
    console.log('   fileInput:', !!fileInput);
    console.log('   replaceBtn:', !!replaceBtn);
    console.log('   progressDiv:', !!progressDiv);
    
    if (!fileInput.files[0]) {
        console.log('❌ REPLACE HANDLER: No file selected');
        showNotification('Please select a file to upload', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    console.log('📄 REPLACE HANDLER: File selected:');
    console.log('   name:', file.name);
    console.log('   type:', file.type);
    console.log('   size:', file.size);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        console.log('❌ REPLACE HANDLER: Invalid file type:', file.type);
        showNotification('Please select an image file', 'error');
        return;
    }
    console.log('✅ REPLACE HANDLER: File type validation passed');
    
    try {
        // Show progress
        console.log('📊 REPLACE HANDLER: Showing progress UI');
        replaceBtn.disabled = true;
        progressDiv.style.display = 'block';
        progressText.textContent = 'Uploading new media...';
        progressFill.style.width = '20%';
        
        // Create form data
        console.log('📦 REPLACE HANDLER: Creating form data');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('originalMediaId', currentReplaceMediaId);
        console.log('📦 REPLACE HANDLER: FormData created with:');
        console.log('   file:', file.name);
        console.log('   originalMediaId:', currentReplaceMediaId);
        
        // Determine endpoint based on user type
        let endpoint;
        if (currentUser.isAdmin) {
            endpoint = `${API_BASE_URL}/admin/media/${currentReplaceMediaId}/replace`;
            console.log('👑 REPLACE HANDLER: Using admin endpoint:', endpoint);
        } else {
            // Use user endpoint and include userId for regular users
            formData.append('userId', currentUser.id);
            endpoint = `${API_BASE_URL}/media/${currentReplaceMediaId}/replace`;
            console.log('👤 REPLACE HANDLER: Using user endpoint:', endpoint);
            console.log('👤 REPLACE HANDLER: Added userId to formData:', currentUser.id);
        }
        
        // Upload and replace
        console.log('🌐 REPLACE HANDLER: Starting fetch request to:', endpoint);
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });
        
        console.log('📡 REPLACE HANDLER: Fetch response received:');
        console.log('   status:', response.status);
        console.log('   statusText:', response.statusText);
        console.log('   ok:', response.ok);
        
        if (!response.ok) {
            console.log('❌ REPLACE HANDLER: HTTP error');
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📋 REPLACE HANDLER: Response JSON:', result);
        
        if (result.success) {
            console.log('✅ REPLACE HANDLER: API replacement successful!');
            progressFill.style.width = '100%';
            progressText.textContent = 'Media replacement completed!';
            
            console.log('📊 REPLACE HANDLER: Replacement data:', result.data);
            showNotification('Media replaced successfully! All references have been updated.', 'success');
            
            // Refresh project gallery since media replacement may affect project approval status
            console.log('🏛️ REPLACE HANDLER: Refreshing project gallery due to potential approval status changes');
            const galleryGrid = document.getElementById('galleryGrid');
            if (galleryGrid) {
                loadGallery();
            }
            
            // Refresh user dashboard since media replacement may affect project approval status
            console.log('📊 REPLACE HANDLER: Refreshing user dashboard due to potential approval status changes');
            const userProjectsGrid = document.getElementById('user-projects-grid');
            if (userProjectsGrid) {
                loadDashboardData();
            }
            
            // AGGRESSIVE cache busting - force reload ALL images
            console.log('🔄 REPLACE HANDLER: Starting aggressive cache busting');
            const timestamp = Date.now();
            
            // Method 1: Update all existing images with cache busting
            console.log('🖼️ REPLACE HANDLER: Method 1 - Updating all images with cache busting');
            const allImages = document.querySelectorAll('img');
            console.log('🖼️ REPLACE HANDLER: Found', allImages.length, 'images');
            
            allImages.forEach((img, index) => {
                if (img.src && (img.src.includes('/uploads/') || img.src.includes('media'))) {
                    const oldSrc = img.src;
                    const cleanUrl = img.src.split('?')[0];
                    const newSrc = cleanUrl + '?v=' + timestamp + '&bust=' + Math.random();
                    img.src = newSrc;
                    console.log(`🖼️ REPLACE HANDLER: Image ${index} updated:`, oldSrc, '→', newSrc);
                    
                    // Force reload by changing src twice
                    setTimeout(() => {
                        const finalSrc = cleanUrl + '?v=' + (timestamp + 1) + '&bust=' + Math.random();
                        img.src = finalSrc;
                        console.log(`🖼️ REPLACE HANDLER: Image ${index} final update:`, finalSrc);
                    }, 100);
                }
            });
            
            // Method 2: Clear browser cache headers for media requests
            console.log('🗑️ REPLACE HANDLER: Method 2 - Clearing browser caches');
            if ('caches' in window) {
                caches.delete('media-cache').then(() => {
                    console.log('✅ REPLACE HANDLER: Media cache deleted');
                }).catch(err => {
                    console.log('⚠️ REPLACE HANDLER: Cache delete failed:', err);
                });
            } else {
                console.log('⚠️ REPLACE HANDLER: Browser cache API not available');
            }
            
            // Method 3: Force refresh the media gallery with delay to ensure backend update
            console.log('📁 REPLACE HANDLER: Method 3 - Refreshing gallery with delay');
            setTimeout(() => {
                console.log('📁 REPLACE HANDLER: Delayed gallery refresh starting');
                if (currentUser.isAdmin) {
                    console.log('👑 REPLACE HANDLER: Calling loadAdminMediaGallery');
                    loadAdminMediaGallery();
                } else {
                    console.log('👤 REPLACE HANDLER: Calling refreshMediaGallery');
                    refreshMediaGallery();
                }
            }, 200);
            
            // Method 4: Also force refresh the media gallery immediately
            console.log('📁 REPLACE HANDLER: Method 4 - Immediate gallery refresh');
            if (currentUser.isAdmin) {
                console.log('👑 REPLACE HANDLER: Immediate loadAdminMediaGallery');
                loadAdminMediaGallery();
            } else {
                console.log('👤 REPLACE HANDLER: Immediate refreshMediaGallery');
                refreshMediaGallery();
            }
            
            // Close modal and refresh gallery again after delay
            console.log('⏰ REPLACE HANDLER: Setting up final modal close and refresh');
            setTimeout(() => {
                console.log('🔒 REPLACE HANDLER: Final modal close and refresh starting');
                closeReplaceMediaModal();
                if (currentUser.isAdmin) {
                    console.log('👑 REPLACE HANDLER: Final loadAdminMediaGallery');
                    loadAdminMediaGallery();
                } else {
                    console.log('👤 REPLACE HANDLER: Final refreshMediaGallery');
                    refreshMediaGallery();
                }
                console.log('✅ REPLACE HANDLER: Replacement process completed successfully!');
            }, 1500);
            
        } else {
            console.log('❌ REPLACE HANDLER: API returned failure:', result);
            throw new Error(result.error || 'Failed to replace media');
        }
        
    } catch (error) {
        console.error('💥 REPLACE HANDLER: Error during replacement:', error);
        console.error('💥 REPLACE HANDLER: Error stack:', error.stack);
        showNotification(`Error replacing media: ${error.message}`, 'error');
        
        console.log('🔄 REPLACE HANDLER: Resetting UI after error');
        progressDiv.style.display = 'none';
        replaceBtn.disabled = false;
        console.log('✅ REPLACE HANDLER: UI reset completed');
    }
    
    console.log('🏁 REPLACE HANDLER: handleReplaceMedia function ended');
}

// Refresh all projects (admin function)
function refreshAllProjects() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) {
        showNotification('Admin access required', 'error');
        return;
    }
    
    showNotification('Refreshing all projects...', 'info');
    loadAdminProjects();
}

// View all projects by a specific creator (admin function)
async function viewCreatorProjects(creatorName) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) {
        showNotification('Admin access required', 'error');
        return;
    }
    
    try {
        const response = await fetchFromAPI(`/projects?is_admin=true`);
        if (response.success && response.data) {
            const creatorProjects = response.data.filter(p => p.creator_name === creatorName);
            
            let projectsList = creatorProjects.map(p => 
                `• ${p.ProjectName} (${p.Approved ? 'Approved' : 'Pending'}) - Created: ${p.DateCreated || 'Unknown'}`
            ).join('\n');
            
            if (projectsList) {
                alert(`Projects by ${creatorName}:\n\n${projectsList}\n\nTotal: ${creatorProjects.length} project(s)`);
            } else {
                alert(`No projects found for creator: ${creatorName}`);
            }
        }
    } catch (error) {
        console.error('Error fetching creator projects:', error);
        showNotification('Failed to load creator projects', 'error');
    }
}

// Admin delete project function
async function adminDeleteProject(projectId, projectName) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) {
        showNotification('Admin access required', 'error');
        return;
    }
    
    if (!confirm(`⚠️ ADMIN DELETE\n\nAre you sure you want to delete the project "${projectName}"?\n\nThis action cannot be undone and will permanently remove the project from the system.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification(`Project "${projectName}" deleted successfully (Admin)`, 'success');
            // Reload both user and admin projects
            loadDashboardData();
        } else {
            showNotification(result.message || 'Failed to delete project', 'error');
        }
    } catch (error) {
        console.error('Admin delete project error:', error);
        showNotification('Failed to delete project', 'error');
    }
}

// Admin approve/unapprove project function
async function adminApproveProject(projectId, projectName) {
    console.log('🔐 Admin approval action for project:', projectId);
    
    // Get current user info for authorization
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        showNotification('Please log in first', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/projects/${projectId}/approve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        });

        const result = await response.json();
        
        if (result.success) {
            const action = result.newStatus.approved ? 'approved' : 'unapproved';
            showNotification(`Project "${projectName}" has been ${action} successfully!`, 'success');
            
            // Reload admin projects to show updated status
            loadAdminProjects();
            
            // Refresh the main gallery if gallery elements exist
            const galleryGrid = document.getElementById('galleryGrid');
            if (galleryGrid) {
                loadGallery();
            }
            
            // Refresh the user dashboard if dashboard elements exist (for regular users viewing their projects)
            const userProjectsGrid = document.getElementById('user-projects-grid');
            if (userProjectsGrid) {
                loadDashboardData();
            }
        } else {
            showNotification(result.message || 'Failed to update project approval status', 'error');
        }
    } catch (error) {
        console.error('Admin approval error:', error);
        showNotification('Error updating project approval status. Please try again.', 'error');
    }
}

// Filter admin projects based on approval status
function filterAdminProjects() {
    const filterSelect = document.getElementById('admin-project-filter');
    const filterValue = filterSelect ? filterSelect.value : 'all';
    
    console.log('🔍 Filtering admin projects by:', filterValue);
    
    const adminCards = document.querySelectorAll('.admin-project-card');
    
    adminCards.forEach(card => {
        const statusElement = card.querySelector('.project-card-status');
        const statusText = statusElement ? statusElement.textContent.trim() : '';
        
        let shouldShow = true;
        
        switch (filterValue) {
            case 'approved':
                shouldShow = statusText === 'Approved';
                break;
            case 'pending':
                shouldShow = statusText === 'Needs Review';
                break;
            case 'rejected':
                shouldShow = statusText === 'Pending' || (statusText !== 'Approved' && statusText !== 'Needs Review');
                break;
            case 'all':
            default:
                shouldShow = true;
                break;
        }
        
        card.style.display = shouldShow ? 'block' : 'none';
    });
}

// Dashboard Action Functions
function showCreateArtworkModal() {
    const modal = document.getElementById('createArtworkModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeCreateArtworkModal() {
    const modal = document.getElementById('createArtworkModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('createArtworkForm').reset();
    }
}

function showCreateProjectModal() {
    const modal = document.getElementById('createProjectModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeCreateProjectModal() {
    const modal = document.getElementById('createProjectModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('createProjectForm').reset();
    }
}

function viewProfile() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        showNotification(`Profile for ${currentUser.username}`, 'info');
        // In a real app, this would open a profile editing modal
    }
}

function viewGallery() {
    hideDashboard();
    document.getElementById('gallery').scrollIntoView({
        behavior: 'smooth'
    });
}

function navigateToSection(sectionId) {
    hideDashboard();
    setTimeout(() => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({
                behavior: 'smooth'
            });
        }
    }, 100);
}

// Handle Create Artwork Form
async function handleCreateArtwork(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser || !currentUser.username) {
        showNotification('Please log in to create artwork', 'error');
        return;
    }
    
    const artName = formData.get('artworkName');
    const artistName = formData.get('artistName');
    
    if (!artName || artName.trim() === '') {
        showNotification('Artwork name is required', 'error');
        return;
    }
    
    if (!artistName || artistName.trim() === '') {
        showNotification('Artist name is required', 'error');
        return;
    }
    
    const artworkData = {
        ArtName: artName.trim(),
        ArtistName: artistName.trim(),
        Submitor: currentUser.username,
        Date: formData.get('artworkDate') || new Date().toISOString().split('T')[0],
        ArtMedia: 1, // Default media type
        artcol: formData.get('artworkDescription') || ''
    };
    
    console.log('Creating artwork with data:', artworkData);
    
    try {
        const response = await fetch(`${API_BASE_URL}/art`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(artworkData)
        });
        
        console.log('Artwork creation response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Artwork creation failed with status:', response.status, errorText);
            showNotification(`Failed to create artwork: ${response.status}`, 'error');
            return;
        }
        
        const result = await response.json();
        console.log('Artwork creation result:', result);
        
        if (result.success) {
            showNotification('Artwork created successfully!', 'success');
            closeCreateArtworkModal();
            loadDashboardData(); // Refresh dashboard stats
        } else {
            showNotification(result.message || 'Failed to create artwork', 'error');
        }
    } catch (error) {
        console.error('Create artwork error:', error);
        showNotification('Failed to create artwork: Network error', 'error');
    }
}

// Handle Create Project Form
async function handleCreateProject(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser || !currentUser.id) {
        showNotification('Please log in to create projects', 'error');
        return;
    }
    
    const projectName = formData.get('projectName');
    if (!projectName || projectName.trim() === '') {
        showNotification('Project name is required', 'error');
        return;
    }
    
    const projectData = {
        ProjectName: projectName.trim(),
        Description: formData.get('projectDescription') || null,
        Approved: 0,
        NeedsReview: 1,
        user_id: currentUser.id,
        DateCreated: new Date().toISOString().split('T')[0],
        DateModified: new Date().toISOString().split('T')[0]
    };
    
    console.log('Creating project with data:', projectData);
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(projectData)
        });
        
        console.log('Project creation response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Project creation failed with status:', response.status, errorText);
            showNotification(`Failed to create project: ${response.status}`, 'error');
            return;
        }
        
        const result = await response.json();
        console.log('Project creation result:', result);
        
        if (result.success) {
            showNotification('Project created successfully!', 'success');
            closeCreateProjectModal();
            loadDashboardData(); // Refresh dashboard stats
        } else {
            showNotification(result.message || 'Failed to create project', 'error');
        }
    } catch (error) {
        console.error('Create project error:', error);
        showNotification('Failed to create project: Network error', 'error');
    }
}

// Handle Edit Project Form
async function handleEditProject(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        showNotification('Please log in to edit projects', 'error');
        return;
    }
    
    // Get the project ID from a hidden field or store it when opening the modal
    const projectId = window.currentEditingProjectId; // We'll set this when opening the modal
    if (!projectId) {
        showNotification('Project ID not found', 'error');
        return;
    }
    
    const projectData = {
        ProjectName: formData.get('editProjectName'),
        Description: formData.get('editProjectDescription'),
        DateModified: new Date().toISOString().split('T')[0],
        user_id: currentUser.id // Add user ID for approval reset checking
    };
    
    console.log('📝 Form data extracted:', {
        ProjectName: projectData.ProjectName,
        Description: projectData.Description,
        rawDescription: formData.get('editProjectDescription')
    });

    // Add image ID if selected
    const selectedImageId = formData.get('selectedImageId');
    if (selectedImageId) {
        projectData.ImageID = selectedImageId;
        console.log('🖼️ Adding ImageID to project data:', selectedImageId);
    } else {
        console.log('🔍 No selectedImageId found in form data');
    }
    
    console.log('📤 Sending project data to server:', projectData);    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(projectData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Project updated successfully!', 'success');
            closeEditProjectModal();
            loadDashboardData(); // Refresh dashboard
            
            // Refresh the main gallery if gallery elements exist
            const galleryGrid = document.getElementById('galleryGrid');
            if (galleryGrid) {
                loadGallery();
            }
        } else {
            showNotification(result.message || 'Failed to update project', 'error');
        }
    } catch (error) {
        console.error('Edit project error:', error);
        showNotification('Failed to update project', 'error');
    }
}

// ========== Local Media Management Functions ==========

let currentMediaFile = null;

// Show upload modal
function showUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Close upload modal
function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Reset form
        const form = document.getElementById('uploadForm');
        if (form) {
            form.reset();
        }
        
        // Hide progress
        const progress = document.getElementById('uploadProgress');
        if (progress) {
            progress.style.display = 'none';
        }
    }
}

// Handle file upload
async function handleFileUpload(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    console.log('📤 UPLOAD: Starting file upload process');
    console.log('📤 UPLOAD: Current user:', currentUser ? currentUser.username : 'Not logged in');
    
    if (!currentUser) {
        showNotification('Please log in to upload files', 'error');
        return;
    }
    
    // Log form data details
    const fileInput = event.target.querySelector('input[type="file"]');
    const customNameInput = document.getElementById('mediaCustomName');
    const folderPathInput = document.getElementById('folderPath');
    
    console.log('📤 UPLOAD: Form data details:', {
        file: fileInput?.files[0]?.name || 'No file selected',
        fileSize: fileInput?.files[0]?.size || 0,
        customName: customNameInput?.value || 'None',
        folderPath: folderPathInput?.value || 'None',
        userId: currentUser.id
    });

    // Add user ID to form data
    formData.append('userId', currentUser.id);
    // Add custom media name if provided
    if (customNameInput && customNameInput.value.trim()) {
        formData.append('customName', customNameInput.value.trim());
        console.log('📤 UPLOAD: Added custom name:', customNameInput.value.trim());
    }    try {
        // Show progress
        const progress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const uploadBtn = document.getElementById('uploadBtn');
        
        if (progress) progress.style.display = 'block';
        if (uploadBtn) uploadBtn.disabled = true;
        if (progressText) progressText.textContent = 'Uploading...';
        
        // Simulate progress
        let progressValue = 0;
        const progressInterval = setInterval(() => {
            progressValue += Math.random() * 30;
            if (progressValue > 90) progressValue = 90;
            if (progressFill) progressFill.style.width = progressValue + '%';
        }, 200);
        
        const response = await fetch(`${API_BASE_URL}/media/upload`, {
            method: 'POST',
            body: formData
        });
        
        clearInterval(progressInterval);
        
        const result = await response.json();
        
        console.log('📤 UPLOAD: Server response:', {
            success: result.success,
            message: result.message,
            data: result.data,
            status: response.status
        });
        
        if (result.success) {
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = 'Upload complete!';
            
            console.log('📤 UPLOAD: Upload successful, refreshing gallery');
            showNotification('File uploaded successfully!', 'success');
            closeUploadModal();
            refreshMediaGallery();
        } else {
            console.error('📤 UPLOAD: Upload failed:', result.message);
            showNotification(result.message || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('📤 UPLOAD: Upload error:', error);
        showNotification('Failed to upload file', 'error');
    } finally {
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) uploadBtn.disabled = false;
    }
}

// Refresh media gallery
async function refreshMediaGallery() {
    console.log('📁 GALLERY REFRESH: refreshMediaGallery called');
    const gallery = document.getElementById('media-gallery');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    console.log('📁 GALLERY REFRESH: Elements check:');
    console.log('   gallery element:', !!gallery);
    console.log('   currentUser:', currentUser ? currentUser.id : 'null');
    
    if (!gallery || !currentUser) {
        console.log('❌ GALLERY REFRESH: Missing gallery or currentUser', { gallery: !!gallery, currentUser: !!currentUser });
        return;
    }

    try {
        console.log('🌐 GALLERY REFRESH: Loading media for user', currentUser.id);
        gallery.innerHTML = '<div class="media-loading"><i class="fas fa-spinner fa-spin"></i> Loading media files...</div>';
        
        const apiUrl = `${API_BASE_URL}/media/files?userId=${currentUser.id}`;
        console.log('🌐 GALLERY REFRESH: API request to:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('📡 GALLERY REFRESH: API response:');
        console.log('   status:', response.status);
        console.log('   ok:', response.ok);
        
        const result = await response.json();
        console.log('📋 GALLERY REFRESH: API result:', result);

        if (result.success) {
            console.log('✅ GALLERY REFRESH: API success, displaying', result.files.length, 'files');
            displayMediaFiles(result.files);
            updateMediaStats(result.files);
            
            // Ensure media preview modal remains closed after loading media
            const mediaPreviewModal = document.getElementById('mediaPreviewModal');
            if (mediaPreviewModal && mediaPreviewModal.style.display === 'block') {
                console.log('🔒 GALLERY REFRESH: Closing media preview modal after refresh');
                mediaPreviewModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        } else {
            console.log('❌ GALLERY REFRESH: API failed:', result);
            gallery.innerHTML = '<div class="media-loading">Failed to load media files</div>';
        }
    } catch (error) {
        console.error('💥 GALLERY REFRESH: Error loading media:', error);
        gallery.innerHTML = '<div class="media-loading">Error loading media files</div>';
    }
    
    console.log('🏁 GALLERY REFRESH: refreshMediaGallery completed');
}// Global variable to store media files for safe preview access
let mediaFilesCache = [];

// Safe preview function that avoids string escaping issues
function previewMediaSafe(fileId) {
    console.log('previewMediaSafe called with fileId:', fileId, 'type:', typeof fileId);
    
    // Find the file in the cached media files
    // Convert fileId to number for comparison since IDs in cache are numbers
    const numericFileId = parseInt(fileId, 10);
    const file = mediaFilesCache.find(f => f.id === numericFileId);
    if (!file) {
        console.error('File not found in cache:', fileId, 'converted to:', numericFileId);
        console.log('Available files in cache:', mediaFilesCache.map(f => ({ id: f.id, name: f.name })));
        showNotification('File not found', 'error');
        return;
    }
    
    const fileName = file.displayName || file.originalName || file.name;
    const fileSize = formatFileSize(file.size || 0);
    const createdDate = file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Unknown';
    
    // Call the original preview function with safe data
    previewMedia(fileId, file.mimeType, file.url, fileName, fileSize, createdDate);
}

// Display media files in gallery
function displayMediaFiles(files) {
    console.log('🖼️ DISPLAY MEDIA: displayMediaFiles called with:', files?.length, 'files');
    
    // Cache the files for safe preview access
    mediaFilesCache = files || [];
    console.log('💾 DISPLAY MEDIA: mediaFilesCache updated with', mediaFilesCache.length, 'files');
    
    const gallery = document.getElementById('media-gallery');
    console.log('📋 DISPLAY MEDIA: Gallery element:', !!gallery);

    if (!files || files.length === 0) {
        console.log('📭 DISPLAY MEDIA: No files to display');
        gallery.innerHTML = '<div class="media-loading">No media files found. Upload your first file!</div>';
        return;
    }

    console.log('🔄 DISPLAY MEDIA: Processing', files.length, 'files for display');
    gallery.innerHTML = files.map((file, index) => {
        console.log(`🖼️ DISPLAY MEDIA: Processing file ${index + 1}:`, file);
        
        const isImage = file.mimeType && file.mimeType.startsWith('image/');
        const isVideo = file.mimeType && file.mimeType.startsWith('video/');
        const isAudio = file.mimeType && file.mimeType.startsWith('audio/');

        let thumbnail = '';
        let typeIcon = 'fas fa-file';
        let typeBadge = 'FILE';

        if (isImage) {
            // Add AGGRESSIVE cache busting - unique timestamp per image plus random number
            const uniqueCacheBuster = Date.now() + Math.random() * 1000 + file.id;
            const imageUrl = file.url.includes('?') ? 
                `${file.url}&v=${uniqueCacheBuster}&bustcache=${Math.random()}` : 
                `${file.url}?v=${uniqueCacheBuster}&bustcache=${Math.random()}`;
            console.log(`🖼️ DISPLAY MEDIA: Image ${index + 1} URL with cache busting:`, imageUrl);
            thumbnail = `<img src="${imageUrl}" alt="${file.customName || file.originalName}" loading="lazy" onload="this.style.opacity=1; console.log('🖼️ IMAGE LOADED: File ${file.id} image loaded successfully');" style="opacity:0;transition:opacity 0.3s" onerror="console.error('❌ IMAGE ERROR: File ${file.id} failed to load');">`;
            typeIcon = 'fas fa-image';
            typeBadge = 'IMAGE';
        } else if (isVideo) {
            const uniqueCacheBuster = Date.now() + Math.random() * 1000 + file.id;
            const videoUrl = file.url.includes('?') ? 
                `${file.url}&v=${uniqueCacheBuster}&bustcache=${Math.random()}` : 
                `${file.url}?v=${uniqueCacheBuster}&bustcache=${Math.random()}`;
            console.log(`🎥 DISPLAY MEDIA: Video ${index + 1} URL with cache busting:`, videoUrl);
            thumbnail = `<video src="${videoUrl}" muted></video>`;
            typeIcon = 'fas fa-video';
            typeBadge = 'VIDEO';
        } else if (isAudio) {
            thumbnail = `<i class="${typeIcon}"></i>`;
            typeIcon = 'fas fa-music';
            typeBadge = 'AUDIO';
        } else {
            thumbnail = `<i class="${typeIcon}"></i>`;
        }

        const fileSize = formatFileSize(file.size || 0);
        // Prefer displayName, then originalName, then name
        const fileName = file.displayName || file.originalName || file.name;
        const createdDate = file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Unknown';
        const updatedDate = file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : 'Unknown';
        const fileType = file.fileType || (file.mimeType ? file.mimeType.split('/')[0] : 'unknown');

        console.log('File details for onClick:', { 
            id: file.id, 
            fileName, 
            url: file.url, 
            mimeType: file.mimeType,
            fileSize,
            createdDate
        });

        return `
            <div class="media-item" onclick="console.log('Media item clicked!'); previewMediaSafe('${file.id}')">
                <div class="media-thumbnail">
                    ${thumbnail}
                    <div class="media-type-badge">${typeBadge}</div>
                </div>
                <div class="media-info">
                    <div class="media-name" title="${fileName}">${fileName}</div>
                    <div class="media-meta">
                        <div class="media-row">
                            <span class="media-label">Type:</span>
                            <span class="media-value">${fileType.toUpperCase()}</span>
                        </div>
                        <div class="media-row">
                            <span class="media-label">Size:</span>
                            <span class="media-value">${fileSize}</span>
                        </div>
                        <div class="media-row">
                            <span class="media-label">Created:</span>
                            <span class="media-value">${createdDate}</span>
                        </div>
                        <div class="media-row">
                            <span class="media-label">Updated:</span>
                            <span class="media-value">${updatedDate}</span>
                        </div>
                    </div>
                </div>
                <div class="media-actions-overlay">
                    <button class="media-action-btn" onclick="event.stopPropagation(); quickRenameSafe('${file.id}')" title="Rename">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="media-action-btn replace-btn" onclick="event.stopPropagation(); showReplaceMediaModal('${file.id}', '${fileName}', '${file.url}')" title="Replace Image">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                    <button class="media-action-btn delete-btn" onclick="event.stopPropagation(); quickDeleteSafe('${file.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('✅ DISPLAY MEDIA: Gallery HTML generated and applied');
    console.log('🏁 DISPLAY MEDIA: displayMediaFiles completed');
}

// Safe rename function that avoids string escaping issues
function quickRenameSafe(fileId) {
    // Convert fileId to number for comparison since IDs in cache are numbers
    const numericFileId = parseInt(fileId, 10);
    const file = mediaFilesCache.find(f => f.id === numericFileId);
    if (!file) {
        console.error('File not found for rename:', fileId, 'converted to:', numericFileId);
        showNotification('File not found', 'error');
        return;
    }
    
    const currentDisplayName = file.displayName || file.originalName || file.name;
    quickRename(fileId, currentDisplayName);
}

// Safe delete function that avoids string escaping issues
function quickDeleteSafe(fileId) {
    // Convert fileId to number for comparison since IDs in cache are numbers
    const numericFileId = parseInt(fileId, 10);
    const file = mediaFilesCache.find(f => f.id === numericFileId);
    if (!file) {
        console.error('File not found for delete:', fileId, 'converted to:', numericFileId);
        showNotification('File not found', 'error');
        return;
    }
    
    const displayName = file.displayName || file.originalName || file.name;
    quickDelete(numericFileId, displayName);
}

// Quick rename function for media library
async function quickRename(fileId, currentDisplayName) {
    const newName = prompt('Enter new display name:', currentDisplayName);
    if (newName !== null && newName.trim() !== '' && newName.trim() !== currentDisplayName) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser || !currentUser.id) {
            showNotification('User not logged in', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/media/file/${fileId}/display-name`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    userId: currentUser.id, 
                    displayName: newName.trim() 
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('Display name updated successfully', 'success');
                refreshMediaGallery(); // Refresh the gallery to show the updated name
            } else {
                showNotification(result.message || 'Failed to update display name', 'error');
            }
        } catch (error) {
            console.error('Rename error:', error);
            showNotification('Failed to update display name', 'error');
        }
    }
}

// Quick delete function for media library
function quickDelete(filename, displayName) {
    if (confirm(`Are you sure you want to delete "${displayName}"?`)) {
        deleteFile(filename);
    }
}

// Delete file by fileId
async function deleteFile(fileId) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    console.log('Delete file called with:', { fileId, currentUser });
    
    if (!currentUser || !currentUser.id) {
        showNotification('User not logged in', 'error');
        return;
    }
    
    try {
        const requestBody = { userId: currentUser.id };
        console.log('Sending DELETE request:', { fileId, requestBody });
        
        const response = await fetch(`${API_BASE_URL}/media/file/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        console.log('Delete response:', result);
        
        if (result.success) {
            showNotification('File deleted successfully', 'success');
            refreshMediaGallery(); // Refresh the gallery to update the display
        } else {
            showNotification(result.message || 'Failed to delete file', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Failed to delete file', 'error');
    }
}

// Update media statistics
function updateMediaStats(files) {
    const totalCount = document.getElementById('total-media-count');
    const totalSize = document.getElementById('total-media-size');
    
    if (totalCount) {
        totalCount.textContent = files.length;
    }
    
    if (totalSize && files.length > 0) {
        const totalBytes = files.reduce((sum, file) => sum + (file.size || 0), 0);
        totalSize.textContent = formatFileSize(totalBytes);
    } else if (totalSize) {
        totalSize.textContent = '0 MB';
    }
}

// Format file size
function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

// Preview media file
function previewMedia(fileId, mimeType, fileUrl, fileName, fileSize, uploadDate) {
    console.log('previewMedia called with:', { fileId, mimeType, fileUrl, fileName, fileSize, uploadDate });
    
    // Add defensive checks for required parameters
    if (!fileId || !mimeType || !fileUrl || !fileName) {
        console.error('previewMedia called with missing required parameters');
        showNotification('Error: Cannot preview media - missing file information', 'error');
        return;
    }
    
    currentMediaFile = { fileId, mimeType, fileUrl, fileName, fileSize, uploadDate };
    
    const modal = document.getElementById('mediaPreviewModal');
    const title = document.getElementById('mediaPreviewTitle');
    const container = document.getElementById('mediaPreviewContainer');
    const info = document.getElementById('mediaPreviewInfo');
    
    console.log('Modal elements:', { modal, title, container, info });
    
    if (!modal || !container) {
        console.error('Modal or container not found');
        showNotification('Error: Media preview modal not found', 'error');
        return;
    }
    
    // Set title
    if (title) title.textContent = fileName;
    
    // Create media preview
    let mediaElement = '';
    console.log('Creating media element for MIME type:', mimeType, 'with URL:', fileUrl);
    
    if (mimeType.startsWith('image/')) {
        mediaElement = `<img src="${fileUrl}" alt="${fileName}" style="max-width: 100%; max-height: 70vh; object-fit: contain;" onload="console.log('Image loaded successfully')" onerror="console.error('Image failed to load:', this.src)">`;
    } else if (mimeType.startsWith('video/')) {
        mediaElement = `<video src="${fileUrl}" controls style="max-width: 100%; max-height: 70vh;"></video>`;
    } else if (mimeType.startsWith('audio/')) {
        mediaElement = `<audio src="${fileUrl}" controls style="width: 100%;"></audio>`;
    } else {
        mediaElement = `<div style="text-align: center; padding: 2rem;">
            <i class="fas fa-file fa-4x" style="color: #6b7280; margin-bottom: 1rem;"></i>
            <p>Preview not available for this file type</p>
        </div>`;
    }
    
    console.log('Generated media element:', mediaElement);
    container.innerHTML = mediaElement;
    console.log('Container content after setting innerHTML:', container.innerHTML);
    
    // Set file info and ensure it starts collapsed
    if (info) {
        info.innerHTML = `
            <dl>
                <dt>File Name:</dt>
                <dd>${fileName}</dd>
                <dt>File Size:</dt>
                <dd>${fileSize}</dd>
                <dt>Type:</dt>
                <dd>${mimeType}</dd>
                <dt>Upload Date:</dt>
                <dd>${uploadDate}</dd>
                <dt>File ID:</dt>
                <dd>${fileId}</dd>
            </dl>
        `;
        
        // Ensure metadata starts collapsed
        info.classList.add('collapsed');
    }
    
    // Reset metadata toggle
    const toggle = document.querySelector('.metadata-toggle');
    const toggleIcon = document.getElementById('metadataToggleIcon');
    if (toggle) {
        toggle.classList.remove('expanded');
    }
    if (toggleIcon) {
        toggleIcon.className = 'fas fa-chevron-down';
    }
    
    // Show modal
    console.log('Showing modal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    console.log('Modal display style set to:', modal.style.display);
}

// Test function to debug modal
function testMediaPreview() {
    console.log('Testing media preview modal');
    const modal = document.getElementById('mediaPreviewModal');
    console.log('Modal found:', modal);
    if (modal) {
        modal.style.display = 'block';
        console.log('Modal display set to:', modal.style.display);
    }
}

// Close media preview modal
function closeMediaPreviewModal() {
    const modal = document.getElementById('mediaPreviewModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        currentMediaFile = null;
    }
}

// Download current media file
function downloadCurrentMedia() {
    if (!currentMediaFile) return;
    
    const link = document.createElement('a');
    link.href = currentMediaFile.fileUrl;
    link.download = currentMediaFile.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Delete current media file
async function deleteCurrentMedia() {
    if (!currentMediaFile) return;
    
    const confirmed = confirm(`Are you sure you want to delete "${currentMediaFile.fileName}"?`);
    if (!confirmed) return;
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    try {
        const response = await fetch(`${API_BASE_URL}/media/file/${currentMediaFile.fileId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUser.id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('File deleted successfully', 'success');
            closeMediaPreviewModal();
            refreshMediaGallery();
        } else {
            showNotification(result.message || 'Failed to delete file', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Failed to delete file', 'error');
    }
}

// Initialize media management when dashboard loads
async function initializeMediaManagement() {
    // Ensure media preview modal is closed on initialization
    const mediaPreviewModal = document.getElementById('mediaPreviewModal');
    if (mediaPreviewModal) {
        mediaPreviewModal.style.display = 'none';
    }
    
    // Set up upload form handler
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFileUpload);
    }
    
    // Set up rename form handler
    const renameForm = document.getElementById('renameForm');
    if (renameForm) {
        renameForm.addEventListener('submit', handleRenameFile);
    }
    
    // Load media gallery
    refreshMediaGallery();
}

// Toggle metadata visibility
function toggleMetadata() {
    const info = document.getElementById('mediaPreviewInfo');
    const toggle = document.querySelector('.metadata-toggle');
    const toggleIcon = document.getElementById('metadataToggleIcon');
    
    if (info && toggle) {
        if (info.classList.contains('collapsed')) {
            // Expand metadata
            info.classList.remove('collapsed');
            toggle.classList.add('expanded');
            if (toggleIcon) toggleIcon.className = 'fas fa-chevron-up';
        } else {
            // Collapse metadata
            info.classList.add('collapsed');
            toggle.classList.remove('expanded');
            if (toggleIcon) toggleIcon.className = 'fas fa-chevron-down';
        }
    }
}

// Show rename modal
function showRenameModal() {
    if (!currentMediaFile) return;
    
    const modal = document.getElementById('renameModal');
    const input = document.getElementById('newFileName');
    
    if (modal && input) {
        // Set current filename without extension
        const nameWithoutExt = currentMediaFile.fileName.replace(/\.[^/.]+$/, "");
        input.value = nameWithoutExt;
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Focus and select the input text
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);
    }
}

// Close rename modal
function closeRenameModal() {
    const modal = document.getElementById('renameModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Reset form
        const form = document.getElementById('renameForm');
        if (form) {
            form.reset();
        }
    }
}

// Handle file rename
async function handleRenameFile(event) {
    event.preventDefault();
    
    if (!currentMediaFile) return;
    
    const formData = new FormData(event.target);
    const newName = formData.get('newFileName').trim();
    
    if (!newName) {
        showNotification('Please enter a valid filename', 'error');
        return;
    }
    
    // Get the original file extension
    const originalExt = currentMediaFile.fileName.match(/\.[^/.]+$/);
    const newFileName = newName + (originalExt ? originalExt[0] : '');
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    try {
        const response = await fetch(`${API_BASE_URL}/media/file/${currentMediaFile.fileId}/rename`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                userId: currentUser.id,
                newFileName: newFileName,
                newOriginalName: newFileName
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('File renamed successfully', 'success');
            
            // Update current file info
            currentMediaFile.fileName = newFileName;
            
            // Update the modal title
            const title = document.getElementById('mediaPreviewTitle');
            if (title) title.textContent = newFileName;
            
            // Update metadata display
            updateMetadataDisplay();
            
            closeRenameModal();
            refreshMediaGallery();
        } else {
            showNotification(result.message || 'Failed to rename file', 'error');
        }
    } catch (error) {
        console.error('Rename error:', error);
        showNotification('Failed to rename file', 'error');
    }
}

// Update metadata display in the preview
function updateMetadataDisplay() {
    const info = document.getElementById('mediaPreviewInfo');
    
    if (info && currentMediaFile) {
        info.innerHTML = `
            <dl>
                <dt>File Name:</dt>
                <dd>${currentMediaFile.fileName}</dd>
                <dt>File Size:</dt>
                <dd>${currentMediaFile.fileSize}</dd>
                <dt>Type:</dt>
                <dd>${currentMediaFile.mimeType}</dd>
                <dt>Upload Date:</dt>
                <dd>${currentMediaFile.uploadDate}</dd>
                <dt>File ID:</dt>
                <dd>${currentMediaFile.fileId}</dd>
            </dl>
        `;
    }
}

// ========== Art Info Modal Functions ==========

// Global variable to store current image for art info
let currentArtInfoImage = null;

// Test function for art info saving (for debugging)
window.testArtInfoSaving = function() {
    console.log('🧪 Testing art info saving...');
    
    // Mock the current art info image
    currentArtInfoImage = {
        id: 1, // Assuming media file ID 1 exists
        src: '/uploads/test.jpg',
        name: 'Test Image'
    };
    
    // Fill the form with test data
    const form = document.getElementById('addArtInfoForm');
    if (form) {
        form.querySelector('#artInfoArtistName').value = 'Test Artist';
        form.querySelector('#artInfoArtName').value = 'Test Artwork';
        form.querySelector('#artInfoArtMedia').value = 'Digital Art';
        form.querySelector('#artInfoSubmitor').value = 'Test User';
        form.querySelector('#artInfoDate').value = '2025-08-07';
        
        console.log('Form filled with test data');
        
        // Trigger submission
        submitArtInfo();
    } else {
        console.error('Art info form not found');
    }
};

// Show Add Art Info Modal
async function showAddArtInfoModal(mediaFilename = null) {
    console.log('🎨 Opening Add Art Info Modal...');
    console.log('Media filename parameter:', mediaFilename);
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    console.log('Current user check:', !!currentUser);
    
    if (!currentUser) {
        console.error('❌ No user logged in');
        showNotification('Please log in first', 'error');
        return;
    }

    let imageInfo = null;
    
    if (mediaFilename) {
        // Called from project view - need to find the actual media file ID
        console.log('Using media filename from project view:', mediaFilename);
        
        try {
            // First, try to get the media file ID by filename
            const response = await fetch(`${API_BASE_URL}/media/files?userId=${currentUser.id}`);
            const result = await response.json();
            
            if (result.success && result.files) {
                // Find the media file that matches this filename
                console.log('🔍 Available media files:', result.files.map(f => ({ id: f.id, name: f.name, originalName: f.originalName, url: f.url })));
                
                const mediaFile = result.files.find(file => 
                    file.name === mediaFilename || 
                    file.originalName === mediaFilename ||
                    (file.url && file.url.includes(mediaFilename))
                );
                
                if (mediaFile) {
                    console.log('✅ Found media file:', mediaFile);
                    imageInfo = {
                        id: mediaFile.id, // Use the numeric ID
                        src: mediaFile.url,
                        name: mediaFile.displayName || mediaFile.originalName || mediaFile.name,
                        file_name: mediaFile.name
                    };
                } else {
                    console.error('❌ Media file not found for filename:', mediaFilename);
                    console.error('❌ Looking for:', mediaFilename);
                    console.error('❌ Available files:', result.files);
                    showNotification('Media file not found. Please refresh and try again.', 'error');
                    return;
                }
            } else {
                console.error('❌ Failed to load media files:', result.message);
                showNotification('Failed to load media files', 'error');
                return;
            }
        } catch (error) {
            console.error('❌ Error finding media file:', error);
            showNotification('Error finding media file', 'error');
            return;
        }
    } else {
        // Called from edit project - get the current selected image
        const selectedImageId = document.getElementById('editSelectedImageId').value;
        console.log('Selected image ID:', selectedImageId);
        
        if (!selectedImageId) {
            console.error('❌ No image selected');
            showNotification('Please select an image first', 'error');
            return;
        }
        
        // Store current image info
        const thumbnailImg = document.getElementById('editProjectThumbnailImg');
        console.log('Thumbnail img element:', !!thumbnailImg);
        console.log('Thumbnail img src:', thumbnailImg ? thumbnailImg.src : 'N/A');
        
        imageInfo = {
            id: selectedImageId,
            // Get image info from the thumbnail
            src: thumbnailImg ? thumbnailImg.src : '',
            name: thumbnailImg ? (thumbnailImg.alt || 'Project Image') : 'Project Image'
        };
    }
    
    currentArtInfoImage = imageInfo;
    console.log('Set currentArtInfoImage:', currentArtInfoImage);

    // Show the modal
    const modal = document.getElementById('addArtInfoModal');
    if (modal) {
        console.log('✅ Showing modal');
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // Load image preview
    loadArtInfoPreview();
    
    // Check for existing art information
    checkExistingArtInfo();
}

// Close Add Art Info Modal
function closeAddArtInfoModal() {
    console.log('🎨 ART INFO: Closing art info modal');
    
    const modal = document.getElementById('addArtInfoModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // Clear form
    document.getElementById('addArtInfoForm').reset();
    
    // Clear art info context (this does NOT affect project image selection)
    console.log('🎨 ART INFO: Clearing currentArtInfoImage (art info context only)');
    currentArtInfoImage = null;
    
    // Check that project image selection is still intact
    const selectedImageInput = document.getElementById('editSelectedImageId');
    if (selectedImageInput) {
        console.log('🎨 ART INFO: Project image selection preserved:', selectedImageInput.value);
    }
    
    // Reset modal title
    const modalTitle = document.querySelector('#addArtInfoModal h2');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-palette"></i> Add Art Information';
    }
    
    // Clear status message
    const statusElement = document.getElementById('artInfoExistingStatus');
    if (statusElement) {
        statusElement.textContent = '';
    }
}

// Load art info preview
async function loadArtInfoPreview() {
    if (!currentArtInfoImage) return;

    try {
        // Set preview image
        const previewImg = document.getElementById('artInfoPreviewImg');
        const imageName = document.getElementById('artInfoImageName');
        
        if (previewImg && imageName) {
            previewImg.src = currentArtInfoImage.src;
            previewImg.alt = currentArtInfoImage.name;
            imageName.textContent = currentArtInfoImage.name;
        }
        
        // Get detailed image info from API
        const response = await fetch(`${API_BASE_URL}/media/file/${currentArtInfoImage.id}`);
        const result = await response.json();
        
        if (result.success && result.file) {
            const imageName = document.getElementById('artInfoImageName');
            if (imageName) {
                imageName.textContent = result.file.originalName || result.file.name || 'Project Image';
            }
        }
    } catch (error) {
        console.error('Error loading art info preview:', error);
    }
}

// Check for existing art information
async function checkExistingArtInfo() {
    if (!currentArtInfoImage) {
        console.log('❌ No currentArtInfoImage available');
        return;
    }

    console.log('🔍 checkExistingArtInfo called with currentArtInfoImage:', currentArtInfoImage);

    try {
        const statusElement = document.getElementById('artInfoExistingStatus');
        if (statusElement) {
            statusElement.textContent = 'Checking for existing art information...';
            statusElement.style.color = '#6b7280';
        }

        console.log('🔍 Checking for existing art info for media ID:', currentArtInfoImage.id);
        console.log('🌐 API endpoint will be:', `${API_BASE_URL}/art/media/${currentArtInfoImage.id}`);

        // Use the new endpoint to check for existing art information
        const response = await fetch(`${API_BASE_URL}/art/media/${currentArtInfoImage.id}`);
        console.log('📡 checkExistingArtInfo response status:', response.status);
        
        if (response.status === 404) {
            // No existing art info found
            console.log('ℹ️ No existing art info found in checkExistingArtInfo');
            if (statusElement) {
                statusElement.textContent = 'No existing art information found. You can add new information below.';
                statusElement.style.color = '#6b7280';
            }
            
            // Ensure modal title shows "Add"
            const modalTitle = document.querySelector('#addArtInfoModal h2');
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-palette"></i> Add Art Information';
            }
            return;
        }
        
        const result = await response.json();
        console.log('📦 checkExistingArtInfo API result:', result);
        
        if (result.success && result.data) {
            console.log('✅ Found existing art info in checkExistingArtInfo:', result.data);
            
            // Populate the form with existing data
            const form = document.getElementById('addArtInfoForm');
            if (form) {
                form.querySelector('#artInfoArtistName').value = result.data.ArtistName || '';
                form.querySelector('#artInfoArtName').value = result.data.ArtName || '';
                form.querySelector('#artInfoArtMedia').value = result.data.ArtMedia || '';
                form.querySelector('#artInfoSubmitor').value = result.data.Submitor || '';
                
                // Format date for input field
                if (result.data.Date) {
                    const date = new Date(result.data.Date);
                    const formattedDate = date.toISOString().split('T')[0];
                    form.querySelector('#artInfoDate').value = formattedDate;
                }
                
                console.log('📝 Form populated with existing data');
            }
            
            if (statusElement) {
                statusElement.innerHTML = `
                    <div style="color: #059669; font-weight: 500;">
                        ✅ Existing art information found and loaded into the form.
                    </div>
                    <div style="color: #6b7280; font-size: 0.875rem; margin-top: 0.25rem;">
                        You can modify the information and save to update it.
                    </div>
                `;
            }
            
            // Update modal title to indicate editing
            const modalTitle = document.querySelector('#addArtInfoModal h2');
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Art Information';
            }
        } else {
            // No existing data, ensure modal title shows "Add"
            const modalTitle = document.querySelector('#addArtInfoModal h2');
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-palette"></i> Add Art Information';
            }
        }
    } catch (error) {
        console.error('❌ Error checking existing art info:', error);
        const statusElement = document.getElementById('artInfoExistingStatus');
        if (statusElement) {
            statusElement.textContent = 'Could not check for existing art information.';
            statusElement.style.color = '#ef4444';
        }
    }
}

// Handle art info form submission
document.addEventListener('DOMContentLoaded', function() {
    // Dashboard-specific event listeners are now set up in initializeDashboardEventListeners()
    // when the dashboard is actually loaded and visible
    console.log('🔧 DOM loaded - dashboard event listeners will be initialized when dashboard is shown');
});

// Test function for manual testing
window.testSubmitArtInfo = function() {
    console.log('🧪 Testing art info submission manually...');
    submitArtInfo();
};

// Submit art information
async function submitArtInfo() {
    console.log('🎨 ART INFO: Starting art info submission...');
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    console.log('🎨 ART INFO: Current user:', currentUser ? currentUser.username : 'Not logged in');
    console.log('🎨 ART INFO: Current art info image:', currentArtInfoImage);
    
    if (!currentUser || !currentArtInfoImage) {
        const message = `Missing required information - User: ${!!currentUser}, Image: ${!!currentArtInfoImage}`;
        console.error('🎨 ART INFO: ❌', message);
        showNotification(message, 'error');
        return;
    }

    try {
        // Get form data
        const formData = new FormData(document.getElementById('addArtInfoForm'));
        const artData = {
            ArtistName: formData.get('artistName'),
            ArtName: formData.get('artName'),
            ArtMedia: formData.get('artMedia'),
            Submitor: formData.get('submitor') || currentUser.UserName,
            Date: formData.get('artDate') || new Date().toISOString().split('T')[0],
            artcol: currentArtInfoImage.id, // Link to the media file
            user_id: currentUser.id // Add user ID for approval reset checking
        };

        console.log('🎨 ART INFO: Form data prepared:', {
            ArtistName: artData.ArtistName,
            ArtName: artData.ArtName,
            ArtMedia: artData.ArtMedia,
            Submitor: artData.Submitor,
            Date: artData.Date,
            artcol: artData.artcol,
            imageFileName: currentArtInfoImage.file_name
        });

        // Validate required fields
        if (!artData.ArtistName || !artData.ArtName) {
            const message = 'Artist name and art title are required';
            console.error('🎨 ART INFO: ❌ Validation failed:', message);
            showNotification(message, 'error');
            return;
        }

        console.log('🎨 ART INFO: 📤 Checking if art info already exists...');
        
        // First check if there's existing art info for this media file
        let existingArt = null;
        try {
            const checkResponse = await fetch(`${API_BASE_URL}/art/media/${currentArtInfoImage.id}`);
            if (checkResponse.status === 200) {
                const checkResult = await checkResponse.json();
                if (checkResult.success) {
                    existingArt = checkResult.data;
                    console.log('📋 Found existing art info, will update:', existingArt.ArtId);
                }
            }
        } catch (checkError) {
            console.log('ℹ️ No existing art info found, will create new');
        }
        
        // Choose API method and endpoint
        const isUpdate = !!existingArt;
        const method = isUpdate ? 'PUT' : 'POST';
        const endpoint = isUpdate ? `${API_BASE_URL}/art/${existingArt.ArtId}` : `${API_BASE_URL}/art`;
        
        console.log(`📤 ${isUpdate ? 'Updating' : 'Creating'} art info via ${method} ${endpoint}`);
        
        // Submit to API
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(artData)
        });

        const result = await response.json();
        console.log('📥 API Response:', result);

        if (result.success) {
            const action = existingArt ? 'updated' : 'saved';
            console.log(`✅ Art information ${action} successfully!`);
            showNotification(`Art information ${action} successfully!`, 'success');
            closeAddArtInfoModal();
            
            // Refresh project gallery since art info changes may affect project approval status
            console.log('🏛️ ART INFO: Refreshing project gallery due to potential approval status changes');
            const galleryGrid = document.getElementById('galleryGrid');
            if (galleryGrid) {
                loadGallery();
            }
            
            // Refresh user dashboard since art info changes may affect project approval status
            console.log('📊 ART INFO: Refreshing user dashboard due to potential approval status changes');
            const userProjectsGrid = document.getElementById('user-projects-grid');
            if (userProjectsGrid) {
                loadDashboardData();
            }
            
            // Refresh art info display in edit project modal if it's open
            const editModal = document.getElementById('editProjectModal');
            if (editModal && editModal.style.display !== 'none') {
                console.log('🔄 Refreshing art info in edit project modal...');
                // Get the current project data and refresh the art info display
                if (window.currentEditingProjectId) {
                    // Fetch fresh project data and reload art info
                    fetch(`${API_BASE_URL}/projects/${window.currentEditingProjectId}`)
                        .then(response => response.json())
                        .then(result => {
                            if (result.success && result.data) {
                                loadEditProjectArtInfo(result.data);
                            }
                        })
                        .catch(error => console.error('Error refreshing art info:', error));
                }
            }
            
            // Refresh art info display in view project modal if it's open
            const viewModal = document.getElementById('viewProjectModal');
            if (viewModal && viewModal.style.display !== 'none') {
                console.log('🔄 Refreshing art info in view project modal...');
                if (window.currentViewingProjectId) {
                    // Fetch fresh project data and reload art info
                    fetch(`${API_BASE_URL}/projects/${window.currentViewingProjectId}`)
                        .then(response => response.json())
                        .then(result => {
                            if (result.success && result.data) {
                                loadProjectArtInfo(result.data);
                            }
                        })
                        .catch(error => console.error('Error refreshing art info:', error));
                }
            }
        } else {
            console.error('❌ API returned error:', result.message);
            showNotification(result.message || 'Failed to save art information', 'error');
        }
    } catch (error) {
        console.error('❌ Error submitting art info:', error);
        showNotification('Failed to save art information', 'error');
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const artInfoModal = document.getElementById('addArtInfoModal');
    if (event.target === artInfoModal) {
        closeAddArtInfoModal();
    }
});

// ========== Project Topics Functions (using existing database structure) ==========

// Global variable to store current project topics
let currentProjectTopics = [];

// Load project topics for viewing
async function loadProjectTopics(projectId) {
    console.log('📋 loadProjectTopics called for project:', projectId);
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/topics`);
        const result = await response.json();
        
        console.log('📋 Topics API response:', {
            success: result.success,
            dataLength: result.data ? result.data.length : 0,
            data: result.data
        });
        
        if (result.success) {
            currentProjectTopics = result.data || [];
            
            // Initialize expansion states (first topic expanded by default for better UX)
            currentProjectTopics.forEach((topic, topicIndex) => {
                topic.is_expanded = topicIndex === 0; // First topic starts expanded
                if (topic.pois) {
                    topic.pois.forEach((poi, poiIndex) => {
                        poi.is_expanded = topicIndex === 0 && poiIndex === 0; // First POI of first topic starts expanded
                        if (poi.cards) {
                            poi.cards.forEach((card, cardIndex) => {
                                card.is_expanded = false; // Cards still start collapsed
                            });
                        }
                    });
                }
            });
            
            console.log('📋 Set currentProjectTopics to', currentProjectTopics.length, 'topics with expansion states initialized');
            displayProjectTopics();
        } else {
            console.error('❌ Failed to load project topics:', result.message);
            currentProjectTopics = [];
            displayProjectTopics();
        }
    } catch (error) {
        console.error('❌ Error loading project topics:', error);
        currentProjectTopics = [];
        displayProjectTopics();
    }
}

// Display project topics in view mode
function displayProjectTopics() {
    const container = document.getElementById('projectTopicsContainer');
    if (!container) {
        console.warn('❌ projectTopicsContainer not found in DOM');
        return;
    }

    console.log('📋 displayProjectTopics called with', currentProjectTopics.length, 'topics');
    console.log('🔧 DEBUG: Full topics data structure:', JSON.stringify(currentProjectTopics, null, 2));

    if (currentProjectTopics.length === 0) {
        console.log('📋 No topics found - displaying placeholder');
        container.innerHTML = `
            <div class="no-topics-display">
                <div class="no-topics-placeholder">
                    <i class="fas fa-list"></i>
                    <p>No topics added to this project</p>
                    <small>Edit the project to add topics</small>
                </div>
            </div>
        `;
        return;
    }

    console.log('📋 Displaying', currentProjectTopics.length, 'topics:');
    currentProjectTopics.forEach((topic, index) => {
        console.log(`  📝 Topic ${index + 1}: "${topic.Label}" (ID: ${topic.TopicID})`);
        console.log(`    📍 POIs: ${topic.pois ? topic.pois.length : 0}`);
        console.log(`    🔧 DEBUG: Topic expansion state: ${topic.is_expanded}`);
        
        if (topic.pois && topic.pois.length > 0) {
            topic.pois.forEach((poi, poiIndex) => {
                console.log(`      POI ${poiIndex + 1}: ID ${poi.POIID}, Location: "${poi.pLocation || 'No location'}", Image: ${poi.pImage ? 'Yes' : 'No'}`);
                console.log(`        🔧 DEBUG: POI expansion state: ${poi.is_expanded}`);
                
                if (poi.cards && poi.cards.length > 0) {
                    console.log(`        📄 Cards: ${poi.cards.length}`);
                    poi.cards.forEach((card, cardIndex) => {
                        console.log(`          Card ${cardIndex + 1}: "${card.Title}" (Body: ${card.Body ? 'Yes' : 'No'}, Notes: ${card.Notes ? 'Yes' : 'No'}, Refs: ${card.References ? 'Yes' : 'No'}, Media: ${card.media ? card.media.length : 0})`);
                        console.log(`            🔧 DEBUG: Card expansion state: ${card.is_expanded}`);
                    });
                } else {
                    console.log(`        📄 Cards: None`);
                }
            });
        }
    });

    const topicsHtml = currentProjectTopics.map(topic => `
        <div class="topic-item" data-topic-id="${topic.TopicID}">
            <div class="topic-header" onclick="toggleTopic(${topic.TopicID})">
                <div class="topic-title">
                    <i class="fas fa-chevron-${topic.is_expanded ? 'down' : 'right'} topic-toggle"></i>
                    <span>${escapeHtml(topic.Label)}</span>
                </div>
                <div class="topic-actions">
                    <span class="topic-count">${topic.pois ? topic.pois.length : 0} POI(s)</span>
                </div>
            </div>
            <div class="topic-content ${topic.is_expanded ? 'expanded' : 'collapsed'}">
                <div class="topic-content-pois">
                    ${displayPOIs(topic.pois || [])}
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="topics-list">${topicsHtml}</div>`;
    console.log('📋 Topics HTML rendered successfully');
}

// Display POIs for a topic
function displayPOIs(pois) {
    console.log('🔧 DEBUG: displayPOIs called with', pois ? pois.length : 0, 'POIs');
    
    if (!pois || pois.length === 0) {
        console.log('🔧 DEBUG: No POIs to display');
        return '<div class="no-pois-message"><em>No POIs created yet</em></div>';
    }

    console.log('🔧 DEBUG: Processing POIs for display:');
    pois.forEach((poi, index) => {
        console.log(`  POI ${index + 1}: ID ${poi.POIID}, expanded: ${poi.is_expanded}`);
    });

    const poisHtml = pois.map(poi => {
        const poiHtml = `
        <div class="poi-item" data-poi-id="${poi.POIID}">
            <div class="poi-header" onclick="togglePOI(${poi.POIID})">
                <div class="poi-title">
                    <i class="fas fa-chevron-${poi.is_expanded ? 'down' : 'right'} poi-toggle"></i>
                    <h5>POI #${poi.POIID}</h5>
                </div>
            </div>
            <div class="poi-content ${poi.is_expanded ? 'expanded' : 'collapsed'}">
                ${poi.pImage ? `
                    <div class="poi-image-display" style="margin-bottom: 1rem;">
                        <img src="${poi.pImage}" alt="POI Image" style="max-width: 200px; max-height: 200px; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb;">
                    </div>
                ` : ''}
                ${poi.pLocation ? `
                    <div class="poi-location-description" style="margin-bottom: 1rem; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <strong style="color: #1e40af; font-size: 1em; display: block; margin-bottom: 6px;">
                            <i class="fas fa-map-marker-alt"></i> Location Description:
                        </strong>
                        <p style="margin: 0; color: #374151; line-height: 1.5;">${escapeHtml(poi.pLocation)}</p>
                    </div>
                ` : ''}
                <div class="poi-cards">
                    <div class="poi-cards-header" style="margin-bottom: 0.5rem;">
                        <strong style="color: #374151;">
                            <i class="fas fa-layer-group"></i> Cards (${poi.cards ? poi.cards.length : 0})
                        </strong>
                    </div>
                    ${displayCards(poi.cards || [])}
                </div>
            </div>
        </div>
    `;
        
        console.log(`🔧 DEBUG: Generated HTML for POI ${poi.POIID}:`, poiHtml.substring(0, 200) + '...');
        return poiHtml;
    }).join('');
    
    console.log('🔧 DEBUG: Total POIs HTML length:', poisHtml.length);
    return poisHtml;
}

// Display cards for a POI
function displayCards(cards) {
    console.log('🔧 DEBUG: displayCards called with', cards ? cards.length : 0, 'cards');
    
    if (!cards || cards.length === 0) {
        console.log('🔧 DEBUG: No cards to display');
        return '<div class="no-cards-message"><em>No cards created yet</em></div>';
    }

    console.log('🔧 DEBUG: Processing cards for display:');
    cards.forEach((card, index) => {
        console.log(`  Card ${index + 1}: ID ${card.CardID}, Title: "${card.Title}", expanded: ${card.is_expanded}`);
    });

    const cardsHtml = cards.map(card => {
        const cardHtml = `
        <div class="card-item" data-card-id="${card.CardID}">
            <div class="card-header" onclick="toggleCard(${card.CardID})">
                <div class="card-title">
                    <i class="fas fa-chevron-${card.is_expanded ? 'down' : 'right'} card-toggle"></i>
                    <h6>${escapeHtml(card.Title)}</h6>
                    <span class="card-type-badge">Type ${card.Type}</span>
                </div>
            </div>
            <div class="card-content ${card.is_expanded ? 'expanded' : 'collapsed'}">
                <div class="card-body" style="margin-bottom: 1rem;">
                    ${card.Body ? `
                        <div style="padding: 12px; background: #f9fafb; border-radius: 6px; border-left: 4px solid #10b981;">
                            <strong style="color: #065f46; display: block; margin-bottom: 6px;">
                                <i class="fas fa-file-text"></i> Content:
                            </strong>
                            <div style="color: #374151; line-height: 1.5;">
                                ${escapeHtml(card.Body).replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    ` : '<div style="color: #9ca3af; font-style: italic; padding: 8px;">No content</div>'}
                </div>
                
                ${card.media && card.media.length > 0 ? `
                    <div class="card-media" style="margin-bottom: 1rem;">
                        <strong style="color: #374151; display: block; margin-bottom: 8px;">
                            <i class="fas fa-images"></i> Media (${card.media.length}):
                        </strong>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;">
                            ${card.media.map(media => `
                                <div class="card-media-item" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                                    <img src="${media.file_url || media.download_url}" alt="${media.displayName || media.original_name}" 
                                         style="width: 100%; height: 80px; object-fit: cover; cursor: pointer;"
                                         onclick="previewCardMedia('${media.file_url || media.download_url}', '${media.displayName || media.original_name}')">
                                    <div style="padding: 4px; font-size: 0.75em; color: #6b7280; text-align: center;">
                                        ${(media.displayName || media.original_name).substring(0, 15)}${(media.displayName || media.original_name).length > 15 ? '...' : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${card.Notes ? `
                    <div class="card-notes" style="margin-bottom: 1rem; padding: 10px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
                        <strong style="color: #92400e; display: block; margin-bottom: 4px;">
                            <i class="fas fa-sticky-note"></i> Notes:
                        </strong>
                        <div style="color: #78350f; line-height: 1.4;">
                            ${escapeHtml(card.Notes)}
                        </div>
                    </div>
                ` : ''}
                
                ${card.References ? `
                    <div class="card-references" style="padding: 10px; background: #ede9fe; border-radius: 6px; border-left: 4px solid #8b5cf6;">
                        <strong style="color: #5b21b6; display: block; margin-bottom: 4px;">
                            <i class="fas fa-link"></i> References:
                        </strong>
                        <div style="color: #6d28d9; line-height: 1.4;">
                            ${escapeHtml(card.References)}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
        
        console.log(`🔧 DEBUG: Generated HTML for Card ${card.CardID}:`, cardHtml.substring(0, 200) + '...');
        return cardHtml;
    }).join('');
    
    console.log('🔧 DEBUG: Total cards HTML length:', cardsHtml.length);
    return cardsHtml;
}

// Toggle topic expansion
async function toggleTopic(topicId) {
    console.log('🔧 DEBUG: toggleTopic called with topicId:', topicId, 'type:', typeof topicId);
    
    // Convert to number for consistent comparison
    const numericTopicId = parseInt(topicId);
    
    const topic = currentProjectTopics.find(t => parseInt(t.TopicID) === numericTopicId);
    if (!topic) {
        console.error('🔧 DEBUG: Topic not found with ID:', topicId);
        return;
    }

    // Just toggle the UI state (no server update needed for this)
    topic.is_expanded = !topic.is_expanded;
    
    // Update UI
    const topicElement = document.querySelector(`[data-topic-id="${topicId}"]`);
    if (topicElement) {
        const toggle = topicElement.querySelector('.topic-toggle');
        const content = topicElement.querySelector('.topic-content');
        
        if (toggle) {
            toggle.className = `fas fa-chevron-${topic.is_expanded ? 'down' : 'right'} topic-toggle`;
        }
        
        if (content) {
            content.className = `topic-content ${topic.is_expanded ? 'expanded' : 'collapsed'}`;
        }
    }
}

// Toggle POI expansion
async function togglePOI(poiId) {
    console.log('🔧 DEBUG: togglePOI called with poiId:', poiId, 'type:', typeof poiId);
    
    // Convert to number for consistent comparison
    const numericPoiId = parseInt(poiId);
    
    // Find the POI in the current project topics
    let targetPOI = null;
    let topicIndex = -1;
    let poiIndex = -1;
    
    for (let i = 0; i < currentProjectTopics.length; i++) {
        const topic = currentProjectTopics[i];
        if (topic.pois) {
            for (let j = 0; j < topic.pois.length; j++) {
                if (parseInt(topic.pois[j].POIID) === numericPoiId) {
                    targetPOI = topic.pois[j];
                    topicIndex = i;
                    poiIndex = j;
                    break;
                }
            }
            if (targetPOI) break;
        }
    }
    
    console.log('🔧 DEBUG: POI search result:', {
        found: !!targetPOI,
        topicIndex,
        poiIndex,
        currentExpansionState: targetPOI ? targetPOI.is_expanded : 'N/A'
    });
    
    if (!targetPOI) {
        console.error('🔧 DEBUG: POI not found in currentProjectTopics');
        console.log('🔧 DEBUG: Available POIs:');
        currentProjectTopics.forEach((topic, tIndex) => {
            if (topic.pois) {
                topic.pois.forEach((poi, pIndex) => {
                    console.log(`  Topic ${tIndex}, POI ${pIndex}: ID ${poi.POIID}`);
                });
            }
        });
        return;
    }

    // Toggle the expansion state
    const oldState = targetPOI.is_expanded;
    targetPOI.is_expanded = !targetPOI.is_expanded;
    
    console.log('🔧 DEBUG: POI expansion state changed:', oldState, '→', targetPOI.is_expanded);
    
    // Update UI
    const poiElement = document.querySelector(`[data-poi-id="${poiId}"]`);
    console.log('🔧 DEBUG: POI element found:', !!poiElement);
    
    if (poiElement) {
        const toggle = poiElement.querySelector('.poi-toggle');
        const content = poiElement.querySelector('.poi-content');
        
        console.log('🔧 DEBUG: UI elements found:', {
            toggle: !!toggle,
            content: !!content
        });
        
        if (toggle) {
            const newToggleClass = `fas fa-chevron-${targetPOI.is_expanded ? 'down' : 'right'} poi-toggle`;
            toggle.className = newToggleClass;
            console.log('🔧 DEBUG: Toggle icon updated to:', newToggleClass);
        }
        
        if (content) {
            const newContentClass = `poi-content ${targetPOI.is_expanded ? 'expanded' : 'collapsed'}`;
            content.className = newContentClass;
            console.log('🔧 DEBUG: Content class updated to:', newContentClass);
            console.log('🔧 DEBUG: Content element current display style:', window.getComputedStyle(content).display);
            console.log('🔧 DEBUG: Content element classList:', content.classList.toString());
        }
    } else {
        console.error('🔧 DEBUG: POI element not found in DOM with selector:', `[data-poi-id="${poiId}"]`);
        console.log('🔧 DEBUG: Available POI elements in DOM:');
        const allPoiElements = document.querySelectorAll('[data-poi-id]');
        allPoiElements.forEach(el => {
            console.log('  Found POI element with ID:', el.getAttribute('data-poi-id'));
        });
    }
}

// Toggle Card expansion
async function toggleCard(cardId) {
    console.log('🔧 DEBUG: toggleCard called with cardId:', cardId, 'type:', typeof cardId);
    
    // Convert to number for consistent comparison
    const numericCardId = parseInt(cardId);
    
    // Find the card in the current project topics
    let targetCard = null;
    let topicIndex = -1;
    let poiIndex = -1;
    let cardIndex = -1;
    
    for (let i = 0; i < currentProjectTopics.length; i++) {
        const topic = currentProjectTopics[i];
        if (topic.pois) {
            for (let j = 0; j < topic.pois.length; j++) {
                const poi = topic.pois[j];
                if (poi.cards) {
                    for (let k = 0; k < poi.cards.length; k++) {
                        if (parseInt(poi.cards[k].CardID) === numericCardId) {
                            targetCard = poi.cards[k];
                            topicIndex = i;
                            poiIndex = j;
                            cardIndex = k;
                            break;
                        }
                    }
                    if (targetCard) break;
                }
            }
            if (targetCard) break;
        }
    }
    
    console.log('🔧 DEBUG: Card search result:', {
        found: !!targetCard,
        topicIndex,
        poiIndex,
        cardIndex,
        currentExpansionState: targetCard ? targetCard.is_expanded : 'N/A'
    });
    
    if (!targetCard) {
        console.error('🔧 DEBUG: Card not found in currentProjectTopics');
        console.log('🔧 DEBUG: Available cards:');
        currentProjectTopics.forEach((topic, tIndex) => {
            if (topic.pois) {
                topic.pois.forEach((poi, pIndex) => {
                    if (poi.cards) {
                        poi.cards.forEach((card, cIndex) => {
                            console.log(`  Topic ${tIndex}, POI ${pIndex}, Card ${cIndex}: ID ${card.CardID}`);
                        });
                    }
                });
            }
        });
        return;
    }

    // Toggle the expansion state
    const oldState = targetCard.is_expanded;
    targetCard.is_expanded = !targetCard.is_expanded;
    
    console.log('🔧 DEBUG: Card expansion state changed:', oldState, '→', targetCard.is_expanded);
    
    // Update UI
    const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
    console.log('🔧 DEBUG: Card element found:', !!cardElement);
    
    if (cardElement) {
        const toggle = cardElement.querySelector('.card-toggle');
        const content = cardElement.querySelector('.card-content');
        
        console.log('🔧 DEBUG: UI elements found:', {
            toggle: !!toggle,
            content: !!content
        });
        
        if (toggle) {
            const newToggleClass = `fas fa-chevron-${targetCard.is_expanded ? 'down' : 'right'} card-toggle`;
            toggle.className = newToggleClass;
            console.log('🔧 DEBUG: Toggle icon updated to:', newToggleClass);
        }
        
        if (content) {
            const newContentClass = `card-content ${targetCard.is_expanded ? 'expanded' : 'collapsed'}`;
            content.className = newContentClass;
            console.log('🔧 DEBUG: Content class updated to:', newContentClass);
            console.log('🔧 DEBUG: Content element current display style:', window.getComputedStyle(content).display);
            console.log('🔧 DEBUG: Content element classList:', content.classList.toString());
        }
    } else {
        console.error('🔧 DEBUG: Card element not found in DOM with selector:', `[data-card-id="${cardId}"]`);
        console.log('🔧 DEBUG: Available card elements in DOM:');
        const allCardElements = document.querySelectorAll('[data-card-id]');
        allCardElements.forEach(el => {
            console.log('  Found card element with ID:', el.getAttribute('data-card-id'));
        });
    }
}

// Load topics for editing
async function loadEditTopics(projectId) {
    console.log('📋 Loading topics for project:', projectId);
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/topics`);
        const result = await response.json();
        
        console.log('📋 Topics API response:', result);
        
        if (result.success) {
            currentProjectTopics = result.data || [];
            console.log('📋 Loaded topics:', currentProjectTopics.length, 'topics');
            displayEditTopics();
        } else {
            console.warn('📋 Failed to load topics:', result.message);
        }
    } catch (error) {
        console.error('Error loading edit topics:', error);
    }
}

// Display topics in edit mode
function displayEditTopics() {
    const container = document.getElementById('editTopicsList');
    if (!container) return;

    if (currentProjectTopics.length === 0) {
        container.innerHTML = `
            <div class="no-topics-message">
                <p>No topics added yet. Click "Add Topic" to create your first topic.</p>
            </div>
        `;
        return;
    }

    const topicsHtml = currentProjectTopics.map((topic, index) => `
        <div class="edit-topic-item" data-topic-id="${topic.TopicID}">
            <div class="topic-header">
                <input type="text" class="topic-title-input" value="${escapeHtml(topic.Label)}" 
                       onblur="updateTopicTitle(${topic.TopicID}, this.value)" placeholder="Topic title">
                <button type="button" class="btn btn-sm btn-secondary" onclick="addPOIToTopic(${topic.TopicID})">
                    <i class="fas fa-plus"></i> Add POI
                </button>
                <button type="button" class="btn btn-sm btn-danger" onclick="deleteEditTopic(${topic.TopicID})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="topic-pois-edit">
                ${displayEditPOIs(topic.pois || [], topic.TopicID)}
            </div>
        </div>
    `).join('');

    container.innerHTML = topicsHtml;
}

// Display POIs in edit mode
function displayEditPOIs(pois, topicId) {
    if (!pois || pois.length === 0) {
        return '<div class="no-pois-edit"><em>No POIs yet. Add a POI to organize cards.</em></div>';
    }

    return pois.map(poi => `
        <div class="edit-poi-item" data-poi-id="${poi.POIID}">
            <div class="poi-header-edit">
                <span>POI #${poi.POIID}</span>
                <div class="poi-image-section">
                    ${poi.pImage ? `
                        <div class="poi-image-preview">
                            <img src="${poi.pImage}" alt="POI Image" style="max-width: 100px; max-height: 100px; object-fit: cover; border-radius: 4px;">
                            <div class="poi-image-actions">
                                <button type="button" class="btn btn-xs btn-secondary" onclick="changePOIImage(${poi.POIID})">
                                    <i class="fas fa-edit"></i> Change
                                </button>
                                <button type="button" class="btn btn-xs btn-danger" onclick="removePOIImage(${poi.POIID})">
                                    <i class="fas fa-trash"></i> Remove
                                </button>
                            </div>
                        </div>
                    ` : `
                        <div class="poi-no-image">
                            <button type="button" class="btn btn-xs btn-info" onclick="uploadPOIImage(${poi.POIID})">
                                <i class="fas fa-upload"></i> Upload Image
                            </button>
                        </div>
                    `}
                </div>
                <button type="button" class="btn btn-xs btn-primary" onclick="addCardToPOI(${poi.POIID})">
                    <i class="fas fa-plus"></i> Card
                </button>
                <button type="button" class="btn btn-xs btn-danger" onclick="deletePOI(${poi.POIID})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="poi-location-edit" style="margin: 8px 0;">
                <label style="display: block; margin-bottom: 4px; font-weight: 500; color: #374151; font-size: 0.9em;">
                    <i class="fas fa-map-marker-alt"></i> Location Description:
                </label>
                <textarea 
                    id="poi-location-${poi.POIID}" 
                    placeholder="Describe where this POI is located..." 
                    style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9em; resize: vertical; min-height: 50px;"
                    onblur="updatePOILocation(${poi.POIID}, this.value)"
                >${poi.pLocation || ''}</textarea>
            </div>
            <div class="poi-cards-edit">
                ${displayEditCards(poi.cards || [])}
            </div>
        </div>
    `).join('');
}

// Helper function to get card type options
function getCardTypeOptions(selectedType) {
    const types = [
        { value: 1, label: 'Single' },
        { value: 2, label: 'Two Column' },
        { value: 3, label: 'Media' },
        { value: 4, label: 'Text and Media' },
        { value: 5, label: 'Media and Text' }
    ];
    
    return types.map(type => 
        `<option value="${type.value}" ${type.value == selectedType ? 'selected' : ''}>${type.label}</option>`
    ).join('');
}

// Function to select card type when creating a new card
function selectCardType() {
    return new Promise((resolve) => {
        const types = [
            { value: 1, label: 'Single' },
            { value: 2, label: 'Two Column' },
            { value: 3, label: 'Media' },
            { value: 4, label: 'Text and Media' },
            { value: 5, label: 'Media and Text' }
        ];
        
        // Create a simple selection dialog
        const typeOptions = types.map(type => `${type.value}. ${type.label}`).join('\n');
        const selection = prompt(
            `Select card type:\n${typeOptions}\n\nEnter the number (1-5):`,
            '1'
        );
        
        if (selection === null) {
            resolve(null); // User cancelled
            return;
        }
        
        const typeValue = parseInt(selection);
        if (typeValue >= 1 && typeValue <= 5) {
            resolve(typeValue);
        } else {
            alert('Invalid selection. Using default type: Single');
            resolve(1);
        }
    });
}

// Display cards in edit mode
function displayEditCards(cards) {
    if (!cards || cards.length === 0) {
        return '<div class="no-cards-edit"><em>No cards yet</em></div>';
    }

    return cards.map(card => `
        <div class="edit-card-item" data-card-id="${card.CardID}">
            <div class="card-edit-header">
                <input type="text" class="card-title-input" value="${escapeHtml(card.Title)}" 
                       onblur="updateCardTitle(${card.CardID}, this.value)" placeholder="Card title">
                <select class="card-type-select" onchange="updateCardType(${card.CardID}, this.value)">
                    ${getCardTypeOptions(card.Type)}
                </select>
                <button type="button" class="btn btn-xs btn-danger" onclick="deleteCard(${card.CardID})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <textarea class="card-body-input" placeholder="Card content..." 
                      onblur="updateCardBody(${card.CardID}, this.value)">${card.Body || ''}</textarea>
            <input type="text" class="card-notes-input" value="${escapeHtml(card.Notes || '')}" 
                   onblur="updateCardNotes(${card.CardID}, this.value)" placeholder="Notes (optional)">
            <input type="text" class="card-references-input" value="${escapeHtml(card.References || '')}" 
                   onblur="updateCardReferences(${card.CardID}, this.value)" placeholder="References (optional)">
            
            <div class="card-media-management">
                <div class="card-media-header">
                    <span>Attached Media:</span>
                    <button type="button" class="btn btn-xs btn-primary" onclick="showAttachMediaModal(${card.CardID})">
                        <i class="fas fa-plus"></i> Attach Media
                    </button>
                </div>
                <div class="card-media-list">
                    ${card.media && card.media.length > 0 ? card.media.map(media => `
                        <div class="card-media-edit-item" data-media-id="${media.id}">
                            <img src="${media.file_url || media.download_url}" alt="${media.displayName || media.original_name}">
                            <div class="media-info">
                                <span class="media-name">${media.displayName || media.original_name}</span>
                                <button type="button" class="btn btn-xs btn-danger" onclick="removeCardMedia(${card.CardID}, ${media.id})">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    `).join('') : '<div class="no-media"><em>No media attached</em></div>'}
                </div>
            </div>
        </div>
    `).join('');
}

// Add new topic in edit mode
async function addEditTopic() {
    console.log('📋 TOPIC: Adding new topic to project');
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const projectId = window.currentEditingProjectId;
    
    console.log('📋 TOPIC: Add topic details:', {
        user: currentUser ? currentUser.username : 'Not logged in',
        projectId: projectId,
        hasCurrentTopics: !!currentProjectTopics,
        topicsCount: currentProjectTopics ? currentProjectTopics.length : 0
    });
    
    if (!currentUser || !projectId) {
        console.error('📋 TOPIC: ❌ Missing required information');
        showNotification('Missing required information', 'error');
        return;
    }

    try {
        console.log('📋 TOPIC: 📤 Sending POST request to create topic');
        
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/topics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Label: 'New Topic'
            })
        });

        const result = await response.json();
        
        console.log('📋 TOPIC: Server response:', {
            success: result.success,
            data: result.data,
            message: result.message
        });
        
        if (result.success) {
            console.log('📋 TOPIC: ✅ Topic created successfully, updating UI');
            currentProjectTopics.push(result.data);
            displayEditTopics();
            showNotification('Topic added successfully', 'success');
        } else {
            showNotification(result.message || 'Failed to add topic', 'error');
        }
    } catch (error) {
        console.error('Error adding topic:', error);
        showNotification('Failed to add topic', 'error');
    }
}

// Update topic title
async function updateTopicTitle(topicId, newTitle) {
    console.log('📋 TOPIC: Updating topic title:', { topicId, newTitle });
    
    if (!newTitle.trim()) {
        console.warn('📋 TOPIC: ❌ Empty title provided');
        return;
    }

    try {
        console.log('📋 TOPIC: 📤 Sending PUT request to update topic');
        
        // Add current user ID for approval reset checking
        const userId = getCurrentUserId();
        const updateData = {
            Label: newTitle.trim()
        };
        if (userId) {
            updateData.user_id = userId;
        }
        
        const response = await fetch(`${API_BASE_URL}/topics/${topicId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();
        
        console.log('📋 TOPIC: Update response:', {
            success: result.success,
            message: result.message
        });
        
        if (result.success) {
            console.log('📋 TOPIC: ✅ Topic title updated successfully');
            // Update local state
            const topic = currentProjectTopics.find(t => t.TopicID === topicId);
            if (topic) {
                topic.Label = newTitle.trim();
            }
            
            // Refresh user dashboard and project gallery since topic changes may affect approval status
            console.log('📊 TOPIC: Refreshing dashboard and gallery due to potential approval status changes');
            const userProjectsGrid = document.getElementById('user-projects-grid');
            if (userProjectsGrid) {
                loadDashboardData();
            }
            const galleryGrid = document.getElementById('galleryGrid');
            if (galleryGrid) {
                loadGallery();
            }
        } else {
            showNotification('Failed to update topic title', 'error');
        }
    } catch (error) {
        console.error('Error updating topic title:', error);
    }
}

// Add POI to topic
async function addPOIToTopic(topicId) {
    console.log('📍 POI: Adding new POI to topic:', topicId);
    
    try {
        console.log('📍 POI: 📤 Sending POST request to create POI');
        
        const response = await fetch(`${API_BASE_URL}/topics/${topicId}/pois`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                XCoord: 0,
                YCoord: 0
            })
        });

        const result = await response.json();
        
        console.log('📍 POI: Server response:', {
            success: result.success,
            data: result.data,
            message: result.message
        });
        
        if (result.success) {
            console.log('📍 POI: ✅ POI created successfully, updating UI');
            
            // Find topic and add POI
            const topic = currentProjectTopics.find(t => t.TopicID === topicId);
            if (topic) {
                if (!topic.pois) topic.pois = [];
                topic.pois.push(result.data);
                console.log('📍 POI: Updated topic with new POI, total POIs:', topic.pois.length);
                displayEditTopics();
                showNotification('POI added successfully', 'success');
            } else {
                console.error('📍 POI: ❌ Could not find topic with ID:', topicId);
            }
        } else {
            console.error('📍 POI: ❌ Failed to create POI:', result.message);
            showNotification(result.message || 'Failed to add POI', 'error');
        }
    } catch (error) {
        console.error('📍 POI: ❌ Error adding POI:', error);
        showNotification('Failed to add POI', 'error');
    }
}

// Update POI coordinates
async function updatePOICoords(poiId, xCoord, yCoord) {
    try {
        // Get current coordinates from the inputs
        const poiElement = document.querySelector(`[data-poi-id="${poiId}"]`);
        if (!poiElement) return;
        
        const xInput = poiElement.querySelector('input[placeholder="X"]');
        const yInput = poiElement.querySelector('input[placeholder="Y"]');
        
        const currentX = parseFloat(xInput.value) || 0;
        const currentY = parseFloat(yInput.value) || 0;
        
        // Determine which coordinate to update
        const updateData = {};
        if (xCoord !== null) {
            updateData.XCoord = parseFloat(xCoord) || 0;
        } else {
            updateData.XCoord = currentX;
        }
        
        if (yCoord !== null) {
            updateData.YCoord = parseFloat(yCoord) || 0;
        } else {
            updateData.YCoord = currentY;
        }

        // Add current user ID for approval reset checking
        const userId = getCurrentUserId();
        if (userId) {
            updateData.user_id = userId;
        }

        const response = await fetch(`${API_BASE_URL}/pois/${poiId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();
        if (result.success) {
            // Update local state
            for (const topic of currentProjectTopics) {
                const poi = topic.pois?.find(p => p.POIID === poiId);
                if (poi) {
                    poi.XCoord = updateData.XCoord;
                    poi.YCoord = updateData.YCoord;
                    break;
                }
            }
            console.log(`POI coordinates updated: (${updateData.XCoord}, ${updateData.YCoord})`);
            
            // Refresh user dashboard and project gallery since POI changes may affect approval status
            console.log('📊 POI: Refreshing dashboard and gallery due to potential approval status changes');
            const userProjectsGrid = document.getElementById('user-projects-grid');
            if (userProjectsGrid) {
                loadDashboardData();
            }
            const galleryGrid = document.getElementById('galleryGrid');
            if (galleryGrid) {
                loadGallery();
            }
        } else {
            showNotification(result.message || 'Failed to update POI coordinates', 'error');
        }
    } catch (error) {
        console.error('Error updating POI coordinates:', error);
        showNotification('Failed to update POI coordinates', 'error');
    }
}

// Upload image for POI
async function uploadPOIImage(poiId) {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    
    document.body.appendChild(input);
    
    input.onchange = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) {
                showNotification('Please log in to upload images', 'error');
                return;
            }
            
            console.log('📍 POI IMAGE: Uploading image for POI:', poiId);
            console.log('📍 POI IMAGE: File details:', {
                name: file.name,
                size: file.size,
                type: file.type
            });
            
            // Upload the file first
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', currentUser.id);
            formData.append('customName', `POI_${poiId}_${file.name}`);
            
            console.log('📍 POI IMAGE: 📤 Uploading file to media endpoint');
            
            const uploadResponse = await fetch(`${API_BASE_URL}/media/upload`, {
                method: 'POST',
                body: formData
            });
            
            const uploadResult = await uploadResponse.json();
            
            console.log('📍 POI IMAGE: Upload response:', {
                success: uploadResult.success,
                fileUrl: uploadResult.file?.url,
                message: uploadResult.message
            });
            
            if (uploadResult.success && uploadResult.file?.url) {
                console.log('📍 POI IMAGE: 📤 Updating POI with image URL');
                
                // Update POI with image path
                const updateResponse = await fetch(`${API_BASE_URL}/pois/${poiId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        pImage: uploadResult.file.url
                    })
                });
                
                console.log('📍 POI IMAGE: Update request body:', {
                    pImage: uploadResult.file.url
                });
                
                const updateResult = await updateResponse.json();
                
                console.log('📍 POI IMAGE: POI update response:', {
                    success: updateResult.success,
                    message: updateResult.message
                });
                
                if (updateResult.success) {
                    console.log('📍 POI IMAGE: ✅ POI image uploaded and linked successfully');
                    showNotification('POI image uploaded successfully!', 'success');
                    // Refresh the topics display
                    loadEditTopics(window.currentEditingProjectId);
                } else {
                    showNotification('Failed to update POI with image', 'error');
                    console.error('POI update error:', updateResult);
                }
            } else {
                showNotification('Failed to upload image', 'error');
                console.error('Upload error:', uploadResult);
            }
            
        } catch (error) {
            console.error('Error uploading POI image:', error);
            showNotification('Failed to upload POI image', 'error');
        } finally {
            document.body.removeChild(input);
        }
    };
    
    input.click();
}

// Change POI image
async function changePOIImage(poiId) {
    uploadPOIImage(poiId); // Reuse the upload function
}

// Remove POI image
async function removePOIImage(poiId) {
    const confirmed = confirm('Are you sure you want to remove this POI image?');
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/pois/${poiId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pImage: null
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('POI image removed successfully', 'success');
            // Refresh the topics display
            loadEditTopics(window.currentEditingProjectId);
        } else {
            showNotification('Failed to remove POI image', 'error');
        }
    } catch (error) {
        console.error('Error removing POI image:', error);
        showNotification('Failed to remove POI image', 'error');
    }
}

// Update POI location description
async function updatePOILocation(poiId, locationDescription) {
    try {
        // Add current user ID for approval reset checking
        const userId = getCurrentUserId();
        const updateData = {
            pLocation: locationDescription
        };
        if (userId) {
            updateData.user_id = userId;
        }

        const response = await fetch(`${API_BASE_URL}/pois/${poiId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('POI location updated successfully', 'success');
            // Update the topic in memory
            const topic = currentProjectTopics.find(t => 
                t.pois && t.pois.some(p => p.POIID === poiId)
            );
            if (topic) {
                const poi = topic.pois.find(p => p.POIID === poiId);
                if (poi) {
                    poi.pLocation = locationDescription;
                }
            }
            
            // Refresh user dashboard and project gallery since POI changes may affect approval status
            console.log('📊 POI LOCATION: Refreshing dashboard and gallery due to potential approval status changes');
            const userProjectsGrid = document.getElementById('user-projects-grid');
            if (userProjectsGrid) {
                loadDashboardData();
            }
            const galleryGrid = document.getElementById('galleryGrid');
            if (galleryGrid) {
                loadGallery();
            }
        } else {
            showNotification('Failed to update POI location', 'error');
        }
    } catch (error) {
        console.error('Error updating POI location:', error);
        showNotification('Failed to update POI location', 'error');
    }
}

// Add card to POI
async function addCardToPOI(poiId) {
    console.log('📄 CARD: Adding new card to POI:', poiId);
    
    // Create a simple modal to select card type
    const typeSelection = await selectCardType();
    console.log('📄 CARD: Selected card type:', typeSelection);
    
    if (typeSelection === null) {
        console.log('📄 CARD: User cancelled card creation');
        return; // User cancelled
    }
    
    try {
        console.log('📄 CARD: 📤 Sending POST request to create card');
        
        const response = await fetch(`${API_BASE_URL}/pois/${poiId}/cards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Title: 'New Card',
                Body: '',
                Type: typeSelection
            })
        });

        const result = await response.json();
        
        console.log('📄 CARD: Server response:', {
            success: result.success,
            data: result.data,
            message: result.message
        });
        
        if (result.success) {
            console.log('📄 CARD: ✅ Card created successfully, updating UI');
            
            // Find POI and add card
            for (const topic of currentProjectTopics) {
                const poi = topic.pois?.find(p => p.POIID === poiId);
                if (poi) {
                    if (!poi.cards) poi.cards = [];
                    poi.cards.push(result.data);
                    console.log('📄 CARD: Updated POI with new card, total cards:', poi.cards.length);
                    displayEditTopics();
                    showNotification('Card added successfully', 'success');
                    break;
                }
            }
        } else {
            showNotification(result.message || 'Failed to add card', 'error');
        }
    } catch (error) {
        console.error('Error adding card:', error);
        showNotification('Failed to add card', 'error');
    }
}

// Update card functions
async function updateCardTitle(cardId, newTitle) {
    if (!newTitle.trim()) return;
    await updateCard(cardId, { Title: newTitle.trim() });
}

async function updateCardBody(cardId, newBody) {
    await updateCard(cardId, { Body: newBody });
}

async function updateCardNotes(cardId, newNotes) {
    await updateCard(cardId, { Notes: newNotes });
}

async function updateCardType(cardId, newType) {
    await updateCard(cardId, { Type: parseInt(newType) });
}

async function updateCardReferences(cardId, newReferences) {
    await updateCard(cardId, { References: newReferences });
}

async function updateCard(cardId, updates) {
    try {
        // Add current user ID for approval reset checking
        const userId = getCurrentUserId();
        if (userId) {
            updates.user_id = userId;
        }

        const response = await fetch(`${API_BASE_URL}/cards/${cardId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        const result = await response.json();
        if (result.success) {
            // Update local state
            for (const topic of currentProjectTopics) {
                for (const poi of topic.pois || []) {
                    const card = poi.cards?.find(c => c.CardID === cardId);
                    if (card) {
                        Object.assign(card, updates);
                        
                        // Refresh user dashboard and project gallery since card changes may affect approval status
                        console.log('📊 CARD: Refreshing dashboard and gallery due to potential approval status changes');
                        const userProjectsGrid = document.getElementById('user-projects-grid');
                        if (userProjectsGrid) {
                            loadDashboardData();
                        }
                        const galleryGrid = document.getElementById('galleryGrid');
                        if (galleryGrid) {
                            loadGallery();
                        }
                        return;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error updating card:', error);
    }
}

// Delete functions
async function deleteEditTopic(topicId) {
    if (!confirm('Are you sure you want to delete this topic? This will also delete all POIs and cards within it. This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/topics/${topicId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            currentProjectTopics = currentProjectTopics.filter(t => t.TopicID !== topicId);
            displayEditTopics();
            showNotification('Topic deleted successfully', 'success');
        } else {
            showNotification(result.message || 'Failed to delete topic', 'error');
        }
    } catch (error) {
        console.error('Error deleting topic:', error);
        showNotification('Failed to delete topic', 'error');
    }
}

async function deletePOI(poiId) {
    if (!confirm('Are you sure you want to delete this POI? This will also delete all cards within it.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/pois/${poiId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            // Remove from local state
            for (const topic of currentProjectTopics) {
                if (topic.pois) {
                    topic.pois = topic.pois.filter(p => p.POIID !== poiId);
                }
            }
            displayEditTopics();
            showNotification('POI deleted successfully', 'success');
        } else {
            showNotification(result.message || 'Failed to delete POI', 'error');
        }
    } catch (error) {
        console.error('Error deleting POI:', error);
        showNotification('Failed to delete POI', 'error');
    }
}

async function deleteCard(cardId) {
    if (!confirm('Are you sure you want to delete this card?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/cards/${cardId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            // Remove from local state
            for (const topic of currentProjectTopics) {
                for (const poi of topic.pois || []) {
                    if (poi.cards) {
                        poi.cards = poi.cards.filter(c => c.CardID !== cardId);
                    }
                }
            }
            displayEditTopics();
            showNotification('Card deleted successfully', 'success');
        } else {
            showNotification(result.message || 'Failed to delete card', 'error');
        }
    } catch (error) {
        console.error('Error deleting card:', error);
        showNotification('Failed to delete card', 'error');
    }
}

// Show modal to attach media to card
async function showAttachMediaModal(cardId) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const response = await fetch(`${API_BASE_URL}/media/files?userId=${currentUser.id}`);
        const result = await response.json();
        
        console.log('📄 CARD MEDIA: API response:', result);
        
        if (result.success && result.files && result.files.length > 0) {
            // Create modal HTML
            const modalHtml = `
                <div class="modal" id="attachMediaModal" style="display: block;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Attach Media to Card</h3>
                            <span class="close" onclick="closeAttachMediaModal()">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="media-grid">
                                ${result.files.map(media => `
                                    <div class="media-item-select" onclick="attachMediaToCard(${cardId}, ${media.id})">
                                        <img src="${media.url}" alt="${media.originalName}">
                                        <div class="media-name">${media.originalName}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } else {
            showNotification('No media files found. Upload some media first!', 'warning');
        }
    } catch (error) {
        console.error('Error loading media files:', error);
        showNotification('Failed to load media files', 'error');
    }
}

// Close attach media modal
function closeAttachMediaModal() {
    const modal = document.getElementById('attachMediaModal');
    if (modal) {
        modal.remove();
    }
}

// Attach media to card
async function attachMediaToCard(cardId, mediaId) {
    console.log('📄 CARD MEDIA: Attaching media to card:', { cardId, mediaId });
    
    try {
        console.log('📄 CARD MEDIA: 📤 Sending POST request to attach media');
        
        const response = await fetch(`${API_BASE_URL}/cards/${cardId}/media`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mediaId: mediaId })
        });

        const result = await response.json();
        
        console.log('📄 CARD MEDIA: Server response:', {
            success: result.success,
            message: result.message
        });
        
        if (result.success) {
            console.log('📄 CARD MEDIA: ✅ Media attached successfully');
            showNotification('Media attached successfully', 'success');
            closeAttachMediaModal();
            
            // Refresh the project display
            if (window.currentEditingProjectId) {
                console.log('📄 CARD MEDIA: Refreshing project display');
                await loadEditTopics(window.currentEditingProjectId);
                displayEditTopics();
            }
        } else {
            console.error('📄 CARD MEDIA: ❌ Failed to attach media:', result.message);
            showNotification(result.message || 'Failed to attach media', 'error');
        }
    } catch (error) {
        console.error('📄 CARD MEDIA: ❌ Error attaching media:', error);
        showNotification('Failed to attach media', 'error');
    }
}

// Remove media from card
async function removeCardMedia(cardId, mediaId) {
    if (!confirm('Remove this media from the card?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/cards/${cardId}/media/${mediaId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Media removed successfully', 'success');
            
            // Refresh the project display
            if (window.currentEditingProjectId) {
                await loadEditTopics(window.currentEditingProjectId);
                displayEditTopics();
            }
        } else {
            showNotification(result.message || 'Failed to remove media', 'error');
        }
    } catch (error) {
        console.error('Error removing media:', error);
        showNotification('Failed to remove media', 'error');
    }
}

// Preview media function
function previewCardMedia(url, name) {
    const modalHtml = `
        <div class="modal" id="mediaPreviewModal" style="display: block;">
            <div class="modal-content media-preview-modal">
                <div class="modal-header">
                    <h3>${name}</h3>
                    <span class="close" onclick="closeMediaPreview()">&times;</span>
                </div>
                <div class="modal-body">
                    <img src="${url}" alt="${name}" style="max-width: 100%; max-height: 80vh;">
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Close media preview
function closeMediaPreview() {
    const modal = document.getElementById('mediaPreviewModal');
    if (modal) {
        modal.remove();
    }
}

// Show modal to add card with POI selection
async function showAddCardModal() {
    if (!currentProjectTopics || currentProjectTopics.length === 0) {
        showNotification('Please add topics and POIs first', 'warning');
        return;
    }

    // Get all POIs from all topics
    const allPois = [];
    for (const topic of currentProjectTopics) {
        if (topic.pois && topic.pois.length > 0) {
            for (const poi of topic.pois) {
                allPois.push({
                    ...poi,
                    topicLabel: topic.Label
                });
            }
        }
    }

    if (allPois.length === 0) {
        showNotification('Please add POIs first before creating cards', 'warning');
        return;
    }

    const modalHtml = `
        <div class="modal" id="addCardModal" style="display: block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Card</h3>
                    <span class="close" onclick="closeAddCardModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="cardTitle">Card Title</label>
                        <input type="text" id="cardTitle" placeholder="Enter card title" value="New Card">
                    </div>
                    <div class="form-group">
                        <label for="cardType">Card Type</label>
                        <select id="cardType">
                            <option value="1">Single</option>
                            <option value="2">Two Column</option>
                            <option value="3">Media</option>
                            <option value="4">Text and Media</option>
                            <option value="5">Media and Text</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="cardPOI">Select POI</label>
                        <select id="cardPOI">
                            ${allPois.map(poi => `
                                <option value="${poi.POIID}">
                                    ${poi.topicLabel} → POI ${poi.POIID} (${poi.XCoord}, ${poi.YCoord})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="cardBody">Card Content (optional)</label>
                        <textarea id="cardBody" placeholder="Enter card content" rows="3"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeAddCardModal()">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="createCardFromModal()">Create Card</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Close add card modal
function closeAddCardModal() {
    const modal = document.getElementById('addCardModal');
    if (modal) {
        modal.remove();
    }
}

// Create card from modal
async function createCardFromModal() {
    const title = document.getElementById('cardTitle').value.trim();
    const type = parseInt(document.getElementById('cardType').value);
    const poiId = parseInt(document.getElementById('cardPOI').value);
    const body = document.getElementById('cardBody').value.trim();

    if (!title) {
        showNotification('Please enter a card title', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/pois/${poiId}/cards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Title: title,
                Body: body,
                Type: type
            })
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Card created successfully', 'success');
            closeAddCardModal();
            
            // Refresh the project display
            if (window.currentEditingProjectId) {
                await loadEditTopics(window.currentEditingProjectId);
                displayEditTopics();
            }
        } else {
            showNotification(result.message || 'Failed to create card', 'error');
        }
    } catch (error) {
        console.error('Error creating card:', error);
        showNotification('Failed to create card', 'error');
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Admin User Management Functions
async function loadAdminUsers() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) {
        console.warn('Admin access required for user management');
        return;
    }
    
    const adminUsersSection = document.getElementById('admin-users-section');
    const tableBody = document.getElementById('admin-users-table-body');
    const totalUsersElement = document.getElementById('admin-total-users-count');
    const adminsCountElement = document.getElementById('admin-admins-count');
    const regularUsersCountElement = document.getElementById('admin-regular-users-count');
    
    // Show admin section
    if (adminUsersSection) {
        adminUsersSection.style.display = 'block';
    }
    
    try {
        const response = await fetchFromAPI('/admin/users');
        
        if (response.success && response.data) {
            const users = response.data;
            
            // Update statistics
            const totalUsers = users.length;
            const admins = users.filter(user => user.isAdmin);
            const regularUsers = users.filter(user => !user.isAdmin);
            
            if (totalUsersElement) totalUsersElement.textContent = totalUsers;
            if (adminsCountElement) adminsCountElement.textContent = admins.length;
            if (regularUsersCountElement) regularUsersCountElement.textContent = regularUsers.length;
            
            // Display users in table
            if (tableBody) {
                if (users.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="7" class="users-empty">
                                <i class="fas fa-users"></i>
                                <p>No users found</p>
                            </td>
                        </tr>
                    `;
                } else {
                    tableBody.innerHTML = users.map(user => {
                        const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown';
                        const roleClass = user.isAdmin ? 'admin' : 'user';
                        const roleName = user.isAdmin ? 'Administrator' : 'User';
                        
                        return `
                            <tr>
                                <td>${user.id}</td>
                                <td><strong>${escapeHtml(user.username)}</strong></td>
                                <td>
                                    <span class="user-role-badge ${roleClass}">
                                        ${roleName}
                                    </span>
                                </td>
                                <td class="user-stats">${user.projectCount}</td>
                                <td class="user-stats">${user.mediaCount}</td>
                                <td class="user-created-date">${createdDate}</td>
                                <td>
                                    <div class="user-actions">
                                        ${generateUserActions(user)}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        } else {
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="users-empty">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Failed to load users</p>
                        </td>
                    </tr>
                `;
            }
        }
        
    } catch (error) {
        console.error('Error loading admin users:', error);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="users-empty">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading users</p>
                    </td>
                </tr>
            `;
        }
    }
}

function generateUserActions(user) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isCurrentUser = currentUser && currentUser.id === user.id;
    
    let actions = [];
    
    if (!user.isAdmin) {
        // Regular user - can be promoted to admin
        actions.push(`
            <button class="btn btn-promote" onclick="promoteUserToAdmin(${user.id}, '${escapeHtml(user.username)}')" 
                    ${isCurrentUser ? 'disabled title="Cannot promote yourself"' : ''}>
                <i class="fas fa-crown"></i> Promote
            </button>
        `);
        
        // Regular user - can be deleted (but not current user)
        actions.push(`
            <button class="btn btn-delete" onclick="deleteUser(${user.id}, '${escapeHtml(user.username)}')"
                    ${isCurrentUser ? 'disabled title="Cannot delete yourself"' : ''}>
                <i class="fas fa-trash"></i> Delete
            </button>
        `);
    } else {
        // Admin user - can be demoted (but not if it's the last admin or current user)
        actions.push(`
            <button class="btn btn-demote" onclick="demoteAdminToUser(${user.id}, '${escapeHtml(user.username)}')"
                    ${isCurrentUser ? 'disabled title="Cannot demote yourself"' : ''}>
                <i class="fas fa-user-minus"></i> Demote
            </button>
        `);
    }
    
    return actions.join('');
}

async function promoteUserToAdmin(userId, username) {
    const confirmed = confirm(`Are you sure you want to promote "${username}" to administrator?\n\nThis will give them full access to all admin features.`);
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/promote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Successfully promoted "${username}" to administrator`, 'success');
            loadAdminUsers(); // Refresh the user list
        } else {
            showNotification(result.error || 'Failed to promote user', 'error');
        }
    } catch (error) {
        console.error('Error promoting user:', error);
        showNotification('Error occurred while promoting user', 'error');
    }
}

async function demoteAdminToUser(userId, username) {
    const confirmed = confirm(`Are you sure you want to demote "${username}" from administrator to regular user?\n\nThis will remove their admin privileges.`);
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/demote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Successfully demoted "${username}" to regular user`, 'success');
            loadAdminUsers(); // Refresh the user list
        } else {
            showNotification(result.error || 'Failed to demote user', 'error');
        }
    } catch (error) {
        console.error('Error demoting user:', error);
        showNotification('Error occurred while demoting user', 'error');
    }
}

async function deleteUser(userId, username) {
    const confirmed = confirm(`Are you sure you want to delete user "${username}"?\n\nThis will permanently delete:\n- The user account\n- All their projects\n- All their media files\n\nThis action cannot be undone.`);
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message || `Successfully deleted user "${username}"`, 'success');
            loadAdminUsers(); // Refresh the user list
        } else {
            showNotification(result.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error occurred while deleting user', 'error');
    }
}

function refreshAdminUsers() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) {
        showNotification('Admin access required', 'error');
        return;
    }
    
    loadAdminUsers();
}

// Storage Cleanup Functions
let currentOrphanedFiles = [];

function showAdminStorageSection() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) return;
    
    const adminStorageSection = document.getElementById('admin-storage-section');
    if (adminStorageSection) {
        adminStorageSection.style.display = 'block';
        // Update editing session status when showing the storage section
        updateEditingSessionStatus();
    }
}

function showAdminDatabaseSection() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) return;
    
    const adminDatabaseSection = document.getElementById('admin-database-section');
    if (adminDatabaseSection) {
        adminDatabaseSection.style.display = 'block';
    }
}

async function updateEditingSessionStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/editing/status`);
        const result = await response.json();
        
        if (result.success) {
            const statusElement = document.getElementById('editing-sessions-status');
            if (statusElement) {
                if (result.activeSessions > 0) {
                    statusElement.innerHTML = `
                        <div class="alert alert-warning">
                            <i class="fas fa-edit"></i> 
                            <strong>${result.activeSessions}</strong> active editing session(s)
                            <br><small>Auto-cleanup disabled while users are editing</small>
                        </div>
                    `;
                } else {
                    statusElement.innerHTML = `
                        <div class="alert alert-success">
                            <i class="fas fa-check"></i> 
                            No active editing sessions
                            <br><small>Auto-cleanup enabled</small>
                        </div>
                    `;
                }
            }
        }
    } catch (error) {
        console.error('Error checking editing status:', error);
    }
}

async function scanOrphanedFiles() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.isAdmin) {
        showNotification('Admin access required', 'error');
        return;
    }

    try {
        document.getElementById('storage-loading').style.display = 'block';
        document.getElementById('storage-stats').style.display = 'none';
        document.getElementById('storage-results').style.display = 'none';

        const response = await fetch('/api/admin/storage/cleanup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dryRun: true })
        });

        const result = await response.json();

        if (result.success) {
            currentOrphanedFiles = result.orphanedFiles || [];
            
            // Update stats
            document.getElementById('storage-total-files').textContent = result.summary.totalFiles;
            document.getElementById('storage-orphaned-files').textContent = result.summary.orphanedFiles;
            document.getElementById('storage-orphaned-size').textContent = result.summary.totalOrphanedSizeMB + ' MB';

            // Show stats
            document.getElementById('storage-stats').style.display = 'flex';
            document.getElementById('storage-loading').style.display = 'none';

            if (result.summary.orphanedFiles > 0) {
                displayOrphanedFiles(result.orphanedFiles);
                document.getElementById('cleanup-btn').style.display = 'inline-block';
                document.getElementById('download-btn').style.display = 'inline-block';
                document.getElementById('storage-results').style.display = 'block';
                showNotification(`Found ${result.summary.orphanedFiles} orphaned files (${result.summary.totalOrphanedSizeMB} MB)`, 'warning');
            } else {
                displayEmptyStorage();
                document.getElementById('storage-results').style.display = 'block';
                showNotification('No orphaned files found! Storage is clean.', 'success');
            }
        } else {
            showNotification(result.error || 'Failed to scan storage', 'error');
            document.getElementById('storage-loading').style.display = 'none';
        }
    } catch (error) {
        console.error('Error scanning storage:', error);
        showNotification('Error occurred while scanning storage', 'error');
        document.getElementById('storage-loading').style.display = 'none';
    }
}

function displayOrphanedFiles(orphanedFiles) {
    const listContainer = document.getElementById('orphaned-files-list');
    
    if (orphanedFiles.length === 0) {
        displayEmptyStorage();
        return;
    }

    const html = orphanedFiles.map(file => `
        <div class="orphaned-file-item">
            <div class="orphaned-file-info">
                <div class="orphaned-file-path">${file.path}</div>
                <div class="orphaned-file-size">${file.sizeMB} MB</div>
            </div>
        </div>
    `).join('');

    listContainer.innerHTML = html;
}

function displayEmptyStorage() {
    const listContainer = document.getElementById('orphaned-files-list');
    listContainer.innerHTML = `
        <div class="storage-empty">
            <i class="fas fa-check-circle"></i>
            <h4>Storage is Clean!</h4>
            <p>No orphaned files found. All files are properly referenced in the database.</p>
        </div>
    `;
    document.getElementById('cleanup-btn').style.display = 'none';
    document.getElementById('download-btn').style.display = 'none';
}

async function cleanupOrphanedFiles() {
    if (currentOrphanedFiles.length === 0) {
        showNotification('No orphaned files to clean up', 'info');
        return;
    }

    const confirmMessage = `Are you sure you want to permanently delete ${currentOrphanedFiles.length} orphaned files? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        document.getElementById('storage-loading').style.display = 'block';
        document.getElementById('storage-results').style.display = 'none';

        const response = await fetch('/api/admin/storage/cleanup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dryRun: false })
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`Successfully deleted ${result.summary.deletedFiles} files (${result.summary.deletedSizeMB} MB)`, 'success');
            
            // Reset the interface
            currentOrphanedFiles = [];
            document.getElementById('storage-loading').style.display = 'none';
            document.getElementById('storage-stats').style.display = 'none';
            document.getElementById('storage-results').style.display = 'none';
            
            // Automatically rescan to show updated status
            setTimeout(() => {
                scanOrphanedFiles();
            }, 1000);
            
        } else {
            showNotification(result.error || 'Failed to cleanup storage', 'error');
            document.getElementById('storage-loading').style.display = 'none';
            document.getElementById('storage-results').style.display = 'block';
        }
    } catch (error) {
        console.error('Error cleaning up storage:', error);
        showNotification('Error occurred during storage cleanup', 'error');
        document.getElementById('storage-loading').style.display = 'none';
        document.getElementById('storage-results').style.display = 'block';
    }
}

function downloadOrphanedList() {
    if (currentOrphanedFiles.length === 0) {
        showNotification('No orphaned files to download', 'info');
        return;
    }

    const csvContent = [
        'File Path,Size (bytes),Size (MB)',
        ...currentOrphanedFiles.map(file => `"${file.path}",${file.size},"${file.sizeMB}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orphaned-files-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showNotification('Orphaned files list downloaded', 'success');
}

// ============================
// Database Management Functions
// ============================

let currentDatabaseTable = 'project';
let currentDatabasePage = 1;
const ROWS_PER_PAGE = 20;

function initializeDatabaseManagement() {
    console.log('Initializing database management...');
    
    // Load database statistics
    loadDatabaseStats();
    
    // Load the default table (project)
    switchDatabaseTable('project');
    
    // Set up pagination handlers
    const prevButton = document.getElementById('db-prev-page');
    const nextButton = document.getElementById('db-next-page');
    
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentDatabasePage > 1) {
                currentDatabasePage--;
                loadDatabaseTable(currentDatabaseTable);
            }
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            currentDatabasePage++;
            loadDatabaseTable(currentDatabaseTable);
        });
    }
    
    // Initialize table actions visibility
    updateTableActionsVisibility();
}

async function loadDatabaseStats() {
    try {
        console.log('Loading database statistics...');
        
        const response = await fetch('/api/admin/database/stats');
        const result = await response.json();
        
        if (result.success) {
            updateStatsDisplay(result.data);
        } else {
            console.error('Failed to load database stats:', result.error);
            showNotification('Failed to load database statistics', 'error');
        }
    } catch (error) {
        console.error('Error loading database stats:', error);
        showNotification('Error loading database statistics', 'error');
    }
}

function updateStatsDisplay(stats) {
    const statElements = {
        projects: document.querySelector('[data-stat="projects"] .stat-number'),
        media: document.querySelector('[data-stat="media"] .stat-number'),
        cards: document.querySelector('[data-stat="cards"] .stat-number'),
        pois: document.querySelector('[data-stat="pois"] .stat-number'),
        users: document.querySelector('[data-stat="users"] .stat-number'),
        art: document.querySelector('[data-stat="art"] .stat-number'),
        topics: document.querySelector('[data-stat="topics"] .stat-number')
    };
    
    // Extract table counts from the nested structure
    const tableCounts = stats.tableCounts || {};
    
    if (statElements.projects) statElements.projects.textContent = tableCounts.project || 0;
    if (statElements.media) statElements.media.textContent = tableCounts.media_files || 0;
    if (statElements.cards) statElements.cards.textContent = tableCounts.card || 0;
    if (statElements.pois) statElements.pois.textContent = tableCounts.poi || 0;
    if (statElements.users) statElements.users.textContent = tableCounts.user || 0;
    if (statElements.art) statElements.art.textContent = tableCounts.art || 0;
    if (statElements.topics) statElements.topics.textContent = tableCounts.project_topics || 0;
    
    // Update tab buttons with record counts
    updateTabButtonCounts(tableCounts);
}

function updateTabButtonCounts(tableCounts) {
    // Mapping of table names to tab button IDs and display names
    const tabMappings = {
        'user': { id: 'tab-user', icon: 'fas fa-users', name: 'Users' },
        'project': { id: 'tab-project', icon: 'fas fa-folder', name: 'Projects' },
        'project_topics': { id: 'tab-project_topics', icon: 'fas fa-list', name: 'Topics' },
        'poi': { id: 'tab-poi', icon: 'fas fa-map-marker-alt', name: 'POIs' },
        'card': { id: 'tab-card', icon: 'fas fa-sticky-note', name: 'Cards' },
        'art': { id: 'tab-art', icon: 'fas fa-palette', name: 'Art' },
        'media_files': { id: 'tab-media_files', icon: 'fas fa-file-image', name: 'Media Files' }
    };
    
    // Update each tab button with count
    Object.entries(tabMappings).forEach(([tableName, config]) => {
        const tabButton = document.getElementById(config.id);
        if (tabButton) {
            const count = tableCounts[tableName] || 0;
            tabButton.innerHTML = `
                <i class="${config.icon}"></i> ${config.name} (${count})
            `;
        }
    });
}

function switchDatabaseTable(tableName) {
    console.log('Switching to table:', tableName);
    
    // Update active tab
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`tab-${tableName}`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Reset pagination
    currentDatabaseTable = tableName;
    currentDatabasePage = 1;
    
    // Update table actions visibility
    updateTableActionsVisibility();
    
    // Load the table data
    loadDatabaseTable(tableName);
}

async function loadDatabaseTable(tableName) {
    try {
        console.log(`Loading table: ${tableName}, page: ${currentDatabasePage}`);
        
        // Show loading state
        const tableBody = document.getElementById('database-table-body');
        const tableInfo = document.getElementById('table-info');
        
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="100%" class="table-loading"><i class="fas fa-spinner fa-spin"></i> Loading data...</td></tr>';
        }
        
        // Fetch table data
        const response = await fetch(`/api/admin/database/tables/${tableName}?page=${currentDatabasePage}&limit=${ROWS_PER_PAGE}`);
        const result = await response.json();
        
        if (result.success) {
            displayTableData(result.data.rows, result.data.pagination);
            updateTableInfo(tableName, result.data.pagination);
        } else {
            console.error('Failed to load table data:', result.error);
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="100%" class="table-loading">Failed to load data</td></tr>';
            }
            showNotification(`Failed to load ${tableName} data`, 'error');
        }
    } catch (error) {
        console.error('Error loading table data:', error);
        const tableBody = document.getElementById('database-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="100%" class="table-loading">Error loading data</td></tr>';
        }
        showNotification('Error loading table data', 'error');
    }
}

function displayTableData(data, pagination) {
    const tableHead = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');
    
    if (!tableHead || !tableBody) {
        console.error('Table elements not found');
        return;
    }
    
    // Clear existing content
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100%" class="table-loading">No data found</td></tr>';
        return;
    }
    
    // Create table headers
    const headers = Object.keys(data[0]);
    const headerRow = document.createElement('tr');
    
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = formatColumnName(header);
        headerRow.appendChild(th);
    });
    
    tableHead.appendChild(headerRow);
    
    // Create table rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        
        headers.forEach(header => {
            const td = document.createElement('td');
            const value = row[header];
            
            // Format cell content based on data type and column name
            formatTableCell(td, header, value);
            
            tr.appendChild(td);
        });
        
        tableBody.appendChild(tr);
    });
    
    // Update pagination controls
    updatePaginationControls(pagination);
}

function formatColumnName(columnName) {
    // Convert camelCase and snake_case to readable format
    return columnName
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

function formatTableCell(td, columnName, value) {
    const lowerColumn = columnName.toLowerCase();
    
    // Handle null/undefined values
    if (value === null || value === undefined) {
        td.innerHTML = '<span class="bool-null">NULL</span>';
        return;
    }
    
    // Handle boolean values
    if (typeof value === 'boolean') {
        td.innerHTML = `<span class="bool-${value}">${value ? 'TRUE' : 'FALSE'}</span>`;
        td.classList.add('table-cell-boolean');
        return;
    }
    
    // Handle ID columns
    if (lowerColumn.includes('id')) {
        td.textContent = value;
        td.classList.add('table-cell-id');
        return;
    }
    
    // Handle date columns
    if (lowerColumn.includes('date') || lowerColumn.includes('time') || lowerColumn.includes('created') || lowerColumn.includes('updated')) {
        if (value) {
            const date = new Date(value);
            td.textContent = date.toLocaleString();
            td.classList.add('table-cell-date');
        } else {
            td.textContent = '-';
        }
        return;
    }
    
    // Handle file size columns
    if (lowerColumn.includes('size') && typeof value === 'number') {
        td.innerHTML = `<span class="file-size">${formatFileSize(value)}</span>`;
        td.classList.add('table-cell-number');
        return;
    }
    
    // Handle numeric columns
    if (typeof value === 'number') {
        td.textContent = value.toLocaleString();
        td.classList.add('table-cell-number');
        return;
    }
    
    // Handle long text content
    const text = String(value);
    if (text.length > 50) {
        td.textContent = text;
        td.classList.add('table-cell-long-text');
        td.title = text; // Show full text on hover
    } else if (text.length > 20) {
        td.textContent = text;
        td.classList.add('table-cell-text');
    } else {
        td.textContent = text;
    }
    
    // Handle special role columns for users
    if (lowerColumn === 'role' && currentDatabaseTable === 'user') {
        if (text.toLowerCase() === 'admin') {
            td.innerHTML = `<span class="user-admin">ADMIN</span>`;
        } else {
            td.innerHTML = `<span class="user-regular">USER</span>`;
        }
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateTableInfo(tableName, pagination) {
    // Update table name
    const tableNameElement = document.getElementById('table-name');
    if (tableNameElement) {
        tableNameElement.textContent = formatColumnName(tableName);
    }
    
    // Update record count
    const tableRecordCount = document.getElementById('table-record-count');
    if (tableRecordCount) {
        if (pagination && pagination.total !== undefined) {
            // Check if we have valid pagination data (server returns 'page', not 'currentPage')
            if (pagination.page && pagination.limit && !isNaN(pagination.page) && !isNaN(pagination.limit)) {
                const start = ((pagination.page - 1) * pagination.limit) + 1;
                const end = Math.min(pagination.page * pagination.limit, pagination.total);
                tableRecordCount.textContent = `${start}-${end} of ${pagination.total} records`;
            } else {
                // Just show total count if pagination data is incomplete
                tableRecordCount.textContent = `${pagination.total} records`;
            }
        } else {
            // Default fallback
            tableRecordCount.textContent = '0 records';
        }
    }
}

function updatePaginationControls(pagination) {
    const prevButton = document.getElementById('db-prev-page');
    const nextButton = document.getElementById('db-next-page');
    const paginationInfo = document.getElementById('pagination-info');
    
    if (pagination) {
        const hasPrev = pagination.page > 1;
        const hasNext = pagination.page < pagination.totalPages;
        
        if (prevButton) {
            prevButton.disabled = !hasPrev;
        }
        
        if (nextButton) {
            nextButton.disabled = !hasNext;
        }
        
        if (paginationInfo) {
            paginationInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
        }
    }
}

// ============================
// Database Cleanup Functions
// ============================

let currentOrphanedRecords = [];

async function scanOrphanedRecords() {
    if (currentDatabaseTable === 'user') {
        showNotification('User table cleanup is not allowed for safety reasons', 'warning');
        return;
    }
    
    try {
        console.log('Scanning for orphaned records in table:', currentDatabaseTable);
        
        // Show loading state
        const scanButton = document.getElementById('scan-orphaned-btn');
        const cleanupButton = document.getElementById('cleanup-orphaned-btn');
        
        if (scanButton) {
            scanButton.disabled = true;
            scanButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
        }
        
        if (cleanupButton) {
            cleanupButton.style.display = 'none';
        }
        
        const response = await fetch(`/api/admin/database/orphaned/${currentDatabaseTable}`);
        const result = await response.json();
        
        if (result.success) {
            currentOrphanedRecords = result.data.orphanedRecords;
            
            if (result.data.orphanedCount > 0) {
                showNotification(`Found ${result.data.orphanedCount} orphaned records in ${currentDatabaseTable} table`, 'warning');
                
                if (cleanupButton) {
                    cleanupButton.style.display = 'inline-block';
                    cleanupButton.innerHTML = `<i class="fas fa-trash"></i> Cleanup ${result.data.orphanedCount} Records`;
                }
            } else {
                showNotification(`No orphaned records found in ${currentDatabaseTable} table`, 'success');
            }
        } else {
            console.error('Failed to scan orphaned records:', result.error);
            showNotification('Failed to scan for orphaned records', 'error');
        }
        
    } catch (error) {
        console.error('Error scanning orphaned records:', error);
        showNotification('Error occurred while scanning for orphaned records', 'error');
    } finally {
        // Reset button state
        const scanButton = document.getElementById('scan-orphaned-btn');
        if (scanButton) {
            scanButton.disabled = false;
            scanButton.innerHTML = '<i class="fas fa-search"></i> Scan Orphaned';
        }
    }
}

async function cleanupOrphanedRecords() {
    if (currentDatabaseTable === 'user') {
        showNotification('User table cleanup is not allowed for safety reasons', 'warning');
        return;
    }
    
    if (currentOrphanedRecords.length === 0) {
        showNotification('No orphaned records to cleanup. Please scan first.', 'info');
        return;
    }
    
    const confirmMessage = `Are you sure you want to delete ${currentOrphanedRecords.length} orphaned records from the ${currentDatabaseTable} table?\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        console.log('Cleaning up orphaned records in table:', currentDatabaseTable);
        
        // Show loading state
        const cleanupButton = document.getElementById('cleanup-orphaned-btn');
        if (cleanupButton) {
            cleanupButton.disabled = true;
            cleanupButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cleaning...';
        }
        
        const response = await fetch(`/api/admin/database/orphaned/${currentDatabaseTable}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Successfully cleaned up ${result.data.deletedCount} orphaned records from ${currentDatabaseTable} table`, 'success');
            
            // Reset state
            currentOrphanedRecords = [];
            if (cleanupButton) {
                cleanupButton.style.display = 'none';
            }
            
            // Reload the table data
            loadDatabaseTable(currentDatabaseTable);
            
            // Reload statistics
            loadDatabaseStats();
            
        } else {
            console.error('Failed to cleanup orphaned records:', result.error);
            showNotification('Failed to cleanup orphaned records', 'error');
        }
        
    } catch (error) {
        console.error('Error cleaning up orphaned records:', error);
        showNotification('Error occurred during cleanup', 'error');
    } finally {
        // Reset button state
        const cleanupButton = document.getElementById('cleanup-orphaned-btn');
        if (cleanupButton) {
            cleanupButton.disabled = false;
            cleanupButton.innerHTML = '<i class="fas fa-trash"></i> Cleanup Orphaned';
        }
    }
}

function updateTableActionsVisibility() {
    const scanButton = document.getElementById('scan-orphaned-btn');
    const cleanupButton = document.getElementById('cleanup-orphaned-btn');
    
    if (currentDatabaseTable === 'user') {
        // Hide cleanup buttons for user table
        if (scanButton) scanButton.style.display = 'none';
        if (cleanupButton) cleanupButton.style.display = 'none';
    } else {
        // Show scan button for other tables
        if (scanButton) scanButton.style.display = 'inline-block';
        // Hide cleanup button until scan is performed
        if (cleanupButton) cleanupButton.style.display = 'none';
        // Reset orphaned records
        currentOrphanedRecords = [];
    }
}

// Clean up editing session when page is unloaded
window.addEventListener('beforeunload', () => {
    if (window.currentEditingProjectId) {
        // Use navigator.sendBeacon for reliable cleanup on page unload
        const userId = getCurrentUserId();
        if (userId) {
            const data = JSON.stringify({ user_id: userId });
            navigator.sendBeacon(`${API_BASE_URL}/projects/${window.currentEditingProjectId}/editing/end`, data);
        }
    }
});

// ========== Global Function Assignments for View Project Modal ==========
// These functions need to be available globally for onclick handlers in the view project modal

window.toggleTopic = toggleTopic;
window.togglePOI = togglePOI;
window.toggleCard = toggleCard;
window.previewCardMedia = previewCardMedia;

// ========== Admin Notes Functions ==========

// Open admin notes modal
function openAdminNotesModal() {
    const projectId = window.currentAdminNotesProjectId;
    if (!projectId) {
        showNotification('No project selected for admin notes', 'error');
        return;
    }
    
    // Load existing admin notes
    loadAdminNotes(projectId);
    
    // Show modal
    const modal = document.getElementById('adminNotesModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    // Setup character counter
    const textarea = document.getElementById('adminNotesText');
    const charCount = document.getElementById('adminNotesCharCount');
    
    if (textarea && charCount) {
        // Update character count on input
        textarea.addEventListener('input', function() {
            charCount.textContent = this.value.length;
        });
        
        // Initial count
        charCount.textContent = textarea.value.length;
    }
}

// Open admin notes modal for a specific project (from admin view)
function openAdminNotesModalForProject(projectId) {
    // Set the project ID for the modal
    window.currentAdminNotesProjectId = projectId;
    
    // Open the modal
    openAdminNotesModal();
}

// Close admin notes modal
function closeAdminNotesModal() {
    const modal = document.getElementById('adminNotesModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // Clear form
    const form = document.getElementById('adminNotesForm');
    if (form) {
        form.reset();
    }
    
    // Reset character count
    const charCount = document.getElementById('adminNotesCharCount');
    if (charCount) {
        charCount.textContent = '0';
    }
}

// Load existing admin notes for a project
async function loadAdminNotes(projectId) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/projects/${projectId}/notes`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.admin_notes) {
            const textarea = document.getElementById('adminNotesText');
            const charCount = document.getElementById('adminNotesCharCount');
            
            if (textarea) {
                textarea.value = result.data.admin_notes;
                
                if (charCount) {
                    charCount.textContent = result.data.admin_notes.length;
                }
            }
        }
    } catch (error) {
        console.error('Error loading admin notes:', error);
        showNotification('Error loading existing admin notes', 'error');
    }
}

// Save admin notes
async function saveAdminNotes(event) {
    event.preventDefault();
    
    const projectId = window.currentAdminNotesProjectId;
    if (!projectId) {
        showNotification('No project selected for admin notes', 'error');
        return;
    }
    
    const textarea = document.getElementById('adminNotesText');
    if (!textarea) {
        showNotification('Could not find admin notes text field', 'error');
        return;
    }
    
    const adminNotes = textarea.value.trim();
    
    // Get current user info
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    console.log('📝 ADMIN NOTES DEBUG: currentUser from localStorage:', currentUser);
    
    if (!currentUser || !currentUser.id) {
        showNotification('User authentication required', 'error');
        console.error('📝 ADMIN NOTES ERROR: No valid user found:', currentUser);
        return;
    }
    
    console.log('📝 ADMIN NOTES DEBUG: Using user ID:', currentUser.id);
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/projects/${projectId}/notes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                admin_notes: adminNotes,
                user_id: currentUser.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Admin notes saved successfully', 'success');
            closeAdminNotesModal();
            
            // Refresh the view project modal to show updated notes if it's currently open
            if (window.currentViewingProjectId === projectId) {
                await viewProject(projectId);
            }
            
            // Refresh the admin projects view if we're in admin mode
            const adminSection = document.getElementById('admin-projects-section');
            if (adminSection && adminSection.style.display !== 'none') {
                await loadAdminProjects();
            }
        } else {
            showNotification(result.error || 'Failed to save admin notes', 'error');
        }
    } catch (error) {
        console.error('Error saving admin notes:', error);
        showNotification('Error occurred while saving admin notes', 'error');
    }
}

// Make admin notes functions globally available
window.openAdminNotesModal = openAdminNotesModal;
window.openAdminNotesModalForProject = openAdminNotesModalForProject;
window.closeAdminNotesModal = closeAdminNotesModal;
window.saveAdminNotes = saveAdminNotes;