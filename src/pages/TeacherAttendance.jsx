import { useState } from 'react'
import { CheckCircle2, MapPin } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { useQrCamera } from '../hooks/useQrCamera'
import { verifyAndMarkAttendance } from '../services/identity'
import { SCHOOL_LOCATION, distanceMeters, getCurrentPosition } from '../services/geofence'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function TeacherAttendance() {
  const [result, setResult] = useState(null)
  const [checkingLocation, setCheckingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const { profile } = useAuth()
  const notify = useToast()

  async function handleCode(token) {
    try {
      const outcome = await verifyAndMarkAttendance(token, profile?.id)
      setResult(outcome)
      notify(outcome.result === 'marked_present' ? 'Attendance marked!' : outcome.result === 'already_marked' ? 'Already marked today.' : 'QR not recognized.')
      stop()
    } catch (e) { notify(e.message) }
  }

  const { videoRef, cameraOn, error, start, stop } = useQrCamera(handleCode)

  // Prevents marking attendance from home: a teacher must be physically within the school's
  // radius (checked via device GPS) before the camera is even allowed to open.
  async function startWithLocationCheck() {
    setLocationError('')
    setCheckingLocation(true)
    try {
      const coords = await getCurrentPosition()
      const distance = distanceMeters(coords.latitude, coords.longitude, SCHOOL_LOCATION.latitude, SCHOOL_LOCATION.longitude)
      if (distance > SCHOOL_LOCATION.radiusMeters) {
        setLocationError(`You appear to be ${Math.round(distance)}m from school — attendance can only be marked on campus.`)
        return
      }
      await start()
    } catch (e) {
      setLocationError(e.message)
    } finally {
      setCheckingLocation(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="MY ATTENDANCE" title="Mark my attendance" subtitle="Scan your own identity card's QR code to check in. Requires you to be on campus." />
      <section className="card mx-auto max-w-md text-center">
        <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl bg-slate-900">
          <video ref={videoRef} className={`h-full w-full object-cover ${cameraOn ? '' : 'hidden'}`} muted playsInline />
          {!cameraOn && <CheckCircle2 className="text-slate-500" size={48} />}
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        {locationError && <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-rose-600"><MapPin size={14} /> {locationError}</p>}

        {result ? (
          <div className="mt-5 flex items-center justify-center gap-2 text-emerald-600">
            <CheckCircle2 /><span className="font-semibold">{result.result === 'marked_present' ? 'Marked present for today' : result.result === 'already_marked' ? 'Already marked today' : 'Code not recognized'}</span>
          </div>
        ) : (
          <button onClick={cameraOn ? stop : startWithLocationCheck} disabled={checkingLocation} className="btn-primary mt-5 w-full justify-center disabled:opacity-60">
            {checkingLocation ? 'Checking location…' : cameraOn ? 'Stop camera' : 'Start camera & scan my card'}
          </button>
        )}
      </section>
    </>
  )
}
