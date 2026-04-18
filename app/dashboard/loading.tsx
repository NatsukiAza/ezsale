export default function DashboardLoading() {
  return (
    <div className="min-h-screen animate-pulse pb-12">
      <div className="fixed top-0 z-50 h-[72px] w-full bg-stone-100/90 shadow-sm backdrop-blur-md" />
      <main className="mx-auto max-w-6xl space-y-10 px-6 pt-24">
        <div className="h-52 rounded-4xl bg-stone-200/90 md:h-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-44 rounded-3xl bg-stone-200/70" />
          <div className="h-44 rounded-3xl bg-stone-200/70" />
        </div>
        <div className="h-36 rounded-3xl bg-stone-200/60" />
      </main>
    </div>
  );
}
