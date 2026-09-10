/**
 * Shown for the fraction of a second between launch and the cloud-sync decision inside Telegram
 * (see App.tsx: syncResolved) — a quiet placeholder shaped like the Dashboard so the real
 * screen doesn't pop in from stale data. Never seen outside Telegram, where sync resolves
 * synchronously.
 */
export default function AppSkeleton() {
  const Bar = ({ className = '' }: { className?: string }) => (
    <div className={`rounded bg-paper-line/70 motion-safe:animate-pulse ${className}`} />
  )

  return (
    <div className="min-h-screen bg-paper text-ink font-body">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10 pt-[env(safe-area-inset-top)] lg:ml-16">
        <Bar className="h-4 w-32 mb-2" />
        <Bar className="h-7 w-56 mb-6" />

        <div className="rounded-lg bg-paper-line/50 h-24 mb-3 motion-safe:animate-pulse" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-paper-line p-3">
              <Bar className="h-3 w-12 mb-2" />
              <Bar className="h-5 w-20" />
            </div>
          ))}
        </div>

        <Bar className="h-11 w-full mb-6" />

        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-paper-line p-4 mb-4">
            <Bar className="h-4 w-40 mb-3" />
            <Bar className="h-2 w-full mb-3" />
            <Bar className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}
