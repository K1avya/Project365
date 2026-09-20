import { describe, it, expect, beforeEach } from "vitest";
import {
  DAGService,
  CircularDependencyError,
  MaxDependencyDepthExceededError,
  type DependencyEdge,
} from "../src/domain/tasks/dag-service.js";

describe("Module 3: DAG Service", () => {
  let dag: DAGService;

  beforeEach(() => {
    dag = new DAGService();
  });

  describe("Cycle Detection", () => {
    it("rejects direct self-dependency (A -> A)", () => {
      expect(() => dag.validateDependency("A", "A", [])).toThrow(CircularDependencyError);
    });

    it("rejects two-node circular cycle (A -> B and B -> A)", () => {
      const edges: DependencyEdge[] = [{ taskId: "A", dependsOnTaskId: "B" }];
      // Attempting to make B depend on A:
      expect(() => dag.validateDependency("B", "A", edges)).toThrow(CircularDependencyError);
    });

    it("rejects multi-node transitive cycle (A -> B -> C and C -> A)", () => {
      const edges: DependencyEdge[] = [
        { taskId: "A", dependsOnTaskId: "B" },
        { taskId: "B", dependsOnTaskId: "C" },
      ];
      // Attempting to make C depend on A:
      expect(() => dag.validateDependency("C", "A", edges)).toThrow(CircularDependencyError);
    });

    it("accepts valid diamond DAG without cycles", () => {
      // D depends on B and C; both B and C depend on A
      const edges: DependencyEdge[] = [
        { taskId: "B", dependsOnTaskId: "A" },
        { taskId: "C", dependsOnTaskId: "A" },
      ];
      expect(() => dag.validateDependency("D", "B", edges)).not.toThrow();
      edges.push({ taskId: "D", dependsOnTaskId: "B" });
      expect(() => dag.validateDependency("D", "C", edges)).not.toThrow();
    });
  });

  describe("Maximum Dependency Depth (<= 20)", () => {
    it("allows dependency chain of depth exactly 20", () => {
      const edges: DependencyEdge[] = [];
      // Build chain T20 -> T19 -> ... -> T1
      for (let i = 20; i > 1; i--) {
        edges.push({ taskId: `T${i}`, dependsOnTaskId: `T${i - 1}` });
      }

      // Depth of T20 is 20:
      const graph = new Map<string, string[]>();
      for (const e of edges) {
        if (!graph.has(e.taskId)) graph.set(e.taskId, []);
        graph.get(e.taskId)!.push(e.dependsOnTaskId);
      }
      expect(dag.calculateDepth("T20", graph)).toBe(20);
    });

    it("throws MaxDependencyDepthExceededError when depth exceeds 20", () => {
      const edges: DependencyEdge[] = [];
      // Build chain T20 -> T19 -> ... -> T1 (depth = 20)
      for (let i = 20; i > 1; i--) {
        edges.push({ taskId: `T${i}`, dependsOnTaskId: `T${i - 1}` });
      }

      // Adding T21 -> T20 would make depth 21:
      expect(() => dag.validateDependency("T21", "T20", edges)).toThrow(
        MaxDependencyDepthExceededError
      );
    });
  });

  describe("Blocked Resolution", () => {
    it("returns PENDING if task has no prerequisites", () => {
      expect(dag.resolveTaskStatus("T1", [], new Set())).toBe("PENDING");
    });

    it("returns BLOCKED if any prerequisite is incomplete", () => {
      const completed = new Set(["P1"]);
      // Depends on P1 and P2 (P2 is incomplete)
      expect(dag.resolveTaskStatus("T1", ["P1", "P2"], completed)).toBe("BLOCKED");
    });

    it("returns PENDING once all prerequisites are in completed set", () => {
      const completed = new Set(["P1", "P2"]);
      expect(dag.resolveTaskStatus("T1", ["P1", "P2"], completed)).toBe("PENDING");
    });
  });

  describe("Topological Sort (Kahn's Algorithm)", () => {
    it("returns tasks in valid topological execution order", () => {
      // JavaScript -> React -> Next.js
      const tasks = ["NextJS", "React", "JavaScript"];
      const edges: DependencyEdge[] = [
        { taskId: "React", dependsOnTaskId: "JavaScript" },
        { taskId: "NextJS", dependsOnTaskId: "React" },
      ];

      const sorted = dag.topologicalSort(tasks, edges);
      expect(sorted).toEqual(["JavaScript", "React", "NextJS"]);
    });
  });
});
