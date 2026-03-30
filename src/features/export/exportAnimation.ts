import { serializeAnimation, type AnimationDocument } from './animationSchema'

function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'animation'
}

export function downloadAnimationJson(animation: AnimationDocument) {
  const blob = new Blob([serializeAnimation(animation)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = `${slugifyName(animation.name)}.animation.json`
  anchor.click()

  URL.revokeObjectURL(url)
}
