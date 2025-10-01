# Design Document

## Overview

This design addresses the code organization issues identified in the current Node.js/Fastify backend project. The main problems are:

1. **Duplicate Business Logic**: Same operations implemented in both API handlers and service classes
2. **Inconsistent Patterns**: Different modules follow different architectural patterns
3. **Mixed Responsibilities**: API handlers contain business logic instead of just HTTP concerns
4. **Schema Inconsistencies**: Mix of `organization` vs `organisation` naming
5. **Missing API Endpoints**: Service methods exist but no corresponding API endpoints

The solution implements a clean layered architecture with proper separation of concerns.

## Architecture

### Layered Architecture Pattern

```
┌─────────────────────────────────────┐
│           API Layer                 │
│  (HTTP concerns, validation, auth)  │
├─────────────────────────────────────┤
│         Service Layer               │
│    (Business logic, validation)     │
├─────────────────────────────────────┤
│        Data Access Layer            │
│         (Prisma ORM)                │
└─────────────────────────────────────┘
```

### Current Issues Analysis

**API Layer Issues:**
- `src/api/admin/index.js`: Contains complex business logic that should be in services
- `src/api/user/index.js`: Mixes profile management with user CRUD operations
- `src/api/organization/index.js`: Missing basic CRUD endpoints, only has settings/roles

**Service Layer Issues:**
- `src/services/admin.js`: Has comprehensive functionality not exposed via API
- `src/services/user.js`: Well-structured but not consistently used by API layer
- `src/services/organization.js`: Complete CRUD operations but API layer reimplements some

**Schema Inconsistencies:**
- Database uses `organization` (American spelling)
- Some code uses `organisation` (British spelling)
- API responses mix both spellings

## Components and Interfaces

### 1. Standardized Service Interface

All service classes will follow this pattern:

```javascript
export class ServiceName {
  static async create(data, language = 'en') { /* ... */ }
  static async findAll(options = {}, language = 'en') { /* ... */ }
  static async findById(id, organizationId, language = 'en') { /* ... */ }
  static async update(id, data, organizationId, language = 'en') { /* ... */ }
  static async delete(id, organizationId, language = 'en') { /* ... */ }
}
```

### 2. Standardized API Route Structure

All API modules will follow this pattern:

```javascript
export default async function entityRoutes(fastify) {
  // Common middleware
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', enforceOrganizationScope)
  
  // Standard CRUD endpoints
  fastify.post('/', createHandler)           // Create
  fastify.get('/', listHandler)              // List with pagination
  fastify.get('/:id', getByIdHandler)        // Get by ID
  fastify.put('/:id', updateHandler)         // Update
  fastify.delete('/:id', deleteHandler)      // Delete
  
  // Resource-specific endpoints
  // ...
}
```

### 3. Refactored Module Structure

#### User Module
- **Service**: `src/services/user.js` (keep existing, well-structured)
- **API**: `src/api/user/index.js` (refactor to use service layer)
  - Split into two concerns:
    - User profile management (`/profile`, `/permissions`, `/organization`)
    - User CRUD operations (`/`, `/:id` - admin only)

#### Admin Module
- **Service**: `src/services/admin.js` (keep existing)
- **API**: `src/api/admin/index.js` (refactor to use service layer)
  - Remove business logic, delegate to AdminService
  - Keep only HTTP concerns (validation, response formatting)

#### Organization Module
- **Service**: `src/services/organization.js` (keep existing)
- **API**: `src/api/organization/index.js` (add missing CRUD endpoints)
  - Add missing endpoints that use OrganizationService methods
  - Keep existing settings/roles/stats endpoints

### 4. Schema Consistency

Standardize on American spelling (`organization`) throughout:
- Update all API responses to use `organization`
- Update variable names to use `organizationId`
- Keep database schema as-is (already uses `organization`)

## Data Models

### Consistent Response Format

All API responses will follow this format:

```javascript
// Success Response
{
  success: true,
  message: "localized.success.message",
  data: {
    // Resource data
  },
  pagination?: {
    // Pagination info for list endpoints
  }
}

// Error Response
{
  success: false,
  error: "error.code",
  message: "localized.error.message",
  statusCode: 400
}
```

### Service Method Signatures

Standardized parameters across all services:

```javascript
// Create
static async create(data, language = 'en')

// Read (list)
static async findAll(options = {}, language = 'en')
// options: { page, limit, search, filters, sortBy, sortOrder, organizationId }

// Read (single)
static async findById(id, organizationId = null, language = 'en')

// Update
static async update(id, data, organizationId = null, language = 'en')

// Delete
static async delete(id, organizationId = null, language = 'en')
```

## Error Handling

### Consistent Error Patterns

All services use the same error handling pattern:

```javascript
try {
  // Business logic
  return createLocalizedSuccess(messageKey, language, data)
} catch (error) {
  if (error.statusCode) {
    throw error // Re-throw localized errors
  }
  console.error('Operation error:', error)
  throw createLocalizedError('error.internal_server_error', language, 500)
}
```

All API handlers use the same error handling:

```javascript
try {
  const result = await ServiceClass.method(params, request.language)
  reply.send(result)
} catch (error) {
  if (error.statusCode) {
    throw error // Fastify will handle localized errors
  }
  console.error('API error:', error)
  throw createLocalizedError('error.internal_server_error', request.language, 500)
}
```

## Testing Strategy

### Service Layer Testing
- Unit tests for all service methods
- Mock Prisma client for database operations
- Test business logic validation
- Test error handling scenarios

### API Layer Testing
- Integration tests for all endpoints
- Test HTTP status codes and response formats
- Test authentication and authorization
- Test request validation

### Refactoring Testing Strategy
- Create tests for existing functionality before refactoring
- Ensure all tests pass after refactoring
- Add new tests for any new functionality

## Implementation Plan

### Phase 1: Schema Consistency
1. Update all API responses to use `organization` spelling
2. Update variable names throughout codebase
3. Fix TypeScript/schema validation issues

### Phase 2: Admin Module Refactoring
1. Refactor `src/api/admin/index.js` to use `AdminService`
2. Remove duplicate business logic from API handlers
3. Ensure all AdminService methods are properly exposed

### Phase 3: User Module Refactoring
1. Split user API into profile and CRUD concerns
2. Refactor API handlers to use `UserService`
3. Remove duplicate business logic

### Phase 4: Organization Module Completion
1. Add missing CRUD endpoints to organization API
2. Ensure all OrganizationService methods are exposed
3. Maintain existing settings/roles functionality

### Phase 5: Validation and Testing
1. Add comprehensive tests for refactored modules
2. Validate consistent response formats
3. Test error handling scenarios

## Migration Considerations

### Backward Compatibility
- Maintain existing API endpoint URLs
- Keep existing response formats where possible
- Gradual migration of spelling inconsistencies

### Database Changes
- No database schema changes required
- Only code-level consistency improvements

### Deployment Strategy
- Can be deployed incrementally by module
- No breaking changes to existing functionality
- Improved error handling and consistency