// Component Loader - Loads HTML components dynamically
class ComponentLoader {
    constructor() {
        this.cache = new Map();
    }

    async loadComponent(componentName, targetSelector) {
        try {
            // Check cache first
            if (this.cache.has(componentName)) {
                const target = document.querySelector(targetSelector);
                if (target) {
                    target.innerHTML = this.cache.get(componentName);
                }
                return;
            }

            // Load component from file
            const response = await fetch(`/components/${componentName}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${componentName}`);
            }

            const html = await response.text();
            
            // Cache the component
            this.cache.set(componentName, html);

            // Insert into target
            const target = document.querySelector(targetSelector);
            if (target) {
                target.innerHTML = html;
            }
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
        }
    }

    async loadAllComponents() {
        const components = [
            { name: 'dashboard', selector: '#dashboard-placeholder' },
            { name: 'header', selector: '#header-placeholder' },
            { name: 'hero', selector: '#hero-placeholder' },
            { name: 'features', selector: '#features-placeholder' },
            { name: 'gallery', selector: '#gallery-placeholder' },
            { name: 'api', selector: '#api-placeholder' },
            { name: 'contact', selector: '#contact-placeholder' },
            { name: 'footer', selector: '#footer-placeholder' },
            { name: 'auth-modal', selector: '#auth-modal-placeholder' }
        ];

        // Load all components concurrently
        const promises = components.map(component => 
            this.loadComponent(component.name, component.selector)
        );

        await Promise.all(promises);
    }
}

// Initialize component loader
const componentLoader = new ComponentLoader();
