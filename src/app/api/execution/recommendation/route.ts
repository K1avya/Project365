import { NextResponse } from "next/server";
import { getCurrentUserId } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { handleApiError } from "../../../../lib/errors";
import { ExecutionApplicationService } from "../../../../services/execution-app.service";
import type { ExecutionRecommendationQueryDTO } from "../../../../dtos/execution.dto";
import type {
  Connectivity,
  ExecutionDevice,
  ExecutionEnvironment,
} from "../../../../domain/execution/execution-decision-engine";
import type { EnergyLevel } from "../../../../domain/types";

const service = new ExecutionApplicationService(prisma);

const ENVIRONMENTS = new Set<ExecutionEnvironment>(["HOME", "COLLEGE", "COMMUTE", "LIBRARY"]);
const DEVICES = new Set<ExecutionDevice>(["MOBILE", "LAPTOP"]);
const ENERGY = new Set<EnergyLevel>(["HIGH", "MEDIUM", "LOW"]);
const CONNECTIVITY = new Set<Connectivity>(["ONLINE", "OFFLINE"]);

function parseQuery(url: URL): ExecutionRecommendationQueryDTO {
  const q: ExecutionRecommendationQueryDTO = {};
  const env = url.searchParams.get("environment")?.toUpperCase();
  if (env && ENVIRONMENTS.has(env as ExecutionEnvironment)) {
    q.environment = env as ExecutionEnvironment;
  }
  const device = url.searchParams.get("device")?.toUpperCase();
  if (device && DEVICES.has(device as ExecutionDevice)) {
    q.device = device as ExecutionDevice;
  }
  const energy = url.searchParams.get("energy")?.toUpperCase();
  if (energy && ENERGY.has(energy as EnergyLevel)) {
    q.energy = energy as EnergyLevel;
  }
  const connectivity = url.searchParams.get("connectivity")?.toUpperCase();
  if (connectivity && CONNECTIVITY.has(connectivity as Connectivity)) {
    q.connectivity = connectivity as Connectivity;
  }
  const mins = url.searchParams.get("availableMinutes");
  if (mins) {
    const n = Number(mins);
    if (Number.isFinite(n) && n > 0) q.availableMinutes = Math.round(n);
  }
  return q;
}

export async function GET(req: Request) {
  try {
    const actorUserId = await getCurrentUserId(req);
    const recommendation = await service.getRecommendation(actorUserId, parseQuery(new URL(req.url)));
    return NextResponse.json(recommendation);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
