# API Documentation

This folder contains comprehensive documentation for the Learning Management System API.

## 📚 Documentation Files

### 1. Quick Start Guide
**File:** `QUICK-START-GUIDE.md`

Perfect for getting started quickly. Includes:
- Step-by-step API testing workflow
- Example requests and responses
- Common query parameters
- cURL and Postman examples
- Troubleshooting tips

**Start here if you want to test the APIs immediately!**

### 2. API Documentation
**File:** `API-DOCUMENTATION-PHASE1.md`

Complete API reference documentation for Phase 1. Includes:
- All Phase 1 endpoints with detailed descriptions
- Request/response formats
- Query parameters
- Authentication requirements
- Error codes
- Permissions required

**Use this as your Phase 1 API reference guide.**

### 3. Postman Collections
**Files:** `postman-collection-phase1.json`, `postman-collection-phase2.json`, `postman-collection-phase3.json`

Ready-to-import Postman collections. Includes:
- **Phase 1**: 35+ pre-configured API requests (Courses, Clips, Videos, Documents, Categories)
- **Phase 2**: 27+ pre-configured API requests (Quizzes, Assignments, Discussions)
- **Phase 3**: 13+ pre-configured API requests (Enrollments, Progress Tracking)
- Example request bodies
- Environment variables
- Query parameter examples
- Organized by module
- Complete workflow examples

**Import these into Postman for easy testing.**

### 4. Implementation Summaries
**Files:** `PHASE1-IMPLEMENTATION-SUMMARY.md`, `PHASE2-COMPLETE.md`

Technical implementation details. Includes:
- Complete list of implemented features
- File structure
- Database schema coverage
- Security considerations
- Performance considerations
- Known limitations
- Next steps

**Read these to understand the implementation.**

## 🚀 Getting Started

### For API Users/Testers:
1. Start with `QUICK-START-GUIDE.md`
2. Import `postman-collection-phase1.json` into Postman
3. Reference `API-DOCUMENTATION-PHASE1.md` as needed

### For Developers:
1. Read `PHASE1-IMPLEMENTATION-SUMMARY.md`
2. Review `API-DOCUMENTATION-PHASE1.md`
3. Check the source code in `src/services/` and `src/api/`

## 📋 Implementation Coverage

### Phase 1 - Content Management (✅ Complete)
- ✅ **Courses** - Complete course management
- ✅ **Clips** - Course content clips
- ✅ **Videos** - Video content with sources and subtitles
- ✅ **Documents** - Document management with translations
- ✅ **Content Categories** - Course categorization

### Phase 2 - Assessments & Interactions (✅ Complete)
- ✅ **Quizzes** - Quiz management with auto-grading
- ✅ **Assignments** - Assignment management with submissions and grading
- ✅ **Discussions** - Discussion forums with posts, replies, and likes

### Phase 3 - Progress Tracking & Enrollment (✅ Complete)
- ✅ **Course Enrollments** - User course enrollment management
- ✅ **Clip Progress** - Progress tracking through course content

### Total Endpoints: 75+

### Features:
- Full CRUD operations
- Pagination and filtering
- Search functionality
- Statistics endpoints
- Soft delete
- Multi-language support
- Role-based access control
- Auto-grading (quizzes)
- Manual grading (assignments)
- Threaded discussions
- Like system

## 🔐 Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <your_access_token>
```

Get your access token by logging in:
```bash
POST /api/auth/login
{
  "email": "your@email.com",
  "password": "your_password"
}
```

## 📊 API Modules

### 1. Courses (`/api/courses`)
- Create, read, update, delete courses
- Link courses to categories and organizations
- Get course statistics
- Manage course content (clips, assignments, quizzes)

### 2. Clips (`/api/clips`)
- Create, read, update, delete clips
- Manage clip content and sequence
- Track clip progress
- Get clip statistics

### 3. Videos (`/api/videos`)
- Create, read, update, delete videos
- Add multiple video sources (qualities)
- Add multiple subtitle tracks (languages)
- Link quizzes to videos

### 4. Documents (`/api/documents`)
- Create, read, update, delete documents
- Add document translations
- Track document views
- Get document statistics

### 5. Content Categories (`/api/content-categories`)
- Create, read, update, delete categories
- Link/unlink courses to categories
- Multi-language category support

## 🧪 Testing

### Using Postman:
1. Import `postman-collection-phase1.json`
2. Set environment variables:
   - `base_url`: `http://localhost:3000/api`
   - `access_token`: Your JWT token
3. Start testing!

### Using cURL:
See examples in `QUICK-START-GUIDE.md`

### Manual Testing:
Follow the step-by-step guide in `QUICK-START-GUIDE.md`

## 📖 Common Patterns

### Pagination
```
GET /api/courses?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

### Search
```
GET /api/courses?search=javascript
```

### Filtering
```
GET /api/courses?status=ACTIVE&isPublished=true&categoryId=1
```

### Statistics
```
GET /api/courses/:id/stats
```

## 🔧 Response Format

### Success Response:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400
}
```

### Paginated Response:
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

## 🎯 Next Steps

### Phase 2 (Upcoming):
- Quiz management
- Assignment management
- Discussion forums
- Course enrollment
- Progress tracking

### Phase 3 (Future):
- Learning paths
- Competencies
- Batches
- E-commerce (products, orders, campaigns)

### Phase 4 (Future):
- Analytics
- Reporting
- SCORM packages
- Resume management

## 📞 Support

For questions or issues:
1. Check the documentation files
2. Review the implementation summary
3. Check server logs
4. Contact the development team

## 📝 Notes

- All delete operations are soft deletes (status: INACTIVE)
- All endpoints require authentication
- Admin permissions required for create/update/delete operations
- Pagination max limit is 100 items per page
- Multi-language support (en, es, fr)

## 🎉 Happy Testing!

Start with the Quick Start Guide and explore the APIs. The Postman collection makes testing easy and fun!
