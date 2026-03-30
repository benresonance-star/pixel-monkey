import { parseProjectSnapshot, type ProjectSnapshot } from './projectSnapshot'

export async function importProjectSnapshotFile(file: File): Promise<ProjectSnapshot> {
  const text = await file.text()
  return parseProjectSnapshot(text)
}

