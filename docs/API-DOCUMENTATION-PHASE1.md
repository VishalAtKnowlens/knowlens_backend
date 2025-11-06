# Learning Management System - Phase 1 API Documentation

## Overview
This document provides comprehensive API documentation for Phase 1 of the LMS, covering Course, Clip, Video, Document, and Content Category management.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints require Bearer token authentication unless specified otherwise.

```
Authorization: Bearer <your_access_token>
```

## Common Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400
}
```

## Pagination
List endpoints support pagination with the following query parameters:
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20, max: 100) - Items per page
- `sortBy` (string) - Field to sort by
- `sortOrder` (string: 'asc' | 'desc', default: 'desc') - Sort order

---

# Courses API

## 1. Create Course
Create a new course with all details.

**Endpoint:** `POST /api/courses`

**Permissions Required:** `admin`, `course_management`

**Request Body:**
```json
{
  "name": "Introduction to JavaScript",
  "subtitle": "Learn JavaScript from scratch",
  "synopsis": "A comprehensive course for beginners",
  "description": "This course covers all the fundamentals of JavaScript programming",
  "targetAudience": "Beginners with no programming experience",
  "learningObjectives": "Understand variables, functions, and objects",
  "skillsLearned": "JavaScript, ES6, DOM Manipulation",
  "prerequisites": "Basic computer knowledge",
  "thumbnailUrl": "https://example.com/thumbnail.jpg",
  "promotionalVideoUrl": "https://example.com/promo.mp4",
  "sampleCertificateUrl": "https://example.com/certificate.pdf",
  "durationInMinutes": 300,
  "totalHours": 5,
  "totalPoints": 100,
  "slug": "intro-to-javascript",
  "layout": "MULTI_CLIP",
  "isPublished": true,
  "showInCatalogue": true,
  "status": "ACTIVE",
  "categoryIds": [1, 2],
  "organizationIds": [1]
}
```

**Response:** `201 Created`
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

## 2. Get All Courses
Retrieve all courses with pagination and filtering.

**Endpoint:** `GET /api/courses`

**Query Parameters:**
- `page` (integer) - Page number
- `limit` (integer) - Items per page
- `search` (string) - Search in name, subtitle, description, slug
- `status` (enum) - Filter by status: ACTIVE, INACTIVE, ARCHIVED, PENDING
- `isPublished` (boolean) - Filter by published status
- `layout` (enum) - Filter by layout: MULTI_CLIP, SINGLE_PAGE
- `categoryId` (integer) - Filter by category ID
- `organizationId` (integer) - Filter by organization ID
- `sortBy` (string) - Sort field
- `sortOrder` (string) - Sort order: asc, desc

**Example:**
```
GET /api/courses?page=1&limit=20&status=ACTIVE&isPublished=true&sortBy=createdAt&sortOrder=desc
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "courses": [
      {
        "id": 1,
        "name": "Introduction to JavaScript",
        "slug": "intro-to-javascript",
        "thumbnailUrl": "https://example.com/thumbnail.jpg",
        "durationInMinutes": 300,
        "totalPoints": 100,
        "isPublished": true,
        "status": "ACTIVE",
        "categories": [
          {
            "category": {
              "id": 1,
              "name": "Programming"
            }
          }
        ],
        "_count": {
          "clips": 10,
          "enrollments": 150,
          "quizzes": 5,
          "assignments": 3
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

## 3. Get Course by ID
Get detailed course information.

**Endpoint:** `GET /api/courses/:id`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "course": {
      "id": 1,
      "name": "Introduction to JavaScript",
      "slug": "intro-to-javascript",
      "clips": [
        {
          "id": 1,
          "title": "Introduction to Variables",
          "sequence": 1,
          "type": "VIDEO",
          "durationInSeconds": 600
        }
      ],
      "assignments": [],
      "quizzes": [],
      "courseObjectives": [],
      "courseFeatures": [],
      "categories": [],
      "organizations": [],
      "relatedCourses": []
    }
  }
}
```

## 4. Update Course
Update course details.

**Endpoint:** `PUT /api/courses/:id`

**Permissions Required:** `admin`, `course_management`

**Request Body:**
```json
{
  "name": "Advanced JavaScript",
  "subtitle": "Master JavaScript concepts",
  "durationInMinutes": 400,
  "totalPoints": 150,
  "isPublished": true,
  "status": "ACTIVE"
}
```

**Response:** `200 OK`

## 5. Delete Course
Soft delete a course (sets status to INACTIVE and isPublished to false).

**Endpoint:** `DELETE /api/courses/:id`

**Permissions Required:** `admin`, `course_management`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

## 6. Get Course Statistics
Get course statistics including enrollments, completion rate, and average quiz scores.

**Endpoint:** `GET /api/courses/:id/stats`

**Permissions Required:** `admin`, `course_management`

**Response:** `200 OK`
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

---

# Clips API

## 1. Create Clip
Create a new clip within a course.

**Endpoint:** `POST /api/clips`

**Permissions Required:** `admin`, `course_management`

**Request Body:**
```json
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

**Clip Types:**
- `VIDEO` - Video content
- `TEXT` - Text/article content
- `ASSIGNMENT` - Assignment
- `QUIZ` - Quiz
- `EXERCISE` - Practice exercise
- `DOCUMENT` - Document/PDF

**Response:** `201 Created`

## 2. Get All Clips
Retrieve all clips with pagination and filtering.

**Endpoint:** `GET /api/clips`

**Query Parameters:**
- `page`, `limit`, `search`, `sortBy`, `sortOrder` (standard pagination)
- `courseId` (integer) - Filter by course ID
- `type` (enum) - Filter by clip type
- `status` (enum) - Filter by status

**Example:**
```
GET /api/clips?courseId=1&type=VIDEO&status=ACTIVE&sortBy=sequence&sortOrder=asc
```

**Response:** `200 OK`

## 3. Get Clip by ID
Get detailed clip information.

**Endpoint:** `GET /api/clips/:id`

**Response:** `200 OK`

## 4. Update Clip
Update clip details.

**Endpoint:** `PUT /api/clips/:id`

**Permissions Required:** `admin`, `course_management`

**Response:** `200 OK`

## 5. Delete Clip
Soft delete a clip.

**Endpoint:** `DELETE /api/clips/:id`

**Permissions Required:** `admin`, `course_management`

**Response:** `200 OK`

## 6. Get Clip Statistics
Get clip progress statistics.

**Endpoint:** `GET /api/clips/:id/stats`

**Permissions Required:** `admin`, `course_management`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "statistics": {
      "totalUsers": 100,
      "completedUsers": 75,
      "completionRate": "75.00",
      "avgProgress": "82.50"
    }
  }
}
```

---

# Videos API

## 1. Create Video
Create a new video with sources and subtitles.

**Endpoint:** `POST /api/videos`

**Permissions Required:** `admin`, `content_management`

**Request Body:**
```json
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
    },
    {
      "url": "https://example.com/video-1080p.mp4",
      "language": "en",
      "format": "mp4",
      "quality": "1080p",
      "sizeInMb": 300
    }
  ],
  "subtitles": [
    {
      "language": "en",
      "label": "English",
      "url": "https://example.com/subtitles-en.vtt"
    },
    {
      "language": "es",
      "label": "Spanish",
      "url": "https://example.com/subtitles-es.vtt"
    }
  ]
}
```

**Response:** `201 Created`

## 2. Get All Videos
Retrieve all videos with pagination and filtering.

**Endpoint:** `GET /api/videos`

**Query Parameters:**
- Standard pagination parameters
- `status` (enum) - Filter by status
- `isPublished` (boolean) - Filter by published status

**Response:** `200 OK`

## 3. Get Video by ID
Get detailed video information including sources, subtitles, and linked quizzes.

**Endpoint:** `GET /api/videos/:id`

**Response:** `200 OK`

## 4. Update Video
Update video details.

**Endpoint:** `PUT /api/videos/:id`

**Permissions Required:** `admin`, `content_management`

**Response:** `200 OK`

## 5. Delete Video
Soft delete a video.

**Endpoint:** `DELETE /api/videos/:id`

**Permissions Required:** `admin`, `content_management`

**Response:** `200 OK`

## 6. Add Video Source
Add a new video source (different quality/format).

**Endpoint:** `POST /api/videos/:id/sources`

**Permissions Required:** `admin`, `content_management`

**Request Body:**
```json
{
  "url": "https://example.com/video-4k.mp4",
  "language": "en",
  "format": "mp4",
  "quality": "4K",
  "sizeInMb": 800
}
```

**Response:** `201 Created`

## 7. Add Video Subtitle
Add a new subtitle track to the video.

**Endpoint:** `POST /api/videos/:id/subtitles`

**Permissions Required:** `admin`, `content_management`

**Request Body:**
```json
{
  "language": "fr",
  "label": "French",
  "url": "https://example.com/subtitles-fr.vtt"
}
```

**Response:** `201 Created`

---

# Documents API

## 1. Create Document
Create a new document with optional translations.

**Endpoint:** `POST /api/documents`

**Permissions Required:** `admin`, `content_management`

**Request Body:**
```json
{
  "title": "JavaScript Cheat Sheet",
  "url": "https://example.com/js-cheatsheet.pdf",
  "requiresConsent": false,
  "isPublished": true,
  "status": "ACTIVE",
  "translations": [
    {
      "language": "es",
      "title": "Hoja de trucos de JavaScript",
      "url": "https://example.com/js-cheatsheet-es.pdf"
    }
  ]
}
```

**Response:** `201 Created`

## 2. Get All Documents
Retrieve all documents with pagination and filtering.

**Endpoint:** `GET /api/documents`

**Query Parameters:**
- Standard pagination parameters
- `status` (enum) - Filter by status
- `isPublished` (boolean) - Filter by published status
- `requiresConsent` (boolean) - Filter by consent requirement

**Response:** `200 OK`

## 3. Get Document by ID
Get detailed document information including translations and recent views.

**Endpoint:** `GET /api/documents/:id`

**Response:** `200 OK`

## 4. Update Document
Update document details.

**Endpoint:** `PUT /api/documents/:id`

**Permissions Required:** `admin`, `content_management`

**Response:** `200 OK`

## 5. Delete Document
Soft delete a document.

**Endpoint:** `DELETE /api/documents/:id`

**Permissions Required:** `admin`, `content_management`

**Response:** `200 OK`

## 6. Record Document View
Record that the current user viewed this document.

**Endpoint:** `POST /api/documents/:id/view`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Document view recorded successfully",
  "data": {
    "view": {
      "documentId": 1,
      "userId": 123,
      "viewedAt": "2025-10-15T10:30:00.000Z"
    }
  }
}
```

## 7. Get Document Statistics
Get document statistics including total views, unique viewers, and recent views.

**Endpoint:** `GET /api/documents/:id/stats`

**Permissions Required:** `admin`, `content_management`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "statistics": {
      "totalViews": 250,
      "uniqueViewers": 180,
      "recentViews": 45
    }
  }
}
```

---

# Content Categories API

## 1. Create Category
Create a new content category.

**Endpoint:** `POST /api/content-categories`

**Permissions Required:** `admin`, `content_management`

**Request Body:**
```json
{
  "name": "Programming",
  "description": "Programming and software development courses",
  "imageUrl": "https://example.com/category-programming.jpg",
  "language": "en"
}
```

**Response:** `201 Created`

## 2. Get All Categories
Retrieve all content categories with pagination and filtering.

**Endpoint:** `GET /api/content-categories`

**Query Parameters:**
- Standard pagination parameters
- `categoryLanguage` (string) - Filter by language

**Response:** `200 OK`

## 3. Get Category by ID
Get detailed category information including linked courses.

**Endpoint:** `GET /api/content-categories/:id`

**Response:** `200 OK`

## 4. Update Category
Update category details.

**Endpoint:** `PUT /api/content-categories/:id`

**Permissions Required:** `admin`, `content_management`

**Response:** `200 OK`

## 5. Delete Category
Delete a category (only if no courses are linked).

**Endpoint:** `DELETE /api/content-categories/:id`

**Permissions Required:** `admin`, `content_management`

**Response:** `200 OK`

## 6. Link Course to Category
Link a course to a category.

**Endpoint:** `POST /api/content-categories/:id/courses/:courseId`

**Permissions Required:** `admin`, `content_management`

**Response:** `200 OK`

## 7. Unlink Course from Category
Unlink a course from a category.

**Endpoint:** `DELETE /api/content-categories/:id/courses/:courseId`

**Permissions Required:** `admin`, `content_management`

**Response:** `200 OK`

---

# Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error - Server error |

---

# Testing with Postman

1. Import the Postman collection: `docs/postman-collection-phase1.json`
2. Set the `base_url` variable to your API base URL
3. Login to get an access token
4. Set the `access_token` variable with your token
5. Start testing the endpoints

---

# Next Steps

Phase 2 will include:
- Quiz API
- Assignment API
- Discussion API
- Course Enrollment API
- Progress Tracking APIs

For questions or issues, please contact the development team.
