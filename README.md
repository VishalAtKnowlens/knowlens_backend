# JWT Authentication Backend

A production-ready Node.js backend API with JWT authentication, refresh tokens, multi-tenancy, internationalization, and comprehensive security features.

## 🚀 Features

- **🔐 Dual-Token JWT Authentication**: 15-minute access tokens + 7-day refresh tokens
- **🔄 Automatic Token Rotation**: New refresh token on each refresh
- **🏢 Multi-Tenancy**: Organization-based data isolation
- **👥 Role-Based Access Control (RBAC)**: Flexible permission system
- **🌍 Internationalization (i18n)**: English, Spanish, French support
- **🛡️ Security**: CORS, Helmet, Rate limiting, Input validation
- **🍪 Secure Cookies**: httpOnly cookies for refresh tokens
- **📱 Multi-Device Support**: Multiple sessions per user
- **🗄️ PostgreSQL + Prisma**: Type-safe database operations
- **⚡ Fastify Framework**: High-performance HTTP server
- **📚 Auto-Generated API Docs**: Swagger/OpenAPI documentation

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+ (ES Modules)
- **Framework**: Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh token rotation
- **Security**: Helmet, CORS, Rate limiting
- **Internationalization**: i18next
- **Validation**: Zod
- **Password Hashing**: bcrypt

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL 12+ database
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install
```

### 2. Environment Setup

Copy the `.env` file and update the values:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/jwt_auth_db"

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_ACCESS_SECRET="your-super-secret-access-key-change-in-production-make-it-very-long-and-complex"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production-make-it-different-and-complex"

# JWT Expiration
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server Configuration
PORT=5000
NODE_ENV="development"

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW="1 minute"

# Internationalization
DEFAULT_LANGUAGE="en"

# CORS Origins (comma-separated)
CORS_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:5173"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Create and migrate database
npm run db:migrate

# Seed sample data (optional)
npm run db:seed
```

### 4. Start Development Server

```bash
# Start with hot reload
npm run dev

# Or start normally
npm start
```

The server will start at `http://localhost:5000`

### 5. View API Documentation

Visit `http://localhost:5000/docs` to see the interactive Swagger documentation.

## 📊 Sample Data

After running `npm run db:seed`, you'll have access to these test accounts:

### Acme Corporation
- **Admin**: admin@acme.com / AdminPass123!
- **Manager**: manager@acme.com / ManagerPass123!
- **User**: user@acme.com / UserPass123!
- **Viewer**: viewer@acme.com / ViewerPass123!

### TechStart Inc
- **Admin**: admin@techstart.com / TechAdmin123!

### Global Solutions SA (Spanish)
- **User/Manager**: usuario@global.com / GlobalUser123!

## 🔗 API Endpoints

### System Endpoints
- `GET /api/health` - Health check
- `GET /api/info` - API information

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/validate` - Validate token
- `POST /api/auth/revoke-all` - Logout from all devices
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/sessions` - Get active sessions

### User Endpoints
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/permissions` - Get user permissions
- `GET /api/user/organization` - Get user's organization
- `DELETE /api/user/account` - Deactivate account

### Admin Endpoints
- `GET /api/admin/users` - List all users (with pagination)
- `GET /api/admin/users/:id` - Get specific user
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Deactivate user
- `POST /api/admin/users/:id/roles` - Assign role to user
- `DELETE /api/admin/users/:id/roles/:roleId` - Remove role from user

### Organization Endpoints
- `GET /api/organization/settings` - Get organization settings
- `PUT /api/organization/settings` - Update organization settings
- `GET /api/organization/roles` - List all roles
- `POST /api/organization/roles` - Create new role
- `GET /api/organization/roles/:id` - Get specific role
- `PUT /api/organization/roles/:id` - Update role
- `DELETE /api/organization/roles/:id` - Delete role
- `GET /api/organization/stats` - Get organization statistics

## 🔐 Authentication Flow

### 1. Login Process
```bash
# Login request
curl -X POST http://localhost:5000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "admin@acme.com",
    "password": "AdminPass123!"
  }'

# Response includes access token, refresh token set as httpOnly cookie
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Making Authenticated Requests
```bash
# Include access token in Authorization header
curl -X GET http://localhost:5000/api/user/profile \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Token Refresh
```bash
# Refresh token (uses httpOnly cookie automatically)
curl -X POST http://localhost:5000/api/auth/refresh \\
  -H "Cookie: refreshToken=..."
```

### 4. Logout
```bash
# Logout (clears refresh token cookie)
curl -X POST http://localhost:5000/api/auth/logout
```

## 🌍 Internationalization

The API supports multiple languages through HTTP headers:

```bash
# Request in Spanish
curl -X GET http://localhost:5000/api/user/profile \\
  -H "Accept-Language: es" \\
  -H "Authorization: Bearer ..."

# Request in French
curl -X GET http://localhost:5000/api/user/profile \\
  -H "Accept-Language: fr" \\
  -H "Authorization: Bearer ..."

# Override with query parameter
curl -X GET "http://localhost:5000/api/user/profile?lang=es" \\
  -H "Authorization: Bearer ..."
```

## 🏢 Multi-Tenancy

Each user belongs to an organization, and all data is automatically scoped:

- Users can only see data from their organization
- Admins can only manage users within their organization
- Roles and permissions are organization-specific
- Cross-organization data access is prevented

## 👥 Role-Based Access Control

### Default Roles

1. **Admin** (`*` permission)
   - Full access to all features
   - Can manage users, roles, and organization settings

2. **Manager** (user management permissions)
   - Can view and manage users
   - Can read organization information
   - Cannot modify organization settings or roles

3. **User** (basic permissions)
   - Can manage own profile
   - Can view organization information
   - Read-only access to most features

4. **Viewer** (read-only permissions)
   - Can view own profile
   - Can view organization information
   - No modification permissions

### Custom Permissions

You can create custom roles with specific permissions:

```json
{
  "name": "custom-role",
  "description": "Custom role with specific permissions",
  "permissions": [
    "profile:read",
    "profile:update",
    "organization:read",
    "user_management:read"
  ]
}
```

## 🛡️ Security Features

### CORS Configuration
- Configurable allowed origins
- Credentials support for cookies
- Proper preflight handling

### Security Headers (Helmet)
- XSS protection
- Content Security Policy
- HSTS in production
- Frame options

### Rate Limiting
- Configurable limits per user/IP
- Different limits for different endpoints
- Automatic cleanup

### Input Validation
- Zod schema validation
- Sanitization of inputs
- Error message localization

### Password Security
- bcrypt hashing with configurable rounds
- Password strength validation
- Secure password change flow

## 📝 Database Schema

### Core Tables

- **organisations**: Organization/tenant data
- **users**: User accounts with organization association
- **roles**: Permission roles per organization
- **user_roles**: Many-to-many user-role assignments
- **refresh_tokens**: Secure refresh token storage

### Key Relationships

- Users belong to one organization
- Roles are scoped to organizations
- Users can have multiple roles
- Refresh tokens are tied to users and devices

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_ACCESS_SECRET` | Access token secret | Required |
| `JWT_REFRESH_SECRET` | Refresh token secret | Required |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |
| `RATE_LIMIT_MAX` | Rate limit max requests | `100` |
| `RATE_LIMIT_WINDOW` | Rate limit time window | `1 minute` |
| `DEFAULT_LANGUAGE` | Default language | `en` |
| `CORS_ORIGINS` | Allowed CORS origins | See .env |

## 📖 Development Scripts

```bash
# Development
npm run dev              # Start with hot reload
npm start               # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to database
npm run db:migrate      # Create and run migrations
npm run db:studio       # Open Prisma Studio
npm run db:seed         # Seed sample data
npm run db:reset        # Reset database

# Other
npm test               # Run tests (not implemented)
```

## 🚀 Production Deployment

### 1. Environment Setup
- Set `NODE_ENV=production`
- Use strong, unique JWT secrets
- Configure production database
- Set appropriate CORS origins
- Enable HTTPS

### 2. Database Setup
```bash
# Run migrations
npm run db:migrate

# Generate client
npm run db:generate
```

### 3. Security Checklist
- [ ] Strong JWT secrets
- [ ] HTTPS enabled
- [ ] Database credentials secured
- [ ] CORS origins restricted
- [ ] Rate limiting configured
- [ ] Monitoring enabled
- [ ] Backup procedures in place

### 4. Performance Optimization
- Use connection pooling
- Enable database indexes
- Configure caching
- Set up load balancing
- Monitor performance metrics

## 🔍 Testing

### Manual Testing with curl

```bash
# Health check
curl http://localhost:5000/api/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User",
    "organisationId": "uuid-here"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "admin@acme.com",
    "password": "AdminPass123!"
  }' \\
  -c cookies.txt

# Get profile (with token)
curl -X GET http://localhost:5000/api/user/profile \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Refresh token (with cookies)
curl -X POST http://localhost:5000/api/auth/refresh \\
  -b cookies.txt \\
  -c cookies.txt
```

### Frontend Integration

For frontend applications, ensure you:

1. **Use `credentials: 'include'`** for all API calls
2. **Store access token** in memory or localStorage
3. **Implement automatic token refresh** on 401 errors
4. **Handle CORS preflight** requests properly
5. **Include proper headers** for language detection

Example JavaScript fetch:

```javascript
// Login
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': 'en'
  },
  credentials: 'include', // Important for cookies
  body: JSON.stringify({
    email: 'admin@acme.com',
    password: 'AdminPass123!'
  })
})

// Authenticated request
const profileResponse = await fetch('http://localhost:5000/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Accept-Language': 'en'
  },
  credentials: 'include'
})

// Refresh token
const refreshResponse = await fetch('http://localhost:5000/api/auth/refresh', {
  method: 'POST',
  credentials: 'include' // Uses httpOnly cookie automatically
})
```

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `CORS_ORIGINS` in `.env`
   - Ensure `credentials: 'include'` in frontend
   - Verify origin matches exactly

2. **Token Issues**
   - Check JWT secrets are set
   - Verify token format in Authorization header
   - Ensure cookies are enabled

3. **Database Connection**
   - Verify `DATABASE_URL` format
   - Check database is running
   - Run `npm run db:generate`

4. **Permission Denied**
   - Check user roles and permissions
   - Verify organization scope
   - Ensure user is active

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation at `/docs`
- Review the troubleshooting section

---

Built with ❤️ using Node.js, Fastify, and Prisma
