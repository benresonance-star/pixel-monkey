import { useEffect, useRef, useState, type ChangeEvent } from 'react'

import { AnimationSection } from './components/AnimationSection'
import { CanvasViewportInner } from './components/CanvasViewport'
import { CollapsibleSection } from './components/CollapsibleSection'
import { DrawingToolsSection } from './components/DrawingToolsSection'
import { EditorHeaderSection } from './components/EditorHeaderSection'
import { HistorySection } from './components/HistorySection'
import { getFrameDurationMs } from './lib/playback'
import { createPersistedEditorStateSnapshot, useEditorStore } from './state/editorStore'
import { downloadAnimationJson } from '../export/exportAnimation'
import { importAnimationFile } from '../import/importAnimation'
import { downloadProjectSnapshot } from '../project/exportProjectSnapshot'
import { importProjectSnapshotFile } from '../project/importProjectSnapshot'

export function PixelEditorPage() {
  const animationFileInputRef = useRef<HTMLInputElement | null>(null)
  const projectFileInputRef = useRef<HTMLInputElement | null>(null)
  const [statusMessage, setStatusMessage] = useState('Ready to draw.')
  const [isHistoryOpen, setIsHistoryOpen] = useState(true)
  const [isToolsOpen, setIsToolsOpen] = useState(true)
  const [isAnimationOpen, setIsAnimationOpen] = useState(false)

  const animation = useEditorStore((state) => state.animation)
  const activeFrameIndex = useEditorStore((state) => state.activeFrameIndex)
  const frameCount = useEditorStore((state) => state.animation.frames.length)
  const zoom = useEditorStore((state) => state.zoom)
  const isPlaying = useEditorStore((state) => state.isPlaying)
  const selectedColor = useEditorStore((state) => state.selectedColor)
  const canvasBackgroundColor = useEditorStore((state) => state.canvasBackgroundColor)
  const canvasGridColorOverride = useEditorStore((state) => state.canvasGridColorOverride)
  const brushSize = useEditorStore((state) => state.brushSize)
  const onionSkinEnabled = useEditorStore((state) => state.onionSkinEnabled)
  const onionSkinOpacity = useEditorStore((state) => state.onionSkinOpacity)
  const onionSkinPlacement = useEditorStore((state) => state.onionSkinPlacement)
  const referenceLayers = useEditorStore((state) => state.referenceLayers)
  const referenceOnionSkinEnabled = useEditorStore((state) => state.referenceOnionSkinEnabled)
  const referenceOnionSkinOpacity = useEditorStore((state) => state.referenceOnionSkinOpacity)
  const nextFrame = useEditorStore((state) => state.nextFrame)
  const replaceAnimation = useEditorStore((state) => state.replaceAnimation)
  const hydrateReferenceAssets = useEditorStore((state) => state.hydrateReferenceAssets)
  const restoreProjectSnapshot = useEditorStore((state) => state.restoreProjectSnapshot)
  const createNewProject = useEditorStore((state) => state.createNewProject)

  useEffect(() => {
    void hydrateReferenceAssets()
  }, [hydrateReferenceAssets])

  useEffect(() => {
    if (!isPlaying) {
      return
    }

    const intervalId = window.setInterval(() => {
      nextFrame()
    }, getFrameDurationMs(animation.fps))

    return () => window.clearInterval(intervalId)
  }, [animation.fps, isPlaying, nextFrame])

  function handleImportAnimationClick() {
    animationFileInputRef.current?.click()
  }

  function handleCreateNewProjectClick() {
    createNewProject()
    setStatusMessage('Started a new blank project.')
  }

  function handleImportProjectClick() {
    projectFileInputRef.current?.click()
  }

  async function handleAnimationFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const importedAnimation = await importAnimationFile(file)
      replaceAnimation(importedAnimation)
      setStatusMessage(`Imported ${importedAnimation.frames.length} frame(s) from ${file.name}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown import error'
      setStatusMessage(`Import failed: ${message}`)
    } finally {
      event.target.value = ''
    }
  }

  function handleExportAnimationClick() {
    downloadAnimationJson(animation)
    setStatusMessage(`Exported ${animation.frames.length} frame(s) to JSON.`)
  }

  async function handleProjectFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const snapshot = await importProjectSnapshotFile(file)
      await restoreProjectSnapshot(snapshot.editorState, snapshot.referenceAssets)
      setStatusMessage(
        `Imported project snapshot "${snapshot.editorState.animation.name}" from ${file.name}.`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown project import error'
      setStatusMessage(`Project import failed: ${message}`)
    } finally {
      event.target.value = ''
    }
  }

  async function handleExportProjectClick() {
    try {
      const editorState = createPersistedEditorStateSnapshot({
        animation,
        activeFrameIndex,
        selectedColor,
        canvasBackgroundColor,
        canvasGridColorOverride,
        brushSize,
        zoom,
        onionSkinEnabled,
        onionSkinOpacity,
        onionSkinPlacement,
        referenceLayers,
        referenceOnionSkinEnabled,
        referenceOnionSkinOpacity,
      })

      await downloadProjectSnapshot(editorState)
      setStatusMessage(`Exported project snapshot "${animation.name}".`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown project export error'
      setStatusMessage(`Project export failed: ${message}`)
    }
  }

  return (
    <main className="editor-shell editor-shell--stacked">
      <EditorHeaderSection
        onCreateNewProjectClick={handleCreateNewProjectClick}
        onImportAnimationClick={handleImportAnimationClick}
        onExportAnimationClick={handleExportAnimationClick}
        onImportProjectClick={handleImportProjectClick}
        onExportProjectClick={() => void handleExportProjectClick()}
        statusMessage={statusMessage}
      />

      <section className="editor-section panel">
        <div className="editor-section__header">
          <div className="editor-section__copy">
            <h2>Canvas</h2>
            <p>Draw directly onto a fixed 180x180 frame, with optional trace references that can sit above or below the pixel art.</p>
          </div>
          <div className="canvas-info">
            <div className="canvas-info__chip">
              <span className="canvas-info__label">Frame</span>
              <strong>{activeFrameIndex + 1}</strong>
            </div>
            <div className="canvas-info__chip">
              <span className="canvas-info__label">Total</span>
              <strong>{frameCount}</strong>
            </div>
            <div className="canvas-info__chip canvas-info__chip--accent">
              <span className="canvas-info__label">Zoom</span>
              <strong>{zoom}x</strong>
            </div>
          </div>
        </div>
        <div className="editor-section__body editor-section__body--canvas">
          <CanvasViewportInner showHeader={false} />
        </div>
      </section>

      <CollapsibleSection
        title="History"
        description="Undo and redo pixel edits."
        isExpanded={isHistoryOpen}
        onToggle={() => setIsHistoryOpen((currentValue) => !currentValue)}
      >
        <HistorySection />
      </CollapsibleSection>

      <CollapsibleSection
        title="Drawing tools"
        description="Pencil, eraser, color, brush size, copy and paste frame, and advanced tools."
        isExpanded={isToolsOpen}
        onToggle={() => setIsToolsOpen((currentValue) => !currentValue)}
      >
        <DrawingToolsSection />
      </CollapsibleSection>

      <CollapsibleSection
        title="Animation features"
        description="Frame management, playback, FPS, and timeline selection."
        isExpanded={isAnimationOpen}
        onToggle={() => setIsAnimationOpen((currentValue) => !currentValue)}
      >
        <AnimationSection />
      </CollapsibleSection>

      <input
        ref={animationFileInputRef}
        className="sr-only"
        type="file"
        accept=".json,.animation.json,application/json"
        onChange={handleAnimationFileChange}
      />
      <input
        ref={projectFileInputRef}
        className="sr-only"
        type="file"
        accept=".pixel-project.json,application/json"
        onChange={handleProjectFileChange}
      />
    </main>
  )
}
