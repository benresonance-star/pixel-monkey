import { MAX_FPS, MIN_FPS } from '../../export/animationSchema'
import { useEditorStore } from '../state/editorStore'

function PreviousIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6 10 12l8 6V6Z" fill="currentColor" />
      <path d="M7 6h2v12H7z" fill="currentColor" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6v12l10-6-10-6Z" fill="currentColor" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 6h4v12H7zM13 6h4v12h-4z" fill="currentColor" />
    </svg>
  )
}

function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6v12l8-6-8-6Z" fill="currentColor" />
      <path d="M15 6h2v12h-2z" fill="currentColor" />
    </svg>
  )
}

export function AnimationSection() {
  const frames = useEditorStore((state) => state.animation.frames)
  const activeFrameIndex = useEditorStore((state) => state.activeFrameIndex)
  const fps = useEditorStore((state) => state.animation.fps)
  const isPlaying = useEditorStore((state) => state.isPlaying)
  const referenceLayers = useEditorStore((state) => state.referenceLayers)

  const setFps = useEditorStore((state) => state.setFps)
  const selectFrame = useEditorStore((state) => state.selectFrame)
  const addBlankFrame = useEditorStore((state) => state.addBlankFrame)
  const duplicateActiveFrame = useEditorStore((state) => state.duplicateActiveFrame)
  const deleteActiveFrame = useEditorStore((state) => state.deleteActiveFrame)
  const togglePlayback = useEditorStore((state) => state.togglePlayback)
  const previousFrame = useEditorStore((state) => state.previousFrame)
  const nextFrame = useEditorStore((state) => state.nextFrame)

  return (
    <div className="animation-section">
      <div className="animation-section__controls">
        <label className="field">
          <span>FPS</span>
          <input
            type="number"
            min={MIN_FPS}
            max={MAX_FPS}
            value={fps}
            onChange={(event) => setFps(Number(event.target.value))}
          />
        </label>

        <div className="button-group" role="group" aria-label="Playback controls">
          <button
            type="button"
            className="transport-button"
            onClick={previousFrame}
            aria-label="Previous frame"
            title="Previous frame"
          >
            <PreviousIcon />
          </button>
          <button
            type="button"
            className="button-primary transport-button"
            onClick={togglePlayback}
            aria-label={isPlaying ? 'Pause playback' : 'Play animation'}
            title={isPlaying ? 'Pause playback' : 'Play animation'}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            className="transport-button"
            onClick={nextFrame}
            aria-label="Next frame"
            title="Next frame"
          >
            <NextIcon />
          </button>
        </div>

        <div className="button-group" role="group" aria-label="Frame actions">
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
      </div>

      <div className="animation-section__meta">
        <span>{frames.length} frames</span>
        <span>{fps} fps</span>
        <span>Active frame #{activeFrameIndex + 1}</span>
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
            <span className="frame-card__badge">
              {referenceLayers[frame.id]?.assetId ? 'Ref image' : 'No ref'}
            </span>
            <span className="frame-card__id">{frame.id.slice(0, 8)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
