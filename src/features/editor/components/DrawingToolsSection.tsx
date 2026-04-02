import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'

import { BRUSH_SIZES, type BrushSize } from '../../export/animationSchema'
import { useEditorStore, type EditorTool, type OnionSkinPlacement } from '../state/editorStore'
import { createEmptyReferenceLayer } from '../state/referenceLayer'
import { CollapsibleSubsection } from './CollapsibleSubsection'

const TOOL_OPTIONS: Array<{ label: string; value: EditorTool; icon: ReactNode }> = [
  {
    label: 'Pencil',
    value: 'pencil',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 20l4.5-1 9.2-9.2a1.8 1.8 0 0 0 0-2.5l-1-1a1.8 1.8 0 0 0-2.5 0L5 15.5 4 20Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12.5 7.5l4 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: 'Eraser',
    value: 'eraser',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 16.5 15.9 7.6a2 2 0 0 1 2.8 0l1.7 1.7a2 2 0 0 1 0 2.8l-6.2 6.2a3 3 0 0 1-2.1.9H9.7a3 3 0 0 1-2.1-.9l-.6-.6a1.8 1.8 0 0 1 0-2.6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 19h7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: 'Select',
    value: 'select',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M6 5h4M14 5h4M19 6v4M19 14v4M18 19h-4M10 19H6M5 18v-4M5 10V6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="m10 9 3 7 1.4-3 3-.8L10 9Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

const ONION_SKIN_PLACEMENT_OPTIONS: Array<{ label: string; value: OnionSkinPlacement }> = [
  { label: 'Below frame', value: 'below' },
  { label: 'Above frame', value: 'above' },
]

export function DrawingToolsSection() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isPixelActionsOpen, setIsPixelActionsOpen] = useState(false)
  const [isSelectionOpen, setIsSelectionOpen] = useState(false)
  const [isSymmetryOpen, setIsSymmetryOpen] = useState(false)
  const [isOnionSkinOpen, setIsOnionSkinOpen] = useState(false)
  const [isReferenceOpen, setIsReferenceOpen] = useState(false)
  const selectedTool = useEditorStore((state) => state.selectedTool)
  const selectedColor = useEditorStore((state) => state.selectedColor)
  const brushSize = useEditorStore((state) => state.brushSize)
  const onionSkinEnabled = useEditorStore((state) => state.onionSkinEnabled)
  const onionSkinOpacity = useEditorStore((state) => state.onionSkinOpacity)
  const onionSkinPlacement = useEditorStore((state) => state.onionSkinPlacement)
  const frames = useEditorStore((state) => state.animation.frames)
  const activeFrameIndex = useEditorStore((state) => state.activeFrameIndex)
  const referenceLayers = useEditorStore((state) => state.referenceLayers)
  const referenceAssets = useEditorStore((state) => state.referenceAssets)
  const referenceEditMode = useEditorStore((state) => state.referenceEditMode)
  const referenceOnionSkinEnabled = useEditorStore((state) => state.referenceOnionSkinEnabled)
  const referenceOnionSkinOpacity = useEditorStore((state) => state.referenceOnionSkinOpacity)
  const hasPixelClipboard = useEditorStore((state) => state.pixelClipboard !== null)
  const selectionFrameId = useEditorStore((state) => state.selectionFrameId)
  const selectedPixelIndices = useEditorStore((state) => state.selectedPixelIndices)
  const selectionClipboard = useEditorStore((state) => state.selectionClipboard)
  const floatingSelection = useEditorStore((state) => state.floatingSelection)
  const symmetryEnabled = useEditorStore((state) => state.symmetryEnabled)
  const symmetryAxis = useEditorStore((state) => state.symmetryAxis)

  const activeFrame = frames[activeFrameIndex]
  const activeReferenceLayer = referenceLayers[activeFrame.id] ?? createEmptyReferenceLayer()
  const activeReferenceAsset = activeReferenceLayer.assetId
    ? referenceAssets[activeReferenceLayer.assetId]
    : null
  const hasReferenceImage = Boolean(activeReferenceLayer.assetId && activeReferenceAsset)
  const hasPaintSelection =
    selectionFrameId === activeFrame.id && selectedPixelIndices.length > 0
  const hasFloatingSelection = Boolean(floatingSelection)
  const hasSelectionClipboard = Boolean(selectionClipboard)

  const setSelectedTool = useEditorStore((state) => state.setSelectedTool)
  const setSelectedColor = useEditorStore((state) => state.setSelectedColor)
  const setBrushSize = useEditorStore((state) => state.setBrushSize)
  const setOnionSkinEnabled = useEditorStore((state) => state.setOnionSkinEnabled)
  const setOnionSkinOpacity = useEditorStore((state) => state.setOnionSkinOpacity)
  const setOnionSkinPlacement = useEditorStore((state) => state.setOnionSkinPlacement)
  const attachReferenceImage = useEditorStore((state) => state.attachReferenceImage)
  const clearReferenceImage = useEditorStore((state) => state.clearReferenceImage)
  const copyReferenceToNextFrame = useEditorStore((state) => state.copyReferenceToNextFrame)
  const mirrorReference = useEditorStore((state) => state.mirrorReference)
  const resetReferenceTransform = useEditorStore((state) => state.resetReferenceTransform)
  const setReferenceEditMode = useEditorStore((state) => state.setReferenceEditMode)
  const setReferenceVisibility = useEditorStore((state) => state.setReferenceVisibility)
  const setReferenceOpacity = useEditorStore((state) => state.setReferenceOpacity)
  const setReferenceLayerPlacement = useEditorStore((state) => state.setReferenceLayerPlacement)
  const setReferenceOnionSkinEnabled = useEditorStore((state) => state.setReferenceOnionSkinEnabled)
  const setReferenceOnionSkinOpacity = useEditorStore((state) => state.setReferenceOnionSkinOpacity)
  const copyActiveFramePixels = useEditorStore((state) => state.copyActiveFramePixels)
  const pastePixelsIntoActiveFrame = useEditorStore((state) => state.pastePixelsIntoActiveFrame)
  const clearPixelSelection = useEditorStore((state) => state.clearPixelSelection)
  const copySelectedPixels = useEditorStore((state) => state.copySelectedPixels)
  const cutSelectedPixels = useEditorStore((state) => state.cutSelectedPixels)
  const pasteSelectedPixels = useEditorStore((state) => state.pasteSelectedPixels)
  const commitFloatingSelection = useEditorStore((state) => state.commitFloatingSelection)
  const cancelFloatingSelection = useEditorStore((state) => state.cancelFloatingSelection)
  const mirrorFloatingSelection = useEditorStore((state) => state.mirrorFloatingSelection)
  const setSymmetryEnabled = useEditorStore((state) => state.setSymmetryEnabled)
  const setSymmetryAxis = useEditorStore((state) => state.setSymmetryAxis)

  async function handleReferenceFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    await attachReferenceImage(file)
    event.target.value = ''
  }

  return (
    <div className="editor-tools">
      <div className="editor-tools__row">
        <div className="button-group" role="group" aria-label="Drawing tools">
          {TOOL_OPTIONS.map((tool) => (
            <button
              key={tool.value}
              type="button"
              className={`tool-button ${tool.value === selectedTool ? 'is-active' : ''}`}
              onClick={() => setSelectedTool(tool.value)}
              aria-label={tool.label}
              title={tool.label}
            >
              <span className="tool-button__icon">{tool.icon}</span>
              <span className="tool-button__label">{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="button-group" role="group" aria-label="Brush sizes">
          {BRUSH_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={`brush-size-button ${size === brushSize ? 'is-active' : ''}`}
              onClick={() => setBrushSize(size as BrushSize)}
            >
              {size}x{size}
            </button>
          ))}
        </div>
      </div>

      <div className="editor-tools__row">
        <label className="tool-color-swatch">
          <span className="sr-only">Color</span>
          <input
            className="tool-color-swatch__input"
            type="color"
            value={selectedColor.slice(0, 7)}
            onChange={(event) => setSelectedColor(event.target.value)}
            aria-label="Drawing color"
            title="Color"
          />
        </label>
      </div>

      <CollapsibleSubsection
        title="Pixel actions"
        headerExtra={
          hasPixelClipboard ? (
            <span className="onion-skin-panel__note">Frame copied</span>
          ) : null
        }
        isExpanded={isPixelActionsOpen}
        onToggle={() => setIsPixelActionsOpen((current) => !current)}
      >
        <div className="button-group" role="group" aria-label="Pixel clipboard actions">
          <button type="button" onClick={copyActiveFramePixels}>
            Copy frame
          </button>
          <button type="button" onClick={pastePixelsIntoActiveFrame} disabled={!hasPixelClipboard}>
            Paste frame
          </button>
        </div>
      </CollapsibleSubsection>

      <CollapsibleSubsection
        title="Selection"
        headerExtra={
          <span className="onion-skin-panel__note">
            {hasFloatingSelection
              ? 'Floating selection'
              : hasPaintSelection
                ? `${selectedPixelIndices.length} pixels selected`
                : 'Use Select tool'}
          </span>
        }
        isExpanded={isSelectionOpen}
        onToggle={() => setIsSelectionOpen((current) => !current)}
      >
        <div className="editor-tools__subgroup">
          <div className="editor-tools__subgroup-label">Copy / paste</div>
          <div className="button-group" role="group" aria-label="Copy and paste selection">
            <button type="button" onClick={copySelectedPixels} disabled={!hasPaintSelection}>
              Copy selection
            </button>
            <button type="button" onClick={cutSelectedPixels} disabled={!hasPaintSelection}>
              Cut selection
            </button>
            <button type="button" onClick={pasteSelectedPixels} disabled={!hasSelectionClipboard}>
              Paste selection
            </button>
            <button type="button" onClick={clearPixelSelection} disabled={!hasPaintSelection && !hasFloatingSelection}>
              Clear selection
            </button>
          </div>
        </div>

        <div className="editor-tools__subgroup">
          <div className="editor-tools__subgroup-label">Mirror</div>
          <div className="button-group" role="group" aria-label="Mirror floating selection">
            <button
              type="button"
              onClick={() => mirrorFloatingSelection('horizontal')}
              disabled={!hasFloatingSelection}
            >
              Mirror horizontal
            </button>
            <button
              type="button"
              onClick={() => mirrorFloatingSelection('vertical')}
              disabled={!hasFloatingSelection}
            >
              Mirror vertical
            </button>
          </div>
        </div>

        <div className="editor-tools__subgroup">
          <div className="editor-tools__subgroup-label">Move</div>
          <div className="button-group" role="group" aria-label="Move floating selection">
            <button type="button" onClick={commitFloatingSelection} disabled={!hasFloatingSelection}>
              Commit move
            </button>
            <button type="button" onClick={cancelFloatingSelection} disabled={!hasFloatingSelection}>
              Cancel move
            </button>
          </div>
        </div>
      </CollapsibleSubsection>

      <CollapsibleSubsection
        title="Symmetry"
        isExpanded={isSymmetryOpen}
        onToggle={() => setIsSymmetryOpen((current) => !current)}
      >
        <div className="editor-tools__row">
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={symmetryEnabled}
              onChange={(event) => setSymmetryEnabled(event.target.checked)}
              disabled={selectedTool === 'select'}
            />
            <span>Symmetry drawing</span>
          </label>
        </div>

        <div className="button-group" role="group" aria-label="Symmetry direction">
          <button
            type="button"
            className={symmetryAxis === 'left-right' ? 'is-active' : ''}
            onClick={() => setSymmetryAxis('left-right')}
            disabled={!symmetryEnabled || selectedTool === 'select'}
          >
            Left / Right
          </button>
          <button
            type="button"
            className={symmetryAxis === 'up-down' ? 'is-active' : ''}
            onClick={() => setSymmetryAxis('up-down')}
            disabled={!symmetryEnabled || selectedTool === 'select'}
          >
            Up / Down
          </button>
        </div>
      </CollapsibleSubsection>

      <CollapsibleSubsection
        title="Onion skinning"
        isExpanded={isOnionSkinOpen}
        onToggle={() => setIsOnionSkinOpen((current) => !current)}
      >
        <div className="editor-tools__row">
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={onionSkinEnabled}
              onChange={(event) => setOnionSkinEnabled(event.target.checked)}
            />
            <span>Onion skin</span>
          </label>

          <label className="field field--compact">
            <span>Onion opacity</span>
            <input
              type="range"
              min={10}
              max={80}
              value={Math.round(onionSkinOpacity * 100)}
              onChange={(event) => setOnionSkinOpacity(Number(event.target.value) / 100)}
              disabled={!onionSkinEnabled}
            />
          </label>
        </div>

        <div className="button-group" role="group" aria-label="Onion skin placement">
          {ONION_SKIN_PLACEMENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === onionSkinPlacement ? 'is-active' : ''}
              onClick={() => setOnionSkinPlacement(option.value)}
              disabled={!onionSkinEnabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CollapsibleSubsection>

      <CollapsibleSubsection
        title="Reference layer"
        headerExtra={
          activeReferenceAsset ? (
            <span className="onion-skin-panel__note">{activeReferenceAsset.name}</span>
          ) : (
            <span className="onion-skin-panel__note">No image loaded</span>
          )
        }
        isExpanded={isReferenceOpen}
        onToggle={() => setIsReferenceOpen((current) => !current)}
      >
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleReferenceFileChange}
        />

        <div className="button-group" role="group" aria-label="Reference image actions">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Upload reference
          </button>
          <button type="button" onClick={() => void clearReferenceImage()} disabled={!hasReferenceImage}>
            Clear reference
          </button>
          <button type="button" onClick={copyReferenceToNextFrame} disabled={!hasReferenceImage}>
            Copy ref to next
          </button>
          <button
            type="button"
            className={referenceEditMode ? 'is-active' : ''}
            onClick={() => setReferenceEditMode(!referenceEditMode)}
            disabled={!hasReferenceImage}
          >
            Reference edit mode
          </button>
        </div>

        <div className="editor-tools__row">
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={activeReferenceLayer.visible}
              onChange={(event) => setReferenceVisibility(event.target.checked)}
              disabled={!hasReferenceImage}
            />
            <span>Show reference</span>
          </label>

          <label className="field field--compact">
            <span>Reference opacity</span>
            <input
              type="range"
              min={5}
              max={100}
              value={Math.round(activeReferenceLayer.opacity * 100)}
              onChange={(event) => setReferenceOpacity(Number(event.target.value) / 100)}
              disabled={!hasReferenceImage}
            />
          </label>
        </div>

        <div className="button-group" role="group" aria-label="Reference layer placement">
          <button
            type="button"
            className={activeReferenceLayer.layerPlacement === 'below' ? 'is-active' : ''}
            onClick={() => setReferenceLayerPlacement('below')}
            disabled={!hasReferenceImage}
          >
            Below pixels
          </button>
          <button
            type="button"
            className={activeReferenceLayer.layerPlacement === 'above' ? 'is-active' : ''}
            onClick={() => setReferenceLayerPlacement('above')}
            disabled={!hasReferenceImage}
          >
            Above pixels
          </button>
        </div>

        <div className="editor-tools__row">
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={referenceOnionSkinEnabled}
              onChange={(event) => setReferenceOnionSkinEnabled(event.target.checked)}
            />
            <span>Reference onion skin</span>
          </label>

          <label className="field field--compact">
            <span>Reference onion opacity</span>
            <input
              type="range"
              min={5}
              max={85}
              value={Math.round(referenceOnionSkinOpacity * 100)}
              onChange={(event) => setReferenceOnionSkinOpacity(Number(event.target.value) / 100)}
              disabled={!referenceOnionSkinEnabled}
            />
          </label>
        </div>

        <div className="button-group" role="group" aria-label="Reference transform actions">
          <button type="button" onClick={() => mirrorReference('x')} disabled={!hasReferenceImage}>
            Mirror horizontal
          </button>
          <button type="button" onClick={() => mirrorReference('y')} disabled={!hasReferenceImage}>
            Mirror vertical
          </button>
          <button type="button" onClick={resetReferenceTransform} disabled={!hasReferenceImage}>
            Reset transform
          </button>
        </div>
      </CollapsibleSubsection>
    </div>
  )
}
