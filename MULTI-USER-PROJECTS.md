# Multi-User Project System

## Overview
The SMARTArt Database now supports multi-user projects where users can be added to projects with edit permissions. The system includes intelligent project deletion that respects the number of users associated with a project.

## Database Changes

### New Table: `project_users`
A junction table that manages the many-to-many relationship between projects and users:

```sql
CREATE TABLE project_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'editor') DEFAULT 'editor',
    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INT,
    
    UNIQUE KEY unique_project_user (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES project(ProjectID) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(UserID) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES user(UserID) ON DELETE SET NULL
);
```

## User Roles

### Owner
- Project creator (automatically assigned)
- Can add/remove users from the project
- Can delete the project (if only owner) or remove themselves (with ownership transfer)

### Editor
- Added by project owners
- Can edit project content
- Can remove themselves from the project
- Cannot add/remove other users

## API Endpoints

### Add User to Project
`POST /api/projects/:id/users`

**Request Body:**
```json
{
  "user_id": 2,           // User to add to the project
  "adding_user_id": 1     // User performing the action (must have permission)
}
```

**Response:**
```json
{
  "success": true,
  "message": "User added to project successfully",
  "data": {
    "user": {
      "UserID": 2,
      "UserName": "jane_doe"
    },
    "role": "editor",
    "added_date": "2025-01-25T10:30:00Z"
  }
}
```

### Get Project Users
`GET /api/projects/:id/users?user_id=1`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "UserName": "john_doe",
      "role": "owner",
      "added_date": "2025-01-25T09:00:00Z",
      "added_by_name": "john_doe"
    },
    {
      "id": 2,
      "user_id": 2,
      "UserName": "jane_doe",
      "role": "editor",
      "added_date": "2025-01-25T10:30:00Z",
      "added_by_name": "john_doe"
    }
  ]
}
```

### Remove User from Project
`DELETE /api/projects/:id/users/:userId`

**Request Body:**
```json
{
  "removing_user_id": 1   // User performing the action
}
```

**Behavior:**
- If the user is the last one in the project → **Deletes the entire project**
- If removing an owner and other users exist → **Promotes the oldest editor to owner**
- Otherwise → **Removes the user from the project**

### Search Users
`GET /api/users?search=john`

Supports searching users by username to help with adding users to projects.

## Project Deletion Logic

### Legacy DELETE `/api/projects/:id`
Updated to work with the new multi-user system:

1. **Single User**: Deletes the project entirely
2. **Multiple Users**: Removes the requesting user from the project
   - If the user is the owner, promotes the oldest editor to owner
   - Returns message indicating the user was removed

### New DELETE `/api/projects/:id/users/:userId`
More explicit control over user removal:
- Owners can remove any user
- Users can remove themselves
- Handles ownership transfer automatically
- Deletes project if removing the last user

## Project Listing Updates

The `GET /api/projects` endpoint now:
- Filters projects based on user access via the `project_users` table
- Includes the user's role in each project (`userRole` field)
- Only shows projects the user has access to when `user_id` parameter is provided

## Migration

Existing projects were automatically migrated to the new system:
- All project creators became owners in the `project_users` table
- No data loss occurred
- Old API calls continue to work

## Frontend Integration

### Adding Users to Projects
1. Use `GET /api/users?search=username` to find users
2. Call `POST /api/projects/:id/users` to add them
3. Use `GET /api/projects/:id/users` to display current project members

### Project Management
- Display user role badges (Owner/Editor)
- Show "Remove User" options based on permissions
- Handle project deletion warnings based on user count

### Permission Checks
Projects now include a `userRole` field indicating the current user's role, which can be used to:
- Show/hide admin features (add/remove users)
- Display appropriate UI based on permissions
- Handle deletion confirmations appropriately

## Security

- All operations require proper user authentication
- Users can only access projects they're associated with
- Ownership transfer is automatic and secure
- Foreign key constraints ensure data integrity
- Unique constraints prevent duplicate user assignments

## Testing

The system has been implemented and is ready for testing. You can:

1. Create a project (user becomes owner)
2. Add other users as editors
3. Test the deletion logic with single/multiple users
4. Verify ownership transfer when owners leave projects
