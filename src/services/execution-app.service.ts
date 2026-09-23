import type { PrismaClient } from "@prisma/client";
import {
  ExecutionDecisionEngine,
  inferEnvironmentFromCommitments,
  type ExecutionCandidate,
  type ExecutionContext,
} from "../domain/execution/execution-decision-engine";
import { TimezoneService } from "../domain/time/timezone-service";
import type {
  ExecutionRecommendationQueryDTO,
  ExecutionRecommendationResponseDTO,
  ExecutionRecommendationItemDTO,
} from "../dtos/execution.dto";
import type { EnergyLevel, LifeAreaType } from "../domain/types";
import { TaskInstanceApplicationService } from "./task-instance-app.service";

const engine = new ExecutionDecisionEngine();

const LIFE_AREA_TAGS: Record<LifeAreaType, string[]> = {
  ACADEMIC: ["college", "academic"],
  STARTUP: ["startup"],
  CAREER_CODING: ["leetcode", "career", "career_coding"],
  HEALTH: ["health", "walking"],
  PERSONAL: ["personal"],
};

function mapInstanceToCandidate(
  inst: Awaited<ReturnType<TaskInstanceApplicationService["getTodayInstances"]>>[number]
): ExecutionCandidate {
  const tags: string[] = [];
  if (inst.areaName) {
    tags.push(inst.areaName.toLowerCase().replace(/\s+/g, "_"));
  }

  const prereqs = inst.prerequisites ?? [];
  const isBlocked =
    inst.status === "BLOCKED" ||
    prereqs.some((p) => !p.isCompleted);

  const unlocksCount = prereqs.length > 0 ? 0 : undefined;

  return {
    id: inst.id,
    title: inst.title,
    source: "task_instance",
    priority: inst.priority,
    energyRequired: inst.energyRequired,
    durationMinutes: inst.durationMinutes,
    isDeepWork: inst.isDeepWork,
    isBlocked,
    objectiveTags: tags,
    sourceDateKey: inst.date,
    dbInstanceId: inst.id,
    unlocksCount,
  };
}

function toItemDto(scored: ReturnType<ExecutionDecisionEngine["scoreCandidate"]>): ExecutionRecommendationItemDTO {
  return {
    id: scored.candidate.id,
    title: scored.candidate.title,
    source: scored.candidate.source,
    score: scored.score,
    contextFit: scored.contextFit,
    reasons: scored.reasons,
    durationMinutes: scored.candidate.durationMinutes,
    priority: scored.candidate.priority,
    energyRequired: scored.candidate.energyRequired,
    taskInstanceId: scored.candidate.dbInstanceId,
  };
}

export class ExecutionApplicationService {
  private instances: TaskInstanceApplicationService;

  constructor(private prisma: PrismaClient) {
    this.instances = new TaskInstanceApplicationService(prisma);
  }

  async getRecommendation(
    actorUserId: string,
    query: ExecutionRecommendationQueryDTO
  ): Promise<ExecutionRecommendationResponseDTO> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actorUserId },
      include: {
        commitments: { where: { isActive: true } },
        lifeAreas: true,
      },
    });

    const today = TimezoneService.toLogicalCalendarDate(
      new Date(),
      user.logicalDayCutoffHour,
      "UTC"
    );
    const todayDateKey = TimezoneService.toLogicalDateString(
      today,
      user.logicalDayCutoffHour,
      "UTC"
    );
    const dayOfWeek = today.getUTCDay();
    const todayCommitments = user.commitments.filter((c) =>
      c.recurrenceDays.includes(dayOfWeek)
    );

    const now = new Date();
    const nowMinute = now.getUTCHours() * 60 + now.getUTCMinutes();

    const environment =
      query.environment ??
      inferEnvironmentFromCommitments(
        nowMinute,
        todayCommitments.map((c) => ({
          type: c.type,
          startMinute: c.startMinute,
          endMinute: c.endMinute,
        }))
      );

    const device: ExecutionContext["device"] =
      query.device ?? (environment === "COMMUTE" ? "MOBILE" : "LAPTOP");

    const energy: EnergyLevel = query.energy ?? "MEDIUM";
    const connectivity = query.connectivity ?? "ONLINE";

    const allInstances = await this.instances.getTodayInstances(actorUserId);
    const executableStatuses = new Set(["PENDING", "ACTIVE", "BLOCKED"]);
    const candidates: ExecutionCandidate[] = allInstances
      .filter((i) => executableStatuses.has(i.status))
      .map((inst) => {
        const base = mapInstanceToCandidate(inst);
        const area = user.lifeAreas.find((a) => a.id === inst.areaId);
        if (area) {
          base.objectiveTags = [
            ...new Set([...base.objectiveTags, ...LIFE_AREA_TAGS[area.type]]),
          ];
          base.lifeAreaType = area.type;
        }
        return base;
      });

    const defaultAvailable = query.availableMinutes ?? 45;

    const ctx: ExecutionContext = {
      environment,
      device,
      availableMinutes: defaultAvailable,
      energy,
      connectivity,
      activeProfile: user.activeProfile,
      todayDateKey,
    };

    const ranked = engine.rank(ctx, candidates);
    const primary = ranked[0] ?? null;
    const alternatives = ranked.slice(1, 4);

    return {
      activeProfile: user.activeProfile,
      context: {
        environment,
        device,
        availableMinutes: ctx.availableMinutes,
        energy,
        connectivity,
        todayDateKey,
      },
      primary: primary ? toItemDto(primary) : null,
      alternatives: alternatives.map(toItemDto),
      telemetry: {
        candidateCount: candidates.length,
        executableCount: ranked.length,
      },
    };
  }
}
