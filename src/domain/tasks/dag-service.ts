import type { TaskStatus } from "../types";

export const MAX_DEPENDENCY_DEPTH = 20;

export class CircularDependencyError extends Error {
  constructor(public readonly cyclePath: string[]) {
    super(`Circular dependency detected: ${cyclePath.join(" -> ")}`);
    this.name = "CircularDependencyError";
  }
}

export class MaxDependencyDepthExceededError extends Error {
  constructor(public readonly depth: number, public readonly maxAllowed: number = MAX_DEPENDENCY_DEPTH) {
    super(`Maximum dependency depth of ${maxAllowed} exceeded. Current depth: ${depth}.`);
    this.name = "MaxDependencyDepthExceededError";
  }
}

export interface DependencyEdge {
  taskId: string;          // Dependent task (blocked until prerequisite finishes)
  dependsOnTaskId: string; // Prerequisite task
}

export class DAGService {
  /**
   * Validates that adding a dependency (taskId depends on dependsOnTaskId)
   * does not introduce a circular dependency or exceed MAX_DEPENDENCY_DEPTH.
   */
  validateDependency(
    taskId: string,
    dependsOnTaskId: string,
    existingEdges: DependencyEdge[]
  ): void {
    if (taskId === dependsOnTaskId) {
      throw new CircularDependencyError([taskId, taskId]);
    }

    // Build adjacency list: node -> prerequisites
    const graph = new Map<string, string[]>();
    for (const edge of existingEdges) {
      if (!graph.has(edge.taskId)) graph.set(edge.taskId, []);
      graph.get(edge.taskId)!.push(edge.dependsOnTaskId);
    }

    // Add candidate edge
    if (!graph.has(taskId)) graph.set(taskId, []);
    graph.get(taskId)!.push(dependsOnTaskId);

    // 1. Detect cycle using DFS from dependsOnTaskId back to taskId
    const visited = new Set<string>();
    const recursionStack: string[] = [];

    const findCycle = (curr: string, target: string): string[] | null => {
      recursionStack.push(curr);
      visited.add(curr);

      const neighbors = graph.get(curr) || [];
      for (const next of neighbors) {
        if (next === target) {
          return [...recursionStack, target];
        }
        if (!visited.has(next)) {
          const cycle = findCycle(next, target);
          if (cycle) return cycle;
        }
      }

      recursionStack.pop();
      return null;
    };

    const cycle = findCycle(dependsOnTaskId, taskId);
    if (cycle) {
      throw new CircularDependencyError([taskId, ...cycle]);
    }

    // 2. Validate max dependency depth (<= 20)
    const depth = this.calculateDepth(taskId, graph);
    if (depth > MAX_DEPENDENCY_DEPTH) {
      throw new MaxDependencyDepthExceededError(depth, MAX_DEPENDENCY_DEPTH);
    }
  }

  /**
   * Computes the maximum dependency depth for a given task node.
   */
  calculateDepth(taskId: string, graph: Map<string, string[]>): number {
    const memo = new Map<string, number>();

    const getDepth = (node: string): number => {
      if (memo.has(node)) return memo.get(node)!;
      const prerequisites = graph.get(node) || [];
      if (prerequisites.length === 0) {
        memo.set(node, 1);
        return 1;
      }

      let maxPrereqDepth = 0;
      for (const p of prerequisites) {
        maxPrereqDepth = Math.max(maxPrereqDepth, getDepth(p));
      }

      const total = 1 + maxPrereqDepth;
      memo.set(node, total);
      return total;
    };

    return getDepth(taskId);
  }

  /**
   * Helper that builds graph from DependencyEdge array and calculates depth
   */
  calculateDependencyDepth(taskId: string, edges: DependencyEdge[]): number {
    const graph = new Map<string, string[]>();
    for (const edge of edges) {
      if (!graph.has(edge.taskId)) graph.set(edge.taskId, []);
      graph.get(edge.taskId)!.push(edge.dependsOnTaskId);
    }
    return this.calculateDepth(taskId, graph);
  }

  /**
   * Resolves the operational status of a task instance.
   * If any required prerequisite is NOT completed, status is BLOCKED.
   * If all prerequisites are completed (or none exist), status is PENDING.
   */
  resolveTaskStatus(
    taskId: string,
    prerequisiteIds: string[],
    completedTaskIds: Set<string>
  ): TaskStatus {
    if (!prerequisiteIds || prerequisiteIds.length === 0) {
      return "PENDING";
    }

    const allSatisfied = prerequisiteIds.every(pId => completedTaskIds.has(pId));
    return allSatisfied ? "PENDING" : "BLOCKED";
  }

  /**
   * Performs Kahn's Algorithm topological sort.
   * Returns task IDs in valid execution order.
   * Throws CircularDependencyError if an unresolvable cycle exists.
   */
  topologicalSort(taskIds: string[], edges: DependencyEdge[]): string[] {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const id of taskIds) {
      inDegree.set(id, 0);
      adj.set(id, []);
    }

    for (const edge of edges) {
      if (taskIds.includes(edge.taskId) && taskIds.includes(edge.dependsOnTaskId)) {
        // dependsOnTaskId must run before taskId
        // Edge: dependsOnTaskId -> taskId
        adj.get(edge.dependsOnTaskId)!.push(edge.taskId);
        inDegree.set(edge.taskId, (inDegree.get(edge.taskId) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      sorted.push(u);

      for (const v of adj.get(u) || []) {
        inDegree.set(v, inDegree.get(v)! - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      }
    }

    if (sorted.length !== taskIds.length) {
      throw new CircularDependencyError(["Graph contains unresolved cycles"]);
    }

    return sorted;
  }
}
