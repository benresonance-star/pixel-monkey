import { beforeEach, describe, expect, it } from 'vitest'

import { EMPTY_PIXEL } from '../../export/animationSchema'
import { getPixelIndex } from '../lib/drawing'
import { getInitialEditorState, useEditorStore } from './editorStore'
import { createEmptyReferenceLayer } from './referenceLayer'

describe('editor store', () => {
  beforeEach(() => {
    useEditorStore.setState(getInitialEditorState())
  })

  it('reorders frames and updates the active index to follow the same frame', () => {
    const store = useEditorStore.getState()
    store.addBlankFrame()

    const frameA = useEditorStore.getState().animation.frames[0]
    const frameB = useEditorStore.getState().animation.frames[1]
    useEditorStore.getState().selectFrame(0)

    useEditorStore.getState().reorderFrames(0, 1)

    const next = useEditorStore.getState()
    expect(next.animation.frames[0].id).toBe(frameB.id)
    expect(next.animation.frames[1].id).toBe(frameA.id)
    expect(next.activeFrameIndex).toBe(1)
  })

  it('duplicates the active frame into a new frame with a different id', () => {
    const beforeDuplicate = useEditorStore.getState()
    const originalFrame = beforeDuplicate.animation.frames[0]

    beforeDuplicate.drawOnActiveFrame({ x: 1, y: 1 })
    beforeDuplicate.duplicateActiveFrame()

    const afterDuplicate = useEditorStore.getState()
    const duplicatedFrame = afterDuplicate.animation.frames[1]

    expect(afterDuplicate.animation.frames).toHaveLength(2)
    expect(afterDuplicate.activeFrameIndex).toBe(1)
    expect(duplicatedFrame.id).not.toBe(originalFrame.id)
    expect(duplicatedFrame.pixels).toEqual(afterDuplicate.animation.frames[0].pixels)
  })

  it('toggles onion skin and clamps opacity settings', () => {
    const state = useEditorStore.getState()

    state.setOnionSkinEnabled(true)
    state.setOnionSkinOpacity(2)
    state.setOnionSkinPlacement('above')

    let nextState = useEditorStore.getState()
    expect(nextState.onionSkinEnabled).toBe(true)
    expect(nextState.onionSkinOpacity).toBe(0.8)
    expect(nextState.onionSkinPlacement).toBe('above')

    nextState.setOnionSkinOpacity(0.02)
    nextState = useEditorStore.getState()
    expect(nextState.onionSkinOpacity).toBe(0.1)
  })

  it('updates the canvas background color as a saved hex value', () => {
    const state = useEditorStore.getState()

    state.setCanvasBackgroundColor('#1D4ED8AA')

    expect(useEditorStore.getState().canvasBackgroundColor).toBe('#1d4ed8')
  })

  it('stores and clears the manual canvas grid color override', () => {
    const state = useEditorStore.getState()

    state.setCanvasGridColorOverride('#F8FAFCAA')
    expect(useEditorStore.getState().canvasGridColorOverride).toBe('#f8fafc')

    state.setCanvasGridColorOverride(null)
    expect(useEditorStore.getState().canvasGridColorOverride).toBeNull()
  })

  it('copies the active frame reference layer when duplicating a frame', () => {
    const frameId = useEditorStore.getState().animation.frames[0].id

    useEditorStore.setState((state) => ({
      ...state,
      referenceLayers: {
        [frameId]: {
          ...createEmptyReferenceLayer(),
          assetId: 'reference-asset-1',
          layerPlacement: 'above',
        },
      },
    }))

    useEditorStore.getState().duplicateActiveFrame()

    const nextState = useEditorStore.getState()
    const duplicatedFrameId = nextState.animation.frames[1].id

    expect(nextState.referenceLayers[duplicatedFrameId]).toMatchObject({
      assetId: 'reference-asset-1',
      layerPlacement: 'above',
    })
  })

  it('updates reference layer settings for the active frame', () => {
    const frameId = useEditorStore.getState().animation.frames[0].id

    useEditorStore.setState((state) => ({
      ...state,
      referenceLayers: {
        [frameId]: {
          ...createEmptyReferenceLayer(),
          assetId: 'reference-asset-1',
        },
      },
    }))

    const state = useEditorStore.getState()
    state.setReferenceVisibility(false)
    state.setReferenceOpacity(2)
    state.setReferenceLayerPlacement('above')
    state.setReferenceTransform({ scale: 30, rotationDeg: -45 })

    const nextLayer = useEditorStore.getState().referenceLayers[frameId]
    expect(nextLayer.visible).toBe(false)
    expect(nextLayer.opacity).toBe(1)
    expect(nextLayer.layerPlacement).toBe('above')
    expect(nextLayer.transform.scale).toBe(12)
    expect(nextLayer.transform.rotationDeg).toBe(315)
  })

  it('copies pixels from one frame and pastes them over another frame', () => {
    const state = useEditorStore.getState()

    state.drawOnActiveFrame({ x: 2, y: 3 })
    const sourcePixels = [...useEditorStore.getState().animation.frames[0].pixels]

    state.copyActiveFramePixels()
    state.addBlankFrame()

    const blankDestinationPixels = [...useEditorStore.getState().animation.frames[1].pixels]
    expect(blankDestinationPixels).not.toEqual(sourcePixels)

    useEditorStore.getState().pastePixelsIntoActiveFrame()

    const nextState = useEditorStore.getState()
    expect(nextState.animation.frames[1].pixels).toEqual(sourcePixels)
    expect(nextState.animation.frames[0].pixels).toEqual(sourcePixels)
  })

  it('undoes and redoes a stroke as a single pixel history step', () => {
    const state = useEditorStore.getState()
    const beforePixels = [...state.animation.frames[0].pixels]

    state.beginPixelChange()
    state.drawOnActiveFrame({ x: 1, y: 1 })
    state.drawOnActiveFrame({ x: 1, y: 1 }, { x: 3, y: 1 })
    state.endPixelChange()

    const drawnPixels = [...useEditorStore.getState().animation.frames[0].pixels]
    expect(useEditorStore.getState().pixelHistoryPast).toHaveLength(1)
    expect(drawnPixels).not.toEqual(beforePixels)

    state.undoPixelChange()
    expect(useEditorStore.getState().animation.frames[0].pixels).toEqual(beforePixels)
    expect(useEditorStore.getState().pixelHistoryFuture).toHaveLength(1)

    state.redoPixelChange()
    expect(useEditorStore.getState().animation.frames[0].pixels).toEqual(drawnPixels)
    expect(useEditorStore.getState().pixelHistoryPast).toHaveLength(1)
  })

  it('caps pixel undo history at 100 steps', () => {
    const state = useEditorStore.getState()

    for (let index = 0; index < 101; index += 1) {
      state.setSelectedColor(`#${index.toString(16).padStart(6, '0')}`)
      state.drawOnActiveFrame({ x: index % 10, y: Math.floor(index / 10) })
    }

    expect(useEditorStore.getState().pixelHistoryPast).toHaveLength(100)
  })

  it('creates a new blank project and clears transient editor state', () => {
    const frameId = useEditorStore.getState().animation.frames[0].id

    useEditorStore.setState((state) => ({
      ...state,
      activeFrameIndex: 0,
      selectedTool: 'eraser',
      selectedColor: '#ff00ffff',
      canvasBackgroundColor: '#7f1d1d',
      canvasGridColorOverride: '#f8fafc',
      brushSize: 4,
      zoom: 9,
      isPlaying: true,
      onionSkinEnabled: true,
      onionSkinOpacity: 0.6,
      onionSkinPlacement: 'above',
      referenceLayers: {
        [frameId]: {
          ...createEmptyReferenceLayer(),
          assetId: 'reference-asset-1',
        },
      },
      referenceAssets: {
        'reference-asset-1': {
          id: 'reference-asset-1',
          name: 'trace.png',
          width: 180,
          height: 180,
          dataUrl: 'data:image/png;base64,AAA',
        },
      },
      referenceEditMode: true,
      referenceOnionSkinEnabled: true,
      referenceOnionSkinOpacity: 0.5,
      pixelClipboard: ['#ffffffff'],
      pixelHistoryPast: [
        {
          frameId,
          beforePixels: state.animation.frames[0].pixels,
          afterPixels: state.animation.frames[0].pixels,
        },
      ],
      pixelHistoryFuture: [
        {
          frameId,
          beforePixels: state.animation.frames[0].pixels,
          afterPixels: state.animation.frames[0].pixels,
        },
      ],
      pendingPixelHistory: {
        frameId,
        beforePixels: state.animation.frames[0].pixels,
      },
    }))

    useEditorStore.getState().createNewProject()

    const nextState = useEditorStore.getState()
    expect(nextState.animation.name).toBe('untitled-animation')
    expect(nextState.animation.frames).toHaveLength(1)
    expect(nextState.selectedTool).toBe('pencil')
    expect(nextState.selectedColor).toBe('#22c55eff')
    expect(nextState.canvasBackgroundColor).toBe('#0f172a')
    expect(nextState.canvasGridColorOverride).toBeNull()
    expect(nextState.brushSize).toBe(1)
    expect(nextState.zoom).toBe(4)
    expect(nextState.isPlaying).toBe(false)
    expect(nextState.onionSkinEnabled).toBe(false)
    expect(nextState.onionSkinPlacement).toBe('below')
    expect(nextState.referenceLayers).toEqual({})
    expect(nextState.referenceAssets).toEqual({})
    expect(nextState.referenceEditMode).toBe(false)
    expect(nextState.referenceOnionSkinEnabled).toBe(false)
    expect(nextState.pixelClipboard).toBeNull()
    expect(nextState.pixelHistoryPast).toEqual([])
    expect(nextState.pixelHistoryFuture).toEqual([])
    expect(nextState.pendingPixelHistory).toBeNull()
  })

  it('paint-selects only non-transparent pixels and can move them after cut/paste', () => {
    const state = useEditorStore.getState()

    state.drawOnActiveFrame({ x: 5, y: 5 })
    state.setSelectedTool('select')
    state.paintSelectOnActiveFrame({ x: 5, y: 5 })
    state.paintSelectOnActiveFrame({ x: 0, y: 0 })

    expect(useEditorStore.getState().selectedPixelIndices).toEqual([getPixelIndex(5, 5)])

    state.cutSelectedPixels()
    expect(useEditorStore.getState().animation.frames[0].pixels[getPixelIndex(5, 5)]).toBe(
      EMPTY_PIXEL,
    )

    state.pasteSelectedPixels()
    state.setFloatingSelectionPosition(8, 9)
    state.commitFloatingSelection()

    const nextPixels = useEditorStore.getState().animation.frames[0].pixels
    expect(nextPixels[getPixelIndex(8, 9)]).toBe('#22c55eff')
    expect(nextPixels[getPixelIndex(5, 5)]).toBe(EMPTY_PIXEL)
  })

  it('mirrors the floating selection horizontally', () => {
    const frameId = useEditorStore.getState().animation.frames[0].id

    useEditorStore.setState((state) => ({
      ...state,
      selectionFrameId: frameId,
      selectedPixelIndices: [getPixelIndex(1, 1), getPixelIndex(2, 1)],
    }))

    useEditorStore.getState().drawOnActiveFrame({ x: 1, y: 1 })
    useEditorStore.getState().setSelectedColor('#ff0000')
    useEditorStore.getState().drawOnActiveFrame({ x: 2, y: 1 })
    useEditorStore.getState().copySelectedPixels()
    useEditorStore.getState().pasteSelectedPixels()
    useEditorStore.getState().mirrorFloatingSelection('horizontal')
    useEditorStore.getState().commitFloatingSelection()

    const nextPixels = useEditorStore.getState().animation.frames[0].pixels
    expect(nextPixels[getPixelIndex(1, 1)]).toBe('#ff0000ff')
    expect(nextPixels[getPixelIndex(2, 1)]).toBe('#22c55eff')
  })

  it('draws with left-right symmetry when enabled', () => {
    const state = useEditorStore.getState()

    state.setSymmetryEnabled(true)
    state.setSymmetryAxis('left-right')
    state.drawOnActiveFrame({ x: 4, y: 7 })

    const nextPixels = useEditorStore.getState().animation.frames[0].pixels
    expect(nextPixels[getPixelIndex(4, 7)]).toBe('#22c55eff')
    expect(nextPixels[getPixelIndex(175, 7)]).toBe('#22c55eff')
  })
})
