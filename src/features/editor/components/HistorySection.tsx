import { useEditorStore } from '../state/editorStore'

export function HistorySection() {
  const canUndo = useEditorStore((state) => state.pixelHistoryPast.length > 0)
  const canRedo = useEditorStore((state) => state.pixelHistoryFuture.length > 0)
  const undoPixelChange = useEditorStore((state) => state.undoPixelChange)
  const redoPixelChange = useEditorStore((state) => state.redoPixelChange)

  return (
    <div className="button-group" role="group" aria-label="Undo and redo">
      <button type="button" onClick={undoPixelChange} disabled={!canUndo}>
        Undo
      </button>
      <button type="button" onClick={redoPixelChange} disabled={!canRedo}>
        Redo
      </button>
    </div>
  )
}
