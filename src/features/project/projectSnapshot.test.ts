import { describe, expect, it } from 'vitest'

import { createDefaultAnimation, createFrame } from '../export/animationSchema'
import type { PersistedEditorState } from '../editor/state/editorPersistence'
import { createEmptyReferenceLayer } from '../editor/state/referenceLayer'
import {
  PIXEL_EDITOR_APP_NAME,
  createProjectSnapshot,
  parseProjectSnapshot,
  serializeProjectSnapshot,
} from './projectSnapshot'

function createEditorState(): PersistedEditorState {
  const animation = createDefaultAnimation()
  animation.name = 'email-transfer'
  animation.frames = [animation.frames[0], createFrame(animation.frames[0].pixels)]

  return {
    animation,
    activeFrameIndex: 1,
    selectedColor: '#00ffaa',
    canvasBackgroundColor: '#365314',
    canvasGridColorOverride: '#f8fafc',
    brushSize: 2,
    zoom: 6,
    onionSkinEnabled: true,
    onionSkinOpacity: 0.4,
    onionSkinPlacement: 'above',
    referenceLayers: {
      [animation.frames[0].id]: {
        ...createEmptyReferenceLayer(),
        assetId: 'asset-1',
      },
      orphaned: {
        ...createEmptyReferenceLayer(),
        assetId: 'missing-asset',
      },
    },
    referenceOnionSkinEnabled: true,
    referenceOnionSkinOpacity: 0.32,
  }
}

describe('project snapshot', () => {
  it('creates a portable snapshot with matching referenced assets only', () => {
    const snapshot = createProjectSnapshot(createEditorState(), [
      {
        id: 'asset-1',
        name: 'pose.png',
        width: 180,
        height: 180,
        dataUrl: 'data:image/png;base64,AAA',
      },
      {
        id: 'unused-asset',
        name: 'unused.png',
        width: 180,
        height: 180,
        dataUrl: 'data:image/png;base64,BBB',
      },
    ])

    expect(snapshot.appName).toBe(PIXEL_EDITOR_APP_NAME)
    expect(snapshot.referenceAssets).toHaveLength(1)
    expect(snapshot.referenceAssets[0].id).toBe('asset-1')
    expect(Object.keys(snapshot.editorState.referenceLayers)).toEqual([
      snapshot.editorState.animation.frames[0].id,
    ])
  })

  it('serializes and parses project snapshots without losing editor metadata', () => {
    const original = createProjectSnapshot(createEditorState(), [
      {
        id: 'asset-1',
        name: 'pose.png',
        width: 180,
        height: 180,
        dataUrl: 'data:image/png;base64,AAA',
      },
    ])

    const roundTripped = parseProjectSnapshot(serializeProjectSnapshot(original))

    expect(roundTripped.editorState.animation.name).toBe('email-transfer')
    expect(roundTripped.editorState.activeFrameIndex).toBe(1)
    expect(roundTripped.editorState.canvasBackgroundColor).toBe('#365314')
    expect(roundTripped.editorState.canvasGridColorOverride).toBe('#f8fafc')
    expect(roundTripped.editorState.referenceOnionSkinEnabled).toBe(true)
    expect(roundTripped.referenceAssets[0].name).toBe('pose.png')
  })
})

