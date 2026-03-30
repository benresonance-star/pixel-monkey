import { z } from 'zod'

import {
  normalizePersistedEditorState,
  persistedEditorStateSchema,
  type PersistedEditorState,
} from '../editor/state/editorPersistence'
import {
  normalizeFrameReferenceLayer,
  type ReferenceAssetRecord,
} from '../editor/state/referenceLayer'

export const PROJECT_SNAPSHOT_KIND = 'pixel-editor-project'
export const PROJECT_SNAPSHOT_FORMAT_VERSION = 1
export const PIXEL_EDITOR_APP_NAME = 'Pixel Art Animation Tool'

export const referenceAssetRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  dataUrl: z.string().min(1),
})

export const projectSnapshotSchema = z.object({
  kind: z.literal(PROJECT_SNAPSHOT_KIND),
  formatVersion: z.literal(PROJECT_SNAPSHOT_FORMAT_VERSION),
  appName: z.string().trim().min(1),
  exportedAt: z.string().datetime(),
  editorState: persistedEditorStateSchema,
  referenceAssets: z.array(referenceAssetRecordSchema),
})

export type ProjectSnapshot = z.infer<typeof projectSnapshotSchema>

export function normalizeProjectSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  const normalizedEditorState = normalizePersistedEditorState(snapshot.editorState)
  const referencedAssetIds = new Set(
    Object.values(normalizedEditorState.referenceLayers)
      .map((layer) => layer.assetId)
      .filter((assetId): assetId is string => Boolean(assetId)),
  )

  const referenceAssets = snapshot.referenceAssets.filter((asset) => referencedAssetIds.has(asset.id))
  const availableAssetIds = new Set(referenceAssets.map((asset) => asset.id))

  return {
    ...snapshot,
    editorState: {
      ...normalizedEditorState,
      referenceLayers: Object.fromEntries(
        Object.entries(normalizedEditorState.referenceLayers)
          .filter(
            ([, layer]) => layer.assetId !== null && availableAssetIds.has(layer.assetId),
          )
          .map(([frameId, layer]) => [frameId, normalizeFrameReferenceLayer(layer)]),
      ),
    },
    referenceAssets,
  }
}

export function createProjectSnapshot(
  editorState: PersistedEditorState,
  referenceAssets: ReferenceAssetRecord[],
): ProjectSnapshot {
  return normalizeProjectSnapshot({
    kind: PROJECT_SNAPSHOT_KIND,
    formatVersion: PROJECT_SNAPSHOT_FORMAT_VERSION,
    appName: PIXEL_EDITOR_APP_NAME,
    exportedAt: new Date().toISOString(),
    editorState,
    referenceAssets,
  })
}

export function parseProjectSnapshot(input: string | unknown): ProjectSnapshot {
  const value = typeof input === 'string' ? JSON.parse(input) : input
  return normalizeProjectSnapshot(projectSnapshotSchema.parse(value))
}

export function serializeProjectSnapshot(snapshot: ProjectSnapshot): string {
  return JSON.stringify(normalizeProjectSnapshot(snapshot), null, 2)
}

