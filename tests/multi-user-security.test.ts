import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { GET as listTasksRoute } from "../src/app/api/tasks/route.js";
import { GET as getTaskRoute, PATCH as updateTaskRoute, DELETE as deleteTaskRoute } from "../src/app/api/tasks/[id]/route.js";
import { GET as getGoalRoute, PATCH as updateGoalRoute, DELETE as deleteGoalRoute } from "../src/app/api/goals/[id]/route.js";
import { GET as getMilestoneRoute, PATCH as updateMilestoneRoute, DELETE as deleteMilestoneRoute } from "../src/app/api/milestones/[id]/route.js";
import { GET as getLifeAreaRoute, PATCH as updateLifeAreaRoute, DELETE as deleteLifeAreaRoute } from "../src/app/api/life-areas/[id]/route.js";
import { PATCH as updateStatusRoute } from "../src/app/api/task-instances/[id]/status/route.js";
import { GET as getEventsRoute, POST as recordEventRoute } from "../src/app/api/task-instances/[id]/events/route.js";
import { GET as getWeeklyPlanRoute } from "../src/app/api/weekly-plan/[id]/route.js";
import { GET as listInstancesRoute } from "../src/app/api/task-instances/route.js";
import { GET as getCommitmentsRoute } from "../src/app/api/commitments/route.js";
import { GET as getCapacityRemainingRoute } from "../src/app/api/capacity/remaining/route.js";
import { TimezoneService } from "../src/domain/time/timezone-service.js";

describe("Multi-Tenant Data Isolation & 404 Anti-Enumeration Security Gate", () => {
  let aliceId: string;
  let bobId: string;

  let aliceAreaId: string;
  let aliceGoalId: string;
  let aliceMilestoneId: string;
  let aliceTaskId: string;
  let aliceInstanceId: string;
  let alicePlanId: string;

  let bobAreaId: string;
  let bobTaskId: string;

  const testDate = TimezoneService.toLogicalCalendarDate(new Date(), 1, "UTC");

  beforeAll(async () => {
    // 1. Create Alice (Tenant A)
    const alice = await prisma.user.create({
      data: {
        email: `alice-${Date.now()}@project365.local`,
        name: "Alice Engineer",
        dayStartHour: 6,
        logicalDayCutoffHour: 1,
        dailySleepHours: 7.0,
      },
    });
    aliceId = alice.id;

    // 2. Create Bob (Tenant B)
    const bob = await prisma.user.create({
      data: {
        email: `bob-${Date.now()}@project365.local`,
        name: "Bob Hacker",
        dayStartHour: 6,
        logicalDayCutoffHour: 1,
        dailySleepHours: 7.0,
      },
    });
    bobId = bob.id;

    // 3. Populate Alice's entire hierarchy
    const aliceArea = await prisma.lifeArea.create({
      data: {
        userId: aliceId,
        type: "STARTUP",
        name: "Alice Confidential Startup",
        color: "#ec4899",
      },
    });
    aliceAreaId = aliceArea.id;

    const aliceGoal = await prisma.goal.create({
      data: {
        userId: aliceId,
        areaId: aliceAreaId,
        title: "Alice Stealth Launch",
      },
    });
    aliceGoalId = aliceGoal.id;

    const aliceMilestone = await prisma.milestone.create({
      data: {
        goalId: aliceGoalId,
        title: "Alice Confidential Milestone",
        orderIndex: 1,
      },
    });
    aliceMilestoneId = aliceMilestone.id;

    const aliceTask = await prisma.task.create({
      data: {
        userId: aliceId,
        areaId: aliceAreaId,
        milestoneId: aliceMilestoneId,
        title: "Alice Proprietary IP Task",
        durationMinutes: 90,
        recurrenceDays: [1, 2, 3, 4, 5, 6, 7],
      },
    });
    aliceTaskId = aliceTask.id;

    const aliceInstance = await prisma.taskInstance.create({
      data: {
        userId: aliceId,
        taskId: aliceTaskId,
        date: testDate,
        title: aliceTask.title,
        priority: "HIGH",
        durationMinutes: 90,
        startMinute: 600,
        endMinute: 690,
        status: "PENDING",
      },
    });
    aliceInstanceId = aliceInstance.id;

    const alicePlan = await prisma.weeklyPlan.create({
      data: {
        userId: aliceId,
        weekStartDate: testDate,
        weekEndDate: new Date(testDate.getTime() + 6 * 24 * 60 * 60 * 1000),
        status: "ACTIVE",
      },
    });
    alicePlanId = alicePlan.id;

    await prisma.commitment.create({
      data: {
        userId: aliceId,
        title: "Alice Confidential Board Meeting",
        type: "CUSTOM",
        startMinute: 720,
        endMinute: 840,
        durationMinutes: 120,
        recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
      },
    });

    // 4. Populate Bob's own resource
    const bobArea = await prisma.lifeArea.create({
      data: {
        userId: bobId,
        type: "ACADEMIC",
        name: "Bob Academic Area",
        color: "#3b82f6",
      },
    });
    bobAreaId = bobArea.id;

    const bobTask = await prisma.task.create({
      data: {
        userId: bobId,
        areaId: bobAreaId,
        title: "Bob Homework",
        durationMinutes: 45,
        recurrenceDays: [1, 2, 3, 4, 5, 6, 7],
      },
    });
    bobTaskId = bobTask.id;
  });

  afterAll(async () => {
    // Clean up both test tenants
    await prisma.taskEvent.deleteMany({
      where: { instance: { userId: { in: [aliceId, bobId] } } },
    });
    await prisma.taskInstance.deleteMany({
      where: { userId: { in: [aliceId, bobId] } },
    });
    await prisma.capacitySnapshot.deleteMany({
      where: { userId: { in: [aliceId, bobId] } },
    });
    await prisma.weeklyPlanRevision.deleteMany({
      where: { weeklyPlan: { userId: { in: [aliceId, bobId] } } },
    });
    await prisma.weeklyPlan.deleteMany({
      where: { userId: { in: [aliceId, bobId] } },
    });
    await prisma.commitment.deleteMany({
      where: { userId: { in: [aliceId, bobId] } },
    });
    await prisma.task.deleteMany({
      where: { userId: { in: [aliceId, bobId] } },
    });
    await prisma.milestone.deleteMany({
      where: { goal: { userId: { in: [aliceId, bobId] } } },
    });
    await prisma.goal.deleteMany({
      where: { userId: { in: [aliceId, bobId] } },
    });
    await prisma.lifeArea.deleteMany({
      where: { userId: { in: [aliceId, bobId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [aliceId, bobId] } },
    });
  });

  describe("Anti-Enumeration Gate: Bob querying Alice's entities gets HTTP 404, never 403 or 200", () => {
    it("Task: GET /api/tasks/[aliceTaskId] as Bob returns 404", async () => {
      const req = new Request(`http://localhost/api/tasks/${aliceTaskId}`, {
        method: "GET",
        headers: { "x-user-id": bobId },
      });
      const res = await getTaskRoute(req, { params: Promise.resolve({ id: aliceTaskId }) });
      expect(res.status).toBe(404);
    });

    it("Task: PATCH /api/tasks/[aliceTaskId] as Bob returns 404", async () => {
      const req = new Request(`http://localhost/api/tasks/${aliceTaskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": bobId,
        },
        body: JSON.stringify({ title: "Hacked by Bob" }),
      });
      const res = await updateTaskRoute(req, { params: Promise.resolve({ id: aliceTaskId }) });
      expect(res.status).toBe(404);
    });

    it("Task: DELETE /api/tasks/[aliceTaskId] as Bob returns 404", async () => {
      const req = new Request(`http://localhost/api/tasks/${aliceTaskId}`, {
        method: "DELETE",
        headers: { "x-user-id": bobId },
      });
      const res = await deleteTaskRoute(req, { params: Promise.resolve({ id: aliceTaskId }) });
      expect(res.status).toBe(404);
    });

    it("Goal: GET, PATCH, DELETE /api/goals/[aliceGoalId] as Bob returns 404", async () => {
      const getReq = new Request(`http://localhost/api/goals/${aliceGoalId}`, {
        method: "GET",
        headers: { "x-user-id": bobId },
      });
      const getRes = await getGoalRoute(getReq, { params: Promise.resolve({ id: aliceGoalId }) });
      expect(getRes.status).toBe(404);

      const patchReq = new Request(`http://localhost/api/goals/${aliceGoalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": bobId },
        body: JSON.stringify({ title: "Stolen Goal" }),
      });
      const patchRes = await updateGoalRoute(patchReq, { params: Promise.resolve({ id: aliceGoalId }) });
      expect(patchRes.status).toBe(404);

      const delReq = new Request(`http://localhost/api/goals/${aliceGoalId}`, {
        method: "DELETE",
        headers: { "x-user-id": bobId },
      });
      const delRes = await deleteGoalRoute(delReq, { params: Promise.resolve({ id: aliceGoalId }) });
      expect(delRes.status).toBe(404);
    });

    it("Milestone: GET, PATCH, DELETE /api/milestones/[aliceMilestoneId] as Bob returns 404", async () => {
      const getReq = new Request(`http://localhost/api/milestones/${aliceMilestoneId}`, {
        method: "GET",
        headers: { "x-user-id": bobId },
      });
      const getRes = await getMilestoneRoute(getReq, { params: Promise.resolve({ id: aliceMilestoneId }) });
      expect(getRes.status).toBe(404);

      const patchReq = new Request(`http://localhost/api/milestones/${aliceMilestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": bobId },
        body: JSON.stringify({ title: "Stolen Milestone" }),
      });
      const patchRes = await updateMilestoneRoute(patchReq, { params: Promise.resolve({ id: aliceMilestoneId }) });
      expect(patchRes.status).toBe(404);

      const delReq = new Request(`http://localhost/api/milestones/${aliceMilestoneId}`, {
        method: "DELETE",
        headers: { "x-user-id": bobId },
      });
      const delRes = await deleteMilestoneRoute(delReq, { params: Promise.resolve({ id: aliceMilestoneId }) });
      expect(delRes.status).toBe(404);
    });

    it("LifeArea: GET, PATCH, DELETE /api/life-areas/[aliceAreaId] as Bob returns 404", async () => {
      const getReq = new Request(`http://localhost/api/life-areas/${aliceAreaId}`, {
        method: "GET",
        headers: { "x-user-id": bobId },
      });
      const getRes = await getLifeAreaRoute(getReq, { params: Promise.resolve({ id: aliceAreaId }) });
      expect(getRes.status).toBe(404);

      const patchReq = new Request(`http://localhost/api/life-areas/${aliceAreaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": bobId },
        body: JSON.stringify({ name: "Renamed Area" }),
      });
      const patchRes = await updateLifeAreaRoute(patchReq, { params: Promise.resolve({ id: aliceAreaId }) });
      expect(patchRes.status).toBe(404);

      const delReq = new Request(`http://localhost/api/life-areas/${aliceAreaId}`, {
        method: "DELETE",
        headers: { "x-user-id": bobId },
      });
      const delRes = await deleteLifeAreaRoute(delReq, { params: Promise.resolve({ id: aliceAreaId }) });
      expect(delRes.status).toBe(404);
    });

    it("TaskInstance Status: PATCH /api/task-instances/[aliceInstanceId]/status as Bob returns 404", async () => {
      const req = new Request(`http://localhost/api/task-instances/${aliceInstanceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": bobId,
        },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      const res = await updateStatusRoute(req, { params: Promise.resolve({ id: aliceInstanceId }) });
      expect(res.status).toBe(404);
    });

    it("TaskInstance Events: GET & POST /api/task-instances/[aliceInstanceId]/events as Bob returns 404", async () => {
      const getReq = new Request(`http://localhost/api/task-instances/${aliceInstanceId}/events`, {
        method: "GET",
        headers: { "x-user-id": bobId },
      });
      const getRes = await getEventsRoute(getReq, { params: Promise.resolve({ id: aliceInstanceId }) });
      expect(getRes.status).toBe(404);

      const postReq = new Request(`http://localhost/api/task-instances/${aliceInstanceId}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": bobId,
        },
        body: JSON.stringify({ eventType: "STARTED" }),
      });
      const postRes = await recordEventRoute(postReq, { params: Promise.resolve({ id: aliceInstanceId }) });
      expect(postRes.status).toBe(404);
    });

    it("WeeklyPlan: GET /api/weekly-plan/[alicePlanId] as Bob returns 404 (Not Found), never 403", async () => {
      const req = new Request(`http://localhost/api/weekly-plan/${alicePlanId}`, {
        method: "GET",
        headers: { "x-user-id": bobId },
      });
      const res = await getWeeklyPlanRoute(req, { params: Promise.resolve({ id: alicePlanId }) });
      expect(res.status).toBe(404);
    });
  });

  describe("Tenant Data Isolation & Query Boundary Gate", () => {
    it("Bob listing tasks receives ONLY Bob's tasks (Alice's proprietary task omitted)", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "GET",
        headers: { "x-user-id": bobId },
      });
      const res = await listTasksRoute(req);
      expect(res.status).toBe(200);

      const tasks = await res.json();
      expect(Array.isArray(tasks)).toBe(true);

      const taskIds = tasks.map((t: any) => t.id);
      expect(taskIds).toContain(bobTaskId);
      expect(taskIds).not.toContain(aliceTaskId);
    });

    it("Bob listing instances receives ONLY Bob's instances", async () => {
      const req = new Request(`http://localhost/api/task-instances?date=${testDate.toISOString().slice(0, 10)}`, {
        method: "GET",
        headers: { "x-user-id": bobId },
      });
      const res = await listInstancesRoute(req);
      expect(res.status).toBe(200);

      const instances = await res.json();
      const instanceIds = instances.map((i: any) => i.id);
      expect(instanceIds).not.toContain(aliceInstanceId);
    });

    it("Bob listing commitments receives ONLY Bob's commitments", async () => {
      const req = new Request("http://localhost/api/commitments", {
        method: "GET",
        headers: { "x-user-id": bobId },
      });
      const res = await getCommitmentsRoute(req);
      expect(res.status).toBe(200);

      const commitments = await res.json();
      const titles = commitments.map((c: any) => c.title);
      expect(titles).not.toContain("Alice Confidential Board Meeting");
    });

    it("Bob's capacity calculation is never polluted by Alice's planned minutes or commitments", async () => {
      const req = new Request("http://localhost/api/capacity/remaining", {
        method: "GET",
        headers: { "x-user-id": bobId },
      });
      const res = await getCapacityRemainingRoute(req);
      expect(res.status).toBe(200);

      const capacity = await res.json();
      // Alice has 90 min planned and 120 min commitment; Bob has 0 planned on testDate and 0 commitments
      expect(capacity.plannedMinutes).toBe(0);
      expect(capacity.commitmentMinutes).toBe(0);
    });
  });
});
