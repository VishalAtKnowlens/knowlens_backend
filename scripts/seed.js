import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

// Admin - Email: admin@knowlens.com, Password: admin123
// Instructor - Email: instructor@knowlens.com, Password: password123
// Learner - Email: learner@knowlens.com, Password: password123
async function main() {
  console.log("🌱 Starting comprehensive database seed...")

  // Create sample organization
  const organization = await prisma.organization.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Knowlens Learning Academy",
      slug: "knowlens-academy",
      logoUrl: "https://example.com/logo.png",
      websiteUrl: "https://knowlens.com",
      address: "123 Learning Street, Education City",
      contactPerson: "John Doe",
      contactEmail: "contact@knowlens.com",
      status: "ACTIVE",
    },
  })

  console.log("✅ Created organization:", organization.name)

  // Create divisions
  const techDivision = await prisma.division.create({
    data: {
      name: "Technology",
      shortName: "TECH",
      organizationId: organization.id,
    },
  })

  const hrDivision = await prisma.division.create({
    data: {
      name: "Human Resources",
      shortName: "HR",
      organizationId: organization.id,
    },
  })

  console.log("✅ Created divisions")

  // Create departments
  const devDepartment = await prisma.department.create({
    data: {
      name: "Software Development",
      divisionId: techDivision.id,
    },
  })

  const recruitmentDepartment = await prisma.department.create({
    data: {
      name: "Recruitment",
      divisionId: hrDivision.id,
    },
  })

  console.log("✅ Created departments")

  // Create roles with permissions
  const adminRole = await prisma.role.create({
    data: {
      name: "Administrator",
      organizationId: organization.id,
      permissions: ["admin", "user_management", "user_read", "user_write", "*"],
    },
  })

  const instructorRole = await prisma.role.create({
    data: {
      name: "Instructor",
      organizationId: organization.id,
      permissions: ["user_read", "course_read", "course_write"],
    },
  })

  const learnerRole = await prisma.role.create({
    data: {
      name: "Learner",
      organizationId: organization.id,
      permissions: ["user_read", "course_read"],
    },
  })

  console.log("✅ Created roles with permissions")

  // Create org levels and designations
  const seniorLevel = await prisma.orgLevel.create({
    data: {
      name: "Senior",
      organizationId: organization.id,
    },
  })

  const managerDesignation = await prisma.designation.create({
    data: {
      name: "Manager",
      organizationId: organization.id,
    },
  })

  const developerDesignation = await prisma.designation.create({
    data: {
      name: "Developer",
      organizationId: organization.id,
    },
  })

  console.log("✅ Created org levels and designations")

  // Create sample users with hashed passwords
  const saltRounds = 12
  const hashedPassword = await bcrypt.hash("password123", saltRounds)
  const hashedAdminPassword = await bcrypt.hash("admin123", saltRounds)

  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@knowlens.com",
      password: hashedAdminPassword,
      salt: await bcrypt.genSalt(saltRounds),
      firstName: "Admin",
      lastName: "User",
      type: "ADMIN",
      isEmailVerified: true,
      organizationId: organization.id,
      departmentId: devDepartment.id,
      status: "ACTIVE",
    },
  })

  const instructorUser = await prisma.user.create({
    data: {
      username: "instructor1",
      email: "instructor@knowlens.com",
      password: hashedPassword,
      salt: await bcrypt.genSalt(saltRounds),
      firstName: "Jane",
      lastName: "Smith",
      type: "FACILITATOR",
      isEmailVerified: true,
      organizationId: organization.id,
      departmentId: devDepartment.id,
      status: "ACTIVE",
    },
  })

  const learnerUser = await prisma.user.create({
    data: {
      username: "learner1",
      email: "learner@knowlens.com",
      password: hashedPassword,
      salt: await bcrypt.genSalt(saltRounds),
      firstName: "Bob",
      lastName: "Johnson",
      type: "REGULAR",
      isEmailVerified: true,
      organizationId: organization.id,
      departmentId: devDepartment.id,
      managerId: instructorUser.id,
      status: "ACTIVE",
    },
  })

  console.log("✅ Created users")

  // Create user role assignments
  await prisma.roleAssignment.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
      divisionId: techDivision.id,
    },
  })

  await prisma.roleAssignment.create({
    data: {
      userId: instructorUser.id,
      roleId: instructorRole.id,
      divisionId: techDivision.id,
    },
  })

  await prisma.roleAssignment.create({
    data: {
      userId: learnerUser.id,
      roleId: learnerRole.id,
      divisionId: techDivision.id,
    },
  })

  // Create legacy UserRole entries for backward compatibility
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  })

  console.log("✅ Created role assignments")

  // Create user org profiles
  await prisma.userOrgProfile.create({
    data: {
      userId: adminUser.id,
      divisionId: techDivision.id,
      departmentId: devDepartment.id,
      levelId: seniorLevel.id,
      designationId: managerDesignation.id,
      joiningDate: new Date("2023-01-01"),
    },
  })

  await prisma.userOrgProfile.create({
    data: {
      userId: instructorUser.id,
      divisionId: techDivision.id,
      departmentId: devDepartment.id,
      designationId: developerDesignation.id,
      joiningDate: new Date("2023-06-01"),
    },
  })

  console.log("✅ Created user org profiles")

  // Create content categories
  const techCategory = await prisma.contentCategory.create({
    data: {
      name: "Technology",
      description: "Technology and programming courses",
      language: "en",
    },
  })

  const businessCategory = await prisma.contentCategory.create({
    data: {
      name: "Business",
      description: "Business and management courses",
      language: "en",
    },
  })

  console.log("✅ Created content categories")

  // Create sample courses
  const jsCourse = await prisma.course.create({
    data: {
      name: "JavaScript Fundamentals",
      subtitle: "Learn the basics of JavaScript programming",
      synopsis: "A comprehensive introduction to JavaScript",
      description: "This course covers all the fundamental concepts of JavaScript programming including variables, functions, objects, and more.",
      targetAudience: "Beginners to programming",
      learningObjectives: "Understand JavaScript syntax and concepts",
      skillsLearned: "JavaScript programming, DOM manipulation, ES6 features",
      prerequisites: "Basic computer knowledge",
      thumbnailUrl: "https://example.com/js-thumb.jpg",
      durationInMinutes: 480,
      totalHours: 8,
      totalPoints: 100,
      slug: "javascript-fundamentals",
      layout: "MULTI_CLIP",
      isPublished: true,
      showInCatalogue: true,
      status: "ACTIVE",
    },
  })

  const reactCourse = await prisma.course.create({
    data: {
      name: "React Development",
      subtitle: "Build modern web applications with React",
      synopsis: "Learn React from basics to advanced concepts",
      description: "Master React development with hands-on projects and real-world examples.",
      targetAudience: "JavaScript developers",
      learningObjectives: "Build React applications",
      skillsLearned: "React components, hooks, state management",
      prerequisites: "JavaScript knowledge required",
      thumbnailUrl: "https://example.com/react-thumb.jpg",
      durationInMinutes: 720,
      totalHours: 12,
      totalPoints: 150,
      slug: "react-development",
      layout: "MULTI_CLIP",
      isPublished: true,
      showInCatalogue: true,
      status: "ACTIVE",
    },
  })

  console.log("✅ Created courses")

  // Link courses to categories
  await prisma.courseCategoryLink.create({
    data: {
      courseId: jsCourse.id,
      categoryId: techCategory.id,
    },
  })

  await prisma.courseCategoryLink.create({
    data: {
      courseId: reactCourse.id,
      categoryId: techCategory.id,
    },
  })

  // Link courses to organization
  await prisma.courseOrganizationLink.create({
    data: {
      courseId: jsCourse.id,
      organizationId: organization.id,
    },
  })

  await prisma.courseOrganizationLink.create({
    data: {
      courseId: reactCourse.id,
      organizationId: organization.id,
    },
  })

  console.log("✅ Linked courses to categories and organization")

  // Create course objectives
  await prisma.courseObjective.createMany({
    data: [
      {
        objective: "Understand JavaScript variables and data types",
        sortOrder: 1,
        courseId: jsCourse.id,
      },
      {
        objective: "Learn functions and scope",
        sortOrder: 2,
        courseId: jsCourse.id,
      },
      {
        objective: "Master DOM manipulation",
        sortOrder: 3,
        courseId: jsCourse.id,
      },
    ],
  })

  console.log("✅ Created course objectives")

  // Create clips for courses
  const jsClip1 = await prisma.clip.create({
    data: {
      title: "Introduction to JavaScript",
      description: "Overview of JavaScript and its uses",
      type: "VIDEO",
      sequence: 1,
      points: 10,
      durationInSeconds: 600,
      slug: "intro-to-javascript",
      courseId: jsCourse.id,
      status: "ACTIVE",
    },
  })

  const jsClip2 = await prisma.clip.create({
    data: {
      title: "Variables and Data Types",
      description: "Learn about JavaScript variables",
      type: "VIDEO",
      sequence: 2,
      points: 15,
      durationInSeconds: 900,
      slug: "variables-data-types",
      courseId: jsCourse.id,
      status: "ACTIVE",
    },
  })

  console.log("✅ Created clips")

  // Create videos
  const video1 = await prisma.video.create({
    data: {
      title: "JavaScript Introduction Video",
      description: "Welcome to JavaScript programming",
      thumbnailUrl: "https://example.com/video1-thumb.jpg",
      durationInSeconds: 600,
      tags: "javascript,introduction,programming",
      points: 10,
      isPublished: true,
      status: "ACTIVE",
    },
  })

  console.log("✅ Created videos")

  // Create video sources
  await prisma.videoSource.create({
    data: {
      videoId: video1.id,
      url: "https://example.com/video1.mp4",
      language: "en",
      format: "mp4",
      quality: "1080p",
      sizeInMb: 150,
    },
  })

  console.log("✅ Created video sources")

  // Create content sequence
  await prisma.contentSequence.create({
    data: {
      clipId: jsClip1.id,
      contentType: "VIDEO",
      contentId: video1.id,
      sequence: 1,
      level: 1,
      status: "ACTIVE",
    },
  })

  console.log("✅ Created content sequences")

  // Create quizzes
  const jsQuiz = await prisma.quiz.create({
    data: {
      title: "JavaScript Basics Quiz",
      courseId: jsCourse.id,
      clipId: jsClip1.id,
      weightage: 20.0,
      passThreshold: 70,
      maxAttempts: 3,
      timeLimitInMinutes: 30,
      showAnalysis: true,
      randomizeQuestions: true,
      isPublished: true,
      status: "ACTIVE",
    },
  })

  console.log("✅ Created quiz")

  // Create quiz questions
  const question1 = await prisma.quizQuestion.create({
    data: {
      quizId: jsQuiz.id,
      text: "What is JavaScript?",
      type: "MULTIPLE_CHOICE",
      points: 5.0,
      sequence: 1,
    },
  })

  const question2 = await prisma.quizQuestion.create({
    data: {
      quizId: jsQuiz.id,
      text: "Which of the following are JavaScript data types?",
      type: "MULTIPLE_RESPONSE",
      points: 10.0,
      sequence: 2,
    },
  })

  console.log("✅ Created quiz questions")

  // Create quiz options
  await prisma.quizOption.createMany({
    data: [
      {
        questionId: question1.id,
        text: "A programming language",
        isCorrect: true,
        sequence: 1,
      },
      {
        questionId: question1.id,
        text: "A database",
        isCorrect: false,
        sequence: 2,
      },
      {
        questionId: question1.id,
        text: "An operating system",
        isCorrect: false,
        sequence: 3,
      },
      {
        questionId: question2.id,
        text: "String",
        isCorrect: true,
        sequence: 1,
      },
      {
        questionId: question2.id,
        text: "Number",
        isCorrect: true,
        sequence: 2,
      },
      {
        questionId: question2.id,
        text: "Boolean",
        isCorrect: true,
        sequence: 3,
      },
      {
        questionId: question2.id,
        text: "HTML",
        isCorrect: false,
        sequence: 4,
      },
    ],
  })

  console.log("✅ Created quiz options")

  // Create course enrollments
  await prisma.courseEnrollment.create({
    data: {
      userId: learnerUser.id,
      courseId: jsCourse.id,
      pointsAchieved: 25,
      percentComplete: 30,
      isStarted: true,
      startedAt: new Date(),
    },
  })

  await prisma.courseEnrollment.create({
    data: {
      userId: learnerUser.id,
      courseId: reactCourse.id,
      pointsAchieved: 0,
      percentComplete: 0,
      isStarted: false,
    },
  })

  console.log("✅ Created course enrollments")

  // Create clip progress
  await prisma.clipProgress.create({
    data: {
      userId: learnerUser.id,
      clipId: jsClip1.id,
      pointsAchieved: 10,
      percentComplete: 100,
      isStarted: true,
      isCompleted: true,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  })

  console.log("✅ Created clip progress")

  // Create assignments
  const assignment1 = await prisma.assignment.create({
    data: {
      title: "JavaScript Variables Exercise",
      description: "Create a simple JavaScript program using variables and functions",
      isPublished: true,
      status: "ACTIVE",
      courseId: jsCourse.id,
      clipId: jsClip2.id,
    },
  })

  console.log("✅ Created assignments")

  // Create assignment submission
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assignment1.id,
      userId: learnerUser.id,
      submittedText: "console.log('Hello World'); let name = 'John';",
      score: 85,
      comments: "Good work! Consider adding more comments.",
      submittedAt: new Date(),
    },
  })

  console.log("✅ Created assignment submission")

  // Create discussions
  const discussion1 = await prisma.discussion.create({
    data: {
      topic: "JavaScript Best Practices",
      description: "Share your favorite JavaScript coding practices",
      isPublished: true,
      status: "ACTIVE",
      authorId: instructorUser.id,
      organizationId: organization.id,
      contentType: "COURSE",
      contentId: jsCourse.id,
    },
  })

  console.log("✅ Created discussions")

  // Create discussion posts
  const post1 = await prisma.discussionPost.create({
    data: {
      text: "Always use const and let instead of var for better scope management",
      discussionId: discussion1.id,
      authorId: instructorUser.id,
    },
  })

  await prisma.discussionPost.create({
    data: {
      text: "Great tip! I also recommend using meaningful variable names",
      discussionId: discussion1.id,
      authorId: learnerUser.id,
      parentId: post1.id,
    },
  })

  console.log("✅ Created discussion posts")

  // Create products for e-commerce
  const jsProduct = await prisma.product.create({
    data: {
      name: "JavaScript Fundamentals Course",
      type: "COURSE",
      description: "Complete JavaScript course for beginners",
      price: 99.99,
      referenceId: jsCourse.id,
      isActive: true,
    },
  })

  console.log("✅ Created products")

  // Create campaigns
  const campaign1 = await prisma.campaign.create({
    data: {
      name: "New Year Learning Sale",
      url: "https://knowlens.com/new-year-sale",
      promoCode: "NEWYEAR2024",
      discountPercent: 25,
      isActive: true,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      organizationId: organization.id,
    },
  })

  console.log("✅ Created campaigns")

  // Create campaign product link
  await prisma.campaignProduct.create({
    data: {
      campaignId: campaign1.id,
      productId: jsProduct.id,
      discountRate: 25.0,
    },
  })

  console.log("✅ Created campaign product links")

  // Create orders
  const order1 = await prisma.order.create({
    data: {
      orderCode: "ORD-2024-001",
      status: "COMPLETED",
      totalAmount: 99.99,
      userId: learnerUser.id,
    },
  })

  console.log("✅ Created orders")

  // Create order items
  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      productId: jsProduct.id,
      quantity: 1,
      priceAtPurchase: 99.99,
    },
  })

  console.log("✅ Created order items")

  // Create competencies
  const jsCompetency = await prisma.competency.create({
    data: {
      name: "JavaScript Programming",
      description: "Ability to write JavaScript code effectively",
      organizationId: organization.id,
    },
  })

  console.log("✅ Created competencies")

  // Create course competency links
  await prisma.courseCompetency.create({
    data: {
      courseId: jsCourse.id,
      competencyId: jsCompetency.id,
      points: 100,
    },
  })

  console.log("✅ Created course competency links")

  // Create learning paths
  const webDevPath = await prisma.learningPath.create({
    data: {
      name: "Full Stack Web Development",
      description: "Complete path to become a full stack developer",
      imageUrl: "https://example.com/webdev-path.jpg",
      organizationId: organization.id,
      dueInDays: 90,
      isPublished: true,
      generateCertificate: true,
    },
  })

  console.log("✅ Created learning paths")

  // Create learning path role assignments
  await prisma.learningPathRoleAssignment.create({
    data: {
      learningPathId: webDevPath.id,
      roleId: learnerRole.id,
      divisionId: techDivision.id,
    },
  })

  console.log("✅ Created learning path role assignments")

  // Create batches for instructor-led training
  const batch1 = await prisma.batch.create({
    data: {
      name: "JavaScript Bootcamp Batch 1",
      description: "Intensive JavaScript training program",
      courseId: jsCourse.id,
      facilitatorId: instructorUser.id,
      organizationId: organization.id,
      status: "ACTIVE",
    },
  })

  console.log("✅ Created batches")

  // Create batch members
  await prisma.batchMember.create({
    data: {
      batchId: batch1.id,
      userId: learnerUser.id,
    },
  })

  console.log("✅ Created batch members")

  // Create analytics events
  await prisma.analyticsEvent.createMany({
    data: [
      {
        platform: "WEB",
        appName: "Knowlens LMS",
        appVersion: "1.0.0",
        userId: learnerUser.id,
        screenView: "course_detail",
        userAction: "view_course",
        contentType: "COURSE",
        contentId: jsCourse.id,
      },
      {
        platform: "WEB",
        appName: "Knowlens LMS",
        appVersion: "1.0.0",
        userId: learnerUser.id,
        screenView: "quiz_attempt",
        userAction: "start_quiz",
        contentType: "QUIZ",
        contentId: jsQuiz.id,
      },
    ],
  })

  console.log("✅ Created analytics events")

  // Create resume for user
  const resume = await prisma.resume.create({
    data: {
      userId: learnerUser.id,
      fullName: "Bob Johnson",
      address: "456 Developer Lane",
      city: "Tech City",
      state: "CA",
      country: "USA",
      postalCode: "12345",
      objective: "Seeking a challenging role in web development",
    },
  })

  console.log("✅ Created resume")

  // Create resume work experience
  await prisma.resumeWorkExperience.create({
    data: {
      resumeId: resume.id,
      jobTitle: "Junior Developer",
      company: "Tech Startup Inc",
      startDate: "2022-01-01",
      endDate: "2023-12-31",
      responsibilities: "Developed web applications using JavaScript and React",
    },
  })

  console.log("✅ Created resume work experience")

  // Create refresh tokens for backward compatibility
  await prisma.refreshToken.create({
    data: {
      token: "sample_refresh_token_123",
      userId: adminUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      deviceInfo: "Chrome Browser",
      ipAddress: "192.168.1.1",
    },
  })

  console.log("✅ Created refresh tokens")

  // Create sessions
  await prisma.session.create({
    data: {
      token: "sample_session_token_123",
      type: "SESSION",
      userId: adminUser.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0 Chrome/91.0",
    },
  })

  console.log("✅ Created sessions")

  console.log("\n🎉 Comprehensive database seeded successfully!")
  console.log("\n📋 Test credentials:")
  console.log("Admin - Email: admin@knowlens.com, Password: admin123")
  console.log("Instructor - Email: instructor@knowlens.com, Password: password123")
  console.log("Learner - Email: learner@knowlens.com, Password: password123")
  console.log("\n📊 Sample data created:")
  console.log("- 1 Organization with divisions and departments")
  console.log("- 3 Users with different roles")
  console.log("- 2 Courses with clips, videos, and quizzes")
  console.log("- Course enrollments and progress tracking")
  console.log("- Assignments, discussions, and submissions")
  console.log("- E-commerce products, orders, and campaigns")
  console.log("- Analytics events and user interactions")
  console.log("- Learning paths and competency mapping")
  console.log("- Batch training and instructor-led sessions")
  console.log("- Resume builder data")
  console.log("- Authentication tokens (JWT + Session)")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
