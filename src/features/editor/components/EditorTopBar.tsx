import { useEditorStore } from '../state/editorStore'

type MobilePanel = 'frames' | 'settings' | 'files' | null

type EditorTopBarProps = {
  activePanel: MobilePanel
  onTogglePanel: (panel: Exclude<MobilePanel, null> | null) => void
}

export function EditorTopBar({ activePanel, onTogglePanel }: EditorTopBarProps) {
  const animationName = useEditorStore((state) => state.animation.name)
  const activeFrameIndex = useEditorStore((state) => state.activeFrameIndex)
  const frameCount = useEditorStore((state) => state.animation.frames.length)

  return (
    <header className="mobile-top-bar panel">
      <div className="mobile-top-bar__meta">
        <strong className="mobile-top-bar__title">{animationName}</strong>
        <span className="mobile-top-bar__subtitle">
          Frame {activeFrameIndex + 1} of {frameCount}
        </span>
      </div>

      <button
        type="button"
        className={activePanel ? 'is-active' : ''}
        onClick={() => onTogglePanel(activePanel ? null : 'settings')}
      >
        {activePanel ? 'Close' : 'Menu'}
      </button>
    </header>
  )
}
