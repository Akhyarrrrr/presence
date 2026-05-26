import * as faceapi from 'face-api.js'

let modelsLoaded = false
let loadingPromise: Promise<void> | null = null

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const modelUrl = '/models'

    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
    ])

    modelsLoaded = true
  })()

  return loadingPromise
}

export async function getFaceDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) return null
  return detection.descriptor
}

export async function getAllFaceDetections(input: HTMLVideoElement | HTMLCanvasElement) {
  return faceapi
    .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors()
}

export function matchFace(
  queryDescriptor: Float32Array,
  members: Array<{ id: string; name: string; face_descriptor: number[] }>,
  threshold = 0.55
): { memberId: string; memberName: string; distance: number; confidence: number } | null {
  if (members.length === 0) return null

  let bestMatch: { memberId: string; memberName: string; distance: number } | null = null

  for (const member of members) {
    const memberDescriptor = new Float32Array(member.face_descriptor)
    const distance = faceapi.euclideanDistance(
      Array.from(queryDescriptor),
      Array.from(memberDescriptor)
    )

    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = { memberId: member.id, memberName: member.name, distance }
    }
  }

  if (!bestMatch || bestMatch.distance > threshold) return null

  const confidence = Math.max(0, Math.round((1 - bestMatch.distance / threshold) * 100)) / 100
  return { ...bestMatch, confidence }
}

type FaceDetectionWithDescriptor = faceapi.WithFaceDescriptor<
  faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>
>

export function drawDetections(
  canvas: HTMLCanvasElement,
  detections: FaceDetectionWithDescriptor[],
  displaySize: { width: number; height: number },
  matches: Array<{
    detection: faceapi.FaceDetection
    label: string
    confidence: number
    matched: boolean
  }>
) {
  faceapi.matchDimensions(canvas, displaySize)
  const resized = faceapi.resizeResults(detections, displaySize)
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = '13px "Geist", system-ui, sans-serif'

  resized.forEach((detection, i) => {
    const box = detection.detection.box
    const match = matches[i]
    const color = match?.matched ? '#10b981' : '#6366f1'
    const label = match ? `${match.label} (${Math.round(match.confidence * 100)}%)` : 'Unknown'

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.strokeRect(box.x, box.y, box.width, box.height)

    const cornerSize = 12
    ctx.lineWidth = 3

    ctx.beginPath()
    ctx.moveTo(box.x, box.y + cornerSize)
    ctx.lineTo(box.x, box.y)
    ctx.lineTo(box.x + cornerSize, box.y)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(box.x + box.width - cornerSize, box.y)
    ctx.lineTo(box.x + box.width, box.y)
    ctx.lineTo(box.x + box.width, box.y + cornerSize)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(box.x, box.y + box.height - cornerSize)
    ctx.lineTo(box.x, box.y + box.height)
    ctx.lineTo(box.x + cornerSize, box.y + box.height)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(box.x + box.width - cornerSize, box.y + box.height)
    ctx.lineTo(box.x + box.width, box.y + box.height)
    ctx.lineTo(box.x + box.width, box.y + box.height - cornerSize)
    ctx.stroke()

    ctx.fillStyle = color
    const labelWidth = ctx.measureText(label).width + 16
    const labelY = Math.max(0, box.y - 26)
    ctx.fillRect(box.x, labelY, labelWidth, 24)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, box.x + 8, labelY + 17)
  })
}
