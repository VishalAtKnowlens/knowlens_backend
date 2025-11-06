# Quick Start Guide - Phase 1 APIs

## Prerequisites
- Node.js installed
- PostgreSQL database running
- Prisma schema migrated
- Server running on `http://localhost:3000`

## Step 1: Authentication

### Login to Get Access Token
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "firstName": "Admin"
    }
  }
}
```

**Save the `accessToken` for subsequent requests!**

## Step 2: Create a Content Category

```bash
POST http://localhost:3000/api/content-categories
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "name": "Programming",
  "description": "Programming and software development courses",
  "imageUrl": "https://example.com/programming.jpg",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "category": {
      "id": 1,
      "name": "Programming",
      "description": "Programming and software development courses",
      "imageUrl": "https://example.com/programming.jpg",
      "language": "en"
    }
  }
}
```

## Step 3: Create a Course

```bash
POST http://localhost:3000/api/courses
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "name": "Introduction to JavaScript",
  "subtitle": "Learn JavaScript from scratch",
  "synopsis": "A comprehensive course for beginners",
  "description": "This course covers all the fundamentals of JavaScript programming",
  "targetAudience": "Beginners with no programming experience",
  "thumbnailUrl": "https://example.com/js-course.jpg",
  "durationInMinutes": 300,
  "totalHours": 5,
  "totalPoints": 100,
  "slug": "intro-to-javascript",
  "layout": "MULTI_CLIP",
  "isPublished": true,
  "showInCatalogue": true,
  "status": "ACTIVE",
  "categoryIds": [1]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "course": {
      "id": 1,
      "name": "Introduction to JavaScript",
      "slug": "intro-to-javascript",
      // ... other fields
    }
  }
}
```

## Step 4: Create a Clip

```bash
POST http://localhost:3000/api/clips
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "Introduction to Variables",
  "description": "Learn about JavaScript variables",
  "type": "VIDEO",
  "sequence": 1,
  "points": 10,
  "durationInSeconds": 600,
  "slug": "intro-to-variables",
  "courseId": 1,
  "status": "ACTIVE"
}
```

## Step 5: Create a Video

```bash
POST http://localhost:3000/api/videos
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "JavaScript Basics Tutorial",
  "description": "Complete tutorial on JavaScript basics",
  "thumbnailUrl": "https://example.com/video-thumb.jpg",
  "durationInSeconds": 1200,
  "tags": "javascript, programming, tutorial",
  "points": 20,
  "isPublished": true,
  "status": "ACTIVE",
  "sources": [
    {
      "url": "https://example.com/video-720p.mp4",
      "language": "en",
      "format": "mp4",
      "quality": "720p",
      "sizeInMb": 150
    }
  ],
  "subtitles": [
    {
      "language": "en",
      "label": "English",
      "url": "https://example.com/subtitles-en.vtt"
    }
  ]
}
```

## Step 6: Create a Document

```bash
POST http://localhost:3000/api/documents
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "JavaScript Cheat Sheet",
  "url": "https://example.com/js-cheatsheet.pdf",
  "requiresConsent": false,
  "isPublished": true,
  "status": "ACTIVE"
}
```

## Step 7: List All Courses

```bash
GET http://localhost:3000/api/courses?page=1&limit=20&status=ACTIVE&isPublished=true
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Step 8: Get Course Details

```bash
GET http://localhost:3000/api/courses/1
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Step 9: Update a Course

```bash
PUT http://localhost:3000/api/courses/1
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "name": "Advanced JavaScript",
  "totalPoints": 150
}
```

## Step 10: Get Course Statistics

```bash
GET http://localhost:3000/api/courses/1/stats
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "statistics": {
      "enrollments": {
        "total": 150,
        "active": 120,
        "completed": 80,
        "completionRate": "53.33"
      },
      "content": {
        "clips": 10,
        "quizzes": 5,
        "assignments": 3
      },
      "performance": {
        "avgQuizScore": "78.50"
      }
    }
  }
}
```

## Common Query Parameters

### Pagination
```
?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

### Search
```
?search=javascript
```

### Filtering
```
?status=ACTIVE&isPublished=true&categoryId=1
```

## Common Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate slug, etc.) |
| 500 | Internal Server Error |

## Testing with cURL

### Create Course
```bash
curl -X POST http://localhost:3000/api/courses \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Introduction to JavaScript",
    "slug": "intro-to-javascript",
    "durationInMinutes": 300,
    "totalPoints": 100,
    "status": "ACTIVE"
  }'
```

### Get All Courses
```bash
curl -X GET "http://localhost:3000/api/courses?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update Course
```bash
curl -X PUT http://localhost:3000/api/courses/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Advanced JavaScript",
    "totalPoints": 150
  }'
```

### Delete Course
```bash
curl -X DELETE http://localhost:3000/api/courses/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Using Postman

1. **Import Collection**
   - Open Postman
   - Click "Import"
   - Select `docs/postman-collection-phase1.json`

2. **Set Variables**
   - Click on the collection
   - Go to "Variables" tab
   - Set `base_url` to `http://localhost:3000/api`
   - Set `access_token` to your JWT token

3. **Test Endpoints**
   - Expand the collection folders
   - Click on any request
   - Click "Send"

## Troubleshooting

### 401 Unauthorized
- Check if your access token is valid
- Token might be expired, login again
- Ensure Bearer token is in Authorization header

### 403 Forbidden
- Your user doesn't have required permissions
- Check if you have `admin` or `course_management` role

### 404 Not Found
- Check if the resource ID exists
- Verify the endpoint URL is correct

### 409 Conflict
- Slug already exists (for courses)
- Category name already exists
- Course already linked to category

### 500 Internal Server Error
- Check server logs
- Verify database connection
- Check if all required fields are provided

## Next Steps

1. Read the full API documentation: `docs/API-DOCUMENTATION-PHASE1.md`
2. Import Postman collection: `docs/postman-collection-phase1.json`
3. Review implementation summary: `docs/PHASE1-IMPLEMENTATION-SUMMARY.md`
4. Test all endpoints systematically
5. Provide feedback for Phase 2 implementation

## Support

For issues or questions:
1. Check the API documentation
2. Review the implementation summary
3. Check server logs for errors
4. Contact the development team

Happy testing! 🚀
