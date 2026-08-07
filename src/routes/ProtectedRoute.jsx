import { Navigate, Outlet, useLocation } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { loading, isAuthenticated, session } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />

  const mustChangePassword = session?.user?.user_metadata?.must_change_password === true
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace state={{ from: location }} />
  }

  return <Outlet />
}
