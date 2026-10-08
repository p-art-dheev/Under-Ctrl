import { ExternalLink } from "lucide-react";
import { courseContext } from "@/lib/page-context";
import { planOrder } from "@/lib/services/snapshot";
import { Card, Empty, PageHeader, Pill } from "@/components/ui";

export const metadata = { title: "Resources" };

export default async function ResourcesPage() {
  const { snap } = await courseContext();
  const origin = snap.course.state.resource_origin;
  const plan = planOrder(snap).filter((s) => s.kind === "core");
  return (
    <>
      <PageHeader
        title="Resources"
        subtitle={
          origin === "live_search"
            ? "Retrieved by live web search (Tavily) when your course was created, then ranked by Gemma. Search results are not automatically authoritative."
            : "Curated resources: a small catalog of official documentation picked by the team, shown because live search was not available. Not live research."
        }
      />
      {snap.resources.length === 0 ? <Empty title="No resources for this course">Lessons were generated without citations.</Empty> : null}
      <div className="space-y-4">
        {plan.map((s) => {
          const list = snap.resources.filter((r) => r.skill_id === s.id);
          if (!list.length) return null;
          return (
            <Card key={s.id}>
              <h2 className="font-semibold">{s.title}</h2>
              <ul className="mt-3 space-y-3">
                {list.map((r) => (
                  <li key={r.id}>
                    <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">{r.title} <ExternalLink size={12} aria-hidden /></a>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <Pill>{r.provider}</Pill>
                      <Pill>{r.format}</Pill>
                      <Pill tone={r.origin === "curated" ? "brand" : "muted"}>{r.origin === "curated" ? "curated" : "live search"}</Pill>
                      {r.estimated_minutes ? <Pill>≈ {r.estimated_minutes} min (platform estimate)</Pill> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted">{r.excerpt}</p>
                    <p className="mt-1 text-xs text-muted">Why selected: {r.selection_reason} · {r.verification_status} · retrieved {new Date(r.retrieved_at).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </>
  );
}
