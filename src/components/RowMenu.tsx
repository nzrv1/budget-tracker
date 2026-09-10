import { useEffect, useState } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useT } from '../lib/i18n'
import { showTelegramBackButton } from '../lib/telegram'

/**
 * The per-row action control for list cards (Goals, Important Dates, …) — a single 44px "⋯"
 * button that opens a bottom sheet with Edit / Delete, replacing the pair of ~30px icons that
 * were too small and too close together on a phone. Delete asks for confirmation inline in the
 * sheet rather than firing on the first tap.
 */
export default function RowMenu({
  label,
  onEdit,
  onDelete,
  deleteConfirmLabel,
}: {
  /** Accessible name for the trigger, e.g. "More actions for Trip to Japan". */
  label: string
  onEdit?: () => void
  onDelete: () => void
  deleteConfirmLabel: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)

  function close() {
    setOpen(false)
    setConfirming(false)
  }

  // The Telegram back gesture should close the sheet, not leave the Mini App.
  useEffect(() => {
    if (!open) return
    return showTelegramBackButton(close)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="menu"
        className="-m-1 flex h-11 w-11 items-center justify-center text-ink-softer hover:text-ink shrink-0"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={close}
        >
          <div
            className="w-full sm:max-w-sm bg-paper-card rounded-t-lg sm:rounded-lg border-t sm:border border-paper-line pb-[env(safe-area-inset-bottom)] sm:mb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
              <span className="h-1 w-9 rounded-full bg-paper-line" />
            </div>

            {!confirming ? (
              <div className="p-2" role="menu">
                {onEdit && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      close()
                      onEdit()
                    }}
                    className="w-full flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-sm font-medium text-ink hover:bg-paper"
                  >
                    <Pencil size={16} className="shrink-0" />
                    {t.common.edit}
                  </button>
                )}
                <button
                  role="menuitem"
                  onClick={() => setConfirming(true)}
                  className="w-full flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-sm font-medium text-clay-dark hover:bg-clay-light"
                >
                  <Trash2 size={16} className="shrink-0" />
                  {t.common.delete}
                </button>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-sm font-medium text-ink mb-3">{deleteConfirmLabel}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      close()
                      onDelete()
                    }}
                    className="flex-1 min-h-[44px] rounded bg-clay text-white text-sm font-medium hover:bg-clay-dark transition-colors"
                  >
                    {t.common.delete}
                  </button>
                  <button
                    onClick={close}
                    className="flex-1 min-h-[44px] rounded border border-paper-line text-ink-softer text-sm font-medium hover:bg-paper transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
