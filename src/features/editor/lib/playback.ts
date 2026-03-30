import { clampFps } from '../../export/animationSchema'

export function getFrameDurationMs(fps: number): number {
  return 1000 / clampFps(fps)
}

export function getNextFrameIndex(currentIndex: number, frameCount: number): number {
  if (frameCount <= 0) {
    return 0
  }

  return (currentIndex + 1) % frameCount
}

export function getPreviousFrameIndex(currentIndex: number, frameCount: number): number {
  if (frameCount <= 0) {
    return 0
  }

  return (currentIndex - 1 + frameCount) % frameCount
}
