import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { activeCourseId } from "@/lib/services/learning";
import { runtimeInfo } from "@/lib/runtime";
import { lastLiveStatus } from "@/lib/ai/gemma";
import { Card, PageHeader, Pill, btn, btnGhost } from "@/components/ui";
import { SmokeButton } from "@/components/dev-status";
import { signOutAction, switchCourseAction } from "@/app/actions";
import type { Course } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, store } = await requireUser();
  const courses = (await store.select<Course>("courses")).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const active = await activeCourseId(store);
  const rt = runtimeInfo();
  return (
    <>
      <PageHeader title="Settings" subtitle={user.email} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Learning plans</h2>
            <Link href="/onboarding" className={btnGhost}><Plus size={14} aria-hidden /> New goal</Link>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {courses.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted">{c.status === "setup" ? "setting up" : "active"} · created {new Date(c.created_at).toLocaleDateString()} · {c.content_mode === "fixture" ? "fixture content" : "Gemma content"}</p>
                </div>
                {c.id === active ? <Pill tone="brand">Active</Pill> : (
                  <form action={switchCourseAction.bind(null, c.id)}><button className={btnGhost}>Switch</button></form>
                )}
              </li>
            ))}
          </ul>
          <form action={signOutAction} className="mt-4"><button className={btn}>Sign out</button></form>
        </Card>
        <Card>
          <h2 className="font-semibold">Developer status</h2>
          <dl className="mt-3 grid grid-cols-[140px_1fr] gap-y-2 text-sm">
            <dt className="text-muted">AI provider</dt><dd>{rt.ai.provider}</dd>
            <dt className="text-muted">Model</dt><dd className="font-mono">{rt.ai.model}</dd>
            <dt className="text-muted">API key</dt><dd>{rt.ai.hasKey ? "configured (hidden)" : "not set"}</dd>
            <dt className="text-muted">Fixture mode</dt><dd>{rt.ai.fixture ? `on: ${rt.ai.fixtureReason}` : "off: all content is generated live by Gemma"}</dd>
            <dt className="text-muted">Live search</dt><dd>{rt.search ? "Tavily key configured" : "not configured: curated catalog is used"}</dd>
            <dt className="text-muted">Data store</dt><dd>{rt.data === "supabase" ? "Supabase (Auth + Postgres with RLS)" : "local demo store (.data/)"}</dd>
          </dl>
          <div className="mt-4"><SmokeButton initial={lastLiveStatus()} /></div>
          <p className="mt-3 text-xs text-muted">The live check is reported separately from fixture mode and never falls back to fixture content.</p>
        </Card>
      </div>
    </>
  );
}
