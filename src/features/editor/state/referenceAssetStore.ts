import type { ReferenceAssetRecord } from './referenceLayer'

const DATABASE_NAME = 'pixel-editor-reference-assets'
const DATABASE_VERSION = 1
const STORE_NAME = 'reference-assets'

type ReferenceAssetRow = ReferenceAssetRecord

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser.'))
      return
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open reference image database.'))
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode)
        const store = transaction.objectStore(STORE_NAME)
        const request = operation(store)

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('IndexedDB transaction failed.'))
        transaction.oncomplete = () => database.close()
        transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'))
      }),
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })
}

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error('Failed to read image dimensions.'))
    image.src = dataUrl
  })
}

export async function createReferenceAssetFromFile(file: File): Promise<ReferenceAssetRecord> {
  const dataUrl = await readFileAsDataUrl(file)
  const { width, height } = await loadImageDimensions(dataUrl)

  return {
    id: crypto.randomUUID(),
    name: file.name,
    width,
    height,
    dataUrl,
  }
}

export async function saveReferenceAsset(asset: ReferenceAssetRecord) {
  await runTransaction('readwrite', (store) => store.put(asset as ReferenceAssetRow))
}

export async function loadReferenceAsset(assetId: string): Promise<ReferenceAssetRecord | null> {
  const asset = await runTransaction<ReferenceAssetRow | undefined>('readonly', (store) => store.get(assetId))
  return asset ?? null
}

export async function loadReferenceAssets(assetIds: string[]): Promise<ReferenceAssetRecord[]> {
  const uniqueAssetIds = Array.from(new Set(assetIds.filter(Boolean)))
  const assets = await Promise.all(uniqueAssetIds.map((assetId) => loadReferenceAsset(assetId)))
  return assets.filter((asset): asset is ReferenceAssetRecord => asset !== null)
}

export async function deleteReferenceAsset(assetId: string) {
  await runTransaction('readwrite', (store) => store.delete(assetId))
}

