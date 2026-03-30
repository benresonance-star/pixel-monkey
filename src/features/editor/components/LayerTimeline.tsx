import { useEditorStore } from '../state/editorStore'

type LayerTimelineProps = {
  compact?: boolean
}

export function LayerTimeline({ compact = false }: LayerTimelineProps) {
  const frames = useEditorStore((state) => state.animation.frames)
  const activeFrameIndex = useEditorStore((state) => state.activeFrameIndex)
  const fps = useEditorStore((state) => state.animation.fps)
  const isPlaying = useEditorStore((state) => state.isPlaying)

  const selectFrame = useEditorStore((state) => state.selectFrame)
  const addBlankFrame = useEditorStore((state) => state.addBlankFrame)
  const duplicateActiveFrame = useEditorStore((state) => state.duplicateActiveFrame)
  const deleteActiveFrame = useEditorStore((state) => state.deleteActiveFrame)
  const togglePlayback = useEditorStore((state) => state.togglePlayback)
  const previousFrame = useEditorStore((state) => state.previousFrame)
  const nextFrame = useEditorStore((state) => state.nextFrame)

  return (
    <section className={`timeline ${compact ? 'timeline--compact' : 'panel'}`}>
      {compact ? null : (
        <div className="timeline__header">
          <div>
            <h2>Frames</h2>
            <p>Duplicate the current artwork into a new frame, then cycle the timeline to build short loops.</p>
          </div>

          <div className="button-group" role="group" aria-label="Playback controls">
            <button type="button" onClick={previousFrame}>
              Previous
            </button>
            <button type="button" className="button-primary" onClick={togglePlayback}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button type="button" onClick={nextFrame}>
              Next
            </button>
          </div>
        </div>
      )}

      <div className="timeline__meta">
        <span>{frames.length} frames</span>
        <span>{fps} fps</span>
        {compact ? (
          <button type="button" className="button-primary" onClick={togglePlayback}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        ) : null}
      </div>

      <div className="timeline__actions">
        <button type="button" onClick={addBlankFrame}>
          New blank frame
        </button>
        <button type="button" onClick={duplicateActiveFrame}>
          Duplicate frame
        </button>
        <button type="button" onClick={deleteActiveFrame}>
          Delete frame
        </button>
      </div>

      <div className="timeline__list" role="list" aria-label="Frame timeline">
        {frames.map((frame, index) => (
          <button
            key={frame.id}
            type="button"
            role="listitem"
            className={`frame-card ${index === activeFrameIndex ? 'is-active' : ''}`}
            onClick={() => selectFrame(index)}
          >
            <span className="frame-card__number">Frame {index + 1}</span>
            <span className="frame-card__id">{frame.id.slice(0, 8)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
