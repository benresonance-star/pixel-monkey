import { BRUSH_SIZES, type BrushSize } from '../../export/animationSchema'
import { useEditorStore, type EditorTool } from '../state/editorStore'

type MobilePanel = 'frames' | 'settings' | 'files' | null

type EditorBottomBarProps = {
  activePanel: MobilePanel
  onTogglePanel: (panel: Exclude<MobilePanel, null>) => void
}

const TOOL_OPTIONS: Array<{ label: string; value: EditorTool }> = [
  { label: 'Pencil', value: 'pencil' },
  { label: 'Eraser', value: 'eraser' },
]

const PANEL_OPTIONS: Array<{ label: string; value: Exclude<MobilePanel, null> }> = [
  { label: 'Frames', value: 'frames' },
  { label: 'Settings', value: 'settings' },
  { label: 'Files', value: 'files' },
]

export function EditorBottomBar({ activePanel, onTogglePanel }: EditorBottomBarProps) {
  const selectedTool = useEditorStore((state) => state.selectedTool)
  const brushSize = useEditorStore((state) => state.brushSize)
  const isPlaying = useEditorStore((state) => state.isPlaying)

  const setSelectedTool = useEditorStore((state) => state.setSelectedTool)
  const setBrushSize = useEditorStore((state) => state.setBrushSize)
  const previousFrame = useEditorStore((state) => state.previousFrame)
  const togglePlayback = useEditorStore((state) => state.togglePlayback)
  const nextFrame = useEditorStore((state) => state.nextFrame)
  const addBlankFrame = useEditorStore((state) => state.addBlankFrame)
  const duplicateActiveFrame = useEditorStore((state) => state.duplicateActiveFrame)

  return (
    <section className="mobile-bottom-bar panel">
      <div className="mobile-bottom-bar__row mobile-bottom-bar__row--compact">
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
              {size}x
            </button>
          ))}
        </div>
      </div>

      <div className="mobile-bottom-bar__row mobile-bottom-bar__row--compact">
        <div className="button-group" role="group" aria-label="Playback and frame actions">
          <button type="button" onClick={previousFrame}>
            Prev
          </button>
          <button type="button" className="button-primary" onClick={togglePlayback}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={nextFrame}>
            Next
          </button>
          <button type="button" onClick={addBlankFrame}>
            New
          </button>
          <button type="button" onClick={duplicateActiveFrame}>
            Dup
          </button>
        </div>
      </div>

      <div className="mobile-bottom-bar__row">
        <div className="button-group mobile-bottom-bar__tabs" role="group" aria-label="Mobile panels">
          {PANEL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === activePanel ? 'is-active' : ''}
              onClick={() => onTogglePanel(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
