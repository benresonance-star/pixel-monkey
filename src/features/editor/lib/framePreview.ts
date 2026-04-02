import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../export/animationSchema'

/** Rendered size for timeline frame thumbnails (CSS px). */
export const FRAME_THUMB_SIZE = 44

function hexToRgba(color: string) {
  const red = Number.parseInt(color.slice(1, 3), 16)
  const green = Number.parseInt(color.slice(3, 5), 16)
  const blue = Number.parseInt(color.slice(5, 7), 16)
  const alpha = Number.parseInt(color.slice(7, 9), 16)

  return { red, green, blue, alpha }
}

export function drawFrameThumbnail(canvas: HTMLCanvasElement, pixels: readonly string[]) {
  canvas.width = FRAME_THUMB_SIZE
  canvas.height = FRAME_THUMB_SIZE

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const full = document.createElement('canvas')
  full.width = CANVAS_WIDTH
  full.height = CANVAS_HEIGHT
  const fullContext = full.getContext('2d')
  if (!fullContext) {
    return
  }

  const imageData = fullContext.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT)

  for (let index = 0; index < pixels.length; index += 1) {
    const rgba = hexToRgba(pixels[index])
    const baseOffset = index * 4
    imageData.data[baseOffset] = rgba.red
    imageData.data[baseOffset + 1] = rgba.green
    imageData.data[baseOffset + 2] = rgba.blue
    imageData.data[baseOffset + 3] = rgba.alpha
  }

  fullContext.putImageData(imageData, 0, 0)

  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, FRAME_THUMB_SIZE, FRAME_THUMB_SIZE)
  ctx.drawImage(full, 0, 0, FRAME_THUMB_SIZE, FRAME_THUMB_SIZE)
}
