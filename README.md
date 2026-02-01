# NestJS gRPC Auth Service

A production-ready authentication service built with NestJS and gRPC, featuring JWT tokens, Prisma ORM, and comprehensive user management.

## Features

- ✅ **gRPC-based APIs** - High-performance service-to-service communication
- ✅ **JWT Authentication** - Access and refresh token support
- ✅ **User Management** - Register, login, update, and soft-delete operations
- ✅ **Prisma ORM** - Type-safe database access with PostgreSQL
- ✅ **Soft Delete** - Users are deactivated instead of permanently deleted
- ✅ **Token Refresh** - Secure token refresh mechanism
- ✅ **Role-based Access** - USER and ADMIN roles supported

## Tech Stack

- **NestJS** - Progressive Node.js framework
- **gRPC** - High-performance RPC framework
- **Prisma** - Next-generation ORM
- **PostgreSQL** - Relational database
- **JWT** - JSON Web Tokens for authentication
- **TypeScript** - Type-safe development
- **bcrypt** - Password hashing

## Prerequisites

- Node.js (v18 or higher)
- pnpm (or npm/yarn)
- PostgreSQL database
- `grpcurl` (for testing) - Install via: `brew install grpcurl` (macOS) or [download](https://github.com/fullstorydev/grpcurl/releases)

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd auth-service
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/auth_db?sslmode=require"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma Client
   npx prisma generate
   
   # Run migrations
   npx prisma migrate dev
   ```

5. **Start the development server**
   ```bash
   pnpm start:dev
   ```

   The gRPC server will start on `localhost:50051`

## API Endpoints

### gRPC Service: `auth.AuthService`

#### 1. Register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "role": 0  // 0 = USER, 1 = ADMIN
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": { ... },
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

#### 2. Login
Authenticate and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": { ... },
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

#### 3. VerifyToken
Verify an access token and get user information.

**Request:**
```json
{
  "token": "eyJhbGci..."
}
```

**Response:**
```json
{
  "valid": true,
  "user": { ... },
  "message": "Token verified successfully"
}
```

#### 4. RefreshToken
Get new access and refresh tokens.

**Request:**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

#### 5. GetUser
Retrieve user information by ID.

**Request:**
```json
{
  "id": "user-uuid"
}
```

**Response:**
```json
{
  "user": { ... },
  "message": "User fetched successfully"
}
```

#### 6. UpdateUser
Update user information (name, email, role, isActive).

**Request:**
```json
{
  "id": "user-uuid",
  "name": "Updated Name",
  "email": "newemail@example.com",
  "role": 1,  // 0 = USER, 1 = ADMIN
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... },
  "message": "User updated successfully"
}
```

#### 7. DeleteUser
Soft delete a user (sets `isActive` to false).

**Request:**
```json
{
  "id": "user-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

## Testing with grpcurl

### Quick Test

```bash
# Register a user
grpcurl -plaintext -proto proto/auth.proto \
  -d '{"email":"test@example.com","password":"pass123","name":"Test User"}' \
  localhost:50051 auth.AuthService.Register

# Login
grpcurl -plaintext -proto proto/auth.proto \
  -d '{"email":"test@example.com","password":"pass123"}' \
  localhost:50051 auth.AuthService.Login
```

### Using the Test Script

The project includes a comprehensive test script (`test.sh`) that tests all endpoints:

**Prerequisites:**
- Make sure the server is running (`pnpm start:dev`)
- Ensure `grpcurl` is installed

**Run the test suite:**
```bash
# Make the script executable (first time only)
chmod +x test.sh

# Run all tests
./test.sh
```

**What the test script does:**
1. ✅ **Registration Tests** - Creates 3 test users, tests duplicate registration
2. ✅ **Login Tests** - Tests successful login, wrong password, non-existent user
3. ✅ **Token Verification** - Tests valid and invalid tokens
4. ✅ **Token Refresh** - Tests refresh token functionality
5. ✅ **GetUser** - Tests fetching user by ID
6. ✅ **UpdateUser** - Tests updating user information
7. ✅ **DeleteUser** - Tests soft delete functionality
8. ✅ **Reactivation** - Tests reactivating deleted users

**Test Output:**
The script provides detailed output for each test case, showing:
- Request/response data
- Success/failure indicators (✓/✗)
- Error messages when tests fail as expected

**Note:** The test script uses test emails (`user1@test.com`, `user2@test.com`, etc.). If you run it multiple times, registration tests may show "User already exists" - this is expected behavior.

## Project Structure

```
auth-service/
├── proto/
│   └── auth.proto          # gRPC service definitions
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/         # Database migrations
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts  # gRPC controller
│   │   ├── auth.service.ts    # Business logic
│   │   ├── auth.module.ts     # NestJS module
│   │   ├── auth.helpers.ts   # Helper functions
│   │   └── types.ts           # TypeScript types
│   ├── prisma/
│   │   ├── prisma.service.ts  # Prisma client wrapper
│   │   └── prisma.module.ts   # Prisma module
│   └── main.ts                # Application entry point
├── test.sh                   # Comprehensive test script
└── README.md                 # This file
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |

## Database Schema

The service uses a `User` model with the following fields:

- `id` - UUID (primary key)
- `email` - Unique email address
- `name` - User's name
- `password` - Hashed password (bcrypt)
- `role` - Enum: USER or ADMIN
- `isActive` - Boolean (for soft delete)
- `deletedAt` - Timestamp (for soft delete tracking)
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## Soft Delete

The service implements soft delete functionality:
- Users are never permanently deleted
- `isActive` is set to `false` and `deletedAt` is recorded
- Soft-deleted users cannot:
  - Log in
  - Verify tokens
  - Refresh tokens
- Deleted users can be reactivated by registering with the same email

## Security Features

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ JWT token expiration (access: 15min, refresh: 30 days)
- ✅ Soft delete enforcement across all auth operations
- ✅ Email uniqueness validation
- ✅ Input validation and error handling

## Development

```bash
# Start development server with hot reload
pnpm start:dev

# Build for production
pnpm build

# Run production build
pnpm start:prod

# Run linting
pnpm lint

# Format code
pnpm format

# Database commands
npx prisma studio          # Open Prisma Studio (GUI)
npx prisma migrate dev     # Create and apply migration
npx prisma generate        # Regenerate Prisma Client
```

## Version

Current version: **v0.1.1**

---

**Built with ❤️ using NestJS and gRPC**
