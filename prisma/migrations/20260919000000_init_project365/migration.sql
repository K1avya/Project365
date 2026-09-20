-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "EnergyLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "LifeAreaType" AS ENUM ('ACADEMIC', 'STARTUP', 'CAREER_CODING', 'HEALTH', 'PERSONAL');

-- CreateEnum
CREATE TYPE "AreaIntensity" AS ENUM ('INTENSIVE', 'NORMAL', 'MINIMAL', 'PAUSED');

-- CreateEnum
CREATE TYPE "CommitmentType" AS ENUM ('COLLEGE', 'COMMUTE', 'FAMILY', 'GYM_HEALTH', 'ROUTINE_MEALS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('BLOCKED', 'PENDING', 'ACTIVE', 'COMPLETED', 'MISSED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskEventType" AS ENUM ('CREATED', 'SCHEDULED', 'STARTED', 'PAUSED', 'RESUMED', 'COMPLETED', 'MISSED', 'CANCELLED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "startDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logicalDayCutoffHour" INTEGER NOT NULL DEFAULT 1,
    "dayStartHour" INTEGER NOT NULL DEFAULT 6,
    "dailySleepHours" DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    "collegeLatitude" DOUBLE PRECISION,
    "collegeLongitude" DOUBLE PRECISION,
    "collegeRadiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 250,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "life_areas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LifeAreaType" NOT NULL,
    "name" TEXT NOT NULL,
    "intensity" "AreaIntensity" NOT NULL DEFAULT 'NORMAL',
    "color" TEXT NOT NULL DEFAULT '#06b6d4',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "life_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" DATE,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "energyRequired" "EnergyLevel" NOT NULL DEFAULT 'MEDIUM',
    "durationMinutes" INTEGER NOT NULL,
    "preferredMinute" INTEGER,
    "isDeepWork" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceDays" INTEGER[],
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_dependencies" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dependsOnTaskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_instances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "energyRequired" "EnergyLevel" NOT NULL DEFAULT 'MEDIUM',
    "durationMinutes" INTEGER NOT NULL,
    "isDeepWork" BOOLEAN NOT NULL DEFAULT false,
    "startMinute" INTEGER,
    "endMinute" INTEGER,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "actualMinutes" INTEGER NOT NULL DEFAULT 0,
    "pausedMs" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_events" (
    "id" TEXT NOT NULL,
    "taskInstanceId" TEXT NOT NULL,
    "eventType" "TaskEventType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commitments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CommitmentType" NOT NULL DEFAULT 'COLLEGE',
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "recurrenceDays" INTEGER[],
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "peakEnergyStartMinute" INTEGER NOT NULL DEFAULT 360,
    "peakEnergyEndMinute" INTEGER NOT NULL DEFAULT 540,
    "secondaryPeakStartMinute" INTEGER DEFAULT 1260,
    "secondaryPeakEndMinute" INTEGER DEFAULT 1410,
    "troughStartMinute" INTEGER NOT NULL DEFAULT 810,
    "troughEndMinute" INTEGER NOT NULL DEFAULT 960,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "energy_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_plan_revisions" (
    "id" TEXT NOT NULL,
    "weeklyPlanId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "grossAvailableHours" DOUBLE PRECISION NOT NULL,
    "committedHours" DOUBLE PRECISION NOT NULL,
    "netAvailableHours" DOUBLE PRECISION NOT NULL,
    "plannedHours" DOUBLE PRECISION NOT NULL,
    "actualHours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isOverloaded" BOOLEAN NOT NULL DEFAULT false,
    "overloadHours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "changeReason" TEXT,
    "snapshotPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_plan_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "life_areas_userId_type_key" ON "life_areas"("userId", "type");

-- CreateIndex
CREATE INDEX "goals_userId_isArchived_idx" ON "goals"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "milestones_goalId_isArchived_idx" ON "milestones"("goalId", "isArchived");

-- CreateIndex
CREATE INDEX "tasks_userId_areaId_isArchived_idx" ON "tasks"("userId", "areaId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_taskId_dependsOnTaskId_key" ON "task_dependencies"("taskId", "dependsOnTaskId");

-- CreateIndex
CREATE INDEX "task_instances_userId_date_idx" ON "task_instances"("userId", "date");

-- CreateIndex
CREATE INDEX "task_instances_userId_status_idx" ON "task_instances"("userId", "status");

-- CreateIndex
CREATE INDEX "task_instances_userId_date_status_idx" ON "task_instances"("userId", "date", "status");

-- CreateIndex
CREATE INDEX "task_events_taskInstanceId_createdAt_idx" ON "task_events"("taskInstanceId", "createdAt");

-- CreateIndex
CREATE INDEX "commitments_userId_isActive_idx" ON "commitments"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "energy_profiles_userId_key" ON "energy_profiles"("userId");

-- CreateIndex
CREATE INDEX "weekly_plans_userId_status_idx" ON "weekly_plans"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_plans_userId_weekStartDate_key" ON "weekly_plans"("userId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_plan_revisions_weeklyPlanId_version_key" ON "weekly_plan_revisions"("weeklyPlanId", "version");

-- AddForeignKey
ALTER TABLE "life_areas" ADD CONSTRAINT "life_areas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "life_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "life_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_taskInstanceId_fkey" FOREIGN KEY ("taskInstanceId") REFERENCES "task_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_profiles" ADD CONSTRAINT "energy_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_plan_revisions" ADD CONSTRAINT "weekly_plan_revisions_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "weekly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

