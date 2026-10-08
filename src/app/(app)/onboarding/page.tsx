import { Card, PageHeader } from "@/components/ui";
import { OnboardingForm } from "@/components/onboarding-form";

export const metadata = { title: "New goal" };

export default function Onboarding() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Set a learning goal" subtitle="Next, a short diagnostic of 6–8 questions in two parts. It's not graded and only shows where to start." />
      <Card>
        <OnboardingForm />
      </Card>
    </div>
  );
}
