# Phase 3 Quick Reference Guide

## Course Enrollments & Progress Tracking

### Quick Start

1. **Import Postman Collection**: `docs/postman-collection-phase3.json`
2. **Set Variables**: `base_url` and `access_token`
3. **Start Testing**: Follow the workflow examples below

---

## Course Enrollment Endpoints

### 1. Enroll in Course
```bash
POST /api/enrollments/courses/:courseId
```
**Response:** Enrollment details with ID

### 2. Get My Enrollments
```bash
GET /api/enrollments/my?page=1&limit=20&isCompleted=false
```
**Query Params:**
- `page`, `limit` - Pagination
- `isCompleted` - Filter by completion
- `sortBy`, `sortOrder` - Sorting

### 3. Get Course Enrollments (Admin)
```bash
GET /api/enrollments/courses/:courseId?page=1&limit=20
```
**Permissions:** admin, course_management

### 4. Get Enrollment by ID
```bash
GET /api/enrollments/:id
```

### 5. Update Enrollment Progress
```bash
PUT /api/enrollments/:id/progress
{
  "progressPercent": 50,
  "pointsEarned": 75,
  "isCompleted": false
}
```
**All fields optional**

### 6. Unenroll from Course
```bash
DELETE /api/enrollments/:id
```

### 7. Get Enrollment Statistics (Admin)
```bash
GET /api/enrollments/courses/:courseId/stats
```
**Returns:** Total enrollments, completion rate, avg progress

---

## Clip Progress Endpoints

### 1. Update Clip Progress
```bash
PUT /api/progress/clips/:clipId
{
  "progressPercent": 50,
  "isCompleted": false
}
```
**Auto-creates progress record if doesn't exist**

### 2. Get My Progress
```bash
GET /api/progress/my?courseId=1&isCompleted=false
```
**Query Params:**
- `courseId` - Filter by course
- `isCompleted` - Filter by completion
- Pagination & sorting

### 3. Get Clip Progress (Admin)
```bash
GET /api/progress/clips/:clipId?page=1&limit=20
```
**Permissions:** admin, course_management

### 4. Get My Progress for Specific Clip
```bash
GET /api/progress/clips/:clipId/my
```

### 5. Get Clip Statistics (Admin)
```bash
GET /api/progress/clips/:clipId/stats
```
**Returns:** Total users, completion rate, avg progress

### 6. Get Course Progress Summary
```bash
GET /api/progress/courses/:courseId/summary
```
**Returns:** Complete progress across all clips, points earned

---

## Complete Workflow Example

### Student Journey

```bash
# 1. Enroll in course
POST /api/enrollments/courses/1
→ Save enrollment_id from response

# 2. Start first clip
PUT /api/progress/clips/1
{
  "progressPercent": 0,
  "isCompleted": false
}

# 3. Update progress (watching video)
PUT /api/progress/clips/1
{
  "progressPercent": 50
}

# 4. Complete clip
PUT /api/progress/clips/1
{
  "progressPercent": 100,
  "isCompleted": true
}

# 5. Check course progress
GET /api/progress/courses/1/summary

# 6. Update enrollment progress
PUT /api/enrollments/{enrollment_id}/progress
{
  "progressPercent": 25,
  "pointsEarned": 50
}

# 7. View all my enrollments
GET /api/enrollments/my
```

---

## Field Mappings

### CourseEnrollment Model
| API Field | Database Field | Description |
|-----------|---------------|-------------|
| `progressPercent` | `percentComplete` | Progress percentage (0-100) |
| `pointsEarned` | `pointsAchieved` | Points earned in course |
| `isCompleted` | `isCompleted` | Completion status |
| `enrolledAt` | `createdAt` | Enrollment date |
| `startedAt` | `startedAt` | When user started |
| `completedAt` | `completedAt` | When user completed |

### ClipProgress Model
| API Field | Database Field | Description |
|-----------|---------------|-------------|
| `progressPercent` | `percentComplete` | Progress percentage (0-100) |
| `isCompleted` | `isCompleted` | Completion status |
| `isStarted` | `isStarted` | Started flag |
| `startedAt` | `startedAt` | When started |
| `completedAt` | `completedAt` | When completed |

---

## Common Use Cases

### 1. Track Video Progress
```bash
# User watches 30% of video
PUT /api/progress/clips/1
{ "progressPercent": 30 }

# User watches 60% of video
PUT /api/progress/clips/1
{ "progressPercent": 60 }

# User completes video
PUT /api/progress/clips/1
{ "progressPercent": 100, "isCompleted": true }
```

### 2. Monitor Course Completion
```bash
# Get all enrollments for a course
GET /api/enrollments/courses/1

# Get completion statistics
GET /api/enrollments/courses/1/stats

# Response includes:
# - totalEnrollments
# - activeEnrollments
# - completedEnrollments
# - completionRate
# - avgProgress
# - avgPoints
```

### 3. Student Dashboard
```bash
# Get all my enrollments
GET /api/enrollments/my

# Get progress for specific course
GET /api/progress/courses/1/summary

# Get all my clip progress
GET /api/progress/my?courseId=1
```

### 4. Admin Analytics
```bash
# Course enrollment stats
GET /api/enrollments/courses/1/stats

# Clip completion stats
GET /api/progress/clips/1/stats

# All users' progress for a clip
GET /api/progress/clips/1
```

---

## Response Examples

### Enrollment Response
```json
{
  "success": true,
  "message": "Enrolled in course successfully",
  "data": {
    "enrollment": {
      "id": 1,
      "userId": 123,
      "courseId": 1,
      "percentComplete": 0,
      "pointsAchieved": 0,
      "isCompleted": false,
      "isStarted": false,
      "createdAt": "2025-10-15T10:00:00Z",
      "course": {
        "id": 1,
        "name": "Introduction to JavaScript",
        "slug": "intro-to-javascript",
        "thumbnailUrl": "...",
        "durationInMinutes": 300,
        "totalPoints": 100
      }
    }
  }
}
```

### Progress Response
```json
{
  "success": true,
  "message": "Progress updated successfully",
  "data": {
    "progress": {
      "id": 1,
      "userId": 123,
      "clipId": 1,
      "percentComplete": 50,
      "isStarted": true,
      "isCompleted": false,
      "startedAt": "2025-10-15T10:05:00Z",
      "updatedAt": "2025-10-15T10:10:00Z",
      "clip": {
        "id": 1,
        "title": "Introduction to Variables",
        "slug": "intro-to-variables",
        "type": "VIDEO",
        "durationInSeconds": 600,
        "points": 10
      }
    }
  }
}
```

### Course Progress Summary
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "summary": {
      "courseId": 1,
      "userId": 123,
      "totalClips": 10,
      "completedClips": 3,
      "progressPercent": "30.00",
      "totalPoints": 100,
      "earnedPoints": 30,
      "clipProgress": [
        {
          "clipId": 1,
          "isCompleted": true,
          "percentComplete": 100
        },
        {
          "clipId": 2,
          "isCompleted": true,
          "percentComplete": 100
        },
        {
          "clipId": 3,
          "isCompleted": true,
          "percentComplete": 100
        },
        {
          "clipId": 4,
          "isCompleted": false,
          "percentComplete": 0
        }
      ]
    }
  }
}
```

---

## Error Handling

### Common Errors

**Already Enrolled (409)**
```json
{
  "success": false,
  "message": "Already enrolled in this course",
  "statusCode": 409
}
```

**Course Not Published (400)**
```json
{
  "success": false,
  "message": "Course is not published",
  "statusCode": 400
}
```

**Enrollment Not Found (404)**
```json
{
  "success": false,
  "message": "Enrollment not found",
  "statusCode": 404
}
```

---

## Tips & Best Practices

### 1. Progress Updates
- Update progress frequently for better UX
- Always set `isCompleted: true` when reaching 100%
- Progress is automatically capped at 100%

### 2. Enrollment Management
- Check if user is already enrolled before enrolling
- Use enrollment statistics for course analytics
- Track both progress percentage and points earned

### 3. Performance
- Use pagination for large result sets
- Filter by `courseId` when getting clip progress
- Cache course progress summaries on frontend

### 4. Admin Features
- Use admin endpoints for analytics dashboards
- Monitor completion rates to identify difficult content
- Track average progress to measure engagement

---

## Testing Checklist

- [ ] Enroll in a course
- [ ] Get my enrollments
- [ ] Start a clip (0% progress)
- [ ] Update clip progress (50%)
- [ ] Complete a clip (100%)
- [ ] Get course progress summary
- [ ] Update enrollment progress
- [ ] Get enrollment statistics (admin)
- [ ] Get clip statistics (admin)
- [ ] Unenroll from course

---

## Next Steps

1. Import Postman collection
2. Test enrollment workflow
3. Test progress tracking
4. Integrate with frontend
5. Monitor analytics

For complete API documentation, see:
- `API-DOCUMENTATION-PHASE1.md` (Phase 1 reference)
- `PHASE3-COMPLETE.md` (Phase 3 summary)
- `ALL-PHASES-COMPLETE.md` (Overall status)
