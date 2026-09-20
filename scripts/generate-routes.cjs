const fs = require('fs');
const path = require('path');

function writeRoute(relativePath, content) {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log('Created route:', relativePath);
}

// 1. Life Areas: GET, POST
writeRoute('src/app/api/life-areas/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { LifeAreaApplicationService } from "../../../services/life-area-app.service.js";

const service = new LifeAreaApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const areas = await service.listLifeAreas(actorUserId);
    return NextResponse.json(areas);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const created = await service.createLifeArea(actorUserId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 2. Life Areas [id]: GET, PATCH, DELETE
writeRoute('src/app/api/life-areas/[id]/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";
import { LifeAreaApplicationService } from "../../../../services/life-area-app.service.js";

const service = new LifeAreaApplicationService(prisma);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const area = await service.getLifeAreaById(actorUserId, id);
    return NextResponse.json(area);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const updated = await service.updateLifeArea(actorUserId, id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const result = await service.deleteLifeArea(actorUserId, id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 3. Goals: GET, POST
writeRoute('src/app/api/goals/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { GoalApplicationService } from "../../../services/goal-app.service.js";

const service = new GoalApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const url = new URL(req.url);
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const goals = await service.listGoals(actorUserId, includeArchived);
    return NextResponse.json(goals);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const created = await service.createGoal(actorUserId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 4. Goals [id]: GET, PATCH, DELETE
writeRoute('src/app/api/goals/[id]/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";
import { GoalApplicationService } from "../../../../services/goal-app.service.js";

const service = new GoalApplicationService(prisma);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const goal = await service.getGoalById(actorUserId, id);
    return NextResponse.json(goal);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const updated = await service.updateGoal(actorUserId, id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const archived = await service.deleteGoal(actorUserId, id);
    return NextResponse.json(archived);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 5. Milestones: GET, POST
writeRoute('src/app/api/milestones/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { MilestoneApplicationService } from "../../../services/milestone-app.service.js";

const service = new MilestoneApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const url = new URL(req.url);
    const goalId = url.searchParams.get("goalId");
    if (!goalId) {
      return NextResponse.json({ error: "Missing goalId query parameter." }, { status: 400 });
    }
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const milestones = await service.listMilestones(actorUserId, goalId, includeArchived);
    return NextResponse.json(milestones);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const created = await service.createMilestone(actorUserId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 6. Milestones [id]: GET, PATCH, DELETE
writeRoute('src/app/api/milestones/[id]/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";
import { MilestoneApplicationService } from "../../../../services/milestone-app.service.js";

const service = new MilestoneApplicationService(prisma);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const milestone = await service.getMilestoneById(actorUserId, id);
    return NextResponse.json(milestone);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const updated = await service.updateMilestone(actorUserId, id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const archived = await service.deleteMilestone(actorUserId, id);
    return NextResponse.json(archived);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 7. Tasks: GET, POST
writeRoute('src/app/api/tasks/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { TaskApplicationService } from "../../../services/task-app.service.js";

const service = new TaskApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const url = new URL(req.url);
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const tasks = await service.listTasks(actorUserId, includeArchived);
    return NextResponse.json(tasks);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const created = await service.createTask(actorUserId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 8. Tasks [id]: GET, PATCH, DELETE
writeRoute('src/app/api/tasks/[id]/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";
import { TaskApplicationService } from "../../../../services/task-app.service.js";

const service = new TaskApplicationService(prisma);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const task = await service.getTaskById(actorUserId, id);
    return NextResponse.json(task);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const updated = await service.updateTask(actorUserId, id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const archived = await service.archiveTask(actorUserId, id);
    return NextResponse.json(archived);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 9. Task Instances Today: GET
writeRoute('src/app/api/task-instances/today/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";
import { TaskInstanceApplicationService } from "../../../../services/task-instance-app.service.js";

const service = new TaskInstanceApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const instances = await service.getTodayInstances(actorUserId);
    return NextResponse.json(instances);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 10. Task Instances by Date: GET
writeRoute('src/app/api/task-instances/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { TaskInstanceApplicationService } from "../../../services/task-instance-app.service.js";

const service = new TaskInstanceApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();
    const instances = await service.getInstancesByDate(actorUserId, date);
    return NextResponse.json(instances);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 11. Task Instance Status: PATCH (Idempotent & Concurrency Safe)
writeRoute('src/app/api/task-instances/[id]/status/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../../lib/auth.js";
import { prisma } from "../../../../../lib/prisma.js";
import { TaskInstanceApplicationService, ConcurrencyConflictError } from "../../../../../services/task-instance-app.service.js";

const service = new TaskInstanceApplicationService(prisma);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const updated = await service.updateStatus(actorUserId, id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 12. Task Instance Events: GET, POST
writeRoute('src/app/api/task-instances/[id]/events/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../../lib/auth.js";
import { prisma } from "../../../../../lib/prisma.js";
import { TaskInstanceApplicationService } from "../../../../../services/task-instance-app.service.js";

const service = new TaskInstanceApplicationService(prisma);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const events = await service.getEventsForInstance(actorUserId, id);
    return NextResponse.json(events);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const recorded = await service.recordEvent(actorUserId, id, body.eventType, body.payload);
    return NextResponse.json(recorded, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 13. Capacity Remaining: GET
writeRoute('src/app/api/capacity/remaining/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";
import { CapacityApplicationService } from "../../../../services/capacity-app.service.js";

const service = new CapacityApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();
    const remaining = await service.getRemainingCapacity(actorUserId, date);
    return NextResponse.json(remaining);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 14. Capacity Today: GET
writeRoute('src/app/api/capacity/today/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";
import { CapacityApplicationService } from "../../../../services/capacity-app.service.js";

const service = new CapacityApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();
    const todayReport = await service.getTodayCapacity(actorUserId, date);
    return NextResponse.json(todayReport);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 15. Capacity Week: GET
writeRoute('src/app/api/capacity/week/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";
import { CapacityApplicationService } from "../../../../services/capacity-app.service.js";

const service = new CapacityApplicationService(prisma);

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate") || undefined;
    const weekReport = await service.getWeekCapacity(actorUserId, startDate);
    return NextResponse.json(weekReport);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 16. Weekly Plan: POST
writeRoute('src/app/api/weekly-plan/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { WeeklyPlanningService } from "../../../services/weekly-planning.service.js";

const service = new WeeklyPlanningService(prisma);

export async function POST(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const body = await req.json();
    const result = await service.runSundayRealityCheck({
      userId: actorUserId,
      weekStartDate: new Date(body.weekStartDate),
      plannedTasks: body.plannedTasks || [],
      forceOverride: body.forceOverride,
      changeReason: body.changeReason,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
`);

// 17. Weekly Plan [id]: GET
writeRoute('src/app/api/weekly-plan/[id]/route.ts', `
import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth.js";
import { prisma } from "../../../../lib/prisma.js";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actorUserId = await getCurrentUserId(req);
    const plan = await prisma.weeklyPlan.findUniqueOrThrow({
      where: { id },
      include: {
        revisions: {
          orderBy: { version: "asc" },
        },
      },
    });

    if (plan.userId !== actorUserId) {
      return NextResponse.json({ error: "Unauthorized access to weekly plan." }, { status: 403 });
    }

    return NextResponse.json({
      id: plan.id,
      userId: plan.userId,
      weekStartDate: plan.weekStartDate.toISOString().slice(0, 10),
      weekEndDate: plan.weekEndDate.toISOString().slice(0, 10),
      currentVersion: plan.currentVersion,
      status: plan.status,
      revisions: plan.revisions.map(r => ({
        version: r.version,
        grossAvailableHours: r.grossAvailableHours,
        committedHours: r.committedHours,
        netAvailableHours: r.netAvailableHours,
        plannedHours: r.plannedHours,
        actualHours: r.actualHours,
        isOverloaded: r.isOverloaded,
        overloadHours: r.overloadHours,
        changeReason: r.changeReason,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}
`);

console.log('All 17 Next.js API route handlers created successfully.');