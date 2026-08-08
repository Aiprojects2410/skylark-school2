import { useCallback, useRef, useState } from 'react'
import jsQR from 'jsqr'

/**
 * Continuously scans the live camera feed for QR codes.
 *
 * A QR token is accepted at most once per calendar day in this scanner
 * session. This prevents a card that remains in front of the camera from
 * generating repeated attendance requests/log entries every few seconds.
 * The database also enforces one attendance record per person per day.
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

  const todayKey = () => new Date().toISOString().slice(0, 10)

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    // Keep today's seen-token map so stopping/restarting the camera cannot
    // cause the same card to be submitted repeatedly on the same day.
    setCameraOn(false)
  }, [])

  const tick = useCallback((timestamp = performance.now()) => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }

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
      const key = `${todayKey()}:${token}`

      // Once a QR has been accepted today, never submit it again while this
      // scanner component is mounted, even if the camera is restarted.
      if (!lastSeenRef.current.has(key)) {
        lastSeenRef.current.set(key, timestamp)
        onDetect(token)
      }

      // Keep memory bounded during a long session. Tokens from previous days
      // are no longer relevant and can safely be discarded.
      if (lastSeenRef.current.size > 500) {
        const today = todayKey()
        for (const key of lastSeenRef.current.keys()) {
          if (!key.startsWith(`${today}:`)) lastSeenRef.current.delete(key)
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [onDetect])

  const start = useCallback(async () => {
    setError('')
    try {
      if (streamRef.current) stop()

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      lastFrameAtRef.current = 0

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
