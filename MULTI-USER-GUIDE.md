# Multi-User Project System - Usage Guide

## Overview
Your project system now supports multiple users per project with role-based access control. Users can collaborate on projects and have intelligent project deletion behavior.

## API Endpoints

### 1. Add User to Project
```
POST /api/projects/:projectId/users
Content-Type: application/json

{
  "userId": 2,
  "role": "editor"  // "owner" or "editor"
}
```

### 2. Get Project Users
```
GET /api/projects/:projectId/users
```
Returns array of users with their roles and details.

### 3. Remove User from Project
```
DELETE /api/projects/:projectId/users/:userId
```

## User Roles

### Owner
- Can add/remove users
- Can delete project
- Full edit permissions
- Automatically assigned to project creator

### Editor
- Can edit project content
- Can view project
- Cannot manage users
- Cannot delete project (only remove themselves)

## Project Deletion Logic

### Multiple Users
When a user attempts to delete a project with multiple users:
- The user is removed from the project
- Project remains intact for other users
- If an owner leaves, ownership transfers to next available user

### Single User
When the last user deletes a project:
- The entire project is deleted
- All associated data is removed

## Usage Examples

### Adding a Collaborator
```javascript
// Add user ID 2 as an editor to project ID 1
fetch('/api/projects/1/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 2, role: 'editor' })
});
```

### Viewing Project Collaborators
```javascript
// Get all users for project ID 1
fetch('/api/projects/1/users')
  .then(response => response.json())
  .then(users => console.log(users));
```

### Removing a User
```javascript
// Remove user ID 2 from project ID 1
fetch('/api/projects/1/users/2', {
  method: 'DELETE'
});
```

## Database Schema

### project_users Table
- `project_id`: Foreign key to project table
- `user_id`: Foreign key to user table
- `role`: 'owner' or 'editor'
- `added_by`: User ID who added this user
- `added_date`: Timestamp when user was added

## Migration Status
✅ All existing projects have been migrated to the new system
✅ Project creators are now owners in the project_users table
✅ Backward compatibility maintained

## Features Implemented
- ✅ Multi-user project access
- ✅ Role-based permissions (owner/editor)
- ✅ Intelligent project deletion
- ✅ Automatic ownership transfer
- ✅ User management API endpoints
- ✅ Database migration for existing projects

## Testing
Run the demonstration script to see the system in action:
```bash
node demo-multi-user.js
```

The system is fully functional and ready for production use!
