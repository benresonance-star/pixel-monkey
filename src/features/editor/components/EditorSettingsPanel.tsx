import { MAX_FPS, MIN_FPS } from '../../export/animationSchema'
import { useEditorStore, type OnionSkinPlacement } from '../state/editorStore'

const ONION_SKIN_PLACEMENT_OPTIONS: Array<{ label: string; value: OnionSkinPlacement }> = [
  { label: 'Below frame', value: 'below' },
  { label: 'Above frame', value: 'above' },
]

type EditorSettingsPanelProps = {
  compact?: boolean
}

export function EditorSettingsPanel({ compact = false }: EditorSettingsPanelProps) {
  const animationName = useEditorStore((state) => state.animation.name)
  const selectedColor = useEditorStore((state) => state.selectedColor)
  const fps = useEditorStore((state) => state.animation.fps)
  const zoom = useEditorStore((state) => state.zoom)
  const onionSkinEnabled = useEditorStore((state) => state.onionSkinEnabled)
  const onionSkinOpacity = useEditorStore((state) => state.onionSkinOpacity)
  const onionSkinPlacement = useEditorStore((state) => state.onionSkinPlacement)

  const setAnimationName = useEditorStore((state) => state.setAnimationName)
  const setSelectedColor = useEditorStore((state) => state.setSelectedColor)
  const setFps = useEditorStore((state) => state.setFps)
  const setZoom = useEditorStore((state) => state.setZoom)
  const setOnionSkinEnabled = useEditorStore((state) => state.setOnionSkinEnabled)
  const setOnionSkinOpacity = useEditorStore((state) => state.setOnionSkinOpacity)
  const setOnionSkinPlacement = useEditorStore((state) => state.setOnionSkinPlacement)

  return (
    <section className={`settings-panel ${compact ? 'settings-panel--compact' : 'panel'}`}>
      {!compact ? (
        <div className="settings-panel__header">
          <h2>Settings</h2>
          <p>Adjust playback, zoom, color, and onion skin behavior.</p>
        </div>
      ) : null}

      <div className="settings-panel__grid">
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

      <div className="settings-panel__controls">
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
      </div>
    </section>
  )
}
