import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Step 2: Seeding Minimal Validation Dataset ===");

  // 1. Exactly 1 User
  const user = await prisma.user.upsert({
    where: { email: "student@project365.local" },
    update: {},
    create: {
      email: "student@project365.local",
      name: "Engineering Scholar",
      logicalDayCutoffHour: 1,
      dayStartHour: 6,
      dailySleepHours: 7.0,
      collegeLatitude: 12.9716,
      collegeLongitude: 77.5946,
      collegeRadiusMeters: 250,
    },
  });
  console.log(`1. User created: ${user.email} (${user.id})`);

  // 2. Exactly 3 Life Areas: Academic, Startup, Health
  const academicArea = await prisma.lifeArea.upsert({
    where: { userId_type: { userId: user.id, type: "ACADEMIC" } },
    update: {},
    create: {
      userId: user.id,
      type: "ACADEMIC",
      name: "Academic & College",
      color: "#3b82f6",
      intensity: "NORMAL",
    },
  });

  const startupArea = await prisma.lifeArea.upsert({
    where: { userId_type: { userId: user.id, type: "STARTUP" } },
    update: {},
    create: {
      userId: user.id,
      type: "STARTUP",
      name: "Startup & Innovation",
      color: "#8b5cf6",
      intensity: "NORMAL",
    },
  });

  const healthArea = await prisma.lifeArea.upsert({
    where: { userId_type: { userId: user.id, type: "HEALTH" } },
    update: {},
    create: {
      userId: user.id,
      type: "HEALTH",
      name: "Health & Vitality",
      color: "#10b981",
      intensity: "NORMAL",
    },
  });
  console.log("2. 3 Life Areas created: Academic, Startup, Health");

  // Clean up existing user data for idempotent re-seeding
  await prisma.taskEvent.deleteMany({ where: { instance: { userId: user.id } } });
  await prisma.taskInstance.deleteMany({ where: { userId: user.id } });
  await prisma.taskDependency.deleteMany({ where: { task: { userId: user.id } } });
  await prisma.task.deleteMany({ where: { userId: user.id } });
  await prisma.milestone.deleteMany({ where: { goal: { userId: user.id } } });
  await prisma.goal.deleteMany({ where: { userId: user.id } });
  await prisma.commitment.deleteMany({ where: { userId: user.id } });

  // 3. Exactly 1 Goal
  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      areaId: academicArea.id,
      title: "Achieve 9.0+ CGPA in Final Semester",
      description: "Capstone project execution and core course distinction.",
      targetDate: new Date("2026-12-15"),
    },
  });
  console.log(`3. 1 Goal created: "${goal.title}" (${goal.id})`);

  // 4. Exactly 1 Milestone
  const milestone = await prisma.milestone.create({
    data: {
      goalId: goal.id,
      title: "Complete Final Year Capstone Project",
      description: "Deliver architecture, core service, and validation benchmarks.",
      orderIndex: 1,
    },
  });
  console.log(`4. 1 Milestone created: "${milestone.title}" (${milestone.id})`);

  // 5. Exactly 3 Tasks
  const task1 = await prisma.task.create({
    data: {
      userId: user.id,
      areaId: academicArea.id,
      milestoneId: milestone.id,
      title: "System Architecture Specification",
      description: "Document state machines and data models.",
      durationMinutes: 90,
      priority: "HIGH",
      energyRequired: "HIGH",
      recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  const task2 = await prisma.task.create({
    data: {
      userId: user.id,
      areaId: academicArea.id,
      milestoneId: milestone.id,
      title: "Core Service Implementation",
      description: "Build domain logic and services.",
      durationMinutes: 120,
      priority: "CRITICAL",
      energyRequired: "HIGH",
      recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  const task3 = await prisma.task.create({
    data: {
      userId: user.id,
      areaId: academicArea.id,
      milestoneId: milestone.id,
      title: "Integration & Benchmark Testing",
      description: "Run automated stress and integration tests.",
      durationMinutes: 60,
      priority: "HIGH",
      energyRequired: "MEDIUM",
      recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
    },
  });
  console.log("5. 3 Tasks created: Task 1, Task 2, Task 3");

  // 6. Exactly 1 Dependency Chain: Task 1 -> Task 2 -> Task 3
  await prisma.taskDependency.create({
    data: {
      taskId: task2.id,
      dependsOnTaskId: task1.id,
    },
  });

  await prisma.taskDependency.create({
    data: {
      taskId: task3.id,
      dependsOnTaskId: task2.id,
    },
  });
  console.log("6. 1 Dependency Chain created: Task 1 -> Task 2 -> Task 3");

  // 7. Non-Negotiable Human Reality Commitments (10.0 Hours = 600 min)
  await prisma.commitment.createMany({
    data: [
      {
        userId: user.id,
        title: "Morning Bus Commute",
        type: "COMMUTE",
        startMinute: 420,
        endMinute: 540,
        durationMinutes: 120,
        recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
      },
      {
        userId: user.id,
        title: "College Lectures & Labs",
        type: "COLLEGE",
        startMinute: 540,
        endMinute: 900,
        durationMinutes: 360,
        recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
      },
      {
        userId: user.id,
        title: "Evening Bus Return",
        type: "COMMUTE",
        startMinute: 900,
        endMinute: 990,
        durationMinutes: 90,
        recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
      },
      {
        userId: user.id,
        title: "Dinner & Family Routine",
        type: "ROUTINE_MEALS",
        startMinute: 1200,
        endMinute: 1230,
        durationMinutes: 30,
        recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
      },
    ],
  });
  console.log("7. 4 Fixed Commitments created (600m / 10.0h locked)");

  console.log("=== Minimal Seed Completed Successfully ===");
}

main()
  .catch(e => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });