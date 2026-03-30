type RgbColor = {
  red: number
  green: number
  blue: number
}

const LIGHT_GRID_COLOR = '#f8fafc'
const DARK_GRID_COLOR = '#0f172a'
const GRID_COLOR_ALPHA = 0.22

function hexToRgb(color: string): RgbColor {
  return {
    red: Number.parseInt(color.slice(1, 3), 16),
    green: Number.parseInt(color.slice(3, 5), 16),
    blue: Number.parseInt(color.slice(5, 7), 16),
  }
}

function getRelativeLuminanceChannel(channel: number) {
  const normalized = channel / 255

  if (normalized <= 0.04045) {
    return normalized / 12.92
  }

  return ((normalized + 0.055) / 1.055) ** 2.4
}

export function getAutomaticCanvasGridColor(backgroundColor: string) {
  const { red, green, blue } = hexToRgb(backgroundColor)
  const luminance =
    0.2126 * getRelativeLuminanceChannel(red) +
    0.7152 * getRelativeLuminanceChannel(green) +
    0.0722 * getRelativeLuminanceChannel(blue)

  if (luminance < 0.45) {
    return LIGHT_GRID_COLOR
  }

  return DARK_GRID_COLOR
}

export function getResolvedCanvasGridColor(
  backgroundColor: string,
  gridColorOverride: string | null,
) {
  return gridColorOverride ?? getAutomaticCanvasGridColor(backgroundColor)
}

export function toRgbaString(color: string, alpha = GRID_COLOR_ALPHA) {
  const { red, green, blue } = hexToRgb(color)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
