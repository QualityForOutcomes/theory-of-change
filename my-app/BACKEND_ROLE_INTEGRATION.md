# Backend Role Integration Guide

## Overview
The frontend now expects user roles to be determined and provided by the backend during authentication. This ensures secure role-based access control.

## Backend Requirements

### 1. Pre-registered Admin Users
- Admin users must be pre-registered in your backend database/Vercel deployment
- Only pre-registered users should receive the `admin` role
- All other users should receive the `user` role

### 2. Authentication Response Format
The backend login endpoints should return user objects with a `userRole` field:

```json
{
  "user": {
    "userId": 22,
    "email": "user@example.com",
    "username": "Username",
    "firstName": "John",
    "lastName": "Doe",
    "organisation": "Company",
    "avatarUrl": null,
    "displayName": "John Doe",
    "userRole": "admin" // or "user" - this is the key field
  },
  "token": "jwt_token_here",
  "statusCode": 200
}
```

### 3. Role Assignment Logic
```javascript
// Example backend logic for role assignment
const determineUserRole = (email) => {
  const adminEmails = [
    'admin@qualityoutcomes.au',
    'divyam@admin.com',
    // Add other pre-registered admin emails
  ];
  
  return adminEmails.includes(email.toLowerCase()) ? 'admin' : 'user';
};
```

### 4. Affected Endpoints
Update these endpoints to include role information:
- `/api/auth/Login`
- `/api/auth/google` (Google login)
- `/api/user/Create` (registration with auto-login)

## Frontend Behavior

### Admin Users
- Role: `admin`
- Redirect: `http://localhost:5174` (development) or configured admin app URL
- Access: Full admin dashboard functionality

### Regular Users  
- Role: `user`
- Redirect: `/dashboard` (within same app)
- Access: Standard user features

## Security Notes
- Role verification happens on the backend during authentication
- Frontend trusts the role provided by the backend
- Admin access is controlled by pre-registration, not email patterns
- Tokens should include role information for API authorization

## Environment Variables
Configure these in your deployment:
- `REACT_APP_ADMIN_URL`: URL of the admin application
- `REACT_APP_USER_DASHBOARD_URL`: Path for user dashboard (default: `/dashboard`)