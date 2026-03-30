import type { PersistedEditorState } from '../editor/state/editorPersistence'
import { loadReferenceAssets } from '../editor/state/referenceAssetStore'
import { createProjectSnapshot, serializeProjectSnapshot } from './projectSnapshot'

function slugifyName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project'
  )
}

function getReferencedAssetIds(editorState: PersistedEditorState) {
  return Array.from(
    new Set(
      Object.values(editorState.referenceLayers)
        .map((layer) => layer.assetId)
        .filter((assetId): assetId is string => Boolean(assetId)),
    ),
  )
}

export async function downloadProjectSnapshot(editorState: PersistedEditorState) {
  const referenceAssets = await loadReferenceAssets(getReferencedAssetIds(editorState))
  const snapshot = createProjectSnapshot(editorState, referenceAssets)
  const blob = new Blob([serializeProjectSnapshot(snapshot)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = `${slugifyName(editorState.animation.name)}.pixel-project.json`
  anchor.click()

  URL.revokeObjectURL(url)
}

