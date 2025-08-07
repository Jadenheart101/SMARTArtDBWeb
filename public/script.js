// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';

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

    // Dashboard Form Handlers
    const createArtworkForm = document.getElementById('createArtworkForm');
    if (createArtworkForm) {
        createArtworkForm.addEventListener('submit', handleCreateArtwork);
    }
    
    const createProjectForm = document.getElementById('createProjectForm');
    if (createProjectForm) {
        createProjectForm.addEventListener('submit', handleCreateProject);
    }
    
    const editProjectForm = document.getElementById('editProjectForm');
    if (editProjectForm) {
        editProjectForm.addEventListener('submit', handleEditProject);
    }
    
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

    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectID}`);
        const result = await response.json();
        if (result.success && result.data) {
            const project = result.data;
            
            // Debug logging
            console.log('Project data received:', project);
            console.log('Description:', project.Description);
            console.log('ImageURL:', project.ImageURL);
            
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
                } else {
                    descriptionElement.textContent = 'No description available';
                    descriptionElement.style.fontStyle = 'italic';
                    descriptionElement.style.color = '#9ca3af';
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
            
            // Handle project image
            const imageContainer = document.getElementById('viewProjectImageContainer');
            const noImageContainer = document.getElementById('viewProjectNoImage');
            
            console.log('Image elements found:', { imageContainer, noImageContainer });
            console.log('Project ImageURL:', project.ImageURL);
            
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
                            console.error('Failed to load image:', project.ImageURL);
                            imageContainer.style.display = 'none';
                            noImageContainer.style.display = 'block';
                        };
                    }
                    
                    if (imgName) {
                        imgName.textContent = project.ImageName || 'Project Image';
                    }
                }
            } else {
                if (imageContainer && noImageContainer) {
                    imageContainer.style.display = 'none';
                    noImageContainer.style.display = 'block';
                }
            }
            
            // Load project topics
            await loadProjectTopics(projectID);
            
        } else {
            showNotification('Failed to load project details', 'error');
        }
    } catch (error) {
        console.error('Error loading project:', error);
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
            
            // Show modal
            const modal = document.getElementById('editProjectModal');
            if (modal) modal.style.display = 'block';
            document.body.style.overflow = 'hidden';

            // Populate form fields
            document.getElementById('editProjectName').value = project.ProjectName || '';
            // Populate description if available
            const descInput = document.getElementById('editProjectDescription');
            if (descInput) descInput.value = project.Description || '';
            // Populate image ID if available
            const imgInput = document.getElementById('editSelectedImageId');
            if (imgInput && project.ImageID) imgInput.value = project.ImageID;
            
            // Show/hide image selection based on whether project has an image
            const thumbnail = document.getElementById('editProjectImageThumbnail');
            const addBtn = document.getElementById('editAddImageBtn');
            
            if (project.ImageID && project.ImageURL) {
                // Project has an image - show thumbnail
                const thumbnailImg = document.getElementById('editProjectThumbnailImg');
                if (thumbnailImg && thumbnail) {
                    thumbnailImg.src = project.ImageURL;
                    thumbnail.style.display = 'block';
                }
                if (addBtn) addBtn.style.display = 'none';
            } else {
                // No image - show add button
                if (thumbnail) thumbnail.style.display = 'none';
                if (addBtn) addBtn.style.display = 'block';
            }
            
            // Load project topics for editing
            await loadEditTopics(projectID);
            
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

// Close Edit Project Modal
function closeEditProjectModal() {
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
    const gallery = document.getElementById('editImageGallery');
    const addBtn = document.getElementById('editAddImageBtn');
    
    if (gallery && addBtn) {
        gallery.style.display = 'block';
        addBtn.style.display = 'none';
        
        // Load user's images
        loadEditImageGallery();
    }
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
    const galleryGrid = document.getElementById('editImageGalleryGrid');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!galleryGrid || !currentUser) return;
    
    try {
        galleryGrid.innerHTML = '<div class="gallery-loading"><i class="fas fa-spinner fa-spin"></i> Loading images...</div>';
        
        const response = await fetch(`${API_BASE_URL}/media/files?userId=${currentUser.id}`);
        const result = await response.json();
        
        if (result.success && result.files) {
            const imageFiles = result.files.filter(file => 
                file.mimeType && file.mimeType.startsWith('image/')
            );
            
            if (imageFiles.length === 0) {
                galleryGrid.innerHTML = '<div class="gallery-empty">No images found. Upload some images first!</div>';
                return;
            }
            
            galleryGrid.innerHTML = imageFiles.map(file => `
                <div class="gallery-image-item" onclick="selectEditImage('${file.id}', '${file.url}', '${file.customName || file.originalName || file.name}')">
                    <img src="${file.url}" alt="${file.customName || file.originalName || file.name}" loading="lazy">
                    <div class="gallery-image-name">${file.customName || file.originalName || file.name}</div>
                </div>
            `).join('');
        } else {
            galleryGrid.innerHTML = '<div class="gallery-empty">Failed to load images</div>';
        }
    } catch (error) {
        console.error('Error loading edit images:', error);
        galleryGrid.innerHTML = '<div class="gallery-empty">Error loading images</div>';
    }
}

// Select image for project
function selectEditImage(imageId, imageUrl, imageName) {
    // Set the hidden input value
    const hiddenInput = document.getElementById('editSelectedImageId');
    if (hiddenInput) {
        hiddenInput.value = imageId;
    }
    
    // Show thumbnail
    const thumbnail = document.getElementById('editProjectImageThumbnail');
    const thumbnailImg = document.getElementById('editProjectThumbnailImg');
    
    if (thumbnail && thumbnailImg) {
        thumbnailImg.src = imageUrl;
        thumbnailImg.alt = imageName;
        thumbnail.style.display = 'block';
    }
    
    // Hide gallery and show add button
    hideEditImageGallery();
    
    showNotification(`Image "${imageName}" selected for project`, 'success');
}

// Change edit project image
function changeEditProjectImage() {
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
    
    // Set up any other dashboard-specific event listeners here
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
    } else {
        // Hide admin section for regular users
        const adminSection = document.getElementById('admin-projects-section');
        if (adminSection) {
            adminSection.style.display = 'none';
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
        DateModified: new Date().toISOString().split('T')[0]
    };
    
    // Add image ID if selected
    const selectedImageId = formData.get('selectedImageId');
    if (selectedImageId) {
        projectData.ImageID = selectedImageId;
    }
    
    try {
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
    
    if (!currentUser) {
        showNotification('Please log in to upload files', 'error');
        return;
    }
    
    // Add user ID to form data
    formData.append('userId', currentUser.id);
    // Add custom media name if provided
    const customNameInput = document.getElementById('mediaCustomName');
    if (customNameInput && customNameInput.value.trim()) {
        formData.append('customName', customNameInput.value.trim());
    }
    
    try {
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
        
        if (result.success) {
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = 'Upload complete!';
            
            showNotification('File uploaded successfully!', 'success');
            closeUploadModal();
            refreshMediaGallery();
        } else {
            showNotification(result.message || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Failed to upload file', 'error');
    } finally {
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) uploadBtn.disabled = false;
    }
}

// Refresh media gallery
async function refreshMediaGallery() {
    const gallery = document.getElementById('media-gallery');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!gallery || !currentUser) return;
    
    try {
        gallery.innerHTML = '<div class="media-loading"><i class="fas fa-spinner fa-spin"></i> Loading media files...</div>';
        
        const response = await fetch(`${API_BASE_URL}/media/files?userId=${currentUser.id}`);
        const result = await response.json();
        
        if (result.success) {
            displayMediaFiles(result.files);
            updateMediaStats(result.files);
            
            // Ensure media preview modal remains closed after loading media
            const mediaPreviewModal = document.getElementById('mediaPreviewModal');
            if (mediaPreviewModal && mediaPreviewModal.style.display === 'block') {
                console.log('Force closing media preview modal after gallery refresh');
                mediaPreviewModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        } else {
            gallery.innerHTML = '<div class="media-loading">Failed to load media files</div>';
        }
    } catch (error) {
        console.error('Error loading media:', error);
        gallery.innerHTML = '<div class="media-loading">Error loading media files</div>';
    }
}

// Global variable to store media files for safe preview access
let mediaFilesCache = [];

// Safe preview function that avoids string escaping issues
function previewMediaSafe(fileId) {
    console.log('previewMediaSafe called with fileId:', fileId);
    
    // Find the file in the cached media files
    const file = mediaFilesCache.find(f => f.id === fileId);
    if (!file) {
        console.error('File not found in cache:', fileId);
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
    console.log('displayMediaFiles called with:', files);
    
    // Cache the files for safe preview access
    mediaFilesCache = files || [];
    
    const gallery = document.getElementById('media-gallery');
    
    if (!files || files.length === 0) {
        gallery.innerHTML = '<div class="media-loading">No media files found. Upload your first file!</div>';
        return;
    }

    gallery.innerHTML = files.map(file => {
        console.log('Processing file:', file);
        
        const isImage = file.mimeType && file.mimeType.startsWith('image/');
        const isVideo = file.mimeType && file.mimeType.startsWith('video/');
        const isAudio = file.mimeType && file.mimeType.startsWith('audio/');

        let thumbnail = '';
        let typeIcon = 'fas fa-file';
        let typeBadge = 'FILE';

        if (isImage) {
            thumbnail = `<img src="${file.url}" alt="${file.customName || file.originalName}" loading="lazy">`;
            typeIcon = 'fas fa-image';
            typeBadge = 'IMAGE';
        } else if (isVideo) {
            thumbnail = `<video src="${file.url}" muted></video>`;
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
                    <button class="media-action-btn delete-btn" onclick="event.stopPropagation(); quickDeleteSafe('${file.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Safe rename function that avoids string escaping issues
function quickRenameSafe(fileId) {
    const file = mediaFilesCache.find(f => f.id === fileId);
    if (!file) {
        console.error('File not found for rename:', fileId);
        showNotification('File not found', 'error');
        return;
    }
    
    const currentDisplayName = file.displayName || file.originalName || file.name;
    quickRename(fileId, currentDisplayName);
}

// Safe delete function that avoids string escaping issues
function quickDeleteSafe(fileId) {
    const file = mediaFilesCache.find(f => f.id === fileId);
    if (!file) {
        console.error('File not found for delete:', fileId);
        showNotification('File not found', 'error');
        return;
    }
    
    const displayName = file.displayName || file.originalName || file.name;
    quickDelete(fileId, displayName);
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
function showAddArtInfoModal() {
    console.log('🎨 Opening Add Art Info Modal...');
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    console.log('Current user check:', !!currentUser);
    
    if (!currentUser) {
        console.error('❌ No user logged in');
        showNotification('Please log in first', 'error');
        return;
    }

    // Get the current selected image from edit project
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
    
    currentArtInfoImage = {
        id: selectedImageId,
        // Get image info from the thumbnail
        src: thumbnailImg ? thumbnailImg.src : '',
        name: thumbnailImg ? (thumbnailImg.alt || 'Project Image') : 'Project Image'
    };
    
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
    const modal = document.getElementById('addArtInfoModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // Clear form
    document.getElementById('addArtInfoForm').reset();
    currentArtInfoImage = null;
    
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
    if (!currentArtInfoImage) return;

    try {
        const statusElement = document.getElementById('artInfoExistingStatus');
        if (statusElement) {
            statusElement.textContent = 'Checking for existing art information...';
            statusElement.style.color = '#6b7280';
        }

        console.log('🔍 Checking for existing art info for media ID:', currentArtInfoImage.id);

        // Use the new endpoint to check for existing art information
        const response = await fetch(`${API_BASE_URL}/art/media/${currentArtInfoImage.id}`);
        
        if (response.status === 404) {
            // No existing art info found
            console.log('ℹ️ No existing art info found');
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
        
        if (result.success && result.data) {
            console.log('✅ Found existing art info:', result.data);
            
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
    console.log('🎨 Starting art info submission...');
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    console.log('Current user:', currentUser);
    console.log('Current art info image:', currentArtInfoImage);
    
    if (!currentUser || !currentArtInfoImage) {
        const message = `Missing required information - User: ${!!currentUser}, Image: ${!!currentArtInfoImage}`;
        console.error('❌', message);
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
            artcol: currentArtInfoImage.id // Link to the media file
        };

        console.log('📝 Form data prepared:', artData);

        // Validate required fields
        if (!artData.ArtistName || !artData.ArtName) {
            const message = 'Artist name and art title are required';
            console.error('❌ Validation failed:', message);
            showNotification(message, 'error');
            return;
        }

        console.log('📤 Checking if art info already exists...');
        
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
            
            // Optionally refresh any displays that show art information
            // You could add additional logic here to update the UI
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
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/topics`);
        const result = await response.json();
        
        if (result.success) {
            currentProjectTopics = result.data || [];
            displayProjectTopics();
        } else {
            console.error('Failed to load project topics:', result.message);
        }
    } catch (error) {
        console.error('Error loading project topics:', error);
    }
}

// Display project topics in view mode
function displayProjectTopics() {
    const container = document.getElementById('projectTopicsContainer');
    if (!container) return;

    if (currentProjectTopics.length === 0) {
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
}

// Display POIs for a topic
function displayPOIs(pois) {
    if (!pois || pois.length === 0) {
        return '<div class="no-pois-message"><em>No POIs created yet</em></div>';
    }

    return pois.map(poi => `
        <div class="poi-item" data-poi-id="${poi.POIID}">
            <div class="poi-header">
                <h5>POI #${poi.POIID}</h5>
                ${poi.pImage ? `
                    <div class="poi-image-display">
                        <img src="${poi.pImage}" alt="POI Image" style="max-width: 150px; max-height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb;">
                    </div>
                ` : `
                    <small class="poi-no-image" style="color: #9ca3af; font-style: italic;">No image</small>
                `}
                ${poi.pLocation ? `
                    <div class="poi-location-description" style="margin-top: 8px; padding: 8px; background: #f8fafc; border-radius: 4px; border-left: 3px solid #3b82f6;">
                        <strong style="color: #1e40af; font-size: 0.9em;">Location:</strong>
                        <p style="margin: 4px 0 0 0; color: #374151; font-size: 0.9em;">${escapeHtml(poi.pLocation)}</p>
                    </div>
                ` : ''}
            </div>
            <div class="poi-cards">
                ${displayCards(poi.cards || [])}
            </div>
        </div>
    `).join('');
}

// Display cards for a POI
function displayCards(cards) {
    if (!cards || cards.length === 0) {
        return '<div class="no-cards-message"><em>No cards created yet</em></div>';
    }

    return cards.map(card => `
        <div class="card-item" data-card-id="${card.CardID}">
            <div class="card-header">
                <h6>${escapeHtml(card.Title)}</h6>
                <span class="card-type-badge">Type ${card.Type}</span>
            </div>
            <div class="card-body">
                ${card.Body ? escapeHtml(card.Body).replace(/\n/g, '<br>') : '<em>No content</em>'}
            </div>
            ${card.media && card.media.length > 0 ? `
                <div class="card-media">
                    ${card.media.map(media => `
                        <div class="card-media-item">
                            <img src="${media.file_url || media.download_url}" alt="${media.displayName || media.original_name}" 
                                 onclick="previewCardMedia('${media.file_url || media.download_url}', '${media.displayName || media.original_name}')">>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${card.Notes ? `<div class="card-notes"><strong>Notes:</strong> ${escapeHtml(card.Notes)}</div>` : ''}
            ${card.References ? `<div class="card-references"><strong>References:</strong> ${escapeHtml(card.References)}</div>` : ''}
        </div>
    `).join('');
}

// Toggle topic expansion
async function toggleTopic(topicId) {
    const topic = currentProjectTopics.find(t => t.TopicID === topicId);
    if (!topic) return;

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

// Load topics for editing
async function loadEditTopics(projectId) {
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/topics`);
        const result = await response.json();
        
        if (result.success) {
            currentProjectTopics = result.data || [];
            displayEditTopics();
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
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !window.currentEditingProjectId) {
        showNotification('Missing required information', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/projects/${window.currentEditingProjectId}/topics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Label: 'New Topic'
            })
        });

        const result = await response.json();
        if (result.success) {
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
    if (!newTitle.trim()) return;

    try {
        const response = await fetch(`${API_BASE_URL}/topics/${topicId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Label: newTitle.trim()
            })
        });

        const result = await response.json();
        if (result.success) {
            // Update local state
            const topic = currentProjectTopics.find(t => t.TopicID === topicId);
            if (topic) {
                topic.Label = newTitle.trim();
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
    try {
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
        if (result.success) {
            // Find topic and add POI
            const topic = currentProjectTopics.find(t => t.TopicID === topicId);
            if (topic) {
                if (!topic.pois) topic.pois = [];
                topic.pois.push(result.data);
                displayEditTopics();
                showNotification('POI added successfully', 'success');
            }
        } else {
            showNotification(result.message || 'Failed to add POI', 'error');
        }
    } catch (error) {
        console.error('Error adding POI:', error);
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
            
            // Upload the file first
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', currentUser.id);
            formData.append('customName', `POI_${poiId}_${file.name}`);
            
            const uploadResponse = await fetch(`${API_BASE_URL}/media/upload`, {
                method: 'POST',
                body: formData
            });
            
            const uploadResult = await uploadResponse.json();
            
            if (uploadResult.success) {
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
                
                const updateResult = await updateResponse.json();
                
                if (updateResult.success) {
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
        const response = await fetch(`${API_BASE_URL}/pois/${poiId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pLocation: locationDescription
            })
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
    // Create a simple modal to select card type
    const typeSelection = await selectCardType();
    if (typeSelection === null) return; // User cancelled
    
    try {
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
        if (result.success) {
            // Find POI and add card
            for (const topic of currentProjectTopics) {
                const poi = topic.pois?.find(p => p.POIID === poiId);
                if (poi) {
                    if (!poi.cards) poi.cards = [];
                    poi.cards.push(result.data);
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
        
        if (result.success && result.data && result.data.length > 0) {
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
                                ${result.data.map(media => `
                                    <div class="media-item-select" onclick="attachMediaToCard(${cardId}, ${media.id})">
                                        <img src="${media.file_url || media.download_url}" alt="${media.displayName || media.original_name}">
                                        <div class="media-name">${media.displayName || media.original_name}</div>
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
    try {
        const response = await fetch(`${API_BASE_URL}/cards/${cardId}/media`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mediaId: mediaId })
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Media attached successfully', 'success');
            closeAttachMediaModal();
            
            // Refresh the project display
            if (window.currentEditingProjectId) {
                await loadEditTopics(window.currentEditingProjectId);
                displayEditTopics();
            }
        } else {
            showNotification(result.message || 'Failed to attach media', 'error');
        }
    } catch (error) {
        console.error('Error attaching media:', error);
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