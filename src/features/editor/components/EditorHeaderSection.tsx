import { useEditorStore } from '../state/editorStore'
import { getResolvedCanvasGridColor } from '../lib/canvasColors'

type EditorHeaderSectionProps = {
  onCreateNewProjectClick: () => void
  onImportAnimationClick: () => void
  onExportAnimationClick: () => void
  onImportProjectClick: () => void
  onExportProjectClick: () => void
  statusMessage: string
}

export function EditorHeaderSection({
  onCreateNewProjectClick,
  onImportAnimationClick,
  onExportAnimationClick,
  onImportProjectClick,
  onExportProjectClick,
  statusMessage,
}: EditorHeaderSectionProps) {
  const animationName = useEditorStore((state) => state.animation.name)
  const canvasBackgroundColor = useEditorStore((state) => state.canvasBackgroundColor)
  const canvasGridColorOverride = useEditorStore((state) => state.canvasGridColorOverride)
  const setAnimationName = useEditorStore((state) => state.setAnimationName)
  const setCanvasBackgroundColor = useEditorStore((state) => state.setCanvasBackgroundColor)
  const setCanvasGridColorOverride = useEditorStore((state) => state.setCanvasGridColorOverride)

  const resolvedGridColor = getResolvedCanvasGridColor(
    canvasBackgroundColor,
    canvasGridColorOverride,
  )

  return (
    <section className="editor-section panel">
      <div className="app-wordmark" aria-label="Pixel Monkey">
        PIXEL MONKEY
      </div>

      <div className="editor-section__header editor-section__header--align-end">
        <details className="settings-menu">
          <summary className="settings-menu__trigger" aria-label="Open settings menu">
            <svg
              className="settings-menu__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3.25" />
              <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.8 1.8 0 0 1 0 2.6 1.8 1.8 0 0 1-2.6 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.8 1.8 0 0 1-1.8 1.8h-1a1.8 1.8 0 0 1-1.8-1.8v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.8 1.8 0 0 1-2.6 0 1.8 1.8 0 0 1 0-2.6l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.8 1.8 0 0 1-1.8-1.8v-1A1.8 1.8 0 0 1 4 10.2h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.8 1.8 0 0 1 0-2.6 1.8 1.8 0 0 1 2.6 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4A1.8 1.8 0 0 1 11 2.2h1A1.8 1.8 0 0 1 13.8 4v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.8 1.8 0 0 1 2.6 0 1.8 1.8 0 0 1 0 2.6l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2A1.8 1.8 0 0 1 21.8 11v1a1.8 1.8 0 0 1-1.8 1.8h-.2a1 1 0 0 0-.9.6Z" />
            </svg>
          </summary>

          <div className="settings-menu__content">
            <div className="settings-menu__group">
              <label className="field field--small">
                <span>Canvas background</span>
                <input
                  type="color"
                  value={canvasBackgroundColor}
                  onChange={(event) => setCanvasBackgroundColor(event.target.value)}
                />
              </label>
              <label className="field field--small">
                <span>Grid color</span>
                <div className="settings-menu__color-row">
                  <input
                    type="color"
                    value={resolvedGridColor}
                    onChange={(event) => setCanvasGridColorOverride(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setCanvasGridColorOverride(null)}
                    disabled={canvasGridColorOverride === null}
                  >
                    Auto
                  </button>
                </div>
              </label>
            </div>
            <button type="button" onClick={onCreateNewProjectClick}>
              Create new project
            </button>
            <button type="button" onClick={onImportAnimationClick}>
              Import animation JSON
            </button>
            <button type="button" onClick={onExportAnimationClick}>
              Export animation JSON
            </button>
            <button type="button" onClick={onImportProjectClick}>
              Import project snapshot
            </button>
            <button type="button" className="button-primary" onClick={onExportProjectClick}>
              Export project snapshot
            </button>
          </div>
        </details>
      </div>

      <div className="editor-section__body">
        <label className="field">
          <span>Animation name</span>
          <input value={animationName} onChange={(event) => setAnimationName(event.target.value)} />
        </label>
      </div>

      {statusMessage !== 'Ready to draw.' ? <p className="status-message">{statusMessage}</p> : null}
    </section>
  )
}
