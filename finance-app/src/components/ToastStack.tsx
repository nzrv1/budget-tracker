import { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

interface Toast {
  id: string
  title: string
  tone: 'positive' | 'warning' | 'info'
}

const TONE_STYLES: Record<Toast['tone'], { bg: string; border: string; icon: React.ElementType; iconColor: string }> = {
  positive: { bg: 'bg-white', border: 'border-sage', icon: CheckCircle2, iconColor: 'text-sage-dark' },
  warning: { bg: 'bg-white', border: 'border-clay', icon: AlertTriangle, iconColor: 'text-clay-dark' },
  info: { bg: 'bg-white', border: 'border-ink-softer', icon: Info, iconColor: 'text-ink-softer' },
}

export default function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), 7000))
    return () => timers.forEach(clearTimeout)
  }, [toasts, dismiss])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-40 flex flex-col gap-2 sm:w-96">
      {toasts.map((t) => {
        const style = TONE_STYLES[t.tone]
        const Icon = style.icon
        return (
          <div
            key={t.id}
            className={`${style.bg} border-l-4 ${style.border} rounded shadow-lg shadow-ink/5 px-4 py-3 flex items-start gap-3 animate-[slideIn_0.25s_ease-out]`}
          >
            <Icon size={18} className={`${style.iconColor} shrink-0 mt-0.5`} strokeWidth={1.75} />
            <p className="text-sm font-medium text-ink flex-1">{t.title}</p>
            <button onClick={() => dismiss(t.id)} className="text-ink/30 hover:text-ink/60 shrink-0">
              <X size={15} />
            </button>
          </div>
        )
      })}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
