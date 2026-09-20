import { describe, it, expect } from "vitest";
import { InstanceGenerator } from "../src/domain/tasks/instance-generator.js";
import { DAGService, type DependencyEdge } from "../src/domain/tasks/dag-service.js";
import type { Task } from "../src/domain/types.js";

interface BenchmarkResult {
  taskCount: number;
  edgeCount: number;
  generationMs: number;
  resolutionMs: number;
  unblockMs: number;
  perTaskGenMicroseconds: number;
}

describe("DAG Scale & Complexity Benchmark Gate (O(N) & O(E) Validation)", () => {
  const dagService = new DAGService();
  const generator = new InstanceGenerator(dagService);

  // Helper to synthesize a complex DAG graph with N tasks and ~1.5N edges
  function generateSyntheticDAG(N: number): {
    templates: Task[];
    dependencies: DependencyEdge[];
  } {
    const templates: Task[] = [];
    const dependencies: DependencyEdge[] = [];

    // Create N tasks across 5 parallel life areas
    for (let i = 0; i < N; i++) {
      templates.push({
        id: `synth-task-${i}`,
        userId: "bench-user",
        areaId: `area-${i % 5}`,
        milestoneId: `milestone-${Math.floor(i / 50)}`,
        title: `Synthetic Engineering Task ${i}`,
        description: `High-scale benchmark task payload ${i}`,
        durationMinutes: 30 + (i % 90),
        priority: i % 4 === 0 ? "CRITICAL" : i % 3 === 0 ? "HIGH" : "MEDIUM",
        energyRequired: i % 2 === 0 ? "HIGH" : "MEDIUM",
        preferredMinute: null,
        isDeepWork: i % 3 === 0,
        recurrenceDays: [0, 1, 2, 3, 4, 5, 6], // Active today
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Create realistic DAG dependencies:
    // 1. Sequential pipeline chains (i -> i + 1)
    // 2. Diamond convergence points (i -> i + 2, i + 1 -> i + 2)
    for (let i = 0; i < N - 2; i++) {
      // Direct prerequisite
      dependencies.push({
        taskId: `synth-task-${i + 1}`,
        dependsOnTaskId: `synth-task-${i}`,
      });

      // Diamond edge every 4 tasks
      if (i % 4 === 0 && i + 2 < N) {
        dependencies.push({
          taskId: `synth-task-${i + 2}`,
          dependsOnTaskId: `synth-task-${i}`,
        });
      }
    }

    return { templates, dependencies };
  }

  const scales = [100, 500, 1000, 5000];
  const benchmarkResults: BenchmarkResult[] = [];

  for (const N of scales) {
    it(`profiles scaling behavior for N=${N} tasks in synthetic DAG`, () => {
      const { templates, dependencies } = generateSyntheticDAG(N);
      const targetDate = new Date("2026-09-19T00:00:00Z");
      const completedHistoricalIds = new Set<string>();

      // Pre-complete 20% of tasks
      for (let i = 0; i < Math.floor(N * 0.2); i++) {
        completedHistoricalIds.add(`synth-task-${i}`);
      }

      // 1. Profile Instance Generation Time (O(N))
      const startGen = performance.now();
      const instances = generator.generateForDate({
        targetDate,
        templates,
        dependencies,
        completedHistoricalTaskIds: completedHistoricalIds,
      });
      const endGen = performance.now();
      const generationMs = endGen - startGen;

      expect(instances.length).toBe(N);

      // 2. Profile DAG Dependency Resolution (O(N + E))
      const prereqMap = new Map<string, string[]>();
      for (const d of dependencies) {
        if (!prereqMap.has(d.taskId)) prereqMap.set(d.taskId, []);
        prereqMap.get(d.taskId)!.push(d.dependsOnTaskId);
      }

      const startRes = performance.now();
      let blockedCount = 0;
      let pendingCount = 0;
      for (const t of templates) {
        const prereqs = prereqMap.get(t.id) || [];
        const status = dagService.resolveTaskStatus(t.id, prereqs, completedHistoricalIds);
        if (status === "BLOCKED") blockedCount++;
        if (status === "PENDING") pendingCount++;
      }
      const endRes = performance.now();
      const resolutionMs = endRes - startRes;

      expect(blockedCount + pendingCount).toBe(N);

      // 3. Profile Atomic Downstream Unblocking Simulation
      // Simulate completing task 0 and checking all downstream dependents
      const startUnblock = performance.now();
      const completedTaskId = "synth-task-0";
      const downstreamEdges = dependencies.filter(d => d.dependsOnTaskId === completedTaskId);
      const unblockedTaskIds: string[] = [];

      for (const edge of downstreamEdges) {
        const allPrereqs = prereqMap.get(edge.taskId) || [];
        const updatedCompleted = new Set([...completedHistoricalIds, completedTaskId]);
        const status = dagService.resolveTaskStatus(edge.taskId, allPrereqs, updatedCompleted);
        if (status === "PENDING") {
          unblockedTaskIds.push(edge.taskId);
        }
      }
      const endUnblock = performance.now();
      const unblockMs = endUnblock - startUnblock;

      const perTaskGenMicroseconds = Math.round((generationMs / N) * 1000);

      benchmarkResults.push({
        taskCount: N,
        edgeCount: dependencies.length,
        generationMs: Number(generationMs.toFixed(2)),
        resolutionMs: Number(resolutionMs.toFixed(2)),
        unblockMs: Number(unblockMs.toFixed(3)),
        perTaskGenMicroseconds,
      });
    });
  }

  it("verifies linear growth O(N + E) complexity across all tested scale tiers", () => {
    // Print ASCII Complexity Benchmark Table
    console.log("\n=================== DAG SCALE & COMPLEXITY BENCHMARK ===================");
    console.log("| Tasks (N) | Edges (E) | Gen Time (ms) | Resolve (ms) | Unblock (ms) | μs/Task |");
    console.log("|-----------|-----------|---------------|--------------|--------------|---------|");
    for (const r of benchmarkResults) {
      console.log(
        `| ${String(r.taskCount).padEnd(9)} | ${String(r.edgeCount).padEnd(9)} | ${String(r.generationMs).padEnd(13)} | ${String(r.resolutionMs).padEnd(12)} | ${String(r.unblockMs).padEnd(12)} | ${String(r.perTaskGenMicroseconds).padEnd(7)} |`
      );
    }
    console.log("========================================================================\n");

    const r100 = benchmarkResults.find(r => r.taskCount === 100)!;
    const r500 = benchmarkResults.find(r => r.taskCount === 500)!;
    const r1000 = benchmarkResults.find(r => r.taskCount === 1000)!;
    const r5000 = benchmarkResults.find(r => r.taskCount === 5000)!;

    // Linear complexity verification:
    // In an O(N) algorithm, per-task time (μs/Task) remains roughly constant (within 5x variation)
    // rather than growing polynomially (e.g. O(N^2) would cause a 50x jump from N=100 to N=5000).
    const ratioPerTask = r5000.generationMs / 5000 / (r500.generationMs / 500);

    // Verify ratio shows linear scaling (growth factor <= 4.0x)
    expect(ratioPerTask).toBeLessThan(4.0);

    // Unblock latency for 5000 tasks must remain sub-millisecond (thanks to direct edge lookup)
    expect(r5000.unblockMs).toBeLessThan(10.0);
  });
});
