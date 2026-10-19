export interface FaceDetectionResult {
  isHumanFace: boolean
  confidence: number
  method: 'native' | 'heuristic'
}

const MIN_SKIN_RATIO = 0.08
const MAX_SKIN_RATIO = 0.85
const MIN_CENTER_CONCENTRATION = 0.35
const SAMPLE_STEP = 8

function isNativeFaceDetectorAvailable(): boolean {
  return typeof window !== 'undefined' && 'FaceDetector' in window
}

async function detectWithNativeAPI(image: ImageBitmap | HTMLCanvasElement): Promise<FaceDetectionResult | null> {
  try {
    const detector = new (window as unknown as { FaceDetector: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => { detect(input: ImageBitmap | HTMLCanvasElement): Promise<Array<{ boundingBox: DOMRect }>> } }).FaceDetector({
      fastMode: false,
      maxDetectedFaces: 1,
    })
    const faces = await detector.detect(image)
    if (faces.length > 0) {
      const box = faces[0].boundingBox
      const imgWidth = image.width
      const imgHeight = image.height
      const faceAreaRatio = (box.width * box.height) / (imgWidth * imgHeight)
      return {
        isHumanFace: faceAreaRatio > 0.02,
        confidence: Math.min(faceAreaRatio * 10, 1),
        method: 'native',
      }
    }
    return { isHumanFace: false, confidence: 0, method: 'native' }
  } catch {
    return null
  }
}

function isSkinTone(r: number, g: number, b: number): boolean {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b

  const inYCbCrRange = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173
  const inRGBRange = r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15

  return inYCbCrRange && inRGBRange
}

function detectWithHeuristic(canvas: HTMLCanvasElement): FaceDetectionResult {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return { isHumanFace: false, confidence: 0, method: 'heuristic' }
  }

  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  let totalSamples = 0
  let skinSamples = 0
  let centerSkinSamples = 0
  let totalCenterSamples = 0

  const centerXMin = width * 0.2
  const centerXMax = width * 0.8
  const centerYMin = height * 0.15
  const centerYMax = height * 0.9

  const skinClusters = new Set<string>()

  for (let y = 0; y < height; y += SAMPLE_STEP) {
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      totalSamples++

      const isInCenter = x >= centerXMin && x <= centerXMax && y >= centerYMin && y <= centerYMax
      if (isInCenter) {
        totalCenterSamples++
      }

      if (isSkinTone(r, g, b)) {
        skinSamples++
        if (isInCenter) {
          centerSkinSamples++
        }
        const clusterKey = `${Math.floor(r / 32)}-${Math.floor(g / 32)}-${Math.floor(b / 32)}`
        skinClusters.add(clusterKey)
      }
    }
  }

  if (totalSamples === 0) {
    return { isHumanFace: false, confidence: 0, method: 'heuristic' }
  }

  const skinRatio = skinSamples / totalSamples
  const centerRatio = totalCenterSamples > 0 ? centerSkinSamples / totalCenterSamples : 0
  const concentration = skinSamples > 0 ? centerSkinSamples / skinSamples : 0

  const hasEnoughSkin = skinRatio >= MIN_SKIN_RATIO && skinRatio <= MAX_SKIN_RATIO
  const isCenterConcentrated = concentration >= MIN_CENTER_CONCENTRATION && centerRatio >= 0.15
  const hasToneVariation = skinClusters.size >= 2

  const confidence =
    Math.min(skinRatio / MIN_SKIN_RATIO, 1) * 0.4 +
    Math.min(concentration / MIN_CENTER_CONCENTRATION, 1) * 0.4 +
    Math.min(skinClusters.size / 3, 1) * 0.2

  return {
    isHumanFace: hasEnoughSkin && isCenterConcentrated && hasToneVariation,
    confidence: Math.min(confidence, 1),
    method: 'heuristic',
  }
}

function createCanvasFromImage(img: HTMLImageElement | ImageBitmap): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const maxDim = 640
  const naturalWidth = img instanceof HTMLImageElement ? img.naturalWidth : img.width
  const naturalHeight = img instanceof HTMLImageElement ? img.naturalHeight : img.height
  const scale = Math.min(1, maxDim / Math.max(naturalWidth, naturalHeight))
  const w = Math.round(naturalWidth * scale)
  const h = Math.round(naturalHeight * scale)

  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(img, 0, 0, w, h)
  }
  return canvas
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

export async function validateHumanFace(imageSource: File | string): Promise<FaceDetectionResult> {
  let img: HTMLImageElement

  if (typeof imageSource === 'string') {
    img = await loadImageFromDataUrl(imageSource)
  } else {
    img = await loadImageFromFile(imageSource)
  }

  const canvas = createCanvasFromImage(img)

  if (isNativeFaceDetectorAvailable()) {
    const nativeResult = await detectWithNativeAPI(canvas)
    if (nativeResult !== null) {
      return nativeResult
    }
  }

  return detectWithHeuristic(canvas)
}
