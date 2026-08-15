import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import AuthLoadingScreen from './Components/Common/AuthLoadingScreen'
import { AuthProvider, ROLE_HOME_PATHS, fetchRoleProfile, useAuth } from './Context/AuthContext'
import { ConfirmProvider } from './Context/ConfirmContext'
import { ThemeProvider } from './Context/ThemeContext'
import AboutPage from './Pages/Common/AboutPage'
import ContactPage from './Pages/Common/ContactPage'
import CoursesPage from './Pages/Common/CoursesPage'
import LandingPage from './Pages/Common/LandingPage'
import LoginPage from './Pages/Common/LoginPage'
import NotFoundPage from './Pages/Common/NotFoundPage'
import RegisterPage from './Pages/Common/RegisterPage'
import UserHomePage from './Pages/User/UserHomePage'
import UserAttendancePage from './Pages/User/UserAttendancePage'
import UserCoursesPage from './Pages/User/UserCoursesPage'
import UserCoursePlayerPage from './Pages/User/UserCoursePlayerPage'
import UserIdePage from './Pages/User/UserIdePage'
import UserBug from './Pages/User/UserBug'
import UserProfilePage from './Pages/User/UserProfilePage'
import UserNameSetup from './Components/User/UserNameSetup'
import AdminHomePage from './Pages/Admin/AdminHomePage'
import AdminAllUsers from './Pages/Admin/AdminAllUsers'
import AdminAttendance from './Pages/Admin/AdminAttendance'
import AdminAllFaculties from './Pages/Admin/AdminAllFaculties'
import AdminCourses from './Pages/Admin/AdminCourses'
import Course from './Pages/Admin/Course'
import CourseAccessPage from './Pages/Admin/CourseAccessPage'
import AdminNotes from './Pages/Admin/AdminNotes'
import AdminTopicNotes from './Pages/Admin/AdminTopicNotes'
import AdminBugs from './Pages/Admin/AdminBugs'
import AdminReviews from './Pages/Admin/AdminReviews'
import AdminContents from './Pages/Admin/AdminContents'
import FacultyHomePage from './Pages/Faculty/FacultyHomePage'
import FacultyAttendance from './Pages/Faculty/FacultyAttendance'
import FacultyCoursesPage from './Pages/Faculty/FacultyCoursesPage'
import FacultyCoursePage from './Pages/Faculty/FacultyCoursePage'
import FacultyCourseNotes from './Pages/Faculty/FacultyCourseNotes'
import FacultyTopicNotes from './Pages/Faculty/FacultyTopicNotes'
import FacultyIdePage from './Pages/Faculty/FacultyIdePage'
import FacultyQueries from './Pages/Faculty/FacultyQueries'
import FacultyBug from './Pages/Faculty/FacultyBug'
import FacultyContents from './Pages/Faculty/FacultyContents'
import SharedIDE from './Components/IDE/SharedIDE'
import { SELF_REGISTRATION_ENABLED } from './utils/featureFlags'

const getLoginState = (location) => ({
  from: {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  },
})

const ProtectedRoute = ({ role, children }) => {
  const location = useLocation()
  const { clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  // Only the user profile reports a missing name; the walkthrough is owed by both the
  // user and the faculty profiles, and admins report neither.
  const [requiresName, setRequiresName] = useState(false)
  const [requiresTour, setRequiresTour] = useState(false)

  useEffect(() => {
    let isActive = true

    const verifyAccess = async () => {
      const profile = await fetchRoleProfile(role)

      if (!isActive) {
        return
      }

      if (profile) {
        setAuth({
          role,
          phone: profile.phone,
          token: null,
        })
        setRequiresName(Boolean(profile.requiresName))
        setRequiresTour(Boolean(profile.requiresTour))
        setIsAuthorized(true)
      } else {
        clearAuth()
        setIsAuthorized(false)
      }

      setCheckingAuth(false)
    }

    verifyAccess()

    return () => {
      isActive = false
    }
  }, [clearAuth, role, setAuth])

  if (checkingAuth) {
    return <AuthLoadingScreen />
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace state={getLoginState(location)} />
  }

  if (requiresName) {
    return <UserNameSetup onComplete={() => setRequiresName(false)} />
  }

  // The walkthrough is anchored to the navigation of the role that is signing in and
  // runs on its home page, so a first visit that came in on a saved link is sent to
  // that page — never to another role's, which would only bounce back to the login.
  const homePath = ROLE_HOME_PATHS[role]

  if (requiresTour && homePath && location.pathname !== homePath) {
    return <Navigate to={homePath} replace />
  }

  return children
}

const protect = (role, element) => (
  <ProtectedRoute role={role}>
    {element}
  </ProtectedRoute>
)

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ConfirmProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/register"
                element={SELF_REGISTRATION_ENABLED ? <RegisterPage /> : <Navigate to="/login" replace />}
              />
              <Route path="/shared-ide/:token" element={<SharedIDE />} />
              <Route path="/user/home" element={protect('user', <UserHomePage />)} />
              <Route path="/user/courses" element={protect('user', <UserCoursesPage />)} />
              <Route path="/user/courses/:courseId/player" element={protect('user', <UserCoursePlayerPage />)} />
              <Route path="/user/attendance" element={protect('user', <UserAttendancePage />)} />
              <Route path="/user/ide" element={protect('user', <UserIdePage />)} />
              <Route path="/user/bugs" element={protect('user', <UserBug />)} />
              <Route path="/user/profile" element={protect('user', <UserProfilePage />)} />
              <Route path="/faculty/home" element={protect('faculty', <FacultyHomePage />)} />
              <Route path="/faculty/courses" element={protect('faculty', <FacultyCoursesPage />)} />
              <Route path="/faculty/courses/:courseId" element={protect('faculty', <FacultyCoursePage />)} />
              <Route path="/faculty/ide" element={protect('faculty', <FacultyIdePage />)} />
              <Route path="/faculty/queries" element={protect('faculty', <FacultyQueries />)} />
              <Route path="/faculty/notes" element={protect('faculty', <FacultyTopicNotes />)} />
              <Route path="/faculty/notes/:courseId" element={protect('faculty', <FacultyCourseNotes />)} />
              <Route path="/faculty/topic-notes" element={protect('faculty', <FacultyTopicNotes />)} />
              <Route path="/faculty/bugs" element={protect('faculty', <FacultyBug />)} />
              <Route path="/faculty/contents" element={protect('faculty', <FacultyContents />)} />
              <Route path="/faculty/attendance" element={protect('faculty', <FacultyAttendance />)} />
              <Route path="/admin/home" element={protect('admin', <AdminHomePage />)} />
              <Route path="/admin/users" element={protect('admin', <AdminAllUsers />)} />
              <Route path="/admin/faculties" element={protect('admin', <AdminAllFaculties />)} />
              <Route path="/admin/attendance" element={protect('admin', <AdminAttendance />)} />
              <Route path="/admin/courses" element={protect('admin', <AdminCourses />)} />
              <Route path="/admin/topic-notes" element={protect('admin', <AdminTopicNotes />)} />
              <Route path="/admin/bugs" element={protect('admin', <AdminBugs />)} />
              <Route path="/admin/reviews" element={protect('admin', <AdminReviews />)} />
              <Route path="/admin/contents" element={protect('admin', <AdminContents />)} />
              <Route path="/admin/courses/:courseId/access" element={protect('admin', <CourseAccessPage />)} />
              <Route path="/admin/courses/:courseId/notes" element={protect('admin', <AdminNotes />)} />
              <Route path="/admin/courses/:courseId" element={protect('admin', <Course />)} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </ConfirmProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
