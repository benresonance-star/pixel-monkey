import type { ReferenceAssetRecord, ReferenceTransform } from '../state/referenceLayer'

type Point = {
  x: number
  y: number
}

export type ReferenceHandleKind = 'move' | 'scale' | 'rotate'

export type ReferenceHandleLayout = {
  center: Point
  scaleHandle: Point
  rotateHandle: Point
  corners: Point[]
}

function toRadians(rotationDeg: number) {
  return (rotationDeg * Math.PI) / 180
}

function rotatePoint(point: Point, angle: number): Point {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)

  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  }
}

function getHalfDimensions(asset: ReferenceAssetRecord, transform: ReferenceTransform) {
  return {
    halfWidth: (asset.width * transform.scale) / 2,
    halfHeight: (asset.height * transform.scale) / 2,
  }
}

export function getReferenceCornerPoints(
  asset: ReferenceAssetRecord,
  transform: ReferenceTransform,
): Point[] {
  const angle = toRadians(transform.rotationDeg)
  const mirrorX = transform.mirrorX ? -1 : 1
  const mirrorY = transform.mirrorY ? -1 : 1
  const { halfWidth, halfHeight } = getHalfDimensions(asset, transform)

  const localCorners: Point[] = [
    { x: -halfWidth * mirrorX, y: -halfHeight * mirrorY },
    { x: halfWidth * mirrorX, y: -halfHeight * mirrorY },
    { x: halfWidth * mirrorX, y: halfHeight * mirrorY },
    { x: -halfWidth * mirrorX, y: halfHeight * mirrorY },
  ]

  return localCorners.map((corner) => {
    const rotated = rotatePoint(corner, angle)

    return {
      x: transform.x + rotated.x,
      y: transform.y + rotated.y,
    }
  })
}

export function getReferenceHandleLayout(
  asset: ReferenceAssetRecord,
  transform: ReferenceTransform,
): ReferenceHandleLayout {
  const corners = getReferenceCornerPoints(asset, transform)
  const angle = toRadians(transform.rotationDeg)
  const topMidpoint = {
    x: (corners[0].x + corners[1].x) / 2,
    y: (corners[0].y + corners[1].y) / 2,
  }
  const rotateOffset = rotatePoint({ x: 0, y: -22 }, angle)

  return {
    center: { x: transform.x, y: transform.y },
    scaleHandle: corners[2],
    rotateHandle: {
      x: topMidpoint.x + rotateOffset.x,
      y: topMidpoint.y + rotateOffset.y,
    },
    corners,
  }
}

export function getDistance(from: Point, to: Point) {
  return Math.hypot(to.x - from.x, to.y - from.y)
}

export function getAngleDeg(from: Point, to: Point) {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
}

export function hitTestReferenceImage(
  point: Point,
  asset: ReferenceAssetRecord,
  transform: ReferenceTransform,
): boolean {
  const angle = -toRadians(transform.rotationDeg)
  const translated = {
    x: point.x - transform.x,
    y: point.y - transform.y,
  }
  const unrotated = rotatePoint(translated, angle)
  const localX = unrotated.x / (transform.mirrorX ? -1 : 1)
  const localY = unrotated.y / (transform.mirrorY ? -1 : 1)
  const halfWidth = (asset.width * transform.scale) / 2
  const halfHeight = (asset.height * transform.scale) / 2

  return (
    localX >= -halfWidth &&
    localX <= halfWidth &&
    localY >= -halfHeight &&
    localY <= halfHeight
  )
}

export function hitTestHandle(point: Point, handlePoint: Point, radius: number) {
  return getDistance(point, handlePoint) <= radius
}

