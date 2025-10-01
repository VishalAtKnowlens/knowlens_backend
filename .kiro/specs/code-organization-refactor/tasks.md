# Implementation Plan

- [x] 1. Fix schema consistency issues





  - Update all API responses to use consistent `organization` spelling
  - Fix Prisma client property access issues in existing code
  - Update variable names to use `organizationId` consistently
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Refactor Admin API to use service layer
  - [x] 2.1 Remove business logic from admin API handlers


    - Extract user management logic to use AdminService methods
    - Remove direct Prisma queries from API handlers
    - Update handlers to call AdminService.getAllUsers() instead of inline queries
    - _Requirements: 1.1, 1.2, 3.1, 3.2_

  - [x] 2.2 Implement consistent error handling in admin API


    - Replace inline error handling with service layer error handling
    - Ensure all admin endpoints use consistent response format
    - Update admin API to properly delegate to AdminService methods
    - _Requirements: 1.3, 6.1, 6.2, 6.3_

  - [x] 2.3 Add missing admin API endpoints


    - Implement POST /api/admin/system-admin endpoint using AdminService.createSystemAdmin()
    - Implement GET /api/admin/dashboard-stats endpoint using AdminService.getDashboardStats()
    - Implement POST /api/admin/bulk-operations endpoint using AdminService.bulkUserOperations()
    - _Requirements: 2.1, 2.2, 5.1, 5.2_

- [ ] 3. Refactor User API to eliminate duplication
  - [x] 3.1 Split user API into profile and management concerns


    - Keep profile endpoints (/profile, /permissions, /organization) as user-specific
    - Move CRUD endpoints (/, /:id) to admin-only section with proper permissions
    - Remove duplicate user creation/update logic from user API
    - _Requirements: 1.1, 1.2, 4.1, 4.2_

  - [x] 3.2 Update user API handlers to use UserService


    - Replace inline Prisma queries with UserService method calls
    - Remove duplicate business logic from user API handlers
    - Ensure consistent error handling across all user endpoints
    - _Requirements: 1.1, 1.2, 3.1, 3.2_

  - [x] 3.3 Fix schema inconsistencies in user API

    - Update all references from `organisation` to `organization`
    - Fix Prisma client property access issues
    - Ensure consistent response format across user endpoints
    - _Requirements: 1.3, 1.4, 6.1, 6.4_

- [ ] 4. Complete Organization API implementation
  - [x] 4.1 Add missing CRUD endpoints to organization API


    - Implement POST /api/organization endpoint using OrganizationService.create()
    - Implement GET /api/organization endpoint using OrganizationService.findAll()
    - Implement GET /api/organization/:id endpoint using OrganizationService.findById()
    - _Requirements: 2.1, 2.2, 5.1, 5.2_

  - [x] 4.2 Add organization management endpoints


    - Implement PUT /api/organization/:id endpoint using OrganizationService.update()
    - Implement DELETE /api/organization/:id endpoint using OrganizationService.delete()
    - Implement POST /api/organization/:id/divisions using OrganizationService.createDivision()
    - _Requirements: 2.1, 2.2, 5.1, 5.2_

  - [x] 4.3 Fix existing organization API inconsistencies


    - Update organization settings endpoints to use OrganizationService methods
    - Fix schema inconsistencies in organization API responses
    - Remove duplicate business logic from organization API handlers
    - _Requirements: 1.3, 1.4, 3.1, 3.2_

- [ ] 5. Standardize service layer patterns
  - [x] 5.1 Ensure consistent service method signatures


    - Verify all services follow the standard create/findAll/findById/update/delete pattern
    - Update method parameters to match standardized signature format
    - Ensure consistent language parameter handling across all services
    - _Requirements: 2.2, 2.3, 4.3, 4.4_

  - [x] 5.2 Implement consistent error handling in services

    - Ensure all service methods use createLocalizedError for error responses
    - Verify all service methods use createLocalizedSuccess for success responses
    - Update error handling to follow the established pattern
    - _Requirements: 3.3, 6.1, 6.2, 6.3_

- [ ] 6. Update validation and middleware consistency
  - [x] 6.1 Standardize request validation across all APIs

    - Ensure all API endpoints use consistent validation schemas
    - Remove unused validation imports and clean up validation logic
    - Update validation error messages to use localized error handling
    - _Requirements: 2.3, 6.1, 6.3, 6.4_

  - [x] 6.2 Ensure consistent authentication and authorization

    - Verify all endpoints use proper authentication middleware
    - Ensure organization scope enforcement is consistent
    - Update permission requirements to follow established patterns
    - _Requirements: 2.3, 4.3, 4.4_

- [ ] 7. Clean up and optimize code structure
  - [x] 7.1 Remove unused imports and variables

    - Clean up unused validation schema imports
    - Remove unused variables and parameters
    - Update import statements to match refactored code structure
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 7.2 Update API documentation and schemas

    - Ensure all API endpoints have proper OpenAPI schema definitions
    - Update response schemas to match consistent format
    - Verify all endpoint descriptions and tags are accurate
    - _Requirements: 5.3, 6.4_

- [ ] 8. Integration testing and validation
  - [x] 8.1 Test refactored admin API endpoints

    - Verify all admin endpoints work correctly with service layer
    - Test error handling and response formats
    - Ensure backward compatibility with existing functionality
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 8.2 Test refactored user API endpoints

    - Verify user profile and CRUD endpoints work correctly
    - Test schema consistency and response formats
    - Ensure proper separation between profile and management concerns
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 8.3 Test organization API completeness







    - Verify all CRUD operations work correctly
    - Test new endpoints against OrganizationService methods
    - Ensure existing settings/roles functionality remains intact
    - _Requirements: 5.1, 5.2, 5.3_