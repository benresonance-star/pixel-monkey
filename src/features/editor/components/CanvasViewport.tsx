import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { CANVAS_HEIGHT, CANVAS_WIDTH, type AnimationFrame } from '../../export/animationSchema'
import { getAngleDeg, getDistance, getReferenceHandleLayout, hitTestHandle, hitTestReferenceImage } from '../lib/referenceMath'
import { hitTestPixelRegion, type SymmetryAxis } from '../lib/selection'
import { useEditorStore } from '../state/editorStore'
import type { PixelPoint } from '../lib/drawing'
import { createEmptyReferenceLayer, type FrameReferenceLayer, type ReferenceAssetRecord, type ReferenceTransform } from '../state/referenceLayer'

type RgbaColor = {
  red: number
  green: number
  blue: number
  alpha: number
}

const PREVIOUS_FRAME_TINT: RgbaColor = { red: 251, green: 146, blue: 60, alpha: 255 }
const NEXT_FRAME_TINT: RgbaColor = { red: 56, green: 189, blue: 248, alpha: 255 }
const REFERENCE_ONION_TINT: RgbaColor = { red: 226, green: 232, blue: 240, alpha: 255 }
const HANDLE_RADIUS = 5

type ReferenceInteraction =
  | {
      kind: 'move'
      pointerId: number
      startPoint: PixelPoint
      initialTransform: ReferenceTransform
    }
  | {
      kind: 'scale'
      pointerId: number
      startPoint: PixelPoint
      initialTransform: ReferenceTransform
      initialDistance: number
    }
  | {
      kind: 'rotate'
      pointerId: number
      startPoint: PixelPoint
      initialTransform: ReferenceTransform
      initialAngle: number
    }

type FloatingSelectionInteraction = {
  pointerId: number
  startPoint: PixelPoint
  initialX: number
  initialY: number
}

function hexToRgba(color: string) {
  const red = Number.parseInt(color.slice(1, 3), 16)
  const green = Number.parseInt(color.slice(3, 5), 16)
  const blue = Number.parseInt(color.slice(5, 7), 16)
  const alpha = Number.parseInt(color.slice(7, 9), 16)

  return { red, green, blue, alpha }
}

function drawFrameToContext(
  context: CanvasRenderingContext2D,
  frame: AnimationFrame,
  alphaMultiplier = 1,
  tint?: RgbaColor,
) {
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = CANVAS_WIDTH
  tempCanvas.height = CANVAS_HEIGHT

  const tempContext = tempCanvas.getContext('2d')

  if (!tempContext) {
    return
  }

  const imageData = tempContext.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT)

  for (let index = 0; index < frame.pixels.length; index += 1) {
    const rgba = hexToRgba(frame.pixels[index])
    const baseOffset = index * 4
    const red = tint ? Math.round((rgba.red + tint.red) / 2) : rgba.red
    const green = tint ? Math.round((rgba.green + tint.green) / 2) : rgba.green
    const blue = tint ? Math.round((rgba.blue + tint.blue) / 2) : rgba.blue

    imageData.data[baseOffset] = red
    imageData.data[baseOffset + 1] = green
    imageData.data[baseOffset + 2] = blue
    imageData.data[baseOffset + 3] = Math.round(rgba.alpha * alphaMultiplier)
  }

  tempContext.putImageData(imageData, 0, 0)
  context.drawImage(tempCanvas, 0, 0)
}

function tintImageContext(
  sourceImage: CanvasImageSource,
  width: number,
  height: number,
  tint: RgbaColor,
): HTMLCanvasElement {
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height

  const tempContext = tempCanvas.getContext('2d')

  if (!tempContext) {
    return tempCanvas
  }

  tempContext.drawImage(sourceImage, 0, 0, width, height)
  tempContext.globalCompositeOperation = 'source-atop'
  tempContext.fillStyle = `rgba(${tint.red}, ${tint.green}, ${tint.blue}, 0.32)`
  tempContext.fillRect(0, 0, width, height)
  tempContext.globalCompositeOperation = 'source-over'

  return tempCanvas
}

function drawReferenceToContext(
  context: CanvasRenderingContext2D,
  asset: ReferenceAssetRecord,
  image: HTMLImageElement,
  layer: FrameReferenceLayer,
  alphaMultiplier = 1,
  tint?: RgbaColor,
) {
  context.save()
  context.translate(layer.transform.x, layer.transform.y)
  context.rotate((layer.transform.rotationDeg * Math.PI) / 180)
  context.scale(
    layer.transform.scale * (layer.transform.mirrorX ? -1 : 1),
    layer.transform.scale * (layer.transform.mirrorY ? -1 : 1),
  )
  context.globalAlpha = Math.max(0, Math.min(1, layer.opacity * alphaMultiplier))

  const drawSource = tint ? tintImageContext(image, asset.width, asset.height, tint) : image

  context.drawImage(drawSource, -asset.width / 2, -asset.height / 2, asset.width, asset.height)
  context.restore()
}

function drawReferenceHandles(
  context: CanvasRenderingContext2D,
  asset: ReferenceAssetRecord,
  layer: FrameReferenceLayer,
) {
  const layout = getReferenceHandleLayout(asset, layer.transform)

  context.save()
  context.strokeStyle = '#f8fafc'
  context.lineWidth = 1.5
  context.setLineDash([4, 3])
  context.beginPath()
  context.moveTo(layout.corners[0].x, layout.corners[0].y)
  for (let index = 1; index < layout.corners.length; index += 1) {
    context.lineTo(layout.corners[index].x, layout.corners[index].y)
  }
  context.closePath()
  context.stroke()
  context.setLineDash([])

  context.beginPath()
  context.moveTo((layout.corners[0].x + layout.corners[1].x) / 2, (layout.corners[0].y + layout.corners[1].y) / 2)
  context.lineTo(layout.rotateHandle.x, layout.rotateHandle.y)
  context.stroke()

  context.fillStyle = '#2563eb'
  context.beginPath()
  context.arc(layout.scaleHandle.x, layout.scaleHandle.y, HANDLE_RADIUS, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#22c55e'
  context.beginPath()
  context.arc(layout.rotateHandle.x, layout.rotateHandle.y, HANDLE_RADIUS, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#f8fafc'
  context.beginPath()
  context.arc(layout.center.x, layout.center.y, 3, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawSelectionOverlay(context: CanvasRenderingContext2D, indices: readonly number[]) {
  context.save()
  context.fillStyle = 'rgba(250, 204, 21, 0.35)'

  for (const index of indices) {
    const x = index % CANVAS_WIDTH
    const y = Math.floor(index / CANVAS_WIDTH)
    context.fillRect(x, y, 1, 1)
  }

  context.restore()
}

function drawSelectionBounds(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.save()
  context.strokeStyle = '#facc15'
  context.lineWidth = 1
  context.setLineDash([3, 2])
  context.strokeRect(x + 0.5, y + 0.5, width, height)
  context.restore()
}

function drawFloatingSelection(
  context: CanvasRenderingContext2D,
  pixels: readonly string[],
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
) {
  const imageData = context.createImageData(width, height)

  for (let index = 0; index < pixels.length; index += 1) {
    const rgba = hexToRgba(pixels[index])
    const baseOffset = index * 4
    imageData.data[baseOffset] = rgba.red
    imageData.data[baseOffset + 1] = rgba.green
    imageData.data[baseOffset + 2] = rgba.blue
    imageData.data[baseOffset + 3] = rgba.alpha
  }

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempContext = tempCanvas.getContext('2d')

  if (!tempContext) {
    return
  }

  tempContext.putImageData(imageData, 0, 0)
  context.drawImage(tempCanvas, offsetX, offsetY)
  drawSelectionBounds(context, offsetX, offsetY, width, height)
}

function drawSymmetryGuide(context: CanvasRenderingContext2D, axis: SymmetryAxis) {
  context.save()
  context.strokeStyle = 'rgba(96, 165, 250, 0.8)'
  context.lineWidth = 1
  context.setLineDash([4, 3])
  context.beginPath()

  if (axis === 'left-right') {
    const centerX = CANVAS_WIDTH / 2
    context.moveTo(centerX, 0)
    context.lineTo(centerX, CANVAS_HEIGHT)
  } else {
    const centerY = CANVAS_HEIGHT / 2
    context.moveTo(0, centerY)
    context.lineTo(CANVAS_WIDTH, centerY)
  }

  context.stroke()
  context.restore()
}

export function CanvasViewport() {
  return <CanvasViewportInner showHeader />
}

type CanvasViewportInnerProps = {
  showHeader?: boolean
  compact?: boolean
}

export function CanvasViewportInner({ showHeader = true, compact = false }: CanvasViewportInnerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointerStateRef = useRef<PixelPoint | null>(null)
  const referenceInteractionRef = useRef<ReferenceInteraction | null>(null)
  const floatingSelectionInteractionRef = useRef<FloatingSelectionInteraction | null>(null)
  const referenceImageCacheRef = useRef<Record<string, HTMLImageElement>>({})
  const [, setImageVersion] = useState(0)

  const frames = useEditorStore((state) => state.animation.frames)
  const activeFrameIndex = useEditorStore((state) => state.activeFrameIndex)
  const activeFrame = useEditorStore((state) => state.animation.frames[state.activeFrameIndex])
  const selectedTool = useEditorStore((state) => state.selectedTool)
  const isPlaying = useEditorStore((state) => state.isPlaying)
  const onionSkinEnabled = useEditorStore((state) => state.onionSkinEnabled)
  const onionSkinOpacity = useEditorStore((state) => state.onionSkinOpacity)
  const onionSkinPlacement = useEditorStore((state) => state.onionSkinPlacement)
  const zoom = useEditorStore((state) => state.zoom)
  const drawOnActiveFrame = useEditorStore((state) => state.drawOnActiveFrame)
  const beginPixelChange = useEditorStore((state) => state.beginPixelChange)
  const endPixelChange = useEditorStore((state) => state.endPixelChange)
  const paintSelectOnActiveFrame = useEditorStore((state) => state.paintSelectOnActiveFrame)
  const selectedPixelIndices = useEditorStore((state) => state.selectedPixelIndices)
  const selectionFrameId = useEditorStore((state) => state.selectionFrameId)
  const floatingSelection = useEditorStore((state) => state.floatingSelection)
  const setFloatingSelectionPosition = useEditorStore((state) => state.setFloatingSelectionPosition)
  const symmetryEnabled = useEditorStore((state) => state.symmetryEnabled)
  const symmetryAxis = useEditorStore((state) => state.symmetryAxis)
  const referenceLayers = useEditorStore((state) => state.referenceLayers)
  const referenceAssets = useEditorStore((state) => state.referenceAssets)
  const referenceEditMode = useEditorStore((state) => state.referenceEditMode)
  const referenceOnionSkinEnabled = useEditorStore((state) => state.referenceOnionSkinEnabled)
  const referenceOnionSkinOpacity = useEditorStore((state) => state.referenceOnionSkinOpacity)
  const setReferenceTransform = useEditorStore((state) => state.setReferenceTransform)

  const canvasStyle = useMemo(
    () => ({
      width: `${CANVAS_WIDTH * zoom}px`,
      height: `${CANVAS_HEIGHT * zoom}px`,
    }),
    [zoom],
  )

  useEffect(() => {
    Object.values(referenceAssets).forEach((asset) => {
      if (referenceImageCacheRef.current[asset.id]) {
        return
      }

      const image = new Image()
      image.onload = () => {
        referenceImageCacheRef.current[asset.id] = image
        setImageVersion((currentValue) => currentValue + 1)
      }
      image.src = asset.dataUrl
    })
  }, [referenceAssets])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const shouldDrawOnionSkin = onionSkinEnabled && !isPlaying
    const previousFrame = frames[activeFrameIndex - 1]
    const nextFrame = frames[activeFrameIndex + 1]
    const activeReferenceLayer = referenceLayers[activeFrame.id] ?? createEmptyReferenceLayer()

    const drawReferenceFrame = (frame: AnimationFrame | undefined, alphaMultiplier: number, placement: 'below' | 'above') => {
      if (!frame || !referenceOnionSkinEnabled) {
        return
      }

      const layer = referenceLayers[frame.id]

      if (!layer?.assetId || !layer.visible || layer.layerPlacement !== placement) {
        return
      }

      const asset = referenceAssets[layer.assetId]
      const image = asset ? referenceImageCacheRef.current[asset.id] : null

      if (!asset || !image) {
        return
      }

      drawReferenceToContext(
        context,
        asset,
        image,
        layer,
        referenceOnionSkinOpacity * alphaMultiplier,
        REFERENCE_ONION_TINT,
      )
    }

    const drawActiveReference = (placement: 'below' | 'above') => {
      if (!activeReferenceLayer.assetId || !activeReferenceLayer.visible || activeReferenceLayer.layerPlacement !== placement) {
        return
      }

      const asset = referenceAssets[activeReferenceLayer.assetId]
      const image = asset ? referenceImageCacheRef.current[asset.id] : null

      if (!asset || !image) {
        return
      }

      drawReferenceToContext(context, asset, image, activeReferenceLayer)
    }

    drawReferenceFrame(previousFrame, 1, 'below')
    drawReferenceFrame(nextFrame, 0.85, 'below')
    drawActiveReference('below')

    if (shouldDrawOnionSkin && onionSkinPlacement === 'below') {
      if (previousFrame) {
        drawFrameToContext(context, previousFrame, onionSkinOpacity, PREVIOUS_FRAME_TINT)
      }

      if (nextFrame) {
        drawFrameToContext(context, nextFrame, onionSkinOpacity * 0.85, NEXT_FRAME_TINT)
      }
    }

    drawFrameToContext(context, activeFrame)

    drawReferenceFrame(previousFrame, 1, 'above')
    drawReferenceFrame(nextFrame, 0.85, 'above')
    drawActiveReference('above')

    if (shouldDrawOnionSkin && onionSkinPlacement === 'above') {
      if (previousFrame) {
        drawFrameToContext(context, previousFrame, onionSkinOpacity, PREVIOUS_FRAME_TINT)
      }

      if (nextFrame) {
        drawFrameToContext(context, nextFrame, onionSkinOpacity * 0.85, NEXT_FRAME_TINT)
      }
    }

    if (referenceEditMode && activeReferenceLayer.assetId && activeReferenceLayer.visible) {
      const asset = referenceAssets[activeReferenceLayer.assetId]
      if (asset) {
        drawReferenceHandles(context, asset, activeReferenceLayer)
      }
    }

    if (selectionFrameId === activeFrame.id && selectedPixelIndices.length > 0) {
      drawSelectionOverlay(context, selectedPixelIndices)
    }

    if (floatingSelection) {
      drawFloatingSelection(
        context,
        floatingSelection.pixels,
        floatingSelection.width,
        floatingSelection.height,
        floatingSelection.x,
        floatingSelection.y,
      )
    }

    if (symmetryEnabled && selectedTool !== 'select' && !referenceEditMode) {
      drawSymmetryGuide(context, symmetryAxis)
    }
  }, [
    activeFrame,
    activeFrameIndex,
    frames,
    isPlaying,
    onionSkinEnabled,
    onionSkinOpacity,
    onionSkinPlacement,
    referenceAssets,
    referenceEditMode,
    referenceLayers,
    referenceOnionSkinEnabled,
    referenceOnionSkinOpacity,
    selectedPixelIndices,
    selectionFrameId,
    floatingSelection,
    symmetryEnabled,
    symmetryAxis,
    selectedTool,
  ])

  function getPointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>): PixelPoint | null {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH)
    const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT)

    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
      return null
    }

    return { x, y }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const point = getPointFromEvent(event)

    if (!point) {
      return
    }

    const activeReferenceLayer = referenceLayers[activeFrame.id]
    const activeReferenceAsset = activeReferenceLayer?.assetId ? referenceAssets[activeReferenceLayer.assetId] : null

    if (
      referenceEditMode &&
      activeReferenceLayer?.assetId &&
      activeReferenceLayer.visible &&
      activeReferenceAsset
    ) {
      const layout = getReferenceHandleLayout(activeReferenceAsset, activeReferenceLayer.transform)

      if (hitTestHandle(point, layout.rotateHandle, HANDLE_RADIUS + 2)) {
        referenceInteractionRef.current = {
          kind: 'rotate',
          pointerId: event.pointerId,
          startPoint: point,
          initialTransform: { ...activeReferenceLayer.transform },
          initialAngle: getAngleDeg(layout.center, point),
        }
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }

      if (hitTestHandle(point, layout.scaleHandle, HANDLE_RADIUS + 2)) {
        referenceInteractionRef.current = {
          kind: 'scale',
          pointerId: event.pointerId,
          startPoint: point,
          initialTransform: { ...activeReferenceLayer.transform },
          initialDistance: Math.max(1, getDistance(layout.center, point)),
        }
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }

      if (hitTestReferenceImage(point, activeReferenceAsset, activeReferenceLayer.transform)) {
        referenceInteractionRef.current = {
          kind: 'move',
          pointerId: event.pointerId,
          startPoint: point,
          initialTransform: { ...activeReferenceLayer.transform },
        }
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }
    }

    if (referenceEditMode) {
      return
    }

    if (
      selectedTool === 'select' &&
      floatingSelection &&
      hitTestPixelRegion(floatingSelection, point, floatingSelection.x, floatingSelection.y)
    ) {
      floatingSelectionInteractionRef.current = {
        pointerId: event.pointerId,
        startPoint: point,
        initialX: floatingSelection.x,
        initialY: floatingSelection.y,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    if (selectedTool === 'select') {
      pointerStateRef.current = point
      event.currentTarget.setPointerCapture(event.pointerId)
      paintSelectOnActiveFrame(point)
      return
    }

    pointerStateRef.current = point
    event.currentTarget.setPointerCapture(event.pointerId)
    beginPixelChange()
    drawOnActiveFrame(point)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const referenceInteraction = referenceInteractionRef.current
    const floatingSelectionInteraction = floatingSelectionInteractionRef.current

    if (referenceInteraction && referenceInteraction.pointerId === event.pointerId) {
      const point = getPointFromEvent(event)

      if (!point) {
        return
      }

      if (referenceInteraction.kind === 'move') {
        setReferenceTransform({
          x: referenceInteraction.initialTransform.x + (point.x - referenceInteraction.startPoint.x),
          y: referenceInteraction.initialTransform.y + (point.y - referenceInteraction.startPoint.y),
        })
        return
      }

      if (referenceInteraction.kind === 'scale') {
        const center = {
          x: referenceInteraction.initialTransform.x,
          y: referenceInteraction.initialTransform.y,
        }
        const nextDistance = Math.max(1, getDistance(center, point))
        setReferenceTransform({
          scale:
            referenceInteraction.initialTransform.scale *
            (nextDistance / referenceInteraction.initialDistance),
        })
        return
      }

      const nextAngle = getAngleDeg(
        { x: referenceInteraction.initialTransform.x, y: referenceInteraction.initialTransform.y },
        point,
      )
      setReferenceTransform({
        rotationDeg:
          referenceInteraction.initialTransform.rotationDeg +
          (nextAngle - referenceInteraction.initialAngle),
      })
      return
    }

    if (floatingSelectionInteraction && floatingSelectionInteraction.pointerId === event.pointerId) {
      const point = getPointFromEvent(event)

      if (!point) {
        return
      }

      setFloatingSelectionPosition(
        floatingSelectionInteraction.initialX + (point.x - floatingSelectionInteraction.startPoint.x),
        floatingSelectionInteraction.initialY + (point.y - floatingSelectionInteraction.startPoint.y),
      )
      return
    }

    if (!pointerStateRef.current) {
      return
    }

    const point = getPointFromEvent(event)

    if (!point) {
      return
    }

    if (selectedTool === 'select') {
      paintSelectOnActiveFrame(pointerStateRef.current, point)
      pointerStateRef.current = point
      return
    }

    drawOnActiveFrame(pointerStateRef.current, point)
    pointerStateRef.current = point
  }

  function handlePointerEnd() {
    if (pointerStateRef.current && selectedTool !== 'select') {
      endPixelChange()
    }

    pointerStateRef.current = null
    referenceInteractionRef.current = null
    floatingSelectionInteractionRef.current = null
  }

  return (
    <section className={`canvas-panel ${compact ? 'canvas-panel--compact' : ''}`}>
      {showHeader ? (
        <header className="canvas-panel__header">
          <div>
            <h2>Canvas</h2>
            <p>Draw on a fixed 180x180 frame and switch into reference edit mode to move, scale, rotate, or mirror trace images per frame.</p>
          </div>
          <span className="canvas-panel__meta">{zoom}x zoom</span>
        </header>
      ) : null}

      <div className="canvas-panel__viewport">
        <canvas
          ref={canvasRef}
          className={`pixel-canvas ${referenceEditMode ? 'pixel-canvas--reference-edit' : ''} ${
            selectedTool === 'select' ? 'pixel-canvas--selection-edit' : ''
          }`}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={canvasStyle}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        />
      </div>
    </section>
  )
}
