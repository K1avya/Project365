import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { POST as createTaskRoute, GET as listTasksRoute } from "../src/app/api/tasks/route.js";
import { GET as getTaskRoute, PATCH as updateTaskRoute, DELETE as deleteTaskRoute } from "../src/app/api/tasks/[id]/route.js";
import { PATCH as updateStatusRoute } from "../src/app/api/task-instances/[id]/status/route.js";
import { GET as getCapacityRemainingRoute } from "../src/app/api/capacity/remaining/route.js";
import { POST as triggerJobRoute } from "../src/app/api/jobs/run/route.js";
import { GET as getHealthRoute } from "../src/app/api/health/route.js";
import { TimezoneService } from "../src/domain/time/timezone-service.js";

describe("HTTP API Contracts & DTO Validation Gate", () => {
  let userId: string;
  let lifeAreaId: string;
  let taskId: string;
  let instanceId: string;
  const testDate = TimezoneService.toLogicalCalendarDate(new Date(), 1, "UTC");

  beforeAll(async () => {
    // 1. Setup isolated user
    const user = await prisma.user.create({
      data: {
        email: `api-contract-test-${Date.now()}@project365.local`,
        name: "Contract Tester",
        dayStartHour: 6,
        logicalDayCutoffHour: 1,
        dailySleepHours: 7.0,
      },
    });
    userId = user.id;

    // 2. Setup life area
    const area = await prisma.lifeArea.create({
      data: {
        userId,
        type: "STARTUP",
        name: "Engineering Core",
        color: "#3b82f6",
      },
    });
    lifeAreaId = area.id;

    // 3. Create a task template
    const task = await prisma.task.create({
      data: {
        userId,
        areaId: lifeAreaId,
        title: "API Contract Validation Task",
        durationMinutes: 45,
        recurrenceDays: [1, 2, 3, 4, 5, 6, 7],
      },
    });
    taskId = task.id;

    // 4. Create an instance for status & concurrency tests
    const instance = await prisma.taskInstance.create({
      data: {
        userId,
        taskId,
        date: testDate,
        title: task.title,
        priority: "MEDIUM",
        durationMinutes: 45,
        startMinute: 600,
        endMinute: 645,
        status: "PENDING",
      },
    });
    instanceId = instance.id;
  });

  afterAll(async () => {
    await prisma.jobExecution.deleteMany({
      where: { jobName: "generate-daily-instances" },
    });
    await prisma.taskEvent.deleteMany({
      where: { instance: { userId } },
    });
    await prisma.taskInstance.deleteMany({
      where: { userId },
    });
    await prisma.capacitySnapshot.deleteMany({
      where: { userId },
    });
    await prisma.task.deleteMany({
      where: { userId },
    });
    await prisma.lifeArea.deleteMany({
      where: { userId },
    });
    await prisma.user.deleteMany({
      where: { id: userId },
    });
  });

  describe("POST & GET /api/tasks Contracts", () => {
    it("returns 201 Created with valid task DTO payload", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          areaId: lifeAreaId,
          title: "Build DTO Serializer",
          durationMinutes: 60,
          priority: "HIGH",
          energyRequired: "HIGH",
          isDeepWork: true,
          preferredMinute: 600,
        }),
      });

      const res = await createTaskRoute(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.id).toBeDefined();
      expect(json.title).toBe("Build DTO Serializer");
      expect(json.durationMinutes).toBe(60);
      expect(json.priority).toBe("HIGH");
      expect(json.isDeepWork).toBe(true);
      expect(json.userId).toBe(userId);
    });

    it("returns 400 Bad Request on empty or missing title", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          areaId: lifeAreaId,
          title: "   ",
          durationMinutes: 60,
        }),
      });

      const res = await createTaskRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain("Task title cannot be empty");
    });

    it("returns 400 Bad Request on invalid durationMinutes", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          areaId: lifeAreaId,
          title: "Negative Duration",
          durationMinutes: -10,
        }),
      });

      const res = await createTaskRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain("durationMinutes must be greater than 0");
    });

    it("returns 400 Bad Request on invalid preferredMinute range", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          areaId: lifeAreaId,
          title: "Out of Bounds Minute",
          durationMinutes: 30,
          preferredMinute: 1500,
        }),
      });

      const res = await createTaskRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain("preferredMinute must be between 0 and 1439");
    });

    it("returns 200 OK with array of task DTOs for user", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "GET",
        headers: {
          "x-user-id": userId,
        },
      });

      const res = await listTasksRoute(req);
      expect(res.status).toBe(200);

      const list = await res.json();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("GET, PATCH, DELETE /api/tasks/[id] Contracts", () => {
    it("GET returns 200 OK for valid owned task", async () => {
      const req = new Request(`http://localhost/api/tasks/${taskId}`, {
        method: "GET",
        headers: { "x-user-id": userId },
      });

      const res = await getTaskRoute(req, { params: Promise.resolve({ id: taskId }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.id).toBe(taskId);
    });

    it("GET returns 404 Not Found on nonexistent task UUID", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const req = new Request(`http://localhost/api/tasks/${fakeId}`, {
        method: "GET",
        headers: { "x-user-id": userId },
      });

      const res = await getTaskRoute(req, { params: Promise.resolve({ id: fakeId }) });
      expect(res.status).toBe(404);
    });

    it("PATCH returns 200 OK on valid update", async () => {
      const req = new Request(`http://localhost/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          title: "Updated Contract Task Title",
          durationMinutes: 75,
        }),
      });

      const res = await updateTaskRoute(req, { params: Promise.resolve({ id: taskId }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.title).toBe("Updated Contract Task Title");
      expect(json.durationMinutes).toBe(75);
    });

    it("DELETE returns 200 OK with isArchived: true", async () => {
      const req = new Request(`http://localhost/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: { "x-user-id": userId },
      });

      const res = await deleteTaskRoute(req, { params: Promise.resolve({ id: taskId }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.isArchived).toBe(true);
    });
  });

  describe("PATCH /api/task-instances/[id]/status Contracts", () => {
    it("returns 200 OK on valid status transition", async () => {
      const req = new Request(`http://localhost/api/task-instances/${instanceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          status: "ACTIVE",
        }),
      });

      const res = await updateStatusRoute(req, { params: Promise.resolve({ id: instanceId }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe("ACTIVE");
    });

    it("returns 409 Conflict when expectedStatus precondition fails", async () => {
      const req = new Request(`http://localhost/api/task-instances/${instanceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          status: "PAUSED",
          expectedStatus: "PENDING",
        }),
      });

      const res = await updateStatusRoute(req, { params: Promise.resolve({ id: instanceId }) });
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.error).toContain("Expected status");
    });

    it("returns 404 Not Found when updating a nonexistent instance ID", async () => {
      const fakeInstanceId = "11111111-1111-1111-1111-111111111111";
      const req = new Request(`http://localhost/api/task-instances/${fakeInstanceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          status: "PAUSED",
        }),
      });

      const res = await updateStatusRoute(req, { params: Promise.resolve({ id: fakeInstanceId }) });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/capacity/remaining Contract", () => {
    it("returns 200 OK with capacity breakdown fields", async () => {
      const req = new Request("http://localhost/api/capacity/remaining", {
        method: "GET",
        headers: { "x-user-id": userId },
      });

      const res = await getCapacityRemainingRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(typeof json.remainingMinutes).toBe("number");
      expect(typeof json.remainingHours).toBe("number");
      expect(typeof json.plannedMinutes).toBe("number");
      expect(typeof json.commitmentMinutes).toBe("number");
      expect(typeof json.availableMinutes).toBe("number");
    });
  });

  describe("POST /api/jobs/run Contract", () => {
    it("returns 400 Bad Request when jobName is missing", async () => {
      const req = new Request("http://localhost/api/jobs/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-job-key": "project365-job-secret",
        },
        body: JSON.stringify({}),
      });

      const res = await triggerJobRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain('Missing required field "jobName"');
    });

    it("returns 400 Bad Request for unknown jobName", async () => {
      const req = new Request("http://localhost/api/jobs/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-job-key": "project365-job-secret",
        },
        body: JSON.stringify({ jobName: "invalid-job-name" }),
      });

      const res = await triggerJobRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain("Unknown jobName");
    });

    it("returns 200 OK with execution result for valid job", async () => {
      const req = new Request("http://localhost/api/jobs/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-job-key": "project365-job-secret",
        },
        body: JSON.stringify({
          jobName: "generate-daily-instances",
          targetDate: "2026-11-20",
        }),
      });

      const res = await triggerJobRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.result).toBeDefined();
      expect(json.result.jobName).toBe("generate-daily-instances");
    });
  });

  describe("GET /api/health Contract", () => {
    it("returns 200 OK with status healthy", async () => {
      const res = await getHealthRoute();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe("healthy");
      expect(json.database.connected).toBe(true);
    });
  });
});
