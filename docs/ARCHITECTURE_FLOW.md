# Application Architecture Flow

This document explains the full request flow of the application, from user login to creating a new user and completing the request lifecycle.

## 1. High-level architecture

The project follows a layered NestJS backend architecture:

- Client / Frontend sends HTTP requests
- `AuthController` handles login, registration, refresh, logout, and profile routes
- `UsersController` handles user management and admin-only operations
- `AuthService` handles authentication decisions and token management
- `UsersService` handles user creation, updates, status changes, and retrieval
- `UsersRepository` and `AuthRepository` talk to PostgreSQL through TypeORM
- PostgreSQL stores users, roles, refresh tokens, and related data
- JWT middleware validates requests for protected routes

## 2. Login flow

### Step 1: Client sends login request

Endpoint:

- `POST /api/v1/auth/login`

Request body includes:

- `email`
- `password`

### Step 2: Controller receives request

`AuthController.login()` receives the DTO and forwards it to `AuthService.login()`.

### Step 3: Authentication logic runs

`AuthService.login()` does the following:

1. Normalizes the email to lowercase and trims spaces.
2. Calls `usersService.findByEmailWithPassword(email)`.
3. Checks whether the user exists.
4. Compares the submitted password with the stored `password_hash` using `bcrypt.compare()`.
5. Verifies that the account is active (`is_active = true`).
6. If all checks pass, the system generates:
   - access token
   - refresh token
   - expiry timestamps

### Step 4: Access token generation

`signAccessToken()` creates a JWT payload containing:

- `sub`: user id
- `email`
- `role`

The token is signed with `JWT_SECRET` and configured to expire in 15 minutes.

### Step 5: Refresh token handling

A refresh token is generated and stored in the database as a hash.

The backend stores:

- `user_id`
- `token_hash`
- `expires_at`
- `revoked_at` (nullable)

This allows the app to revoke one token or rotate it during refresh.

### Step 6: Response returned to client

The API sends back:

- `accessToken`
- `refreshToken`
- `expiresIn`
- user summary object

The frontend stores the access token in memory or local storage and sends it in the Authorization header for protected requests.

## 3. Protected request flow with JWT

After login, every protected API call uses the access token.

### Flow

1. Client sends request with:
   - `Authorization: Bearer <accessToken>`
2. NestJS executes `JwtAuthGuard`.
3. `JwtStrategy` validates the token.
4. If valid, it extracts user details such as:
   - `id`
   - `email`
   - `role`
5. That user is attached to `req.user`.
6. `RolesGuard` checks whether the user role is allowed for that route.

### Example

For admin-only user operations:

- `@Roles(UserRole.ADMIN)`
- `@UseGuards(JwtAuthGuard, RolesGuard)`

If the token belongs to a viewer or editor and the route requires admin, access is denied.

## 4. User creation flow

This flow covers creating a user by an admin.

### Endpoint

- `POST /users`

Only admins can call this route.

### Step 1: Request reaches `UsersController`

`UsersController.create()` receives `CreateUserDto` and calls:

- `this.usersService.create(dto)`

### Step 2: Validation and normalization

Before saving, the service validates fields such as:

- name
- email
- password
- role

The email is normalized to lowercase, and the password is hashed using bcrypt.

### Step 3: Role assignment

The user is assigned a role using the role table relationship.

The default role for self-registered users is usually `VIEWER`, while admin-created users may be assigned a different role depending on the DTO.

### Step 4: Data persistence

`UsersService.create()` saves the user record into the `users` table.

Important values saved include:

- `name`
- `email`
- `password_hash`
- `role_id`
- `is_active`
- `created_at`
- `updated_at`

### Step 5: Response

The API returns a success response with the created user payload.

Example response shape:

- `success: true`
- `message: User created successfully`
- `data: {...user details...}`

## 5. Admin user management flow

The application supports several admin-only operations:

- list all users
- get user by id
- update user
- change role
- activate or deactivate user
- soft delete user

These routes are all behind:

- `JwtAuthGuard`
- `RolesGuard`
- `@Roles(UserRole.ADMIN)`

### Example: Role update

- `PATCH /users/:id/role`
- Admin sends a role update payload
- `UsersService.updateRole()` validates the request
- `UsersService` ensures changes are safe
- The database row is updated
- Response returns updated user data

### Example: User deactivate

- `PATCH /users/:id/status`
- Admin sends active/inactive status
- Service mutates the user record
- Role rules and safety checks are enforced before saving

## 6. Refresh token flow

When an access token expires, the client sends a refresh request.

### Endpoint

- `POST /api/v1/auth/refresh`

### Process

1. Client sends `refreshToken`.
2. `AuthService.refresh()` checks the token in the database.
3. It confirms the token is valid and not revoked.
4. It checks expiry time.
5. If valid, it invalidates the old refresh token and creates a new one.
6. It returns a new access token + new refresh token.

### Why this matters

This ensures the app can rotate tokens and reduce the risk of long-lived stolen refresh tokens.

## 7. Logout flow

### Endpoint

- `POST /api/v1/auth/logout`

### Process

1. Client sends the refresh token.
2. `AuthService.logout()` calls the repository to revoke the token.
3. The token is marked as revoked in the database.
4. Future refresh attempts using that token fail.

## 8. Database layer interaction

The backend uses TypeORM with PostgreSQL.

### Repository responsibilities

- `UsersRepository` handles user queries and writes
- `AuthRepository` handles refresh token storage, lookup, and revocation

### Typical flow

- Controller calls Service
- Service calls Repository
- Repository executes SQL through TypeORM
- PostgreSQL responds with data or row count
- NestJS transforms the result into a response DTO or JSON payload

## 9. End-to-end summary

A complete flow looks like this:

1. User sends login request.
2. `AuthController` delegates to `AuthService`.
3. Service validates credentials against the database.
4. JWT access token and refresh token are created.
5. Refresh token hash is stored in PostgreSQL.
6. Client uses the access token for authenticated routes.
7. `JwtAuthGuard` verifies the token.
8. `RolesGuard` checks role-based access.
9. If an admin creates another user, `UsersController` calls `UsersService.create()`.
10. The service hashes the password and saves the user.
11. The role and status are stored in PostgreSQL.
12. The API returns the final result to the client.

## 10. Security principles in this architecture

- Passwords are never stored in plain text.
- Password hashing uses bcrypt.
- Refresh tokens are stored as hashes, not raw strings.
- JWT auth protects private APIs.
- `RolesGuard` enforces admin-only access.
- `is_active` checks prevent inactive users from signing in.
- Soft deletes are used instead of hard deletes for user removal.

## 11. Practical architecture view

The design is a classic NestJS modular backend:

- `auth` module = authentication and token lifecycle
- `users` module = user profile and administrative user management
- `documents` and `ingestion` modules = future business functionalities
- PostgreSQL = central data store
- JWT + Guards = request-level authorization

This separation keeps authentication concerns separate from user management while preserving clean module boundaries.
