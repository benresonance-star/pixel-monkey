import { describe, expect, it } from 'vitest'

import { getAnimationNameFromFileName } from './importAnimation'

describe('import animation naming', () => {
  it('uses the file name without the animation json suffix', () => {
    expect(getAnimationNameFromFileName('jumping-jack.animation.json')).toBe('jumping-jack')
  })

  it('uses the file name without the json suffix', () => {
    expect(getAnimationNameFromFileName('kettlebell-swing.json')).toBe('kettlebell-swing')
  })

  it('falls back to the default animation name when the file base is empty', () => {
    expect(getAnimationNameFromFileName('.json')).toBe('untitled-animation')
  })
})
