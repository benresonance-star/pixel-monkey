import { CANVAS_HEIGHT, CANVAS_WIDTH, EMPTY_PIXEL, type BrushSize } from '../../export/animationSchema'
import { getPixelIndex, isInsideCanvas, type PixelPoint } from './drawing'

export type SelectionMirrorAxis = 'horizontal' | 'vertical'
export type SymmetryAxis = 'left-right' | 'up-down'

export type PixelRegion = {
  width: number
  height: number
  pixels: string[]
  originX: number
  originY: number
}

function getBrushPoints(center: PixelPoint, brushSize: BrushSize): PixelPoint[] {
  const points: PixelPoint[] = []
  const startX = center.x - Math.floor(brushSize / 2)
  const startY = center.y - Math.floor(brushSize / 2)

  for (let y = startY; y < startY + brushSize; y += 1) {
    for (let x = startX; x < startX + brushSize; x += 1) {
      if (isInsideCanvas(x, y)) {
        points.push({ x, y })
      }
    }
  }

  return points
}

function getStrokePoints(from: PixelPoint, to = from): PixelPoint[] {
  const points: PixelPoint[] = []
  const deltaX = to.x - from.x
  const deltaY = to.y - from.y
  const steps = Math.max(Math.abs(deltaX), Math.abs(deltaY), 1)

  for (let step = 0; step <= steps; step += 1) {
    points.push({
      x: Math.round(from.x + (deltaX * step) / steps),
      y: Math.round(from.y + (deltaY * step) / steps),
    })
  }

  return points
}

export function getMirroredPoint(point: PixelPoint, axis: SymmetryAxis): PixelPoint {
  if (axis === 'left-right') {
    return {
      x: CANVAS_WIDTH - 1 - point.x,
      y: point.y,
    }
  }

  return {
    x: point.x,
    y: CANVAS_HEIGHT - 1 - point.y,
  }
}

export function collectSelectableIndices(
  pixels: readonly string[],
  from: PixelPoint,
  to: PixelPoint | undefined,
  brushSize: BrushSize,
): number[] {
  const indices = new Set<number>()

  for (const point of getStrokePoints(from, to)) {
    for (const brushPoint of getBrushPoints(point, brushSize)) {
      const index = getPixelIndex(brushPoint.x, brushPoint.y)

      if (pixels[index] !== EMPTY_PIXEL) {
        indices.add(index)
      }
    }
  }

  return Array.from(indices)
}

export function getSelectionBounds(indices: readonly number[]) {
  if (indices.length === 0) {
    return null
  }

  let minX = CANVAS_WIDTH
  let minY = CANVAS_HEIGHT
  let maxX = 0
  let maxY = 0

  for (const index of indices) {
    const x = index % CANVAS_WIDTH
    const y = Math.floor(index / CANVAS_WIDTH)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

export function createPixelRegionFromSelection(
  pixels: readonly string[],
  indices: readonly number[],
): PixelRegion | null {
  const bounds = getSelectionBounds(indices)

  if (!bounds) {
    return null
  }

  const regionPixels = Array.from({ length: bounds.width * bounds.height }, () => EMPTY_PIXEL)
  const selectedIndexSet = new Set(indices)

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const canvasIndex = getPixelIndex(x, y)

      if (!selectedIndexSet.has(canvasIndex)) {
        continue
      }

      const localIndex = (y - bounds.minY) * bounds.width + (x - bounds.minX)
      regionPixels[localIndex] = pixels[canvasIndex]
    }
  }

  return {
    width: bounds.width,
    height: bounds.height,
    pixels: regionPixels,
    originX: bounds.minX,
    originY: bounds.minY,
  }
}

export function removeSelectedPixels(
  pixels: readonly string[],
  indices: readonly number[],
): string[] {
  const nextPixels = [...pixels]

  for (const index of indices) {
    nextPixels[index] = EMPTY_PIXEL
  }

  return nextPixels
}

export function pastePixelRegion(
  pixels: readonly string[],
  region: PixelRegion,
  targetX: number,
  targetY: number,
): string[] {
  const nextPixels = [...pixels]

  for (let localY = 0; localY < region.height; localY += 1) {
    for (let localX = 0; localX < region.width; localX += 1) {
      const sourceColor = region.pixels[localY * region.width + localX]

      if (sourceColor === EMPTY_PIXEL) {
        continue
      }

      const canvasX = targetX + localX
      const canvasY = targetY + localY

      if (!isInsideCanvas(canvasX, canvasY)) {
        continue
      }

      nextPixels[getPixelIndex(canvasX, canvasY)] = sourceColor
    }
  }

  return nextPixels
}

export function mirrorPixelRegion(
  region: PixelRegion,
  axis: SelectionMirrorAxis,
): PixelRegion {
  const nextPixels = Array.from({ length: region.width * region.height }, () => EMPTY_PIXEL)

  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      const sourceIndex = y * region.width + x
      const targetX = axis === 'horizontal' ? region.width - 1 - x : x
      const targetY = axis === 'vertical' ? region.height - 1 - y : y
      nextPixels[targetY * region.width + targetX] = region.pixels[sourceIndex]
    }
  }

  return {
    ...region,
    pixels: nextPixels,
  }
}

export function hitTestPixelRegion(
  region: PixelRegion,
  point: PixelPoint,
  offsetX: number,
  offsetY: number,
): boolean {
  const localX = point.x - offsetX
  const localY = point.y - offsetY

  if (localX < 0 || localX >= region.width || localY < 0 || localY >= region.height) {
    return false
  }

  return region.pixels[localY * region.width + localX] !== EMPTY_PIXEL
}

