import { useCallback, useRef, useState } from 'react'
import jsQR from 'jsqr'

/** Continuously scans the live camera feed for a QR code using jsQR (pure JS decoder,
 *  works in every browser — unlike the native BarcodeDetector API which many browsers,
 *  especially desktop Chrome on Windows, don't support). */
export function useQrCamera(onDetect) {
  const videoRef = useRef(null)
  const canvasRef = useRef(document.createElement('canvas'))
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [error, setError] = useState('')

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) { rafRef.current = requestAnimationFrame(tick); return }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    if (code?.data) { onDetect(code.data); return }
    rafRef.current = requestAnimationFrame(tick)
  }, [onDetect])

  const start = useCallback(async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      // videoRef.current is guaranteed to exist because callers now keep <video> permanently
      // mounted (hidden via CSS when off) — assigning srcObject before the element exists was
      // the root cause of the camera appearing to "turn on" but showing a black screen.
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      setError('Camera access was denied or unavailable. Check browser permissions, or use manual entry below.')
    }
  }, [tick])

  return { videoRef, cameraOn, error, start, stop }
}
