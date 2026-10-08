import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { ModeBanner } from "@/components/mode-banner";
import { activeCourseId } from "@/lib/services/learning";
import type { Course } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, store } = await requireUser();
  const courseId = await activeCourseId(store);
  const [course] = courseId ? await store.select<Course>("courses", { id: courseId }) : [];
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar email={user.email} courseTitle={course?.title ?? null} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ModeBanner />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
