import { z } from "zod";

const nullableString = z.string().nullable().optional();
const operationSchema = z.enum([
  "set",
  "update",
  "clear",
  "move",
  "add",
  "remove",
  "archive",
  "unarchive",
  "complete",
  "reopen",
  "create",
  "delete",
]);
const prioritySchema = z.enum(["P0", "P1", "P2", "P3", "Unknown"]);
const riskSchema = z.enum(["Critical", "High", "Medium", "Low", "Unknown"]);
const statusSchema = z.enum([
  "Inbox",
  "Backlog",
  "Ready",
  "In Progress",
  "Review / QA",
  "Blocked",
  "Done",
  "Cancelled",
]);
const teamSchema = z
  .enum([
    "Backend",
    "Frontend",
    "Security",
    "QA",
    "DevOps",
    "Architecture",
    "Documentation",
    "Product",
    "UX",
    "Data",
    "Unknown",
  ])
  .or(z.string().min(1));
const healthSchema = z.enum(["Green", "Amber", "Red", "Unknown"]);

export const activityReportCardSchema = z
  .object({
    id: nullableString,
    number: z.coerce.number(),
    name: z.string(),
    url: nullableString,
    board_name: nullableString,
    total_events: z.coerce.number().nonnegative(),
    management_events: z.coerce.number().nonnegative().optional(),
    actors: z.array(z.string()).optional(),
    current_list_id: nullableString,
    current_list_name: nullableString,
    first_activity: nullableString,
    last_activity: nullableString,
    transitions: z.coerce.number().nonnegative().optional(),
    reopenings: z.coerce.number().nonnegative().optional(),
  })
  .passthrough();

export const activityReportEventSchema = z
  .object({
    event_id: z.string(),
    event_type: z.string(),
    category: z.string(),
    category_label: z.string().optional(),
    action_label: z.string().optional(),
    occurred_at: z.string(),
    received_at: z.string().optional(),
    board: z
      .object({ id: z.string(), name: z.string(), short_link: z.string().optional() })
      .passthrough(),
    card: z
      .object({
        id: nullableString,
        number: z.coerce.number(),
        name: z.string(),
        short_link: z.string().optional(),
        current_list_id: nullableString,
      })
      .passthrough(),
    actor: z
      .object({ id: z.string(), name: z.string(), username: z.string().optional() })
      .passthrough()
      .nullable()
      .optional(),
    change: z.object({ field: z.string().optional() }).passthrough().optional(),
    summary: z.string().optional(),
  })
  .passthrough();

export const activityReportSchema = z
  .object({
    schema_version: z.string().startsWith("lovable.project_activity_report"),
    generated_at: z.string().optional(),
    report: z.record(z.unknown()).optional(),
    cards: z.array(activityReportCardSchema),
    events: z.array(activityReportEventSchema),
    evidences: z.array(z.unknown()).nullable().optional(),
  })
  .passthrough();

const fieldValueSchema = z.object({
  raw: z.unknown(),
  normalized: z.unknown(),
  display: z.string(),
});
const fieldChangeItemSchema = z.object({
  field: z.string(),
  canonical_field: z.string(),
  field_path: z.string(),
  field_label: z.string(),
  field_group: z.string(),
  data_type: z.string(),
  operation: operationSchema,
  changed: z.boolean(),
  certainty: z.number(),
  before: fieldValueSchema,
  after: fieldValueSchema,
  delta: z.string(),
  summary: z.string(),
});

export const normalizedEventSchema = z
  .object({
    schema_version: z.string(),
    event_id: z.string(),
    event_type: z.string(),
    event_name: z.string(),
    category: z.string(),
    occurred_at: z.string(),
    received_at: z.string(),
    board: z.object({ id: z.string(), name: z.string(), short_link: z.string() }),
    card: z.object({
      id: z.string(),
      id_short: z.number(),
      name: z.string(),
      short_link: z.string(),
      id_list: z.string(),
    }),
    actor: z.object({ id: z.string(), full_name: z.string(), username: z.string() }),
    target: z.object({ type: z.string(), id: z.string(), name: z.string() }),
    field_change: z.object({
      count: z.number().nonnegative(),
      primary_field: z.string(),
      primary_operation: operationSchema,
      primary_group: z.string(),
      items: z.array(fieldChangeItemSchema),
    }),
    summary: z.string(),
  })
  .passthrough();

export const pmCardSchema = z
  .object({
    id: z.string(),
    work_item_id: z.string(),
    name: z.string(),
    team: teamSchema,
    priority: prioritySchema,
    status: statusSchema,
    risk: riskSchema,
    owner: z.string(),
    sprint: z.string(),
    estimate: z.number().nullable(),
    release_blocker: z.boolean().nullable(),
    evidence_required: z.boolean().nullable(),
    has_evidence: z.boolean().nullable(),
    reopenings: z.number().nullable().optional(),
    dependencies: z.array(z.string()),
    repository: z.string(),
    target_release: z.string(),
    environment: z.string(),
    health: healthSchema,
    created_at: z.string(),
    updated_at: z.string(),
    completed_at: z.string().optional(),
    short_link: z.string(),
    description: z.string(),
  })
  .passthrough();

const evidenceSchema = z.object({
  id: z.string(),
  card_id: z.string(),
  work_item_id: z.string(),
  type: z.enum([
    "commit",
    "pull_request",
    "ci",
    "deployment",
    "release",
    "security",
    "document",
    "test",
  ]),
  hash: z.string(),
  actor: z.string(),
  environment: z.string(),
  result: z.enum(["success", "failure", "pending"]),
  date: z.string(),
  url: z.string(),
  summary: z.string(),
});

export const dashboardPayloadSchema = z.object({
  cards: z.array(pmCardSchema),
  events: z.array(normalizedEventSchema),
  evidences: z.array(evidenceSchema).optional(),
});

export function formatSchemaError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "El payload no cumple el contrato.";
  const path = first.path.length ? ` (${first.path.join(".")})` : "";
  return `El payload no cumple el contrato${path}: ${first.message}.`;
}
