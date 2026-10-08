import { Award, ExternalLink, Info } from "lucide-react";
import { courseContext } from "@/lib/page-context";
import { recommendCertifications } from "@/lib/certifications";
import { dashboardStats, skillViews } from "@/lib/services/snapshot";
import { Card, Empty, PageHeader, Pill } from "@/components/ui";

export const metadata = { title: "Certification" };

export default async function CertificationPage() {
  const { snap } = await courseContext();
  const stats = dashboardStats(snap, skillViews(snap));
  const matches = recommendCertifications({
    goal: snap.goal.goal_text,
    title: snap.course.title,
    skills: snap.skills.filter((s) => s.kind === "core").map((s) => s.title),
  });
  const [best, ...others] = matches;
  return (
    <>
      <PageHeader title="Certification" subtitle="Credentials that line up with your goal, so your learning ends in something you can show." />
      {!best ? (
        <Empty title="No catalog match for this goal">The team&apos;s certification catalog does not cover this topic yet. Check the credentials your field&apos;s professional bodies or employers recognise.</Empty>
      ) : (
        <div className="space-y-6">
          <Card className="relative overflow-hidden border-brand/30 bg-gradient-to-br from-brand-soft via-surface to-surface dark:border-line dark:from-surface-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand"><Award size={13} aria-hidden /> Best match for your goal</p>
            <h2 className="mt-1 text-2xl font-semibold">{best.cert.name}</h2>
            <p className="mt-0.5 text-sm text-muted">{best.cert.provider}</p>
            <div className="mt-3 flex flex-wrap gap-2"><Pill tone="brand">{best.cert.kind}</Pill><Pill>{best.cert.level}</Pill></div>
            <p className="mt-3 text-sm">{best.cert.blurb}</p>
            <p className="mt-3 text-sm"><span className="font-medium">Why it fits:</span> your goal and skill map mention {best.matched.slice(0, 4).join(", ")}.</p>
            <p className="mt-1 text-sm text-muted">
              Your progress so far: {stats.mastered} of {stats.coreSkills} skills mastered, {stats.assessed} assessed. Finish the skill map first, then check the official exam outline against what you have covered.
            </p>
            <a href={best.cert.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">Official page <ExternalLink size={13} aria-hidden /></a>
          </Card>
          {others.length ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Other options</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {others.map(({ cert, matched }) => (
                  <Card key={cert.id}>
                    <h3 className="font-semibold">{cert.name}</h3>
                    <p className="text-sm text-muted">{cert.provider}</p>
                    <div className="mt-2 flex flex-wrap gap-2"><Pill tone="brand">{cert.kind}</Pill><Pill>{cert.level}</Pill></div>
                    <p className="mt-2 text-sm">{cert.blurb}</p>
                    <p className="mt-2 text-xs text-muted">Matched: {matched.slice(0, 4).join(", ")}</p>
                    <a href={cert.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">Official page <ExternalLink size={13} aria-hidden /></a>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
          <p className="flex items-start gap-2 text-xs text-muted">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
            Recommendations come from a small catalog curated by the team and matched to your goal by keywords; it is not a ranking of all certifications. Fees, exam formats and availability change, so confirm them on the provider&apos;s page. Cognify is not affiliated with these providers.
          </p>
        </div>
      )}
    </>
  );
}
