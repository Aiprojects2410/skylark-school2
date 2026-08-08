import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import LoadingSpinner from './components/LoadingSpinner'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleProtectedRoute from './routes/RoleProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import RoleHome from './components/RoleHome'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Unauthorized401 from './pages/errors/Unauthorized401'
import Forbidden403 from './pages/errors/Forbidden403'
import NotFound404 from './pages/errors/NotFound404'
import ServerError500 from './pages/errors/ServerError500'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const SuperAdminDeveloperPortal = lazy(() => import('./pages/SuperAdminDeveloperPortal'))
const Students = lazy(() => import('./pages/Students'))
const Teachers = lazy(() => import('./pages/Teachers'))
const Classes = lazy(() => import('./pages/Classes'))
const Attendance = lazy(() => import('./pages/Attendance'))
const IdentityCards = lazy(() => import('./pages/IdentityCards'))
const Scanner = lazy(() => import('./pages/Scanner'))
const Fees = lazy(() => import('./pages/Fees'))
const Notices = lazy(() => import('./pages/Notices'))
const Leave = lazy(() => import('./pages/Leave'))
const Reports = lazy(() => import('./pages/Reports'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const SupportTickets = lazy(() => import('./pages/SupportTickets'))
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'))
const TeacherAttendanceAdmin = lazy(() => import('./pages/TeacherAttendanceAdmin'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const Homework = lazy(() => import('./pages/Homework'))
const Timetable = lazy(() => import('./pages/Timetable'))
const SecurityCenter = lazy(() => import('./pages/SecurityCenter'))
const GlobalSearch = lazy(() => import('./pages/GlobalSearch'))

const STAFF = ['super_admin', 'admin', 'principal']
const TEACHING_STAFF = [...STAFF, 'teacher']
const ALL_PORTAL_USERS = [...TEACHING_STAFF, 'student', 'parent']

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePassword forced />} />
        </Route>
        <Route path="/401" element={<Unauthorized401 />} />
        <Route path="/403" element={<Forbidden403 />} />
        <Route path="/500" element={<ServerError500 />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleProtectedRoute roles={ALL_PORTAL_USERS} />}>
            <Route path="security" element={<SecurityCenter />} />
            <Route path="global-search" element={<GlobalSearch />} />
          </Route>
          <Route element={<RoleProtectedRoute roles={TEACHING_STAFF} />}>
            <Route path="scanner" element={<Scanner />} />
          </Route>
          <Route element={<DashboardLayout />}>
            <Route index element={<RoleHome />} />
            <Route path="dashboard/super-admin" element={<Dashboard />} />
            <Route path="dashboard/admin" element={<Dashboard />} />
            <Route path="dashboard/teacher" element={<TeacherDashboard />} />
            <Route path="dashboard/student" element={<StudentDashboard />} />

            <Route element={<RoleProtectedRoute roles={['super_admin']} />}>
              <Route path="super-admin/developer" element={<SuperAdminDeveloperPortal />} />
            </Route>
            <Route element={<RoleProtectedRoute roles={STAFF} />}>
              <Route path="students" element={<Students />} />
              <Route path="classes" element={<Classes />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="identity-cards" element={<IdentityCards />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="support-tickets" element={<SupportTickets />} />
            </Route>
            <Route element={<RoleProtectedRoute roles={TEACHING_STAFF} />}>
              <Route path="attendance" element={<Attendance />} />
              <Route path="teacher-attendance" element={<TeacherAttendanceAdmin />} />
            </Route>
            <Route path="homework" element={<Homework />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="fees" element={<Fees />} />
            <Route path="notices" element={<Notices />} />
            <Route path="leave" element={<Leave />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound404 />} />
      </Routes>
    </Suspense>
  )
}
