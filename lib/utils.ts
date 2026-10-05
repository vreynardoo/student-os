export { cn } from "cn";

export function formatDueDate(date: Date): string {
  return new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
