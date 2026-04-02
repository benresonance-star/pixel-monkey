import { create } from 'zustand'

import {
  BRUSH_SIZES,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_COLOR,
  EMPTY_PIXEL,
  MAX_FRAME_DESCRIPTOR_LENGTH,
  MAX_FRAMES,
  clampFps,
  createDefaultAnimation,
  createFrame,
  normalizeAnimationDocument,
  normalizeColorHex,
  sanitizeAnimationName,
  type AnimationDocument,
  type BrushSize,
} from '../../export/animationSchema'
import { drawStroke, type PixelPoint } from '../lib/drawing'
import { getNextFrameIndex, getPreviousFrameIndex } from '../lib/playback'
import {
  collectSelectableIndices,
  createPixelRegionFromSelection,
  getMirroredPoint,
  mirrorPixelRegion,
  pastePixelRegion,
  removeSelectedPixels,
  type PixelRegion,
  type SelectionMirrorAxis,
  type SymmetryAxis,
} from '../lib/selection'
import { createReferenceAssetFromFile, deleteReferenceAsset, loadReferenceAssets, saveReferenceAsset } from './referenceAssetStore'
import {
  DEFAULT_CANVAS_BACKGROUND_COLOR,
  loadPersistedEditorState,
  normalizePersistedEditorState,
  savePersistedEditorState,
  type PersistedEditorState,
} from './editorPersistence'
import {
  DEFAULT_REFERENCE_LAYER_PLACEMENT,
  DEFAULT_REFERENCE_ONION_OPACITY,
  clampReferenceOnionOpacity,
  clampReferenceOpacity,
  clampReferenceScale,
  createDefaultReferenceTransform,
  createEmptyReferenceLayer,
  normalizeFrameReferenceLayer,
  normalizeRotation,
  type FrameReferenceLayer,
  type ReferenceAssetRecord,
  type ReferenceLayerMap,
  type ReferenceLayerPlacement,
  type ReferenceTransform,
} from './referenceLayer'

export type EditorTool = 'pencil' | 'eraser' | 'select'
export type OnionSkinPlacement = 'below' | 'above'

type FloatingPixelSelection = PixelRegion & {
  x: number
  y: number
}

type PixelHistoryEntry = {
  frameId: string
  beforePixels: string[]
  afterPixels: string[]
}

type PendingPixelHistory = {
  frameId: string
  beforePixels: string[]
}

export type EditorState = {
  animation: AnimationDocument
  activeFrameIndex: number
  selectedTool: EditorTool | 'select'
  selectedColor: string
  canvasBackgroundColor: string
  canvasGridColorOverride: string | null
  brushSize: BrushSize
  zoom: number
  isPlaying: boolean
  onionSkinEnabled: boolean
  onionSkinOpacity: number
  onionSkinPlacement: OnionSkinPlacement
  referenceLayers: ReferenceLayerMap
  referenceAssets: Record<string, ReferenceAssetRecord>
  referenceAssetsHydrated: boolean
  referenceEditMode: boolean
  referenceOnionSkinEnabled: boolean
  referenceOnionSkinOpacity: number
  pixelClipboard: string[] | null
  pixelHistoryPast: PixelHistoryEntry[]
  pixelHistoryFuture: PixelHistoryEntry[]
  pendingPixelHistory: PendingPixelHistory | null
  selectionFrameId: string | null
  selectedPixelIndices: number[]
  selectionClipboard: PixelRegion | null
  floatingSelection: FloatingPixelSelection | null
  symmetryEnabled: boolean
  symmetryAxis: SymmetryAxis
}

type EditorActions = {
  setAnimationName: (name: string) => void
  setSelectedTool: (tool: EditorTool | 'select') => void
  setSelectedColor: (color: string) => void
  setCanvasBackgroundColor: (color: string) => void
  setCanvasGridColorOverride: (color: string | null) => void
  setBrushSize: (size: BrushSize) => void
  setZoom: (zoom: number) => void
  setFps: (fps: number) => void
  setOnionSkinEnabled: (enabled: boolean) => void
  setOnionSkinOpacity: (opacity: number) => void
  setOnionSkinPlacement: (placement: OnionSkinPlacement) => void
  setReferenceOnionSkinEnabled: (enabled: boolean) => void
  setReferenceOnionSkinOpacity: (opacity: number) => void
  setReferenceEditMode: (enabled: boolean) => void
  beginPixelChange: () => void
  endPixelChange: () => void
  paintSelectOnActiveFrame: (from: PixelPoint, to?: PixelPoint) => void
  clearPixelSelection: () => void
  copySelectedPixels: () => void
  cutSelectedPixels: () => void
  pasteSelectedPixels: () => void
  setFloatingSelectionPosition: (x: number, y: number) => void
  commitFloatingSelection: () => void
  cancelFloatingSelection: () => void
  mirrorFloatingSelection: (axis: SelectionMirrorAxis) => void
  setSymmetryEnabled: (enabled: boolean) => void
  setSymmetryAxis: (axis: SymmetryAxis) => void
  setReferenceVisibility: (visible: boolean) => void
  setReferenceOpacity: (opacity: number) => void
  setReferenceLayerPlacement: (placement: ReferenceLayerPlacement) => void
  setReferenceTransform: (transform: Partial<ReferenceTransform>) => void
  setReferenceScale: (scale: number) => void
  nudgeReference: (deltaX: number, deltaY: number) => void
  rotateReference: (deltaDeg: number) => void
  mirrorReference: (axis: 'x' | 'y') => void
  resetReferenceTransform: () => void
  attachReferenceImage: (file: File) => Promise<void>
  clearReferenceImage: () => Promise<void>
  copyReferenceToNextFrame: () => void
  hydrateReferenceAssets: () => Promise<void>
  copyActiveFramePixels: () => void
  pastePixelsIntoActiveFrame: () => void
  undoPixelChange: () => void
  redoPixelChange: () => void
  restoreProjectSnapshot: (
    editorState: PersistedEditorState,
    referenceAssets: ReferenceAssetRecord[],
  ) => Promise<void>
  createNewProject: () => void
  selectFrame: (index: number) => void
  setFrameDescriptor: (frameIndex: number, descriptor: string) => void
  reorderFrames: (fromIndex: number, toIndex: number) => void
  addBlankFrame: () => void
  duplicateActiveFrame: () => void
  deleteActiveFrame: () => void
  drawOnActiveFrame: (from: PixelPoint, to?: PixelPoint) => void
  togglePlayback: () => void
  stopPlayback: () => void
  nextFrame: () => void
  previousFrame: () => void
  replaceAnimation: (animation: AnimationDocument) => void
}

export type EditorStore = EditorState & EditorActions

const DEFAULT_ZOOM = 4
const MIN_ZOOM = 2
const MAX_ZOOM = 12
const DEFAULT_ONION_SKIN_OPACITY = 0.35
const MIN_ONION_SKIN_OPACITY = 0.1
const MAX_ONION_SKIN_OPACITY = 0.8
const DEFAULT_ONION_SKIN_PLACEMENT: OnionSkinPlacement = 'below'
const PIXEL_HISTORY_LIMIT = 100

function clampOnionSkinOpacity(opacity: number) {
  if (!Number.isFinite(opacity)) {
    return DEFAULT_ONION_SKIN_OPACITY
  }

  return Math.min(MAX_ONION_SKIN_OPACITY, Math.max(MIN_ONION_SKIN_OPACITY, opacity))
}

function clampFrameIndex(index: number, frameCount: number) {
  return Math.max(0, Math.min(index, Math.max(0, frameCount - 1)))
}

function reorderFrameList<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return [...items]
  }

  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

function synchronizeReferenceLayers(
  animation: AnimationDocument,
  referenceLayers: ReferenceLayerMap,
): ReferenceLayerMap {
  const frameIdSet = new Set(animation.frames.map((frame) => frame.id))

  return Object.fromEntries(
    Object.entries(referenceLayers)
      .filter(([frameId, layer]) => frameIdSet.has(frameId) && layer.assetId)
      .map(([frameId, layer]) => [frameId, normalizeFrameReferenceLayer(layer)]),
  )
}

function getFrameReferenceLayer(referenceLayers: ReferenceLayerMap, frameId: string): FrameReferenceLayer {
  const existingLayer = referenceLayers[frameId]
  return existingLayer ? normalizeFrameReferenceLayer(existingLayer) : createEmptyReferenceLayer()
}

function setFrameReferenceLayer(
  referenceLayers: ReferenceLayerMap,
  frameId: string,
  layer: FrameReferenceLayer,
): ReferenceLayerMap {
  if (!layer.assetId) {
    const remainingLayers = { ...referenceLayers }
    delete remainingLayers[frameId]
    return remainingLayers
  }

  return {
    ...referenceLayers,
    [frameId]: normalizeFrameReferenceLayer(layer),
  }
}

function getReferencedAssetIds(referenceLayers: ReferenceLayerMap) {
  return new Set(
    Object.values(referenceLayers)
      .map((layer) => layer.assetId)
      .filter((assetId): assetId is string => Boolean(assetId)),
  )
}

function createReferenceAssetMap(referenceAssets: ReferenceAssetRecord[]) {
  return Object.fromEntries(referenceAssets.map((asset) => [asset.id, asset]))
}

function arePixelArraysEqual(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}

function updateFramePixels(
  animation: AnimationDocument,
  frameId: string,
  pixels: string[],
): AnimationDocument {
  return {
    ...animation,
    frames: animation.frames.map((frame) =>
      frame.id === frameId
        ? {
            ...frame,
            pixels: [...pixels],
          }
        : frame,
    ),
  }
}

function pushPixelHistory(
  past: PixelHistoryEntry[],
  entry: PixelHistoryEntry,
): PixelHistoryEntry[] {
  const nextPast = [...past, entry]
  return nextPast.slice(-PIXEL_HISTORY_LIMIT)
}

function removeFramePixelHistory(
  history: PixelHistoryEntry[],
  frameId: string,
): PixelHistoryEntry[] {
  return history.filter((entry) => entry.frameId !== frameId)
}

function clearActiveSelectionState() {
  return {
    selectionFrameId: null as string | null,
    selectedPixelIndices: [] as number[],
    floatingSelection: null as FloatingPixelSelection | null,
  }
}

function fitReferenceScale(width: number, height: number) {
  return clampReferenceScale(Math.min(CANVAS_WIDTH / width, CANVAS_HEIGHT / height))
}

export function createPersistedEditorStateSnapshot(
  state: Pick<
    EditorState,
    | 'animation'
    | 'activeFrameIndex'
    | 'selectedColor'
    | 'canvasBackgroundColor'
    | 'canvasGridColorOverride'
    | 'brushSize'
    | 'zoom'
    | 'onionSkinEnabled'
    | 'onionSkinOpacity'
    | 'onionSkinPlacement'
    | 'referenceLayers'
    | 'referenceOnionSkinEnabled'
    | 'referenceOnionSkinOpacity'
  >,
): PersistedEditorState {
  return normalizePersistedEditorState({
    animation: state.animation,
    activeFrameIndex: state.activeFrameIndex,
    selectedColor: state.selectedColor,
    canvasBackgroundColor: state.canvasBackgroundColor,
    canvasGridColorOverride: state.canvasGridColorOverride,
    brushSize: state.brushSize,
    zoom: state.zoom,
    onionSkinEnabled: state.onionSkinEnabled,
    onionSkinOpacity: state.onionSkinOpacity,
    onionSkinPlacement: state.onionSkinPlacement,
    referenceLayers: state.referenceLayers,
    referenceOnionSkinEnabled: state.referenceOnionSkinEnabled,
    referenceOnionSkinOpacity: state.referenceOnionSkinOpacity,
  })
}

async function pruneReferenceAssetIfUnused(
  assetId: string | null,
  referenceLayers: ReferenceLayerMap,
  referenceAssets: Record<string, ReferenceAssetRecord>,
) {
  if (!assetId) {
    return
  }

  const referencedAssetIds = getReferencedAssetIds(referenceLayers)

  if (referencedAssetIds.has(assetId)) {
    return
  }

  await deleteReferenceAsset(assetId)

  if (referenceAssets[assetId]) {
    delete referenceAssets[assetId]
  }
}

export function getInitialEditorState(): EditorState {
  const defaultState: EditorState = {
    animation: createDefaultAnimation(),
    activeFrameIndex: 0,
    selectedTool: 'pencil',
    selectedColor: DEFAULT_COLOR,
    canvasBackgroundColor: DEFAULT_CANVAS_BACKGROUND_COLOR,
    canvasGridColorOverride: null,
    brushSize: BRUSH_SIZES[0],
    zoom: DEFAULT_ZOOM,
    isPlaying: false,
    onionSkinEnabled: false,
    onionSkinOpacity: DEFAULT_ONION_SKIN_OPACITY,
    onionSkinPlacement: DEFAULT_ONION_SKIN_PLACEMENT,
    referenceLayers: {},
    referenceAssets: {},
    referenceAssetsHydrated: false,
    referenceEditMode: false,
    referenceOnionSkinEnabled: false,
    referenceOnionSkinOpacity: DEFAULT_REFERENCE_ONION_OPACITY,
    pixelClipboard: null,
    pixelHistoryPast: [],
    pixelHistoryFuture: [],
    pendingPixelHistory: null,
    selectionFrameId: null,
    selectedPixelIndices: [],
    selectionClipboard: null,
    floatingSelection: null,
    symmetryEnabled: false,
    symmetryAxis: 'left-right',
  }

  const persistedState = loadPersistedEditorState()

  if (!persistedState) {
    return defaultState
  }

  try {
    const nextAnimation = normalizeAnimationDocument(persistedState.animation)

    return {
      ...defaultState,
      animation: nextAnimation,
      activeFrameIndex: clampFrameIndex(persistedState.activeFrameIndex, nextAnimation.frames.length),
      selectedColor: normalizeColorHex(persistedState.selectedColor),
      canvasBackgroundColor: persistedState.canvasBackgroundColor,
      canvasGridColorOverride: persistedState.canvasGridColorOverride,
      brushSize: persistedState.brushSize,
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(persistedState.zoom))),
      onionSkinEnabled: persistedState.onionSkinEnabled,
      onionSkinOpacity: clampOnionSkinOpacity(persistedState.onionSkinOpacity),
      onionSkinPlacement: persistedState.onionSkinPlacement,
      referenceLayers: synchronizeReferenceLayers(nextAnimation, persistedState.referenceLayers),
      referenceOnionSkinEnabled: persistedState.referenceOnionSkinEnabled,
      referenceOnionSkinOpacity: clampReferenceOnionOpacity(persistedState.referenceOnionSkinOpacity),
    }
  } catch {
    return defaultState
  }
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...getInitialEditorState(),

  setAnimationName: (name) => {
    set((state) => ({
      animation: {
        ...state.animation,
        name: sanitizeAnimationName(name),
      },
    }))
  },

  setSelectedTool: (tool) => {
    set({ selectedTool: tool, referenceEditMode: false })
  },

  setSelectedColor: (color) => {
    set({ selectedColor: normalizeColorHex(color), selectedTool: 'pencil', referenceEditMode: false })
  },

  setCanvasBackgroundColor: (color) => {
    const nextColor = normalizeColorHex(color).slice(0, 7)
    set({ canvasBackgroundColor: nextColor })
  },

  setCanvasGridColorOverride: (color) => {
    set({
      canvasGridColorOverride: color ? normalizeColorHex(color).slice(0, 7) : null,
    })
  },

  setBrushSize: (size) => {
    if (!BRUSH_SIZES.includes(size)) {
      return
    }

    set({ brushSize: size })
  },

  setZoom: (zoom) => {
    const nextZoom = Math.round(zoom)
    set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)) })
  },

  setFps: (fps) => {
    set((state) => ({
      animation: {
        ...state.animation,
        fps: clampFps(fps),
      },
    }))
  },

  setOnionSkinEnabled: (enabled) => {
    set({ onionSkinEnabled: enabled })
  },

  setOnionSkinOpacity: (opacity) => {
    set({ onionSkinOpacity: clampOnionSkinOpacity(opacity) })
  },

  setOnionSkinPlacement: (placement) => {
    set({ onionSkinPlacement: placement })
  },

  setReferenceOnionSkinEnabled: (enabled) => {
    set({ referenceOnionSkinEnabled: enabled })
  },

  setReferenceOnionSkinOpacity: (opacity) => {
    set({ referenceOnionSkinOpacity: clampReferenceOnionOpacity(opacity) })
  },

  setReferenceEditMode: (enabled) => {
    set({ referenceEditMode: enabled, isPlaying: enabled ? false : get().isPlaying })
  },

  beginPixelChange: () => {
    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]

      if (state.pendingPixelHistory?.frameId === activeFrame.id) {
        return state
      }

      return {
        pendingPixelHistory: {
          frameId: activeFrame.id,
          beforePixels: [...activeFrame.pixels],
        },
      }
    })
  },

  endPixelChange: () => {
    set((state) => {
      const pendingPixelHistory = state.pendingPixelHistory

      if (!pendingPixelHistory) {
        return state
      }

      const frame = state.animation.frames.find(
        (currentFrame) => currentFrame.id === pendingPixelHistory.frameId,
      )

      if (!frame || arePixelArraysEqual(pendingPixelHistory.beforePixels, frame.pixels)) {
        return {
          pendingPixelHistory: null,
        }
      }

      return {
        pixelHistoryPast: pushPixelHistory(state.pixelHistoryPast, {
          frameId: frame.id,
          beforePixels: pendingPixelHistory.beforePixels,
          afterPixels: [...frame.pixels],
        }),
        pixelHistoryFuture: [],
        pendingPixelHistory: null,
      }
    })
  },

  paintSelectOnActiveFrame: (from, to) => {
    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]
      const nextIndices = collectSelectableIndices(activeFrame.pixels, from, to, state.brushSize)

      if (nextIndices.length === 0) {
        return state
      }

      return {
        selectionFrameId: activeFrame.id,
        selectedPixelIndices: Array.from(new Set([...state.selectedPixelIndices, ...nextIndices])),
        floatingSelection: null,
      }
    })
  },

  clearPixelSelection: () => {
    set(() => ({
      ...clearActiveSelectionState(),
    }))
  },

  copySelectedPixels: () => {
    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]

      if (
        state.selectionFrameId !== activeFrame.id ||
        state.selectedPixelIndices.length === 0
      ) {
        return state
      }

      const region = createPixelRegionFromSelection(
        activeFrame.pixels,
        state.selectedPixelIndices,
      )

      if (!region) {
        return state
      }

      return {
        selectionClipboard: region,
      }
    })
  },

  cutSelectedPixels: () => {
    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]

      if (
        state.selectionFrameId !== activeFrame.id ||
        state.selectedPixelIndices.length === 0
      ) {
        return state
      }

      const region = createPixelRegionFromSelection(
        activeFrame.pixels,
        state.selectedPixelIndices,
      )

      if (!region) {
        return state
      }

      const nextPixels = removeSelectedPixels(activeFrame.pixels, state.selectedPixelIndices)

      if (arePixelArraysEqual(activeFrame.pixels, nextPixels)) {
        return state
      }

      return {
        animation: updateFramePixels(state.animation, activeFrame.id, nextPixels),
        selectionClipboard: region,
        pixelHistoryPast: pushPixelHistory(state.pixelHistoryPast, {
          frameId: activeFrame.id,
          beforePixels: [...activeFrame.pixels],
          afterPixels: [...nextPixels],
        }),
        pixelHistoryFuture: [],
        pendingPixelHistory: null,
        ...clearActiveSelectionState(),
      }
    })
  },

  pasteSelectedPixels: () => {
    set((state) => {
      if (!state.selectionClipboard) {
        return state
      }

      return {
        ...clearActiveSelectionState(),
        floatingSelection: {
          ...state.selectionClipboard,
          x: state.selectionClipboard.originX,
          y: state.selectionClipboard.originY,
        },
      }
    })
  },

  setFloatingSelectionPosition: (x, y) => {
    set((state) => {
      if (!state.floatingSelection) {
        return state
      }

      return {
        floatingSelection: {
          ...state.floatingSelection,
          x,
          y,
        },
      }
    })
  },

  commitFloatingSelection: () => {
    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]
      const floatingSelection = state.floatingSelection

      if (!floatingSelection) {
        return state
      }

      const nextPixels = pastePixelRegion(
        activeFrame.pixels,
        floatingSelection,
        floatingSelection.x,
        floatingSelection.y,
      )

      if (arePixelArraysEqual(activeFrame.pixels, nextPixels)) {
        return {
          floatingSelection: null,
        }
      }

      return {
        animation: updateFramePixels(state.animation, activeFrame.id, nextPixels),
        pixelHistoryPast: pushPixelHistory(state.pixelHistoryPast, {
          frameId: activeFrame.id,
          beforePixels: [...activeFrame.pixels],
          afterPixels: [...nextPixels],
        }),
        pixelHistoryFuture: [],
        pendingPixelHistory: null,
        ...clearActiveSelectionState(),
      }
    })
  },

  cancelFloatingSelection: () => {
    set((state) => {
      if (!state.floatingSelection) {
        return state
      }

      return {
        floatingSelection: null,
      }
    })
  },

  mirrorFloatingSelection: (axis) => {
    set((state) => {
      if (!state.floatingSelection) {
        return state
      }

      return {
        floatingSelection: {
          ...mirrorPixelRegion(state.floatingSelection, axis),
          x: state.floatingSelection.x,
          y: state.floatingSelection.y,
        },
      }
    })
  },

  setSymmetryEnabled: (enabled) => {
    set({ symmetryEnabled: enabled })
  },

  setSymmetryAxis: (axis) => {
    set({ symmetryAxis: axis })
  },

  setReferenceVisibility: (visible) => {
    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]
      const layer = getFrameReferenceLayer(state.referenceLayers, activeFrame.id)

      if (!layer.assetId) {
        return state
      }

      return {
        referenceLayers: setFrameReferenceLayer(state.referenceLayers, activeFrame.id, {
          ...layer,
          visible,
        }),
      }
    })
  },

  setReferenceOpacity: (opacity) => {
    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]
      const layer = getFrameReferenceLayer(state.referenceLayers, activeFrame.id)

      if (!layer.assetId) {
        return state
      }

      return {
        referenceLayers: setFrameReferenceLayer(state.referenceLayers, activeFrame.id, {
          ...layer,
          opacity: clampReferenceOpacity(opacity),
        }),
      }
    })
  },

  setReferenceLayerPlacement: (placement) => {
    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]
      const layer = getFrameReferenceLayer(state.referenceLayers, activeFrame.id)

      if (!layer.assetId) {
        return state
      }

      return {
        referenceLayers: setFrameReferenceLayer(state.referenceLayers, activeFrame.id, {
          ...layer,
          layerPlacement: placement ?? DEFAULT_REFERENCE_LAYER_PLACEMENT,
        }),
      }
    })
  },

  setReferenceTransform: (transform) => {
    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]
      const layer = getFrameReferenceLayer(state.referenceLayers, activeFrame.id)

      if (!layer.assetId) {
        return state
      }

      return {
        referenceLayers: setFrameReferenceLayer(state.referenceLayers, activeFrame.id, {
          ...layer,
          transform: {
            ...layer.transform,
            ...transform,
            scale: clampReferenceScale(transform.scale ?? layer.transform.scale),
            rotationDeg: normalizeRotation(transform.rotationDeg ?? layer.transform.rotationDeg),
          },
        }),
      }
    })
  },

  setReferenceScale: (scale) => {
    get().setReferenceTransform({ scale })
  },

  nudgeReference: (deltaX, deltaY) => {
    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]
      const layer = getFrameReferenceLayer(state.referenceLayers, activeFrame.id)

      if (!layer.assetId) {
        return state
      }

      return {
        referenceLayers: setFrameReferenceLayer(state.referenceLayers, activeFrame.id, {
          ...layer,
          transform: {
            ...layer.transform,
            x: layer.transform.x + deltaX,
            y: layer.transform.y + deltaY,
          },
        }),
      }
    })
  },

  rotateReference: (deltaDeg) => {
    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]
      const layer = getFrameReferenceLayer(state.referenceLayers, activeFrame.id)

      if (!layer.assetId) {
        return state
      }

      return {
        referenceLayers: setFrameReferenceLayer(state.referenceLayers, activeFrame.id, {
          ...layer,
          transform: {
            ...layer.transform,
            rotationDeg: normalizeRotation(layer.transform.rotationDeg + deltaDeg),
          },
        }),
      }
    })
  },

  mirrorReference: (axis) => {
    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]
      const layer = getFrameReferenceLayer(state.referenceLayers, activeFrame.id)

      if (!layer.assetId) {
        return state
      }

      return {
        referenceLayers: setFrameReferenceLayer(state.referenceLayers, activeFrame.id, {
          ...layer,
          transform: {
            ...layer.transform,
            mirrorX: axis === 'x' ? !layer.transform.mirrorX : layer.transform.mirrorX,
            mirrorY: axis === 'y' ? !layer.transform.mirrorY : layer.transform.mirrorY,
          },
        }),
      }
    })
  },

  resetReferenceTransform: () => {
    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]
      const layer = getFrameReferenceLayer(state.referenceLayers, activeFrame.id)
      const asset = layer.assetId ? state.referenceAssets[layer.assetId] : null

      if (!layer.assetId || !asset) {
        return state
      }

      return {
        referenceLayers: setFrameReferenceLayer(state.referenceLayers, activeFrame.id, {
          ...layer,
          transform: createDefaultReferenceTransform(fitReferenceScale(asset.width, asset.height)),
        }),
      }
    })
  },

  attachReferenceImage: async (file) => {
    const asset = await createReferenceAssetFromFile(file)
    await saveReferenceAsset(asset)

    set((state) => {
      const activeFrame = state.animation.frames[state.activeFrameIndex]
      const scale = fitReferenceScale(asset.width, asset.height)

      return {
        referenceAssets: {
          ...state.referenceAssets,
          [asset.id]: asset,
        },
        referenceLayers: setFrameReferenceLayer(state.referenceLayers, activeFrame.id, {
          ...createEmptyReferenceLayer(),
          assetId: asset.id,
          transform: createDefaultReferenceTransform(scale),
        }),
        referenceAssetsHydrated: true,
        referenceEditMode: true,
        isPlaying: false,
      }
    })
  },

  clearReferenceImage: async () => {
    const currentState = get()
    const activeFrame = currentState.animation.frames[currentState.activeFrameIndex]
    const layer = getFrameReferenceLayer(currentState.referenceLayers, activeFrame.id)

    if (!layer.assetId) {
      return
    }

    const assetId = layer.assetId
    const nextLayers = setFrameReferenceLayer(currentState.referenceLayers, activeFrame.id, {
      ...layer,
      assetId: null,
    })

    set((state) => ({
      referenceLayers: nextLayers,
      referenceEditMode: false,
      referenceAssets: { ...state.referenceAssets },
    }))

    const nextAssets = { ...get().referenceAssets }
    await pruneReferenceAssetIfUnused(assetId, nextLayers, nextAssets)
    set({ referenceAssets: nextAssets })
  },

  copyReferenceToNextFrame: () => {
    set((state) => {
      const sourceFrame = state.animation.frames[state.activeFrameIndex]
      const sourceLayer = getFrameReferenceLayer(state.referenceLayers, sourceFrame.id)

      if (!sourceLayer.assetId) {
        return state
      }

      const nextFrames = [...state.animation.frames]
      let targetIndex = state.activeFrameIndex + 1

      if (targetIndex >= nextFrames.length) {
        if (nextFrames.length >= MAX_FRAMES) {
          return state
        }

        nextFrames.push(createFrame())
        targetIndex = nextFrames.length - 1
      }

      const targetFrame = nextFrames[targetIndex]

      return {
        animation: {
          ...state.animation,
          frames: nextFrames,
        },
        activeFrameIndex: targetIndex,
        isPlaying: false,
        referenceLayers: setFrameReferenceLayer(state.referenceLayers, targetFrame.id, {
          ...sourceLayer,
          transform: { ...sourceLayer.transform },
        }),
      }
    })
  },

  hydrateReferenceAssets: async () => {
    const state = get()
    const assetIds = Array.from(getReferencedAssetIds(state.referenceLayers))

    if (assetIds.length === 0) {
      set({ referenceAssetsHydrated: true, referenceAssets: {} })
      return
    }

    const assets = await loadReferenceAssets(assetIds)
    set({
      referenceAssets: createReferenceAssetMap(assets),
      referenceAssetsHydrated: true,
    })
  },

  copyActiveFramePixels: () => {
    set((state) => ({
      pixelClipboard: [...state.animation.frames[state.activeFrameIndex].pixels],
    }))
  },

  pastePixelsIntoActiveFrame: () => {
    set((state) => {
      const pixelClipboard = state.pixelClipboard

      if (!pixelClipboard) {
        return state
      }

      const frame = state.animation.frames[state.activeFrameIndex]

      if (arePixelArraysEqual(frame.pixels, pixelClipboard)) {
        return state
      }

      return {
        animation: updateFramePixels(state.animation, frame.id, pixelClipboard),
        pixelHistoryPast: pushPixelHistory(state.pixelHistoryPast, {
          frameId: frame.id,
          beforePixels: [...frame.pixels],
          afterPixels: [...pixelClipboard],
        }),
        pixelHistoryFuture: [],
        pendingPixelHistory: null,
      }
    })
  },

  undoPixelChange: () => {
    set((state) => {
      const nextPast = [...state.pixelHistoryPast]
      const lastEntry = nextPast.pop()

      if (!lastEntry) {
        return state
      }

      const targetFrameIndex = state.animation.frames.findIndex(
        (frame) => frame.id === lastEntry.frameId,
      )

      if (targetFrameIndex === -1) {
        return {
          pixelHistoryPast: nextPast,
          pendingPixelHistory: null,
        }
      }

      return {
        animation: updateFramePixels(state.animation, lastEntry.frameId, lastEntry.beforePixels),
        activeFrameIndex: targetFrameIndex,
        pixelHistoryPast: nextPast,
        pixelHistoryFuture: [...state.pixelHistoryFuture, lastEntry],
        pendingPixelHistory: null,
      }
    })
  },

  redoPixelChange: () => {
    set((state) => {
      const nextFuture = [...state.pixelHistoryFuture]
      const lastEntry = nextFuture.pop()

      if (!lastEntry) {
        return state
      }

      const targetFrameIndex = state.animation.frames.findIndex(
        (frame) => frame.id === lastEntry.frameId,
      )

      if (targetFrameIndex === -1) {
        return {
          pixelHistoryFuture: nextFuture,
          pendingPixelHistory: null,
        }
      }

      return {
        animation: updateFramePixels(state.animation, lastEntry.frameId, lastEntry.afterPixels),
        activeFrameIndex: targetFrameIndex,
        pixelHistoryPast: pushPixelHistory(state.pixelHistoryPast, lastEntry),
        pixelHistoryFuture: nextFuture,
        pendingPixelHistory: null,
      }
    })
  },

  restoreProjectSnapshot: async (editorState, referenceAssets) => {
    const currentState = get()
    const previousAssetIds = Array.from(getReferencedAssetIds(currentState.referenceLayers))
    const normalizedEditorState = normalizePersistedEditorState(editorState)
    const nextAnimation = normalizeAnimationDocument(normalizedEditorState.animation)
    const nextReferenceLayers = synchronizeReferenceLayers(
      nextAnimation,
      normalizedEditorState.referenceLayers,
    )
    const referencedAssetIds = getReferencedAssetIds(nextReferenceLayers)
    const nextReferenceAssets = referenceAssets.filter((asset) => referencedAssetIds.has(asset.id))

    await Promise.all(previousAssetIds.map((assetId) => deleteReferenceAsset(assetId)))
    await Promise.all(nextReferenceAssets.map((asset) => saveReferenceAsset(asset)))

    set({
      animation: nextAnimation,
      activeFrameIndex: clampFrameIndex(
        normalizedEditorState.activeFrameIndex,
        nextAnimation.frames.length,
      ),
      selectedTool: 'pencil',
      selectedColor: normalizeColorHex(normalizedEditorState.selectedColor),
      canvasBackgroundColor: normalizedEditorState.canvasBackgroundColor,
      canvasGridColorOverride: normalizedEditorState.canvasGridColorOverride,
      brushSize: normalizedEditorState.brushSize,
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(normalizedEditorState.zoom))),
      isPlaying: false,
      onionSkinEnabled: normalizedEditorState.onionSkinEnabled,
      onionSkinOpacity: clampOnionSkinOpacity(normalizedEditorState.onionSkinOpacity),
      onionSkinPlacement: normalizedEditorState.onionSkinPlacement,
      referenceLayers: nextReferenceLayers,
      referenceAssets: createReferenceAssetMap(nextReferenceAssets),
      referenceAssetsHydrated: true,
      referenceEditMode: false,
      referenceOnionSkinEnabled: normalizedEditorState.referenceOnionSkinEnabled,
      referenceOnionSkinOpacity: clampReferenceOnionOpacity(
        normalizedEditorState.referenceOnionSkinOpacity,
      ),
      pixelClipboard: null,
      pixelHistoryPast: [],
      pixelHistoryFuture: [],
      pendingPixelHistory: null,
      selectionFrameId: null,
      selectedPixelIndices: [],
      selectionClipboard: null,
      floatingSelection: null,
      symmetryEnabled: false,
      symmetryAxis: 'left-right',
    })
  },

  createNewProject: () => {
    const state = get()
    const assetIds = Array.from(getReferencedAssetIds(state.referenceLayers))

    set({
      animation: createDefaultAnimation(),
      activeFrameIndex: 0,
      selectedTool: 'pencil',
      selectedColor: DEFAULT_COLOR,
      canvasBackgroundColor: DEFAULT_CANVAS_BACKGROUND_COLOR,
      canvasGridColorOverride: null,
      brushSize: BRUSH_SIZES[0],
      zoom: DEFAULT_ZOOM,
      isPlaying: false,
      onionSkinEnabled: false,
      onionSkinOpacity: DEFAULT_ONION_SKIN_OPACITY,
      onionSkinPlacement: DEFAULT_ONION_SKIN_PLACEMENT,
      referenceLayers: {},
      referenceAssets: {},
      referenceAssetsHydrated: true,
      referenceEditMode: false,
      referenceOnionSkinEnabled: false,
      referenceOnionSkinOpacity: DEFAULT_REFERENCE_ONION_OPACITY,
      pixelClipboard: null,
      pixelHistoryPast: [],
      pixelHistoryFuture: [],
      pendingPixelHistory: null,
      selectionFrameId: null,
      selectedPixelIndices: [],
      selectionClipboard: null,
      floatingSelection: null,
      symmetryEnabled: false,
      symmetryAxis: 'left-right',
    })

    void Promise.all(assetIds.map((assetId) => deleteReferenceAsset(assetId))).catch(() => undefined)
  },

  selectFrame: (index) => {
    set((state) => ({
      activeFrameIndex: clampFrameIndex(index, state.animation.frames.length),
      isPlaying: false,
      pendingPixelHistory: null,
      ...clearActiveSelectionState(),
    }))
  },

  setFrameDescriptor: (frameIndex, descriptor) => {
    set((state) => {
      const frames = state.animation.frames
      if (frameIndex < 0 || frameIndex >= frames.length) {
        return state
      }

      const nextDescriptor = descriptor.slice(0, MAX_FRAME_DESCRIPTOR_LENGTH)
      const current = frames[frameIndex]?.descriptor ?? ''
      if (nextDescriptor === current) {
        return state
      }

      const nextFrames = frames.map((frame, index) =>
        index === frameIndex ? { ...frame, descriptor: nextDescriptor } : frame,
      )

      return {
        animation: {
          ...state.animation,
          frames: nextFrames,
        },
      }
    })
  },

  reorderFrames: (fromIndex, toIndex) => {
    set((state) => {
      const frames = state.animation.frames
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= frames.length ||
        toIndex >= frames.length
      ) {
        return state
      }

      const nextFrames = reorderFrameList(frames, fromIndex, toIndex)

      const activeId = frames[state.activeFrameIndex]?.id
      const newActiveIndex =
        activeId !== undefined ? nextFrames.findIndex((frame) => frame.id === activeId) : state.activeFrameIndex

      return {
        animation: {
          ...state.animation,
          frames: nextFrames,
        },
        activeFrameIndex: clampFrameIndex(
          newActiveIndex >= 0 ? newActiveIndex : state.activeFrameIndex,
          nextFrames.length,
        ),
        isPlaying: false,
        pendingPixelHistory: null,
        ...clearActiveSelectionState(),
      }
    })
  },

  addBlankFrame: () => {
    set((state) => {
      if (state.animation.frames.length >= MAX_FRAMES) {
        return state
      }

      const nextIndex = state.activeFrameIndex + 1
      const nextFrames = [...state.animation.frames]
      nextFrames.splice(nextIndex, 0, createFrame())

      return {
        animation: {
          ...state.animation,
          frames: nextFrames,
        },
        activeFrameIndex: nextIndex,
        isPlaying: false,
        pendingPixelHistory: null,
        ...clearActiveSelectionState(),
      }
    })
  },

  duplicateActiveFrame: () => {
    set((state) => {
      if (state.animation.frames.length >= MAX_FRAMES) {
        return state
      }

      const sourceFrame = state.animation.frames[state.activeFrameIndex]
      const sourceLayer = getFrameReferenceLayer(state.referenceLayers, sourceFrame.id)
      const nextFrame = createFrame(sourceFrame.pixels, { descriptor: sourceFrame.descriptor })
      const nextIndex = state.activeFrameIndex + 1
      const nextFrames = [...state.animation.frames]
      nextFrames.splice(nextIndex, 0, nextFrame)

      return {
        animation: {
          ...state.animation,
          frames: nextFrames,
        },
        activeFrameIndex: nextIndex,
        isPlaying: false,
        pendingPixelHistory: null,
        ...clearActiveSelectionState(),
        referenceLayers: sourceLayer.assetId
          ? setFrameReferenceLayer(state.referenceLayers, nextFrame.id, {
              ...sourceLayer,
              transform: { ...sourceLayer.transform },
            })
          : state.referenceLayers,
      }
    })
  },

  deleteActiveFrame: () => {
    const state = get()
    const activeFrame = state.animation.frames[state.activeFrameIndex]
    const removedLayer = getFrameReferenceLayer(state.referenceLayers, activeFrame.id)

    set((currentState) => {
      if (currentState.animation.frames.length === 1) {
        return {
          animation: {
            ...currentState.animation,
            frames: [createFrame()],
          },
          activeFrameIndex: 0,
          isPlaying: false,
          referenceLayers: {},
          referenceEditMode: false,
          pixelHistoryPast: [],
          pixelHistoryFuture: [],
          pendingPixelHistory: null,
          selectionFrameId: null,
          selectedPixelIndices: [],
          selectionClipboard: state.selectionClipboard,
          floatingSelection: null,
        }
      }

      const nextFrames = currentState.animation.frames.filter(
        (_, frameIndex) => frameIndex !== currentState.activeFrameIndex,
      )
      const remainingLayers = { ...currentState.referenceLayers }
      delete remainingLayers[activeFrame.id]

      return {
        animation: {
          ...currentState.animation,
          frames: nextFrames,
        },
        activeFrameIndex: clampFrameIndex(currentState.activeFrameIndex, nextFrames.length),
        isPlaying: false,
        referenceLayers: remainingLayers,
        referenceEditMode: false,
        pixelHistoryPast: removeFramePixelHistory(currentState.pixelHistoryPast, activeFrame.id),
        pixelHistoryFuture: removeFramePixelHistory(currentState.pixelHistoryFuture, activeFrame.id),
        pendingPixelHistory:
          currentState.pendingPixelHistory?.frameId === activeFrame.id
            ? null
            : currentState.pendingPixelHistory,
        ...clearActiveSelectionState(),
      }
    })

    const nextAssets = { ...get().referenceAssets }
    void pruneReferenceAssetIfUnused(removedLayer.assetId, get().referenceLayers, nextAssets).then(() => {
      set({ referenceAssets: nextAssets })
    })
  },

  drawOnActiveFrame: (from, to) => {
    set((state) => {
      const frame = state.animation.frames[state.activeFrameIndex]
      const nextColor = state.selectedTool === 'eraser' ? EMPTY_PIXEL : state.selectedColor
      let nextPixels = drawStroke(frame.pixels, {
        from,
        to,
        color: nextColor,
        brushSize: state.brushSize,
      })

      if (state.symmetryEnabled) {
        nextPixels = drawStroke(nextPixels, {
          from: getMirroredPoint(from, state.symmetryAxis),
          to: to ? getMirroredPoint(to, state.symmetryAxis) : undefined,
          color: nextColor,
          brushSize: state.brushSize,
        })
      }

      if (arePixelArraysEqual(frame.pixels, nextPixels)) {
        return state
      }

      const nextFrames = [...state.animation.frames]
      nextFrames[state.activeFrameIndex] = {
        ...frame,
        pixels: nextPixels,
      }

      if (state.pendingPixelHistory?.frameId === frame.id) {
        return {
          animation: {
            ...state.animation,
            frames: nextFrames,
          },
        }
      }

      return {
        animation: {
          ...state.animation,
          frames: nextFrames,
        },
        pixelHistoryPast: pushPixelHistory(state.pixelHistoryPast, {
          frameId: frame.id,
          beforePixels: [...frame.pixels],
          afterPixels: [...nextPixels],
        }),
        pixelHistoryFuture: [],
        pendingPixelHistory: null,
      }
    })
  },

  togglePlayback: () => {
    set((state) => ({
      isPlaying: !state.isPlaying,
      referenceEditMode: false,
      pendingPixelHistory: null,
    }))
  },

  stopPlayback: () => {
    set({ isPlaying: false, pendingPixelHistory: null })
  },

  nextFrame: () => {
    set((state) => ({
      activeFrameIndex: getNextFrameIndex(state.activeFrameIndex, state.animation.frames.length),
      pendingPixelHistory: null,
    }))
  },

  previousFrame: () => {
    set((state) => ({
      activeFrameIndex: getPreviousFrameIndex(state.activeFrameIndex, state.animation.frames.length),
      pendingPixelHistory: null,
    }))
  },

  replaceAnimation: (animation) => {
    const state = get()
    const nextAnimation = normalizeAnimationDocument(animation)
    const assetIds = Array.from(getReferencedAssetIds(state.referenceLayers))

    set({
      animation: nextAnimation,
      activeFrameIndex: 0,
      selectedTool: 'pencil',
      selectedColor: DEFAULT_COLOR,
      canvasBackgroundColor: DEFAULT_CANVAS_BACKGROUND_COLOR,
      canvasGridColorOverride: null,
      brushSize: BRUSH_SIZES[0],
      zoom: DEFAULT_ZOOM,
      isPlaying: false,
      onionSkinEnabled: false,
      onionSkinOpacity: DEFAULT_ONION_SKIN_OPACITY,
      onionSkinPlacement: DEFAULT_ONION_SKIN_PLACEMENT,
      referenceLayers: {},
      referenceAssets: {},
      referenceAssetsHydrated: true,
      referenceEditMode: false,
      referenceOnionSkinEnabled: false,
      referenceOnionSkinOpacity: DEFAULT_REFERENCE_ONION_OPACITY,
      pixelClipboard: null,
      pixelHistoryPast: [],
      pixelHistoryFuture: [],
      pendingPixelHistory: null,
      selectionFrameId: null,
      selectedPixelIndices: [],
      selectionClipboard: null,
      floatingSelection: null,
      symmetryEnabled: false,
      symmetryAxis: 'left-right',
    })

    void Promise.all(assetIds.map((assetId) => deleteReferenceAsset(assetId)))
  },
}))

useEditorStore.subscribe((state) => {
  savePersistedEditorState({
    animation: state.animation,
    activeFrameIndex: state.activeFrameIndex,
    selectedColor: state.selectedColor,
    canvasBackgroundColor: state.canvasBackgroundColor,
    canvasGridColorOverride: state.canvasGridColorOverride,
    brushSize: state.brushSize,
    zoom: state.zoom,
    onionSkinEnabled: state.onionSkinEnabled,
    onionSkinOpacity: state.onionSkinOpacity,
    onionSkinPlacement: state.onionSkinPlacement,
    referenceLayers: state.referenceLayers,
    referenceOnionSkinEnabled: state.referenceOnionSkinEnabled,
    referenceOnionSkinOpacity: state.referenceOnionSkinOpacity,
  })
})
