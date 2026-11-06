# API Endpoints

Base URL:

```text
/api/v1
```

## Authentication endpoints

### POST `/api/v1/auth/register`
Register a new user.

Request body:

```json
{
  "name": "Abhinav Saxena",
  "email": "abhinav@example.com",
  "password": "StrongPassword@123"
}
```

### POST `/api/v1/auth/login`
Login and return access and refresh tokens.

Request body:

```json
{
  "email": "abhinav@example.com",
  "password": "StrongPassword@123"
}
```

### POST `/api/v1/auth/refresh`
Refresh access token using a valid refresh token.

Request body:

```json
{
  "refreshToken": "your-refresh-token"
}
```

### POST `/api/v1/auth/logout`
Revoke a refresh token.

Request body:

```json
{
  "refreshToken": "your-refresh-token"
}
```

### GET `/api/v1/auth/me`
Get the current authenticated user.

Headers:

```http
Authorization: Bearer <access_token>
```

## User management endpoints

### GET `/api/v1/users`
List users with pagination and filtering.

Requires: `ADMIN`

Example:

```http
GET /api/v1/users?page=1&limit=10&role=EDITOR&search=abhinav
```

### GET `/api/v1/users/:id`
Get a single user by ID.

Requires: `ADMIN`

### POST `/api/v1/users`
Create a user as an admin.

Requires: `ADMIN`

### PATCH `/api/v1/users/:id`
Update a user profile by admin.

Requires: `ADMIN`

### PATCH `/api/v1/users/:id/role`
Update a user's role.

Requires: `ADMIN`

### PATCH `/api/v1/users/:id/status`
Activate or deactivate a user.

Requires: `ADMIN`

### DELETE `/api/v1/users/:id`
Soft-delete or deactivate the user.

Requires: `ADMIN`

### GET `/api/v1/users/me`
Get current user profile.

Requires: authenticated user

### PATCH `/api/v1/users/me`
Update the current user profile.

Requires: authenticated user

## Response format

Successful responses use a standard shape like:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "id": "uuid",
    "name": "Abhinav Saxena",
    "email": "abhinav@example.com",
    "role": "VIEWER"
  }
}
```

## Auth error handling

Typical auth failures return:

```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

## Notes

- Password hashes are never exposed to clients.
- Refresh tokens are stored as hashes in PostgreSQL.
- Tokens use JWT access tokens and refresh token rotation.
