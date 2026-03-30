# Workout Animation Import Contract

The standalone pixel editor exports animation JSON that a future workout app importer can validate and play frame-by-frame.

## Required JSON Shape

```json
{
  "version": 1,
  "name": "jumping-jack-loop",
  "width": 180,
  "height": 180,
  "fps": 8,
  "frames": [
    {
      "id": "frame-1",
      "pixels": ["#00000000", "#00000000", "#22c55eff"]
    }
  ]
}
```

## Validation Rules

- `version` must be `1`
- `width` must be `180`
- `height` must be `180`
- `fps` must be an integer from `1` to `24`
- `frames` must contain `1` to `24` entries
- each frame must contain exactly `32400` RGBA colors
- colors must use `#RRGGBBAA`

## Playback Contract

- playback loops in frame order
- frame duration is `1000 / fps`
- transparent pixels are represented by `#00000000`
- the importer should reject invalid JSON before saving any asset

## Recommended Workout App Surface

- `parseImportedAnimation(raw: string): AnimationDocument`
- `validateAnimation(document: unknown): AnimationDocument`
- `AnimationPlayer` component that advances frames on a timer
- asset import UI for local JSON files
