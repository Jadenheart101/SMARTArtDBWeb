# CSS Component Structure

This document outlines the modular CSS architecture for the SMARTArt Database web application.

## File Structure

```
public/
├── main.css                    # Main CSS file that imports all components
├── style.css                   # Original monolithic CSS file (kept for backup)
└── css/
    ├── global.css              # Global styles, utilities, and common components
    ├── header.css              # Navigation and header styles
    ├── hero.css                # Hero section and landing page styles
    ├── features.css            # Features section styles
    ├── gallery.css             # Gallery section styles
    ├── api.css                 # API documentation section styles
    ├── contact.css             # Contact section styles
    ├── footer.css              # Footer styles
    ├── dashboard.css           # Dashboard/landing page styles
    └── modal.css               # Modal and authentication form styles
```

## Component Breakdown

### `global.css`
- CSS reset and base styles
- Global typography and layout utilities
- Common button styles (`.btn`, `.btn-primary`, `.btn-secondary`, etc.)
- Common form styles (`.form-group`, inputs, textareas)
- Section titles (`.section-title`)
- Animations and keyframes
- Scroll behavior

### `header.css`
- Navigation bar styles (`.navbar`, `.nav-container`)
- Logo styles (`.nav-logo`)
- Navigation menu styles (`.nav-menu`, `.nav-link`)
- Mobile navigation toggle (`.nav-toggle`)
- Responsive navigation styles

### `hero.css`
- Hero section layout and styling (`.hero`, `.hero-container`)
- Hero title with neon effect (`.hero-title`)
- Art showcase grid (`.art-showcase`, `.art-card`)
- Hero responsive styles

### `features.css`
- Features section layout (`.features`, `.features-grid`)
- Feature cards (`.feature-card`, `.feature-icon`)
- Feature responsive styles

### `gallery.css`
- Gallery section layout (`.gallery`, `.gallery-grid`)
- Gallery items (`.gallery-item`, `.gallery-item-header`)
- Gallery loading states (`.gallery-loading`)
- Gallery animations

### `api.css`
- API documentation section (`.api-section`)
- API statistics (`.api-stats`, `.stat`)
- Endpoint documentation (`.endpoint-list`, `.endpoint-item`)
- Method badges (`.method.get`, `.method.post`)
- API responsive styles

### `contact.css`
- Contact section layout (`.contact`, `.contact-content`)
- Contact information (`.contact-item`)
- Contact form styles (`.contact-form`)
- Contact responsive styles

### `footer.css`
- Footer layout (`.footer`, `.footer-content`)
- Footer sections (`.footer-section`)
- Footer links and styling
- Footer bottom bar (`.footer-bottom`)

### `dashboard.css`
- Dashboard layout and background (`.dashboard`)
- User information card (`.user-card`, `.user-avatar`)
- Statistics cards (`.stat-card`, `.stat-icon`)
- Dashboard actions (`.action-section`, `.action-buttons`)
- Recent activity (`.recent-section`, `.recent-items`)
- Dashboard navigation (`.nav-section`, `.nav-grid`)
- Dashboard responsive styles

### `modal.css`
- Modal overlay and content (`.modal`, `.modal-content`)
- Modal animations (`.modalSlideIn`)
- Close button styles (`.close`)
- Authentication form styles (`.auth-form`)
- Modal responsive styles

## Usage

The main CSS file (`main.css`) imports all component styles using `@import` statements. This allows for:

1. **Modular Development**: Each component can be developed and maintained independently
2. **Better Organization**: Related styles are grouped together
3. **Easier Maintenance**: Changes to specific components don't affect others
4. **Improved Collaboration**: Multiple developers can work on different components simultaneously
5. **Selective Loading**: Components can be loaded conditionally if needed in the future

## Best Practices

1. **Component Isolation**: Each CSS file should only contain styles for its specific component
2. **Consistent Naming**: Use BEM methodology or similar naming conventions
3. **Responsive Design**: Include responsive styles within each component file
4. **Global Utilities**: Common utilities and variables should be in `global.css`
5. **Import Order**: Maintain the import order in `main.css` to ensure proper CSS cascade

## Migration Notes

- The original `style.css` file is kept as a backup
- All component files include their own responsive styles
- Global styles and utilities are centralized in `global.css`
- The application now uses `main.css` as the entry point

This modular structure improves maintainability, scalability, and developer experience while maintaining the exact same visual appearance and functionality.
