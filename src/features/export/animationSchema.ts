import { z } from 'zod'

export const CANVAS_WIDTH = 180
export const CANVAS_HEIGHT = 180
export const TOTAL_PIXELS = CANVAS_WIDTH * CANVAS_HEIGHT
export const MIN_FPS = 1
export const MAX_FPS = 24
export const DEFAULT_FPS = 8
export const MAX_FRAMES = 24
export const MAX_FRAME_DESCRIPTOR_LENGTH = 80
export const EMPTY_PIXEL = '#00000000'
export const DEFAULT_COLOR = '#22c55eff'
export const DEFAULT_ANIMATION_NAME = 'untitled-animation'
export const BRUSH_SIZES = [1, 2, 4, 8] as const

const rgbaHexPattern = /^#[0-9a-fA-F]{8}$/

export const animationFrameSchema = z.object({
  id: z.string().min(1),
  pixels: z.array(z.string().regex(rgbaHexPattern)).length(TOTAL_PIXELS),
  descriptor: z.string().max(MAX_FRAME_DESCRIPTOR_LENGTH).default(''),
})

export const animationDocumentSchema = z.object({
  version: z.literal(1),
  name: z.string().trim().min(1).max(100).default(DEFAULT_ANIMATION_NAME),
  width: z.literal(CANVAS_WIDTH),
  height: z.literal(CANVAS_HEIGHT),
  fps: z.int().min(MIN_FPS).max(MAX_FPS),
  frames: z.array(animationFrameSchema).min(1).max(MAX_FRAMES),
})

export type AnimationFrame = z.infer<typeof animationFrameSchema>
export type AnimationDocument = z.infer<typeof animationDocumentSchema>
export type BrushSize = (typeof BRUSH_SIZES)[number]

export function normalizeColorHex(rawColor: string): string {
  const value = rawColor.trim()

  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return `${value.toLowerCase()}ff`
  }

  if (/^#[0-9a-fA-F]{8}$/.test(value)) {
    return value.toLowerCase()
  }

  throw new Error(`Unsupported color format: ${rawColor}`)
}

export function clampFps(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_FPS
  }

  return Math.min(MAX_FPS, Math.max(MIN_FPS, Math.round(value)))
}

export function sanitizeAnimationName(name: string): string {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed : DEFAULT_ANIMATION_NAME
}

export function sanitizeFrameDescriptor(raw: string): string {
  return raw.trim().slice(0, MAX_FRAME_DESCRIPTOR_LENGTH)
}

export function createBlankPixels(): string[] {
  return Array.from({ length: TOTAL_PIXELS }, () => EMPTY_PIXEL)
}

export function createFrame(
  sourcePixels?: readonly string[],
  options?: { descriptor?: string },
): AnimationFrame {
  const pixels = sourcePixels ? [...sourcePixels] : createBlankPixels()

  if (pixels.length !== TOTAL_PIXELS) {
    throw new Error(`Frame pixel count must be ${TOTAL_PIXELS}.`)
  }

  const descriptor =
    options?.descriptor !== undefined ? sanitizeFrameDescriptor(options.descriptor) : ''

  return {
    id: crypto.randomUUID(),
    pixels: pixels.map((pixel) => normalizeColorHex(pixel)),
    descriptor,
  }
}

export function createDefaultAnimation(): AnimationDocument {
  return {
    version: 1,
    name: DEFAULT_ANIMATION_NAME,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    fps: DEFAULT_FPS,
    frames: [createFrame()],
  }
}

export function normalizeAnimationDocument(document: AnimationDocument): AnimationDocument {
  return {
    ...document,
    name: sanitizeAnimationName(document.name),
    fps: clampFps(document.fps),
    frames: document.frames.map((frame) => ({
      ...frame,
      descriptor: sanitizeFrameDescriptor(frame.descriptor ?? ''),
      pixels: frame.pixels.map((pixel) => normalizeColorHex(pixel)),
    })),
  }
}

export function parseImportedAnimation(input: string | unknown): AnimationDocument {
  const value = typeof input === 'string' ? JSON.parse(input) : input
  return normalizeAnimationDocument(animationDocumentSchema.parse(value))
}

export function serializeAnimation(animation: AnimationDocument): string {
  return JSON.stringify(normalizeAnimationDocument(animation), null, 2)
}
