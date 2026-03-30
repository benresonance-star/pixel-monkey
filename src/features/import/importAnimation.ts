import {
  parseImportedAnimation,
  sanitizeAnimationName,
  type AnimationDocument,
} from '../export/animationSchema'

export function getAnimationNameFromFileName(fileName: string): string {
  const trimmed = fileName.trim()
  const withoutJsonExtension = trimmed.replace(/(\.animation)?\.json$/i, '')

  return sanitizeAnimationName(withoutJsonExtension)
}

export async function importAnimationFile(file: File): Promise<AnimationDocument> {
  const text = await file.text()
  const animation = parseImportedAnimation(text)

  return {
    ...animation,
    name: getAnimationNameFromFileName(file.name),
  }
}
