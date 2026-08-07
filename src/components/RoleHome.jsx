import { lazy, Suspense } from 'react'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

const Dashboard = lazy(() => import('../pages/Dashboard'))
const TeacherDashboard = lazy(() => import('../pages/TeacherDashboard'))
const StudentDashboard = lazy(() => import('../pages/StudentDashboard'))

export default function RoleHome() {
  const { role } = useAuth()
  const Page = role === 'teacher' ? TeacherDashboard : role === 'student' ? StudentDashboard : Dashboard
  return <Suspense fallback={<LoadingSpinner />}><Page /></Suspense>
}
