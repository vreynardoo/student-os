// Plain DTO the engine depends on — deliberately decoupled from the DB's Task
// type so this module can never reach for the database itself.
export type PriorityTaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";

export interface PriorityInputTask {
  id: string;
  title: string;
  dueDate: Date;
  estimatedHours: number | null;
  progressPercent: number;
  weight: number;
  status: PriorityTaskStatus;
}

export type PriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface PriorityBreakdown {
  dueInHours: number;
  remainingHours: number;
  urgency: number;
  pacePressure: number;
  weightMultiplier: number;
  usedDefaultEstimate: boolean;
  isOverdue: boolean;
}

export interface PriorityResult {
  taskId: string;
  score: number;
  level: PriorityLevel;
  reasons: string[];
  breakdown: PriorityBreakdown;
}

export interface RankedTask {
  task: PriorityInputTask;
  priority: PriorityResult;
}
