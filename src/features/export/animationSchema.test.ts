import { describe, expect, it } from 'vitest'

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  TOTAL_PIXELS,
  createDefaultAnimation,
  parseImportedAnimation,
  serializeAnimation,
} from './animationSchema'

describe('animation schema', () => {
  it('round-trips a valid animation document', () => {
    const animation = createDefaultAnimation()
    const parsed = parseImportedAnimation(serializeAnimation(animation))

    expect(parsed.width).toBe(CANVAS_WIDTH)
    expect(parsed.height).toBe(CANVAS_HEIGHT)
    expect(parsed.frames).toHaveLength(1)
    expect(parsed.frames[0].pixels).toHaveLength(TOTAL_PIXELS)
  })

  it('rejects frames with the wrong pixel count', () => {
    const animation = createDefaultAnimation()
    const invalid = {
      ...animation,
      frames: [
        {
          id: 'broken-frame',
          pixels: animation.frames[0].pixels.slice(0, TOTAL_PIXELS - 4),
        },
      ],
    }

    expect(() => parseImportedAnimation(invalid)).toThrowError()
  })
})
