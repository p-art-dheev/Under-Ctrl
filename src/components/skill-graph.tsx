"use client";

import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { MasteryBar, STATE_META, StateBadge, UnassessedBadge, btn } from "@/components/ui";
import type { DisplayState } from "@/lib/types";

export interface GraphSkill {
  id: string;
  title: string;
  objective: string;
  contribution: string;
  kind: "core" | "remediation";
  state: DisplayState;
  stateLabel?: string;
  reason: string;
  score: number | null;
  evidence: number;
  assessed: boolean;
  depth: number;
  row: number;
  prerequisites: string[];
  dependents: string[];
  lessonStatus: string;
  resources: { key: string; title: string; url: string; origin: string }[];
  attempts: { prompt: string; correct: boolean; at: string }[];
}

type SkillNodeData = { skill: GraphSkill; selected: boolean };

const BORDER: Record<DisplayState, string> = {
  locked: "var(--st-locked)",
  available: "var(--st-available)",
  learning: "var(--st-learning)",
  needs_review: "var(--st-review)",
  mastered: "var(--st-mastered)",
};

function SkillNode({ data }: NodeProps<Node<SkillNodeData>>) {
  const s = data.skill;
  return (
    <div
      className={`w-[200px] rounded-xl border-2 bg-surface px-3 py-2 text-left shadow-sm ${s.kind === "remediation" ? "border-dashed" : ""} ${data.selected ? "ring-2 ring-brand ring-offset-2 ring-offset-bg" : ""}`}
      style={{ borderColor: BORDER[s.state], opacity: s.state === "locked" ? 0.75 : 1 }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-line" />
      <p className="truncate text-[13px] font-semibold text-ink" title={s.title}>{s.title}</p>
      <div className="mt-1 flex items-center justify-between gap-1">
        <span className="text-[11px] font-medium" style={{ color: BORDER[s.state] }}>{s.stateLabel ?? STATE_META[s.state].label}</span>
        <span className="text-[11px] text-muted">{s.score === null ? (s.kind === "core" ? "unassessed" : "review") : `${Math.round(s.score * 100)}%`}</span>
      </div>
      <div className="mt-1.5"><MasteryBar score={s.score} /></div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-line" />
    </div>
  );
}

const nodeTypes = { skill: SkillNode };

export function SkillGraph({ skills, version }: { skills: GraphSkill[]; version: number }) {
  const [selected, setSelected] = useState<string | null>(() => skills.find((s) => s.state === "needs_review" || s.state === "learning" || s.state === "available")?.id ?? null);
  const byId = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const nodes: Node<SkillNodeData>[] = useMemo(
    () =>
      skills.map((s) => ({
        id: s.id,
        type: "skill",
        position: { x: s.depth * 260, y: s.row * 110 },
        data: { skill: s, selected: s.id === selected },
      })),
    [skills, selected],
  );
  const edges: Edge[] = useMemo(
    () =>
      skills.flatMap((s) =>
        s.prerequisites.map((p) => ({
          id: `${p}-${s.id}`,
          source: p,
          target: s.id,
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
          style: { strokeWidth: 1.5, stroke: byId.get(s.id)?.kind === "remediation" || byId.get(p)?.kind === "remediation" ? "var(--st-review)" : "var(--line)" },
          animated: byId.get(p)?.kind === "remediation",
        })),
      ),
    [skills, byId],
  );
  const sel = selected ? byId.get(selected) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <Legend />
        <div className="hidden h-[560px] overflow-hidden rounded-2xl border border-line bg-surface md:block">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, n) => setSelected(n.id)}
            fitView
            minZoom={0.3}
            nodesDraggable={false}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
            aria-label={`Skill graph, version ${version}`}
          >
            <Background gap={24} color="var(--line)" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <ul className="space-y-2 md:hidden" aria-label="Skills in plan order">
          {[...skills].sort((a, b) => a.depth - b.depth || a.row - b.row).map((s) => (
            <li key={s.id}>
              <button onClick={() => setSelected(s.id)} className={`w-full rounded-xl border bg-surface px-3 py-2 text-left ${selected === s.id ? "border-brand" : "border-line"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{s.title}</span>
                  <StateBadge state={s.state} label={s.stateLabel} />
                </div>
                <div className="mt-2"><MasteryBar score={s.score} /></div>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <aside className="lg:sticky lg:top-6 lg:self-start">
        {sel ? <Details s={sel} byId={byId} /> : <p className="text-sm text-muted">Select a skill to see why it is in its current state.</p>}
      </aside>
    </div>
  );
}

function Legend() {
  return (
    <div className="mb-3 flex flex-wrap gap-2" aria-label="Legend">
      {(Object.keys(STATE_META) as DisplayState[]).map((s) => <StateBadge key={s} state={s} />)}
      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-review px-2 py-0.5 text-xs text-review">Dashed: inserted review</span>
    </div>
  );
}

function Details({ s, byId }: { s: GraphSkill; byId: Map<string, GraphSkill> }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap gap-2">
        <StateBadge state={s.state} label={s.stateLabel} />
        {!s.assessed && s.kind === "core" ? <UnassessedBadge /> : null}
      </div>
      <h2 className="mt-2 text-lg font-semibold">{s.title}</h2>
      <p className="mt-1 text-sm text-muted">{s.objective}</p>
      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Why this state</h3>
      <p className="mt-1 text-sm">{s.reason}</p>
      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">How it serves your goal</h3>
      <p className="mt-1 text-sm">{s.contribution}</p>
      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Evidence</h3>
      <p className="mt-1 text-sm">{s.score === null ? "No scored answers yet." : `${Math.round(s.score * 100)}% from ${s.evidence} direct answer${s.evidence === 1 ? "" : "s"} (provisional below 3).`}</p>
      {s.attempts.length ? (
        <ul className="mt-1 space-y-0.5 text-xs text-muted">
          {s.attempts.slice(-4).map((a, i) => <li key={i}>{a.correct ? "✓" : "✗"} {a.prompt}</li>)}
        </ul>
      ) : null}
      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Prerequisites</h3>
      <p className="mt-1 text-sm">{s.prerequisites.length ? s.prerequisites.map((p) => byId.get(p)?.title).join(", ") : "None"}</p>
      {s.resources.length ? (
        <>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Sources</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {s.resources.map((r) => (
              <li key={r.key}><a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">{r.title} <ExternalLink size={12} aria-hidden /></a> <span className="text-xs text-muted">({r.origin === "curated" ? "curated" : "live search"})</span></li>
            ))}
          </ul>
        </>
      ) : null}
      <Link href={`/learn/${s.id}`} className={`${btn} mt-5 w-full`}>
        {s.state === "locked" ? "View options" : s.lessonStatus === "none" ? "Open lesson" : "Continue"} <ArrowRight size={14} aria-hidden />
      </Link>
    </div>
  );
}
