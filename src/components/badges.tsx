import { Badge } from "@/components/ui/badge";
import type { Priority, Risk, Status, Health, Operation } from "@/lib/types";
import { cn } from "@/lib/utils";

const P: Record<Priority, string> = {
  P0: "bg-destructive/20 text-destructive border-destructive/40",
  P1: "bg-warning/20 text-warning border-warning/40",
  P2: "bg-info/20 text-info border-info/40",
  P3: "bg-muted text-muted-foreground border-border",
};
export function PriorityBadge({ value }: { value: Priority }) {
  return <Badge variant="outline" className={cn("mono text-[10px]", P[value])}>{value}</Badge>;
}

const R: Record<Risk, string> = {
  Critical: "bg-destructive/20 text-destructive border-destructive/40",
  High: "bg-warning/20 text-warning border-warning/40",
  Medium: "bg-info/20 text-info border-info/40",
  Low: "bg-success/20 text-success border-success/40",
};
export function RiskBadge({ value }: { value: Risk }) {
  return <Badge variant="outline" className={cn("text-[10px]", R[value])}>{value}</Badge>;
}

const S: Record<Status, string> = {
  Inbox: "bg-muted text-muted-foreground border-border",
  Backlog: "bg-muted text-muted-foreground border-border",
  Ready: "bg-info/15 text-info border-info/30",
  "In Progress": "bg-primary/15 text-primary border-primary/30",
  "Review / QA": "bg-chart-5/20 text-chart-5 border-chart-5/40",
  Blocked: "bg-destructive/20 text-destructive border-destructive/40",
  Done: "bg-success/20 text-success border-success/40",
  Cancelled: "bg-muted text-muted-foreground border-border line-through",
};
export function StatusBadge({ value }: { value: Status }) {
  return <Badge variant="outline" className={cn("text-[10px]", S[value])}>{value}</Badge>;
}

const H: Record<Health, string> = {
  Green: "bg-success/20 text-success border-success/40",
  Amber: "bg-warning/20 text-warning border-warning/40",
  Red: "bg-destructive/20 text-destructive border-destructive/40",
};
export function HealthBadge({ value }: { value: Health }) {
  return <Badge variant="outline" className={cn("text-[10px]", H[value])}>{value}</Badge>;
}

const O: Record<Operation, string> = {
  set: "bg-info/20 text-info border-info/40",
  update: "bg-primary/15 text-primary border-primary/40",
  clear: "bg-muted text-muted-foreground border-border",
  move: "bg-chart-5/20 text-chart-5 border-chart-5/40",
  add: "bg-success/20 text-success border-success/40",
  remove: "bg-destructive/15 text-destructive border-destructive/40",
  archive: "bg-muted text-muted-foreground border-border",
  unarchive: "bg-info/15 text-info border-info/30",
  complete: "bg-success/20 text-success border-success/40",
  reopen: "bg-warning/20 text-warning border-warning/40",
  create: "bg-primary/20 text-primary border-primary/40",
  delete: "bg-destructive/20 text-destructive border-destructive/40",
};
export function OperationBadge({ value }: { value: Operation }) {
  return <Badge variant="outline" className={cn("mono text-[10px] uppercase", O[value])}>{value}</Badge>;
}
