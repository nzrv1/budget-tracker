import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { Insight } from '../types'
import { Card, SectionHeading } from './shared'
import { EmptyState } from './Dashboard'

export default function NotificationsView({ insights }: { insights: Insight[] }) {
  return (
    <div>
      <SectionHeading eyebrow="Nudges & tips" title="Notifications" />

      {insights.length === 0 ? (
        <Card className="p-8">
          <EmptyState text="Nothing to flag right now — add transactions and goals to get tailored tips here." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {insights.map((insight) => (
            <Card key={insight.id} className="p-4 flex gap-3 items-start">
              <span
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  insight.tone === 'positive'
                    ? 'bg-sage-light text-sage-dark'
                    : insight.tone === 'warning'
                    ? 'bg-clay-light text-clay-dark'
                    : 'bg-paper text-ink-softer'
                }`}
              >
                {insight.tone === 'positive' ? (
                  <CheckCircle2 size={16} strokeWidth={1.75} />
                ) : insight.tone === 'warning' ? (
                  <AlertTriangle size={16} strokeWidth={1.75} />
                ) : (
                  <Info size={16} strokeWidth={1.75} />
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{insight.title}</p>
                <p className="text-sm text-ink-softer mt-0.5 leading-relaxed">{insight.message}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
