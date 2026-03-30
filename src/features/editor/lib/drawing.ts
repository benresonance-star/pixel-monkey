import { CANVAS_HEIGHT, CANVAS_WIDTH, type BrushSize } from '../../export/animationSchema'

export type PixelPoint = {
  x: number
  y: number
}

type DrawStrokeOptions = {
  color: string
  brushSize: BrushSize
  from: PixelPoint
  to?: PixelPoint
}

export function isInsideCanvas(x: number, y: number): boolean {
  return x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT
}

export function getPixelIndex(x: number, y: number): number {
  return y * CANVAS_WIDTH + x
}

function paintBrush(pixels: string[], center: PixelPoint, brushSize: BrushSize, color: string) {
  const startX = center.x - Math.floor(brushSize / 2)
  const startY = center.y - Math.floor(brushSize / 2)

  for (let y = startY; y < startY + brushSize; y += 1) {
    for (let x = startX; x < startX + brushSize; x += 1) {
      if (!isInsideCanvas(x, y)) {
        continue
      }

      pixels[getPixelIndex(x, y)] = color
    }
  }
}

export function drawStroke(pixels: readonly string[], options: DrawStrokeOptions): string[] {
  const nextPixels = [...pixels]
  const target = options.to ?? options.from
  const deltaX = target.x - options.from.x
  const deltaY = target.y - options.from.y
  const steps = Math.max(Math.abs(deltaX), Math.abs(deltaY), 1)

  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(options.from.x + (deltaX * step) / steps)
    const y = Math.round(options.from.y + (deltaY * step) / steps)
    paintBrush(nextPixels, { x, y }, options.brushSize, options.color)
  }

  return nextPixels
}
