import { Navigate, Outlet } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'

export const ROLE_HOME = {
  super_admin: '/dashboard/admin',
  admin: '/dashboard/admin',
  principal: '/dashboard/admin',
  teacher: '/dashboard/teacher',
  student: '/dashboard/student',
}

export default function RoleProtectedRoute({ roles = [] }) {
  const { loading, isAuthenticated, role } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!roles.includes(role)) return <Navigate to="/403" replace />

  return <Outlet />
}
