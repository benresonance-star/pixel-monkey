import { describe, expect, it } from 'vitest'

import { getFrameDurationMs, getNextFrameIndex, getPreviousFrameIndex } from './playback'

describe('playback helpers', () => {
  it('returns frame duration from fps', () => {
    expect(getFrameDurationMs(8)).toBe(125)
  })

  it('wraps around when moving to the next frame', () => {
    expect(getNextFrameIndex(2, 3)).toBe(0)
  })

  it('wraps around when moving to the previous frame', () => {
    expect(getPreviousFrameIndex(0, 3)).toBe(2)
  })
})
