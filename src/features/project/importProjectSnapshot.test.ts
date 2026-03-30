import { describe, expect, it } from 'vitest'

import { createDefaultAnimation } from '../export/animationSchema'
import { createEmptyReferenceLayer } from '../editor/state/referenceLayer'
import { importProjectSnapshotFile } from './importProjectSnapshot'
import { serializeProjectSnapshot, type ProjectSnapshot } from './projectSnapshot'

function createSnapshot(): ProjectSnapshot {
  const animation = createDefaultAnimation()
  animation.name = 'carry-over-project'

  return {
    kind: 'pixel-editor-project',
    formatVersion: 1,
    appName: 'Pixel Art Animation Tool',
    exportedAt: '2026-03-30T00:00:00.000Z',
    editorState: {
      animation,
      activeFrameIndex: 0,
      selectedColor: '#22c55eff',
      canvasBackgroundColor: '#0f172a',
      canvasGridColorOverride: '#f8fafc',
      brushSize: 1,
      zoom: 4,
      onionSkinEnabled: false,
      onionSkinOpacity: 0.35,
      onionSkinPlacement: 'below',
      referenceLayers: {
        [animation.frames[0].id]: {
          ...createEmptyReferenceLayer(),
          assetId: 'asset-1',
        },
      },
      referenceOnionSkinEnabled: false,
      referenceOnionSkinOpacity: 0.28,
    },
    referenceAssets: [
      {
        id: 'asset-1',
        name: 'trace.png',
        width: 180,
        height: 180,
        dataUrl: 'data:image/png;base64,AAA',
      },
    ],
  }
}

describe('import project snapshot', () => {
  it('keeps the embedded project name instead of deriving it from the file name', async () => {
    const file = new File(
      [serializeProjectSnapshot(createSnapshot())],
      'different-file-name.pixel-project.json',
      { type: 'application/json' },
    )

    const importedSnapshot = await importProjectSnapshotFile(file)

    expect(importedSnapshot.editorState.animation.name).toBe('carry-over-project')
    expect(importedSnapshot.referenceAssets[0].name).toBe('trace.png')
  })

  it('maps legacy app background snapshots to the canvas background field', async () => {
    const snapshot = createSnapshot()
    const legacySnapshot = {
      ...snapshot,
      editorState: {
        ...snapshot.editorState,
        canvasBackgroundColor: undefined,
        appBackgroundColor: '#312e81',
      },
    }
    const file = new File([JSON.stringify(legacySnapshot)], 'legacy.pixel-project.json', {
      type: 'application/json',
    })

    const importedSnapshot = await importProjectSnapshotFile(file)

    expect(importedSnapshot.editorState.canvasBackgroundColor).toBe('#312e81')
  })
})

