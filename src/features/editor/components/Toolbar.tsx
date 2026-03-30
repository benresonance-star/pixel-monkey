import { BRUSH_SIZES, MAX_FPS, MIN_FPS, type BrushSize } from '../../export/animationSchema'
import { useEditorStore, type EditorTool, type OnionSkinPlacement } from '../state/editorStore'

type ToolbarProps = {
  onImportClick: () => void
  onExportClick: () => void
}

const TOOL_OPTIONS: Array<{ label: string; value: EditorTool }> = [
  { label: 'Pencil', value: 'pencil' },
  { label: 'Eraser', value: 'eraser' },
]

const ONION_SKIN_PLACEMENT_OPTIONS: Array<{ label: string; value: OnionSkinPlacement }> = [
  { label: 'Below frame', value: 'below' },
  { label: 'Above frame', value: 'above' },
]

export function Toolbar({ onImportClick, onExportClick }: ToolbarProps) {
  const animationName = useEditorStore((state) => state.animation.name)
  const fps = useEditorStore((state) => state.animation.fps)
  const selectedColor = useEditorStore((state) => state.selectedColor)
  const selectedTool = useEditorStore((state) => state.selectedTool)
  const brushSize = useEditorStore((state) => state.brushSize)
  const zoom = useEditorStore((state) => state.zoom)
  const isPlaying = useEditorStore((state) => state.isPlaying)
  const onionSkinEnabled = useEditorStore((state) => state.onionSkinEnabled)
  const onionSkinOpacity = useEditorStore((state) => state.onionSkinOpacity)
  const onionSkinPlacement = useEditorStore((state) => state.onionSkinPlacement)
  const frameCount = useEditorStore((state) => state.animation.frames.length)
  const activeFrameIndex = useEditorStore((state) => state.activeFrameIndex)

  const setAnimationName = useEditorStore((state) => state.setAnimationName)
  const setSelectedTool = useEditorStore((state) => state.setSelectedTool)
  const setSelectedColor = useEditorStore((state) => state.setSelectedColor)
  const setBrushSize = useEditorStore((state) => state.setBrushSize)
  const setZoom = useEditorStore((state) => state.setZoom)
  const setFps = useEditorStore((state) => state.setFps)
  const setOnionSkinEnabled = useEditorStore((state) => state.setOnionSkinEnabled)
  const setOnionSkinOpacity = useEditorStore((state) => state.setOnionSkinOpacity)
  const setOnionSkinPlacement = useEditorStore((state) => state.setOnionSkinPlacement)

  return (
    <section className="toolbar panel">
      <div className="toolbar__heading">
        <div>
          <h1>Pixel Animation Editor</h1>
          <p>Create frame-by-frame pixel art and export animation JSON for later app playback.</p>
        </div>
        <div className="toolbar__summary">
          <span>{frameCount} frame(s)</span>
          <span>Active #{activeFrameIndex + 1}</span>
        </div>
      </div>

      <div className="toolbar__grid">
        <label className="field">
          <span>Animation name</span>
          <input value={animationName} onChange={(event) => setAnimationName(event.target.value)} />
        </label>

        <label className="field">
          <span>Color</span>
          <input
            type="color"
            value={selectedColor.slice(0, 7)}
            onChange={(event) => setSelectedColor(event.target.value)}
          />
        </label>

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

        <label className="field">
          <span>Zoom</span>
          <input
            type="range"
            min={2}
            max={12}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="toolbar__row toolbar__row--settings">
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

        <span className="toolbar__hint">
          {isPlaying
            ? 'Playback automatically hides onion skin so the animation preview stays clean.'
            : 'Previous frames are tinted orange and next frames are tinted blue, shown above or below the active frame for easier alignment.'}
        </span>
      </div>

      <div className="toolbar__row">
        <div className="button-group" role="group" aria-label="Tools">
          {TOOL_OPTIONS.map((tool) => (
            <button
              key={tool.value}
              type="button"
              className={tool.value === selectedTool ? 'is-active' : ''}
              onClick={() => setSelectedTool(tool.value)}
            >
              {tool.label}
            </button>
          ))}
        </div>

        <div className="button-group" role="group" aria-label="Brush sizes">
          {BRUSH_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={size === brushSize ? 'is-active' : ''}
              onClick={() => setBrushSize(size as BrushSize)}
            >
              {size}x{size}
            </button>
          ))}
        </div>

        <div className="button-group button-group--actions" role="group" aria-label="Import and export">
          <button type="button" onClick={onImportClick}>
            Import JSON
          </button>
          <button type="button" className="button-primary" onClick={onExportClick}>
            Export JSON
          </button>
        </div>
      </div>
    </section>
  )
}
