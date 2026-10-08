import { courseContext } from "@/lib/page-context";
import { graphSkills } from "@/lib/graph-view";
import { PageHeader } from "@/components/ui";
import { SkillGraph } from "@/components/skill-graph";

export const metadata = { title: "Skill map" };

export default async function MapPage() {
  const { snap } = await courseContext();
  const skills = graphSkills(snap);
  return (
    <>
      <PageHeader
        title="Skill map"
        subtitle={`${snap.skills.length} skills · ${snap.edges.length} prerequisite links · graph version ${snap.course.graph_version}. Arrows point from a prerequisite to the skill that depends on it.`}
      />
      <SkillGraph skills={skills} version={snap.course.graph_version} />
    </>
  );
}
