import type {
  PMCard, Team, Priority, Status, Risk, Health,
  TrelloNormalizedEventV2, FieldChangeItem, Operation, Evidence, TeamMetrics,
} from "./types";

const TEAMS: Team[] = ["Backend","Frontend","Security","QA","DevOps","Architecture","Documentation","Product","UX","Data"];
const PRIORITIES: Priority[] = ["P0","P1","P2","P3"];
const STATUSES: Status[] = ["Inbox","Backlog","Ready","In Progress","Review / QA","Blocked","Done","Cancelled"];
const RISKS: Risk[] = ["Critical","High","Medium","Low"];
const TEAM_PREFIX: Record<Team,string> = {
  Backend:"BE", Frontend:"FE", Security:"SEC", QA:"QA", DevOps:"OPS",
  Architecture:"ARCH", Documentation:"DOC", Product:"PRD", UX:"UX", Data:"DAT",
};
const OWNERS = [
  "Ana Torres","Luis Peña","Marta Ruiz","Diego Vargas","Sofía Morales",
  "Carlos Iglesias","Elena García","Iván Cortés","Nuria Ramos","Pablo Serrano",
  "Lucía Herrera","Jorge Núñez",
];
const CARD_NAMES: Record<Team,string[]> = {
  Backend: ["Motor de reglas de reservas","Migración a Postgres 16","API pública v2","Sincronizador de inventario","Refactor módulo pagos"],
  Frontend: ["Rediseño de dashboard","Componentes de accesibilidad AA","Optimización de bundle","Editor de itinerarios","Vista pública de tour"],
  Security: ["Rotación de claves KMS","Auditoría SAST/DAST","Política de secretos","Endurecimiento CSP","Revisión OWASP Top 10"],
  QA: ["Regresión E2E checkout","Suite performance k6","Test contract API","Escenarios accesibilidad","Smoke deploy productivo"],
  DevOps: ["Pipeline blue/green","IaC Terraform base","Observabilidad OTLP","Cost guardrails AWS","Backups verificados"],
  Architecture: ["ADR eventos de dominio","Segmentación de servicios","Estrategia multi-región","Patrones event-sourcing","Diagrama C4 v3"],
  Documentation: ["Runbook producción","Guía de onboarding","Manual operador","Catálogo de APIs","Política de datos"],
  Product: ["Discovery reservas grupo","Roadmap Q3","OKR release Colibrí 2.0","Investigación upsell","Definición KPIs"],
  UX: ["Rediseño flow reserva","Sistema de iconografía","Auditoría de contraste","Prototipo mobile","Investigación jobs-to-be-done"],
  Data: ["Modelo lakehouse v2","Panel adopción","ETL Trello analytics","Calidad de datos SLAs","Dashboard revenue"],
};

const BOARD = { id: "b_colibri", name: "Colibrí OS", short_link: "colibri" };

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random()*arr.length)]; }
function daysAgo(d: number) { return new Date(Date.now() - d*86400000).toISOString(); }
function pick(n: number, arr: string[]) { return [...arr].sort(()=>Math.random()-0.5).slice(0,n); }

function healthFor(c: {status:Status;risk:Risk;priority:Priority;evidence_required:boolean;has_evidence:boolean}): Health {
  if (c.status==="Blocked" || c.risk==="Critical") return "Red";
  if (c.priority==="P0" || c.risk==="High" || (c.evidence_required && !c.has_evidence)) return "Amber";
  return "Green";
}

let seq = 0;
const teamCounters: Record<Team,number> = Object.fromEntries(TEAMS.map(t=>[t,0])) as Record<Team,number>;

function makeCard(team: Team, forcedStatus?: Status): PMCard {
  teamCounters[team] += 1;
  const idx = teamCounters[team];
  const work_item_id = `${TEAM_PREFIX[team]}-${String(idx).padStart(3,"0")}`;
  const priority = rand(PRIORITIES);
  const risk = rand(RISKS);
  const status = forcedStatus ?? rand(STATUSES);
  const evidence_required = Math.random() > 0.55;
  const has_evidence = evidence_required ? Math.random() > 0.35 : true;
  const created = Math.floor(Math.random()*80)+5;
  const due = Math.random()>0.3 ? daysAgo(-1*(Math.floor(Math.random()*30)-8)) : undefined;
  const name = rand(CARD_NAMES[team]);
  const owner = rand(OWNERS);
  const base = {
    id: `c_${++seq}`,
    work_item_id, name, team, priority, status, risk, owner,
    sprint: `S-${25 + Math.floor(Math.random()*4)}`,
    estimate: [1,2,3,5,8,13][Math.floor(Math.random()*6)],
    release_blocker: priority==="P0" && Math.random()>0.4,
    evidence_required, has_evidence,
    dependencies: Math.random()>0.7 ? [`${rand(Object.values(TEAM_PREFIX))}-${String(Math.floor(Math.random()*20)+1).padStart(3,"0")}`] : [],
    repository: `norug-es/${team.toLowerCase()}-service`,
    github_ref: Math.random()>0.5 ? `#${Math.floor(Math.random()*900)+100}` : undefined,
    target_release: `2026.${(Math.floor(Math.random()*3)+7)}`,
    environment: rand(["dev","staging","prod"]),
    due_date: due,
    created_at: daysAgo(created),
    updated_at: daysAgo(Math.floor(Math.random()*5)),
    completed_at: status==="Done" ? daysAgo(Math.floor(Math.random()*10)) : undefined,
    short_link: Math.random().toString(36).slice(2,10),
    description: `Historia asociada a ${name} para el equipo ${team}. Incluye criterios de aceptación, DoD y evidencias.`,
  };
  return { ...base, health: healthFor(base) } as PMCard;
}

const FIELDS: {field:string;label:string;group:string;type:string;}[] = [
  { field:"desc", label:"Descripción", group:"content", type:"text" },
  { field:"idList", label:"Lista", group:"workflow", type:"reference" },
  { field:"members", label:"Responsables", group:"people", type:"array" },
  { field:"due", label:"Fecha límite", group:"schedule", type:"datetime" },
  { field:"checklist", label:"Checklist", group:"content", type:"array" },
  { field:"attachments", label:"Adjuntos", group:"content", type:"array" },
  { field:"cf.team", label:"Equipo", group:"custom", type:"enum" },
  { field:"cf.priority", label:"Prioridad", group:"custom", type:"enum" },
  { field:"cf.risk", label:"Riesgo", group:"custom", type:"enum" },
  { field:"cf.evidence", label:"Evidencia", group:"custom", type:"boolean" },
];

function makeEvent(card: PMCard, i: number): TrelloNormalizedEventV2 {
  const f = rand(FIELDS);
  const opPool: Operation[] =
    f.field==="idList" ? ["move"] :
    f.field==="members" ? ["add","remove"] :
    f.field==="due" ? ["set","clear","update"] :
    f.field==="checklist" ? ["add","complete","remove"] :
    f.field==="attachments" ? ["add","remove"] :
    ["set","update","clear"];
  const operation = rand(opPool);
  const before = operation==="set" || operation==="create" ? "" : "Valor previo";
  const after = operation==="clear" || operation==="remove" ? "" :
    f.field==="idList" ? rand(STATUSES) :
    f.field==="cf.priority" ? rand(PRIORITIES) :
    f.field==="cf.risk" ? rand(RISKS) :
    f.field==="due" ? daysAgo(-1*(Math.floor(Math.random()*20)-5)) :
    `Nuevo ${f.label.toLowerCase()}`;
  const item: FieldChangeItem = {
    field: f.field, canonical_field: f.field, field_path: `card.${f.field}`,
    field_label: f.label, field_group: f.group, data_type: f.type,
    operation, changed: true, certainty: 1,
    before: { raw: before, normalized: before, display: before || "—" },
    after: { raw: after, normalized: after, display: String(after || "—") },
    delta: `${before || "∅"} → ${after || "∅"}`,
    summary: `${f.label}: ${operation} ${after || ""}`.trim(),
  };
  const occurred = daysAgo(Math.floor(Math.random()*45));
  return {
    schema_version: "2.0.0",
    event_id: `evt_${card.id}_${i}_${Math.random().toString(36).slice(2,6)}`,
    event_type: operation==="move" ? "updateCard.idList" : `updateCard.${f.field}`,
    event_name: `${f.label} ${operation}`,
    category: f.group,
    occurred_at: occurred,
    received_at: occurred,
    board: BOARD,
    card: { id: card.id, id_short: parseInt(card.work_item_id.split("-")[1]), name: card.name, short_link: card.short_link, id_list: card.status },
    actor: { id: `u_${card.owner.replace(/\s/g,"").toLowerCase()}`, full_name: card.owner, username: card.owner.split(" ")[0].toLowerCase() },
    target: { type: "card", id: card.id, name: card.name },
    field_change: { count: 1, primary_field: f.field, primary_operation: operation, primary_group: f.group, items: [item] },
    summary: `${card.owner} ${operation} ${f.label} en ${card.work_item_id}`,
    raw: { trello: true, action: f.field, source: "demo" },
  };
}

function generate() {
  // ensure spread across teams and statuses
  const cards: PMCard[] = [];
  for (const t of TEAMS) {
    cards.push(makeCard(t,"In Progress"));
    cards.push(makeCard(t,"Done"));
    cards.push(makeCard(t));
  }
  // top up to 38
  while (cards.length < 38) cards.push(makeCard(rand(TEAMS)));

  const events: TrelloNormalizedEventV2[] = [];
  cards.forEach((c) => {
    const n = 2 + Math.floor(Math.random()*3);
    for (let i=0;i<n;i++) events.push(makeEvent(c,i));
  });
  // top up to 90
  while (events.length < 90) events.push(makeEvent(rand(cards), events.length));

  events.sort((a,b)=> b.occurred_at.localeCompare(a.occurred_at));

  const evidences: Evidence[] = [];
  cards.filter(c=>c.has_evidence).forEach((c,idx)=>{
    const type = rand(["commit","pull_request","ci","deployment","release","security","document","test"] as const);
    evidences.push({
      id: `ev_${idx}_${c.id}`,
      card_id: c.id, work_item_id: c.work_item_id,
      type, hash: Math.random().toString(16).slice(2,10),
      actor: c.owner, environment: c.environment,
      result: rand(["success","success","success","failure","pending"] as const),
      date: c.updated_at, url: `https://github.com/${c.repository}/pull/${Math.floor(Math.random()*900)+100}`,
      summary: `${type.toUpperCase()} de ${c.work_item_id} — ${c.name}`,
    });
  });

  return { cards, events, evidences };
}

let cache: ReturnType<typeof generate> | null = null;
export function getDemoDataset() {
  if (!cache) cache = generate();
  return cache;
}

export function computeTeamMetrics(cards: PMCard[]): TeamMetrics[] {
  return TEAMS.map((team) => {
    const list = cards.filter(c=>c.team===team);
    const wip = list.filter(c=>["In Progress","Review / QA"].includes(c.status)).length;
    const completed = list.filter(c=>c.status==="Done").length;
    const blocked = list.filter(c=>c.status==="Blocked").length;
    const overdue = list.filter(c=>c.due_date && new Date(c.due_date) < new Date() && c.status!=="Done").length;
    const story_points = list.reduce((s,c)=>s+c.estimate,0);
    const wip_limit = 6;
    const health: Health = blocked>1 || overdue>2 ? "Red" : wip>wip_limit ? "Amber" : "Green";
    const membersMap = new Map<string,{wip:number;completed:number}>();
    list.forEach(c=>{
      const m = membersMap.get(c.owner) ?? {wip:0,completed:0};
      if (c.status==="Done") m.completed++;
      else if (["In Progress","Review / QA"].includes(c.status)) m.wip++;
      membersMap.set(c.owner, m);
    });
    return {
      team, owner: list[0]?.owner ?? "—",
      wip, wip_limit, completed, blocked, overdue, story_points, health,
      members: Array.from(membersMap.entries()).map(([name,v])=>({name,...v})),
    };
  });
}
