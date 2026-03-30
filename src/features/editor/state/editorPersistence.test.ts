import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createDefaultAnimation, createFrame } from '../../export/animationSchema'
import { getInitialEditorState, useEditorStore } from './editorStore'
import {
  EDITOR_PERSISTENCE_KEY,
  loadPersistedEditorState,
  savePersistedEditorState,
  type PersistedEditorState,
} from './editorPersistence'
import { createEmptyReferenceLayer } from './referenceLayer'

function createStorageMock(): Storage {
  const store = new Map<string, string>()

  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key) {
      return store.get(key) ?? null
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key) {
      store.delete(key)
    },
    setItem(key, value) {
      store.set(key, value)
    },
  }
}

function createPersistedState(): PersistedEditorState {
  const animation = createDefaultAnimation()

  animation.name = 'restored-draft'
  animation.frames = [animation.frames[0], createFrame(animation.frames[0].pixels)]
  animation.fps = 10

  return {
    animation,
    activeFrameIndex: 1,
    selectedColor: '#ff8800',
    brushSize: 4,
    zoom: 7,
    onionSkinEnabled: true,
    onionSkinOpacity: 0.45,
    onionSkinPlacement: 'above',
    referenceLayers: {
      [animation.frames[0].id]: {
        ...createEmptyReferenceLayer(),
        assetId: 'reference-asset-1',
        layerPlacement: 'above',
      },
    },
    referenceOnionSkinEnabled: true,
    referenceOnionSkinOpacity: 0.33,
  }
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: createStorageMock(),
  })
})

describe('editor persistence', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
    useEditorStore.setState(getInitialEditorState())
  })

  it('loads a valid persisted editor state', () => {
    const persistedState = createPersistedState()
    savePersistedEditorState(persistedState)

    const loadedState = loadPersistedEditorState()

    expect(loadedState).not.toBeNull()
    expect(loadedState?.animation.name).toBe('restored-draft')
    expect(loadedState?.activeFrameIndex).toBe(1)
  })

  it('hydrates the editor state from local storage and keeps playback stopped', () => {
    savePersistedEditorState(createPersistedState())

    const restoredState = getInitialEditorState()

    expect(restoredState.animation.name).toBe('restored-draft')
    expect(restoredState.activeFrameIndex).toBe(1)
    expect(restoredState.selectedColor).toBe('#ff8800ff')
    expect(restoredState.brushSize).toBe(4)
    expect(restoredState.zoom).toBe(7)
    expect(restoredState.onionSkinEnabled).toBe(true)
    expect(restoredState.onionSkinPlacement).toBe('above')
    expect(restoredState.referenceLayers[restoredState.animation.frames[0].id]?.assetId).toBe(
      'reference-asset-1',
    )
    expect(restoredState.referenceOnionSkinEnabled).toBe(true)
    expect(restoredState.isPlaying).toBe(false)
  })

  it('falls back to the default state when persisted data is corrupted', () => {
    globalThis.localStorage.setItem(EDITOR_PERSISTENCE_KEY, '{bad json')

    const restoredState = getInitialEditorState()

    expect(restoredState.animation.name).toBe('untitled-animation')
    expect(restoredState.activeFrameIndex).toBe(0)
    expect(restoredState.isPlaying).toBe(false)
  })

  it('autosaves imported or replaced animations without persisting playback state', () => {
    const importedAnimation = createDefaultAnimation()
    importedAnimation.name = 'imported-loop'
    importedAnimation.frames = [importedAnimation.frames[0], createFrame(importedAnimation.frames[0].pixels)]

    useEditorStore.getState().replaceAnimation(importedAnimation)
    useEditorStore.getState().togglePlayback()

    const persistedState = loadPersistedEditorState()
    const rawValue = globalThis.localStorage.getItem(EDITOR_PERSISTENCE_KEY)

    expect(persistedState?.animation.name).toBe('imported-loop')
    expect(persistedState?.animation.frames).toHaveLength(2)
    expect(rawValue).not.toBeNull()
    expect(rawValue).not.toContain('isPlaying')
    expect(getInitialEditorState().isPlaying).toBe(false)
  })
})
