import { z } from 'zod'

import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../export/animationSchema'

export type ReferenceLayerPlacement = 'below' | 'above'

export const REFERENCE_LAYER_PLACEMENTS = ['below', 'above'] as const

export const MIN_REFERENCE_OPACITY = 0.05
export const MAX_REFERENCE_OPACITY = 1
export const DEFAULT_REFERENCE_OPACITY = 0.65
export const MIN_REFERENCE_ONION_OPACITY = 0.05
export const MAX_REFERENCE_ONION_OPACITY = 0.85
export const DEFAULT_REFERENCE_ONION_OPACITY = 0.28
export const MIN_REFERENCE_SCALE = 0.1
export const MAX_REFERENCE_SCALE = 12
export const DEFAULT_REFERENCE_LAYER_PLACEMENT: ReferenceLayerPlacement = 'below'

export const referenceTransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  scale: z.number().min(MIN_REFERENCE_SCALE).max(MAX_REFERENCE_SCALE),
  rotationDeg: z.number(),
  mirrorX: z.boolean(),
  mirrorY: z.boolean(),
})

export const frameReferenceLayerSchema = z.object({
  assetId: z.string().min(1).nullable(),
  visible: z.boolean(),
  opacity: z.number().min(MIN_REFERENCE_OPACITY).max(MAX_REFERENCE_OPACITY),
  layerPlacement: z.enum(REFERENCE_LAYER_PLACEMENTS),
  transform: referenceTransformSchema,
})

export const referenceLayerMapSchema = z.record(z.string(), frameReferenceLayerSchema)

export type ReferenceTransform = z.infer<typeof referenceTransformSchema>
export type FrameReferenceLayer = z.infer<typeof frameReferenceLayerSchema>
export type ReferenceLayerMap = z.infer<typeof referenceLayerMapSchema>

export type ReferenceAssetRecord = {
  id: string
  name: string
  width: number
  height: number
  dataUrl: string
}

export function clampReferenceOpacity(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_REFERENCE_OPACITY
  }

  return Math.min(MAX_REFERENCE_OPACITY, Math.max(MIN_REFERENCE_OPACITY, value))
}

export function clampReferenceOnionOpacity(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_REFERENCE_ONION_OPACITY
  }

  return Math.min(MAX_REFERENCE_ONION_OPACITY, Math.max(MIN_REFERENCE_ONION_OPACITY, value))
}

export function clampReferenceScale(value: number) {
  if (!Number.isFinite(value)) {
    return 1
  }

  return Math.min(MAX_REFERENCE_SCALE, Math.max(MIN_REFERENCE_SCALE, value))
}

export function normalizeRotation(rotationDeg: number) {
  if (!Number.isFinite(rotationDeg)) {
    return 0
  }

  const normalized = rotationDeg % 360
  return normalized < 0 ? normalized + 360 : normalized
}

export function createDefaultReferenceTransform(scale = 1): ReferenceTransform {
  return {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    scale: clampReferenceScale(scale),
    rotationDeg: 0,
    mirrorX: false,
    mirrorY: false,
  }
}

export function createEmptyReferenceLayer(): FrameReferenceLayer {
  return {
    assetId: null,
    visible: true,
    opacity: DEFAULT_REFERENCE_OPACITY,
    layerPlacement: DEFAULT_REFERENCE_LAYER_PLACEMENT,
    transform: createDefaultReferenceTransform(),
  }
}

export function normalizeReferenceTransform(transform: ReferenceTransform): ReferenceTransform {
  return {
    x: Number.isFinite(transform.x) ? transform.x : CANVAS_WIDTH / 2,
    y: Number.isFinite(transform.y) ? transform.y : CANVAS_HEIGHT / 2,
    scale: clampReferenceScale(transform.scale),
    rotationDeg: normalizeRotation(transform.rotationDeg),
    mirrorX: Boolean(transform.mirrorX),
    mirrorY: Boolean(transform.mirrorY),
  }
}

export function normalizeFrameReferenceLayer(layer: FrameReferenceLayer): FrameReferenceLayer {
  return {
    assetId: layer.assetId,
    visible: Boolean(layer.visible),
    opacity: clampReferenceOpacity(layer.opacity),
    layerPlacement:
      layer.layerPlacement === 'above' ? 'above' : DEFAULT_REFERENCE_LAYER_PLACEMENT,
    transform: normalizeReferenceTransform(layer.transform),
  }
}

