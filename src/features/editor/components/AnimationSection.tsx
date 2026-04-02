import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import {
  MAX_FPS,
  MAX_FRAME_DESCRIPTOR_LENGTH,
  MIN_FPS,
  clampFps,
} from '../../export/animationSchema'
import { drawFrameThumbnail, FRAME_THUMB_SIZE } from '../lib/framePreview'
import { useEditorStore } from '../state/editorStore'

const FRAME_DRAG_MIME = 'application/x-pixel-editor-frame-index'

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

function FrameThumbnail({ pixels }: { pixels: readonly string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    drawFrameThumbnail(canvas, pixels)
  }, [pixels])

  return (
    <canvas
      ref={canvasRef}
      className="frame-card__thumb"
      width={FRAME_THUMB_SIZE}
      height={FRAME_THUMB_SIZE}
      aria-hidden
    />
  )
}

export function AnimationSection() {
  const frames = useEditorStore((state) => state.animation.frames)
  const activeFrameIndex = useEditorStore((state) => state.activeFrameIndex)
  const fps = useEditorStore((state) => state.animation.fps)
  const isPlaying = useEditorStore((state) => state.isPlaying)
  const referenceLayers = useEditorStore((state) => state.referenceLayers)

  const setFps = useEditorStore((state) => state.setFps)
  const [fpsInput, setFpsInput] = useState(() => String(fps))

  useEffect(() => {
    setFpsInput(String(fps))
  }, [fps])
  const selectFrame = useEditorStore((state) => state.selectFrame)
  const setFrameDescriptor = useEditorStore((state) => state.setFrameDescriptor)
  const reorderFrames = useEditorStore((state) => state.reorderFrames)
  const addBlankFrame = useEditorStore((state) => state.addBlankFrame)
  const duplicateActiveFrame = useEditorStore((state) => state.duplicateActiveFrame)
  const deleteActiveFrame = useEditorStore((state) => state.deleteActiveFrame)
  const togglePlayback = useEditorStore((state) => state.togglePlayback)
  const previousFrame = useEditorStore((state) => state.previousFrame)
  const nextFrame = useEditorStore((state) => state.nextFrame)

  const deleteFrameDialogRef = useRef<HTMLDialogElement>(null)

  const openDeleteFrameDialog = () => {
    deleteFrameDialogRef.current?.showModal()
  }

  const closeDeleteFrameDialog = () => {
    deleteFrameDialogRef.current?.close()
  }

  const confirmDeleteFrame = () => {
    deleteActiveFrame()
    closeDeleteFrameDialog()
  }

  const [draggingFrameIndex, setDraggingFrameIndex] = useState<number | null>(null)
  const [dropTargetFrameIndex, setDropTargetFrameIndex] = useState<number | null>(null)

  return (
    <div className="animation-section">
      <div className="animation-section__controls">
        <label className="field">
          <span>FPS</span>
          <input
            type="number"
            min={MIN_FPS}
            max={MAX_FPS}
            inputMode="numeric"
            autoComplete="off"
            value={fpsInput}
            onChange={(event) => {
              const next = event.target.value
              setFpsInput(next)
              if (next === '') {
                return
              }
              const parsed = Number(next)
              if (!Number.isFinite(parsed)) {
                return
              }
              setFps(parsed)
            }}
            onBlur={() => {
              if (fpsInput === '') {
                const restored = clampFps(fps)
                setFpsInput(String(restored))
                return
              }
              const parsed = Number(fpsInput)
              if (!Number.isFinite(parsed)) {
                setFpsInput(String(fps))
                return
              }
              const clamped = clampFps(parsed)
              setFps(clamped)
              setFpsInput(String(clamped))
            }}
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
          <button type="button" onClick={openDeleteFrameDialog}>
            Delete frame
          </button>
        </div>
      </div>

      <dialog
        ref={deleteFrameDialogRef}
        className="confirm-dialog"
        aria-labelledby="delete-frame-dialog-title"
      >
        <div className="confirm-dialog__panel panel">
          <h3 id="delete-frame-dialog-title" className="confirm-dialog__title">
            Delete this frame?
          </h3>
          <p className="confirm-dialog__body">
            This removes the active frame from the animation. If it is the only frame, the canvas is
            replaced with a new blank frame. This cannot be undone.
          </p>
          <div className="confirm-dialog__actions">
            <button type="button" onClick={closeDeleteFrameDialog}>
              Cancel
            </button>
            <button type="button" className="button-danger" onClick={confirmDeleteFrame}>
              Delete frame
            </button>
          </div>
        </div>
      </dialog>

      <div className="animation-section__meta">
        <span>{frames.length} frames</span>
        <span>{fps} fps</span>
        <span>Active frame #{activeFrameIndex + 1}</span>
      </div>

      <div
        className="timeline__list"
        role="list"
        aria-label="Frame timeline. Drag frames to reorder."
        onDragLeave={(event) => {
          const next = event.relatedTarget as Node | null
          if (next && event.currentTarget.contains(next)) {
            return
          }
          setDropTargetFrameIndex(null)
        }}
      >
        {frames.map((frame, index) => (
          <div
            key={frame.id}
            role="listitem"
            draggable
            title="Drag to reorder frames"
            className={`frame-card ${
              draggingFrameIndex === index ? 'frame-card--dragging' : ''
            } ${dropTargetFrameIndex === index && draggingFrameIndex !== index ? 'frame-card--drop-target' : ''}`}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData(FRAME_DRAG_MIME, String(index))
              event.dataTransfer.setData('text/plain', String(index))
              setDraggingFrameIndex(index)
            }}
            onDragEnd={() => {
              setDraggingFrameIndex(null)
              setDropTargetFrameIndex(null)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              if (draggingFrameIndex !== null && draggingFrameIndex !== index) {
                setDropTargetFrameIndex(index)
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              const raw =
                event.dataTransfer.getData(FRAME_DRAG_MIME) || event.dataTransfer.getData('text/plain')
              const fromIndex = Number.parseInt(raw, 10)
              if (!Number.isFinite(fromIndex)) {
                return
              }
              reorderFrames(fromIndex, index)
              setDraggingFrameIndex(null)
              setDropTargetFrameIndex(null)
            }}
          >
            <button
              type="button"
              className={`frame-card__select ${index === activeFrameIndex ? 'is-active' : ''}`}
              onClick={() => selectFrame(index)}
            >
              <div className="frame-card__row">
                <FrameThumbnail pixels={frame.pixels} />
                <div className="frame-card__meta">
                  <div className="frame-card__header-row">
                    <span className="frame-card__number">Frame {index + 1}</span>
                    <span className="frame-card__drag-hint" aria-hidden="true">
                      ⋮⋮
                    </span>
                  </div>
                  <span className="frame-card__badge">
                    {referenceLayers[frame.id]?.assetId ? 'Ref image' : 'No ref'}
                  </span>
                  <span className="frame-card__id">{frame.id.slice(0, 8)}</span>
                </div>
              </div>
            </button>
            <input
              type="text"
              className="frame-card__descriptor"
              placeholder="Label…"
              maxLength={MAX_FRAME_DESCRIPTOR_LENGTH}
              value={frame.descriptor ?? ''}
              aria-label={`Frame ${index + 1} label`}
              onChange={(event) => setFrameDescriptor(index, event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
