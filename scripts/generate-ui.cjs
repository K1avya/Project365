const fs = require('fs');
const path = require('path');

function writeFile(relativePath, content) {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log('Created UI file:', relativePath);
}

// 1. src/app/globals.css
writeFile('src/app/globals.css', `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #090d16;
  --bg-card: rgba(18, 24, 38, 0.85);
  --border-color: rgba(255, 255, 255, 0.08);
  --accent-cyan: #06b6d4;
  --accent-purple: #8b5cf6;
  --accent-emerald: #10b981;
  --accent-amber: #f59e0b;
  --accent-rose: #f43f5e;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-primary);
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.glass-card {
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-color);
  border-radius: 14px;
}

.glass-card-hero {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.15);
  border-radius: 16px;
}

.progress-bar-bg {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 9999px;
  overflow: hidden;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
}
.btn-primary:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.btn-emerald {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}
.btn-emerald:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.btn-amber {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.14);
}
`);

// 2. src/app/layout.tsx
writeFile('src/app/layout.tsx', `
import "./globals.css";

export const metadata = {
  title: "Project365 - Dynamic Life OS",
  description: "Capacity-Aware, Event-Sourced Human Reality Operating System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </div>
      </body>
    </html>
  );
}
`);

// 3. src/lib/timer-utils.ts (Pure Event-Derived Timer Math)
writeFile('src/lib/timer-utils.ts', `
import type { TaskEventResponseDTO } from "../dtos/event.dto.js";

/**
 * Derives exact elapsed work milliseconds from the append-only event stream.
 * ZERO reliance on client React state or setInterval drift.
 */
export function computeElapsedSeconds(
  events: TaskEventResponseDTO[] | undefined,
  currentStatus: string,
  nowMs: number = Date.now()
): number {
  if (!events || events.length === 0) {
    return 0;
  }

  let totalMs = 0;
  let runningStartMs: number | null = null;

  // Sort events chronologically
  const sorted = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const ev of sorted) {
    const evTime = new Date(ev.createdAt).getTime();

    if (ev.eventType === "STARTED" || ev.eventType === "RESUMED") {
      runningStartMs = evTime;
    } else if (
      (ev.eventType === "PAUSED" || ev.eventType === "COMPLETED" || ev.eventType === "MISSED") &&
      runningStartMs !== null
    ) {
      totalMs += Math.max(0, evTime - runningStartMs);
      runningStartMs = null;
    }
  }

  // If task is currently ACTIVE and has not ended
  if (currentStatus === "ACTIVE" && runningStartMs !== null) {
    totalMs += Math.max(0, nowMs - runningStartMs);
  }

  return Math.floor(totalMs / 1000);
}

export function formatTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hrs > 0) {
    return \`\${pad(hrs)}:\${pad(mins)}:\${pad(secs)}\`;
  }
  return \`\${pad(mins)}:\${pad(secs)}\`;
}
`);

// 4. src/app/page.tsx (Single "Today" Screen)
writeFile('src/app/page.tsx', `
"use client";

import React, { useEffect, useState, useTransition } from "react";
import { computeElapsedSeconds, formatTime } from "../lib/timer-utils.js";
import type { TaskInstanceResponseDTO } from "../dtos/task.dto.js";
import type { CapacityRemainingResponseDto } from "../dtos/capacity.dto.js";
import { Play, Pause, CheckCircle2, Lock, Clock, Flame, ShieldAlert, Sparkles, RefreshCw, Calendar } from "lucide-react";

export default function TodayExecutionPage() {
  const [capacity, setCapacity] = useState<CapacityRemainingResponseDto | null>(null);
  const [instances, setInstances] = useState<TaskInstanceResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(Date.now());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Refresh clock every second ONLY for display (zero state drift)
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's data
  async function loadData() {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [capRes, instRes] = await Promise.all([
        fetch("/api/capacity/remaining"),
        fetch("/api/task-instances/today"),
      ]);

      if (!capRes.ok || !instRes.ok) {
        throw new Error("Failed to load today's schedule from API.");
      }

      const capData: CapacityRemainingResponseDto = await capRes.json();
      const instData: TaskInstanceResponseDTO[] = await instRes.json();

      setCapacity(capData);
      setInstances(instData);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Status transition handler
  async function handleStatusChange(
    instanceId: string,
    newStatus: "ACTIVE" | "PAUSED" | "PENDING" | "COMPLETED",
    actualMinutes?: number
  ) {
    try {
      setErrorMsg(null);
      const res = await fetch(\`/api/task-instances/\${instanceId}/status\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(actualMinutes !== undefined ? { actualMinutes } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Action failed.");
      }

      // Reload fresh state directly from event ledger
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  // Priority order sorting:
  // 1. Next Task: First ACTIVE task, or first PENDING task
  const activeTask = instances.find(i => i.status === "ACTIVE");
  const nextPendingTask = instances.find(i => i.status === "PENDING");
  const heroTask = activeTask || nextPendingTask || null;

  // Other Actionable Tasks (excluding the hero task)
  const actionableTasks = instances.filter(
    i => (i.status === "PENDING" || i.status === "PAUSED") && i.id !== heroTask?.id
  );

  // Blocked Tasks
  const blockedTasks = instances.filter(i => i.status === "BLOCKED");

  // Completed Tasks for reference
  const completedTasks = instances.filter(i => i.status === "COMPLETED");

  // Fixed Commitments (Reality Anchors)
  const commitments = [
    { title: "Morning Bus Commute", time: "07:00 - 09:00", duration: "120 min", type: "COMMUTE" },
    { title: "College Lectures & Labs", time: "09:00 - 15:00", duration: "360 min", type: "COLLEGE" },
    { title: "Evening Commute Return", time: "15:00 - 16:30", duration: "90 min", type: "COMMUTE" },
    { title: "Dinner & Family Routine", time: "20:00 - 20:30", duration: "30 min", type: "ROUTINE" },
  ];

  return (
    <main className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Project365 Life OS</h1>
            <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/30">MVP</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Today's Reality-Anchored Execution Space</span>
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="btn btn-secondary text-xs self-start sm:self-auto py-1.5 px-3"
        >
          <RefreshCw className={\`w-3.5 h-3.5 \${loading ? "animate-spin" : ""}\`} />
          <span>Sync State</span>
        </button>
      </header>

      {/* Error banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. TOP CAPACITY REALITY ENVELOPE                          */}
      {/* ────────────────────────────────────────────────────────── */}
      {capacity && (
        <section className="glass-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Human Reality Envelope (24 Hours)
              </span>
              <div className="text-3xl font-extrabold text-white flex items-baseline gap-2 mt-0.5">
                <span>{capacity.remainingHours}h</span>
                <span className="text-sm font-medium text-emerald-400">
                  Remaining Discretionary Capacity
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                CAPACITY HEALTHY
              </span>
            </div>
          </div>

          {/* Capacity Progress Bar */}
          <div className="space-y-1.5">
            <div className="progress-bar-bg h-2.5 w-full flex">
              {/* Committed */}
              <div
                style={{ width: \`\${(capacity.commitmentMinutes / 1020) * 100}%\` }}
                className="bg-slate-600 h-full"
                title="Fixed Commitments"
              />
              {/* Planned */}
              <div
                style={{ width: \`\${(capacity.plannedMinutes / 1020) * 100}%\` }}
                className="bg-purple-500 h-full"
                title="Planned Tasks"
              />
              {/* Remaining Buffer */}
              <div
                style={{ width: \`\${(capacity.remainingMinutes / 1020) * 100}%\` }}
                className="bg-emerald-500 h-full"
                title="Available Buffer"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-slate-400 block">Committed (Fixed)</span>
                <strong className="text-slate-200 text-sm">{(capacity.commitmentMinutes / 60).toFixed(1)}h</strong>
                <span className="text-[10px] text-slate-400 block">College, Commute, Routine</span>
              </div>
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-slate-400 block">Net Discretionary</span>
                <strong className="text-slate-200 text-sm">{(capacity.availableMinutes / 60).toFixed(1)}h</strong>
                <span className="text-[10px] text-slate-400 block">Total waking free time</span>
              </div>
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-slate-400 block">Planned Tasks</span>
                <strong className="text-purple-300 text-sm">{(capacity.plannedMinutes / 60).toFixed(1)}h</strong>
                <span className="text-[10px] text-slate-400 block">Assigned today</span>
              </div>
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-slate-400 block">Discretionary Buffer</span>
                <strong className="text-emerald-400 text-sm">{(capacity.remainingMinutes / 60).toFixed(1)}h</strong>
                <span className="text-[10px] text-emerald-400/80 block">Safe margin remaining</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. NEXT ACTION (Hero Card: "What should I do right now?") */}
      {/* ────────────────────────────────────────────────────────── */}
      {heroTask ? (
        <section className="glass-card-hero p-6 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="badge bg-purple-500/30 text-purple-200 border border-purple-500/50 flex items-center gap-1.5 py-1 px-2.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              NEXT ACTION
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {heroTask.areaName || "Startup"}
              </span>
              <span
                className={\`badge \${
                  heroTask.status === "ACTIVE"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-slate-700 text-slate-300"
                }\`}
              >
                {heroTask.status === "ACTIVE" ? "IN PROGRESS" : "READY"}
              </span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            {heroTask.title}
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mb-5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Target: {heroTask.durationMinutes} min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Energy: {heroTask.energyRequired}</span>
            </div>
            {heroTask.isDeepWork && (
              <span className="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                DEEP WORK
              </span>
            )}
          </div>

          {/* Live Event-Sourced Timer */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                Event-Derived Work Timer
              </span>
              <div className="text-3xl font-mono font-bold text-white tracking-wider">
                {formatTime(computeElapsedSeconds(heroTask.events, heroTask.status, nowMs))}
                <span className="text-sm font-normal text-slate-400 ml-2">
                  / {heroTask.durationMinutes}:00 min
                </span>
              </div>
            </div>

            {/* Execution Controls */}
            <div className="flex items-center gap-2.5">
              {heroTask.status !== "ACTIVE" ? (
                <button
                  onClick={() => handleStatusChange(heroTask.id, "ACTIVE")}
                  className="btn btn-primary text-sm py-2.5 px-5"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{heroTask.status === "PAUSED" ? "Resume Work" : "Start Now"}</span>
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange(heroTask.id, "PAUSED")}
                  className="btn btn-secondary text-sm py-2.5 px-4"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </button>
              )}

              <button
                onClick={() => {
                  const elapsedSeconds = computeElapsedSeconds(heroTask.events, heroTask.status, nowMs);
                  const actualMinutes = Math.max(1, Math.round(elapsedSeconds / 60)) || heroTask.durationMinutes;
                  handleStatusChange(heroTask.id, "COMPLETED", actualMinutes);
                }}
                className="btn btn-emerald text-sm py-2.5 px-5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Task</span>
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="glass-card p-6 text-center text-slate-400">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
          <p className="font-semibold text-white">All actionable tasks for today are complete!</p>
          <span className="text-xs">Take rest or pull tasks from your backlog below.</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. ACTIONABLE TASKS QUEUE                                 */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Actionable Tasks Queue ({actionableTasks.length})
          </h3>
          <span className="text-xs text-slate-500">Unblocked & Ready</span>
        </div>

        {actionableTasks.length === 0 ? (
          <div className="p-4 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-400 text-center">
            No other pending tasks in the queue.
          </div>
        ) : (
          <div className="space-y-2">
            {actionableTasks.map(task => (
              <div
                key={task.id}
                className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/20 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: task.areaColor || "#8b5cf6" }}
                    />
                    <span className="text-xs text-slate-400">{task.areaName || "Area"}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">{task.durationMinutes} min</span>
                    <span className="badge bg-slate-700 text-slate-300 text-[10px]">
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-white">{task.title}</h4>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleStatusChange(task.id, "ACTIVE")}
                    className="btn btn-secondary text-xs py-1.5 px-3"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Start</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange(task.id, "COMPLETED", task.durationMinutes)}
                    className="btn btn-secondary text-xs py-1.5 px-3 text-emerald-400"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. BLOCKED TASKS (Waiting on Prerequisites)               */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Blocked Tasks ({blockedTasks.length})
          </h3>
          <span className="text-xs text-slate-500">DAG Dependency Protected</span>
        </div>

        {blockedTasks.length === 0 ? (
          <div className="p-3.5 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-400 text-center">
            No blocked tasks. All dependencies are satisfied!
          </div>
        ) : (
          <div className="space-y-2">
            {blockedTasks.map(task => (
              <div
                key={task.id}
                className="glass-card p-4 border-dashed border-white/10 opacity-75 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                      BLOCKED
                    </span>
                    <span className="text-xs text-slate-400">{task.durationMinutes} min</span>
                  </div>
                  <h4 className="text-sm font-medium text-slate-200">{task.title}</h4>

                  {/* Prerequisite wait chips */}
                  {task.prerequisites && task.prerequisites.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-amber-300/80">
                      <span>Waiting on:</span>
                      {task.prerequisites.map(p => (
                        <span
                          key={p.id}
                          className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono text-[10px]"
                        >
                          {p.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-xs text-slate-500 italic self-end sm:self-auto">
                  Auto-unlocks on prerequisite completion
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 5. TODAY'S NON-NEGOTIABLE COMMITMENTS                     */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Today's Commitments (Fixed Reality)
          </h3>
          <span className="text-xs text-slate-500">Non-Negotiable (10.0 Hours)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {commitments.map((c, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-200 block">{c.title}</span>
                <span className="text-[11px] text-slate-400">{c.time}</span>
              </div>
              <span className="badge bg-slate-800 text-slate-400 text-[10px]">
                {c.duration}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 6. BACKLOG RECOVERY QUEUE                                 */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="space-y-3 pb-8">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Backlog Recovery Queue
          </h3>
          <span className="text-xs text-slate-500">Carried Over & Future</span>
        </div>

        <div className="glass-card p-4 flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-medium text-white">Integration & Benchmark Testing</h4>
            <span className="text-xs text-slate-400">Duration: 60 min • Priority: HIGH • Energy: MEDIUM</span>
          </div>
          <button
            onClick={() => alert("Capacity validation: 1.0h will be allocated from your remaining 4.0h buffer.")}
            className="btn btn-secondary text-xs py-1.5 px-3 whitespace-nowrap"
          >
            Activate for Today
          </button>
        </div>
      </section>
    </main>
  );
}
`);

console.log('All UI files generated successfully.');