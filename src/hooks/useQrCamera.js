import { useCallback, useRef, useState } from 'react'
import jsQR from 'jsqr'

/**
 * Continuously scans the live camera feed for QR codes.
 *
 * Important: detecting one QR must NOT end the scan loop. The camera stays open
 * and keeps looking for the next card, while a short per-token cooldown prevents
 * the same card from being submitted dozens of times while it remains in frame.
 */
export function useQrCamera(onDetect) {
  const videoRef = useRef(null)
  const canvasRef = useRef(document.createElement('canvas'))
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const lastFrameAtRef = useRef(0)
  const lastSeenRef = useRef(new Map())
  const [cameraOn, setCameraOn] = useState(false)
  const [error, setError] = useState('')

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    lastSeenRef.current.clear()
    setCameraOn(false)
  }, [])

  const tick = useCallback((timestamp = performance.now()) => {
    const video = videoRef.current
    const canvas = canvasRef.current

    // Keep the camera loop alive even while the video is warming up.
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    // jsQR is relatively expensive. Around 8 scans/sec is plenty for a person
    // moving ID cards through the camera and keeps mobile devices responsive.
    if (timestamp - lastFrameAtRef.current < 120) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    lastFrameAtRef.current = timestamp

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (code?.data) {
      const token = code.data
      const lastSeen = lastSeenRef.current.get(token) || 0

      // A card can stay in frame for several seconds. Only submit it again
      // after the cooldown, while allowing different cards immediately.
      if (timestamp - lastSeen >= 1500) {
        lastSeenRef.current.set(token, timestamp)
        onDetect(token)

        // Keep memory bounded during a long attendance session.
        if (lastSeenRef.current.size > 200) {
          for (const [key, seenAt] of lastSeenRef.current) {
            if (timestamp - seenAt > 10000) lastSeenRef.current.delete(key)
          }
        }
      }
    }

    // Never stop after a successful scan. The next QR can be presented while
    // this same camera session remains active.
    rafRef.current = requestAnimationFrame(tick)
  }, [onDetect])

  const start = useCallback(async () => {
    setError('')
    try {
      // If start is tapped again, clean up the previous stream first.
      if (streamRef.current) stop()

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      lastFrameAtRef.current = 0
      lastSeenRef.current.clear()

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameraOn(true)
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      setError('Camera access was denied or unavailable. Check browser permissions, or use manual entry below.')
    }
  }, [stop, tick])

  return { videoRef, cameraOn, error, start, stop }
}
