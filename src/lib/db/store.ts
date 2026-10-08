// Data access behind one interface with two implementations:
//   * Supabase (production): reads and learner-authored writes use the
//     signed-in user's session under RLS; privileged writes go through the
//     service-role-only sf_commit RPC after the server has verified the user.
//   * Local demo store (only when Supabase is not configured): a JSON file in
//     .data/, clearly labeled in the UI. It applies the same ownership,
//     version and idempotency rules as sf_commit.

import { promises as fs } from "node:fs";
import { supabaseUrl } from "@/lib/supabase-url";
import { appEnv } from "@/lib/env";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Course, QuestionKey } from "@/lib/types";

export type UserTable = "profiles" | "learning_goals" | "lesson_progress" | "tutor_messages" | "hint_uses";
export type CommitTable =
  | "skills"
  | "skill_edges"
  | "skill_mastery"
  | "resources"
  | "lessons"
  | "questions"
  | "question_keys"
  | "assessment_attempts"
  | "mastery_events"
  | "adaptation_events";
export type ReadTable = UserTable | Exclude<CommitTable, "question_keys"> | "courses";

type Row = Record<string, unknown>;
type Match = Record<string, string | number | boolean | null>;

export interface ChangeSet {
  course?: Partial<Pick<Course, "graph_version" | "state" | "status">>;
  upsert?: Partial<Record<CommitTable, Row[]>>;
}

export interface CommitOptions {
  /** reject the commit unless the course is still at this graph version */
  expectedVersion?: number | null;
  /** a retried commit with the same key is ignored */
  idempotencyKey?: string | null;
}

export interface CommitResult {
  status: "applied" | "duplicate";
  graph_version: number;
}

export class ConflictError extends Error {}

export interface Store {
  mode: "supabase" | "local";
  userId: string;
  select<T>(table: ReadTable, match?: Match): Promise<T[]>;
  insert(table: UserTable, row: Row): Promise<void>;
  update(table: UserTable, match: Match, patch: Row): Promise<void>;
  createCourse(course: Course): Promise<void>;
  questionKeys(courseId: string, questionIds: string[]): Promise<QuestionKey[]>;
  commit(courseId: string, changes: ChangeSet, opts?: CommitOptions): Promise<CommitResult>;
}

export const supabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
export const dataMode = (): "supabase" | "local" => (supabaseConfigured() ? "supabase" : "local");

const PK: Partial<Record<CommitTable, string>> = { skill_mastery: "skill_id", question_keys: "question_id" };
const APPEND_ONLY = new Set<CommitTable>([
  "skill_edges",
  "resources",
  "lessons",
  "questions",
  "question_keys",
  "assessment_attempts",
  "mastery_events",
  "adaptation_events",
]);
const ORDER: CommitTable[] = [
  "skills",
  "skill_edges",
  "skill_mastery",
  "resources",
  "lessons",
  "questions",
  "question_keys",
  "assessment_attempts",
  "mastery_events",
  "adaptation_events",
];
const ownerColumn = (table: string) => (table === "profiles" ? "id" : "owner_id");

// ------------------------------------------------------------------ Supabase

let adminClient: SupabaseClient | null = null;
export function supabaseAdmin(): SupabaseClient {
  adminClient ??= createClient(supabaseUrl()!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export function supabaseStore(userClient: SupabaseClient, userId: string): Store {
  const admin = supabaseAdmin();
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`${what}: ${error.message}`);
  };
  return {
    mode: "supabase",
    userId,
    async select<T>(table: ReadTable, match: Match = {}) {
      let q = userClient.from(table).select("*").eq(ownerColumn(table), userId);
      for (const [k, v] of Object.entries(match)) q = v === null ? q.is(k, null) : q.eq(k, v);
      const { data, error } = await q;
      fail(`read ${table}`, error);
      return (data ?? []) as T[];
    },
    async insert(table, row) {
      const { error } = await userClient.from(table).insert({ ...row, [ownerColumn(table)]: userId });
      fail(`insert ${table}`, error);
    },
    async update(table, match, patch) {
      let q = userClient.from(table).update(patch).eq(ownerColumn(table), userId);
      for (const [k, v] of Object.entries(match)) q = v === null ? q.is(k, null) : q.eq(k, v);
      const { error } = await q;
      fail(`update ${table}`, error);
    },
    async createCourse(course) {
      if (course.owner_id !== userId) throw new Error("course owner mismatch");
      // goal ownership is enforced here because the admin client bypasses RLS
      const { data: goal } = await userClient.from("learning_goals").select("id").eq("id", course.goal_id).maybeSingle();
      if (!goal) throw new Error("goal not found");
      const { error } = await admin.from("courses").insert(course);
      fail("create course", error);
    },
    async questionKeys(courseId, ids) {
      if (ids.length === 0) return [];
      const { data, error } = await admin
        .from("question_keys")
        .select("*")
        .eq("owner_id", userId)
        .eq("course_id", courseId)
        .in("question_id", ids);
      fail("read question keys", error);
      return (data ?? []) as QuestionKey[];
    },
    async commit(courseId, changes, opts = {}) {
      const { data, error } = await admin.rpc("sf_commit", {
        p_owner: userId,
        p_course: courseId,
        p_expected_version: opts.expectedVersion ?? null,
        p_key: opts.idempotencyKey ?? null,
        p_changes: changes,
      });
      if (error) {
        if (/version conflict/.test(error.message)) throw new ConflictError(error.message);
        throw new Error(`commit failed: ${error.message}`);
      }
      return data as CommitResult;
    },
  };
}

// ------------------------------------------------------------------ Local demo store

export interface LocalUser {
  id: string;
  email: string;
  salt: string;
  hash: string;
  created_at: string;
}

interface LocalDb {
  users: LocalUser[];
  tables: Record<string, Row[]>;
  commit_keys: { owner_id: string; key: string }[];
}

const DATA_DIR = appEnv("DATA_DIR") || path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "cognify-local.json");

const g = globalThis as unknown as { __sfLocal?: { db: LocalDb | null; lock: Promise<unknown> } };
const local = (g.__sfLocal ??= { db: null, lock: Promise.resolve() });

async function loadDb(): Promise<LocalDb> {
  if (local.db) return local.db;
  try {
    local.db = JSON.parse(await fs.readFile(DB_FILE, "utf8")) as LocalDb;
  } catch {
    local.db = { users: [], tables: {}, commit_keys: [] };
  }
  return local.db;
}

async function saveDb(db: LocalDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db));
  await fs.rename(tmp, DB_FILE);
}

/** Serialise every local read-modify-write so commits are atomic in-process. */
export function withLocalDb<T>(fn: (db: LocalDb) => T | Promise<T>, write = false): Promise<T> {
  const run = local.lock.then(async () => {
    const db = await loadDb();
    if (!write) return fn(db);
    const snapshot = structuredClone(db);
    try {
      const result = await fn(db);
      await saveDb(db);
      return result;
    } catch (err) {
      local.db = snapshot; // roll back the in-memory copy
      throw err;
    }
  });
  local.lock = run.catch(() => undefined);
  return run;
}

const matches = (row: Row, match: Match) => Object.entries(match).every(([k, v]) => (row[k] ?? null) === v);
const tbl = (db: LocalDb, name: string) => (db.tables[name] ??= []);
const clone = <T>(v: T): T => structuredClone(v);

export function localStore(userId: string): Store {
  return {
    mode: "local",
    userId,
    select<T>(table: ReadTable, match: Match = {}) {
      return withLocalDb((db) =>
        tbl(db, table)
          .filter((r) => r[ownerColumn(table)] === userId && matches(r, match))
          .map((r) => clone(r) as T),
      );
    },
    insert(table, row) {
      return withLocalDb((db) => {
        const full: Row = { created_at: new Date().toISOString(), ...row, [ownerColumn(table)]: userId };
        if (!full.id) full.id = crypto.randomUUID();
        const rows = tbl(db, table);
        if (table === "profiles" && rows.some((r) => r.id === userId)) throw new Error("profile exists");
        if (table === "lesson_progress" && rows.some((r) => r.owner_id === userId && r.lesson_id === full.lesson_id)) {
          throw new Error("duplicate lesson progress");
        }
        if (table !== "profiles" && table !== "learning_goals") {
          const course = tbl(db, "courses").find((c) => c.id === full.course_id);
          if (!course || course.owner_id !== userId) throw new Error("course not found");
        }
        rows.push(full);
      }, true);
    },
    update(table, match, patch) {
      return withLocalDb((db) => {
        for (const r of tbl(db, table)) {
          if (r[ownerColumn(table)] === userId && matches(r, match)) Object.assign(r, patch, { [ownerColumn(table)]: userId });
        }
      }, true);
    },
    createCourse(course) {
      return withLocalDb((db) => {
        if (course.owner_id !== userId) throw new Error("course owner mismatch");
        const goal = tbl(db, "learning_goals").find((x) => x.id === course.goal_id && x.owner_id === userId);
        if (!goal) throw new Error("goal not found");
        tbl(db, "courses").push(clone(course) as unknown as Row);
      }, true);
    },
    questionKeys(courseId, ids) {
      const wanted = new Set(ids);
      return withLocalDb((db) =>
        tbl(db, "question_keys")
          .filter((r) => r.owner_id === userId && r.course_id === courseId && wanted.has(r.question_id as string))
          .map((r) => clone(r) as unknown as QuestionKey),
      );
    },
    commit(courseId, changes, opts = {}) {
      return withLocalDb((db) => {
        const course = tbl(db, "courses").find((c) => c.id === courseId);
        if (!course || course.owner_id !== userId) throw new Error("course not found");
        const key = opts.idempotencyKey ?? null;
        if (key && db.commit_keys.some((k) => k.owner_id === userId && k.key === key)) {
          return { status: "duplicate" as const, graph_version: course.graph_version as number };
        }
        if (opts.expectedVersion != null && course.graph_version !== opts.expectedVersion) {
          throw new ConflictError(
            `graph version conflict: expected ${opts.expectedVersion}, found ${course.graph_version}`,
          );
        }
        for (const table of ORDER) {
          const rows = changes.upsert?.[table];
          if (!rows?.length) continue;
          const pk = PK[table] ?? "id";
          const target = tbl(db, table);
          for (const row of rows) {
            if (row.owner_id !== userId || row.course_id !== courseId) {
              throw new Error(`row ownership mismatch in ${table}`);
            }
            const existing = target.find((r) => r[pk] === row[pk]);
            const dupAttempt =
              table === "assessment_attempts" &&
              target.some((r) => r.owner_id === userId && r.question_id === row.question_id);
            if (existing) {
              if (APPEND_ONLY.has(table)) continue;
              if (existing.course_id !== courseId) throw new Error(`row ownership mismatch in ${table}`);
              Object.assign(existing, clone(row), { created_at: existing.created_at ?? row.created_at });
            } else if (!dupAttempt) {
              target.push(clone(row));
            }
          }
        }
        if (changes.course) {
          Object.assign(course, clone(changes.course), { updated_at: new Date().toISOString() });
        }
        if (key) db.commit_keys.push({ owner_id: userId, key });
        return { status: "applied" as const, graph_version: course.graph_version as number };
      }, true);
    },
  };
}
