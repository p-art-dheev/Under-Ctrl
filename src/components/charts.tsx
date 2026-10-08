"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { fontSize: 11, fill: "var(--muted)" };

export function WeeklyActivity({ data }: { data: { day: string; answers: number; lessons: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: new Date(`${d.day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" }) }));
  return (
    <div className="h-44" role="img" aria-label={`Answers per day over the last 7 days: ${rows.map((r) => `${r.label} ${r.answers}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="answers" name="Answers" fill="var(--brand)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="lessons" name="Lessons completed" fill="var(--st-mastered)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MasteryHistory({ data }: { data: { at: string; average: number; assessed: number }[] }) {
  const rows = data.map((d, i) => ({ ...d, n: i + 1 }));
  return (
    <div className="h-44" role="img" aria-label="Average mastery estimate of assessed skills after each scored batch">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="n" tick={axis} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={axis} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
            formatter={(v, _n, p) => [`${v}% across ${(p.payload as { assessed: number }).assessed} assessed skills`, "Average estimate"]}
            labelFormatter={(n) => `Update ${n}`}
          />
          <Line type="monotone" dataKey="average" stroke="var(--st-learning)" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
