export type Team =
  | "Backend" | "Frontend" | "Security" | "QA" | "DevOps"
  | "Architecture" | "Documentation" | "Product" | "UX" | "Data";

export type Priority = "P0" | "P1" | "P2" | "P3";
export type Risk = "Critical" | "High" | "Medium" | "Low";
export type Health = "Green" | "Amber" | "Red";
export type Status =
  | "Inbox" | "Backlog" | "Ready" | "In Progress"
  | "Review / QA" | "Blocked" | "Done" | "Cancelled";

export type Operation =
  | "set" | "update" | "clear" | "move" | "add" | "remove"
  | "archive" | "unarchive" | "complete" | "reopen" | "create" | "delete";

export interface FieldChangeItem {
  field: string;
  canonical_field: string;
  field_path: string;
  field_label: string;
  field_group: string;
  data_type: string;
  operation: Operation;
  changed: boolean;
  certainty: number;
  before: { raw: unknown; normalized: unknown; display: string };
  after: { raw: unknown; normalized: unknown; display: string };
  delta: string;
  summary: string;
}

export interface FieldChange {
  count: number;
  primary_field: string;
  primary_operation: Operation;
  primary_group: string;
  items: FieldChangeItem[];
}

export interface TrelloNormalizedEventV2 {
  schema_version: string;
  event_id: string;
  event_type: string;
  event_name: string;
  category: string;
  occurred_at: string;
  received_at: string;
  board: { id: string; name: string; short_link: string };
  card: { id: string; id_short: number; name: string; short_link: string; id_list: string };
  actor: { id: string; full_name: string; username: string };
  target: { type: string; id: string; name: string };
  field_change: FieldChange;
  summary: string;
  raw?: unknown;
}

export interface PMCard {
  id: string;
  work_item_id: string;
  name: string;
  team: Team;
  priority: Priority;
  status: Status;
  risk: Risk;
  owner: string;
  sprint: string;
  estimate: number;
  release_blocker: boolean;
  evidence_required: boolean;
  has_evidence: boolean;
  dependencies: string[];
  repository: string;
  github_ref?: string;
  target_release: string;
  environment: string;
  health: Health;
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  short_link: string;
  description: string;
}

export interface TeamMetrics {
  team: Team;
  owner: string;
  wip: number;
  wip_limit: number;
  completed: number;
  blocked: number;
  overdue: number;
  story_points: number;
  health: Health;
  members: { name: string; wip: number; completed: number }[];
}

export interface Evidence {
  id: string;
  card_id: string;
  work_item_id: string;
  type: "commit" | "pull_request" | "ci" | "deployment" | "release" | "security" | "document" | "test";
  hash: string;
  actor: string;
  environment: string;
  result: "success" | "failure" | "pending";
  date: string;
  url: string;
  summary: string;
}
