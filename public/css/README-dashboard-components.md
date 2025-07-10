# Dashboard CSS Components

The dashboard CSS has been modularized into separate component files for better organization and maintainability.

## Component Files

### Core Layout
- **`dashboard-layout.css`** - Main dashboard structure, background, headers, and base responsive layout
- **`dashboard-logout.css`** - Floating logout button in the top-right corner

### User Interface Sections
- **`dashboard-user.css`** - User information card displaying user details and avatar
- **`dashboard-stats.css`** - Statistics cards showing user metrics and counts
- **`dashboard-actions.css`** - Action buttons section for quick access to features
- **`dashboard-recent.css`** - Recent activities section showing user's recent actions
- **`dashboard-navigation.css`** - Navigation grid with various dashboard sections

### Media Management
- **`media-management.css`** - Media section container, stats, and overall management layout
- **`media-items.css`** - Individual media item cards, thumbnails, and metadata
- **`upload-modal.css`** - File upload modal and progress bar styles
- **`media-preview.css`** - Media preview modal layout and responsive behavior
- **`media-metadata.css`** - Metadata dropdown toggle and collapsible information display

### Modals
- **`create-modals.css`** - Styles for create artwork and project modals

## Main Files
- **`dashboard.css`** - Main file that imports all component CSS files
- **`dashboard-main.css`** - Alternative main file (same as dashboard.css)
- **`dashboard-backup.css`** - Backup of the original monolithic CSS file

## Usage

The main `dashboard.css` file uses CSS `@import` statements to load all component files:

```css
@import url('dashboard-layout.css');
@import url('dashboard-logout.css');
@import url('dashboard-user.css');
/* ... other imports ... */
```

## Benefits of Modular Structure

1. **Better Organization** - Each component is in its own file
2. **Easier Maintenance** - Find and edit specific component styles quickly
3. **Reusability** - Individual components can be reused in other projects
4. **Collaboration** - Multiple developers can work on different components
5. **Debugging** - Easier to isolate and fix CSS issues
6. **Loading Options** - Can selectively load only needed components

## Editing Components

To modify styles for a specific component:

1. Open the relevant component CSS file
2. Make your changes
3. The changes will automatically apply since the main file imports the component

## File Structure

```
css/
├── dashboard.css (main file with imports)
├── dashboard-backup.css (original file backup)
├── dashboard-main.css (alternative main file)
├── dashboard-layout.css
├── dashboard-logout.css
├── dashboard-user.css
├── dashboard-stats.css
├── dashboard-actions.css
├── dashboard-recent.css
├── dashboard-navigation.css
├── media-management.css
├── media-items.css
├── upload-modal.css
├── media-preview.css
├── media-metadata.css
└── create-modals.css
```

## Finding Specific Styles

- **Change name button** → `media-preview.css` (`.media-preview-actions .btn`)
- **User profile card** → `dashboard-user.css`
- **Statistics** → `dashboard-stats.css`
- **Media gallery** → `media-items.css`
- **File upload** → `upload-modal.css`
- **Metadata dropdown** → `media-metadata.css`
