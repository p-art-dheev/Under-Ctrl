export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Preparing your lesson">
      <div className="sf-skeleton h-8 w-1/2" />
      <div className="sf-skeleton h-4 w-3/4" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <div className="sf-skeleton h-40 w-full" />
          <div className="sf-skeleton h-24 w-full" />
          <div className="sf-skeleton h-24 w-full" />
        </div>
        <div className="sf-skeleton h-80 w-full" />
      </div>
      <p className="text-sm text-muted">Preparing your lesson. A new lesson is written the first time you open it, which can take up to a minute.</p>
    </div>
  );
}
