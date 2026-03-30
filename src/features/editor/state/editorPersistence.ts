import { z } from 'zod'

import { BRUSH_SIZES, animationDocumentSchema, type AnimationDocument, type BrushSize } from '../../export/animationSchema'
import {
  DEFAULT_REFERENCE_ONION_OPACITY,
  clampReferenceOnionOpacity,
  normalizeFrameReferenceLayer,
  referenceLayerMapSchema,
  type FrameReferenceLayer,
  type ReferenceLayerMap,
} from './referenceLayer'

export const EDITOR_PERSISTENCE_KEY = 'pixel-editor.current-draft.v1'

export type OnionSkinPlacement = 'below' | 'above'

export type PersistedEditorState = {
  animation: AnimationDocument
  activeFrameIndex: number
  selectedColor: string
  brushSize: BrushSize
  zoom: number
  onionSkinEnabled: boolean
  onionSkinOpacity: number
  onionSkinPlacement: OnionSkinPlacement
  referenceLayers: ReferenceLayerMap
  referenceOnionSkinEnabled: boolean
  referenceOnionSkinOpacity: number
}

export const persistedEditorStateSchema = z.object({
  animation: animationDocumentSchema,
  activeFrameIndex: z.int().min(0),
  selectedColor: z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/),
  brushSize: z.number().refine((value): value is BrushSize => BRUSH_SIZES.includes(value as BrushSize)),
  zoom: z.int().min(1).max(64),
  onionSkinEnabled: z.boolean(),
  onionSkinOpacity: z.number().min(0).max(1),
  onionSkinPlacement: z.enum(['below', 'above']),
  referenceLayers: referenceLayerMapSchema.default({}),
  referenceOnionSkinEnabled: z.boolean().default(false),
  referenceOnionSkinOpacity: z.number().min(0).max(1).default(DEFAULT_REFERENCE_ONION_OPACITY),
})

export function normalizePersistedEditorState(
  state: PersistedEditorState,
): PersistedEditorState {
  return {
    ...state,
    referenceLayers: Object.fromEntries(
      Object.entries(state.referenceLayers).map(([frameId, layer]) => [
        frameId,
        normalizeFrameReferenceLayer(layer as FrameReferenceLayer),
      ]),
    ),
    referenceOnionSkinOpacity: clampReferenceOnionOpacity(state.referenceOnionSkinOpacity),
  }
}

function getLocalStorage(): Storage | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage
  } catch {
    return null
  }
}

export function loadPersistedEditorState(): PersistedEditorState | null {
  const storage = getLocalStorage()

  if (!storage) {
    return null
  }

  try {
    const rawValue = storage.getItem(EDITOR_PERSISTENCE_KEY)

    if (!rawValue) {
      return null
    }

    const parsedState = persistedEditorStateSchema.parse(JSON.parse(rawValue))

    return normalizePersistedEditorState(parsedState)
  } catch {
    return null
  }
}

export function savePersistedEditorState(state: PersistedEditorState) {
  const storage = getLocalStorage()

  if (!storage) {
    return
  }

  try {
    storage.setItem(EDITOR_PERSISTENCE_KEY, JSON.stringify(state))
  } catch {
    // Ignore quota/security errors and keep the editor usable.
  }
}
