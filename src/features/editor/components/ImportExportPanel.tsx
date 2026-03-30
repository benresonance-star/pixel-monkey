import { useEditorStore } from '../state/editorStore'

type ImportExportPanelProps = {
  onImportClick: () => void
  onExportClick: () => void
  statusMessage: string
  compact?: boolean
}

export function ImportExportPanel({
  onImportClick,
  onExportClick,
  statusMessage,
  compact = false,
}: ImportExportPanelProps) {
  const activeFrameIndex = useEditorStore((state) => state.activeFrameIndex)
  const frameCount = useEditorStore((state) => state.animation.frames.length)
  const fps = useEditorStore((state) => state.animation.fps)

  return (
    <section className={`io-panel ${compact ? 'io-panel--compact' : 'panel'}`}>
      {!compact ? (
        <div className="io-panel__header">
          <h2>File Actions</h2>
          <p>Import an animation JSON file or export the current draft.</p>
        </div>
      ) : null}

      <div className="io-panel__actions">
        <button type="button" onClick={onImportClick}>
          Import JSON
        </button>
        <button type="button" className="button-primary" onClick={onExportClick}>
          Export JSON
        </button>
      </div>

      <dl className="io-panel__stats">
        <div>
          <dt>Current frame</dt>
          <dd>{activeFrameIndex + 1}</dd>
        </div>
        <div>
          <dt>Total frames</dt>
          <dd>{frameCount}</dd>
        </div>
        <div>
          <dt>Playback rate</dt>
          <dd>{fps} fps</dd>
        </div>
        <div>
          <dt>Format</dt>
          <dd>JSON</dd>
        </div>
      </dl>

      <p className="status-message">{statusMessage}</p>
    </section>
  )
}
