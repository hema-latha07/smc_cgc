import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import StudentLogin from './pages/StudentLogin';
import AdminLogin from './pages/AdminLogin';
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';
import StudentDashboard from './pages/student/Dashboard';
import StudentDrives from './pages/student/Drives';
import StudentApplications from './pages/student/Applications';
import StudentOffers from './pages/student/Offers';
import StudentEvents from './pages/student/Events';
import StudentAttendance from './pages/student/Attendance';
import StudentNotifications from './pages/student/Notifications';
import StudentChat from './pages/student/Chat';
import StudentProfile from './pages/student/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import AdminStudents from './pages/admin/Students';
import AdminCompanies from './pages/admin/Companies';
import AdminDrives from './pages/admin/Drives';
import AdminDriveStudents from './pages/admin/DriveStudents';
import AdminEvents from './pages/admin/Events';
import AdminEventRegistrations from './pages/admin/EventRegistrations';
import AdminNotifications from './pages/admin/Notifications';
import AdminChat from './pages/admin/Chat';
import AdminPlacementReport from './pages/admin/PlacementReport';
import AdminAuditLog from './pages/admin/AuditLog';
import AdminRecycleBin from './pages/admin/RecycleBin';
import AdminProfile from './pages/admin/AdminProfile';
import AdminCompanyDetail from './pages/admin/CompanyDetail';
import AdminAttendance from './pages/admin/Attendance';

function PrivateStudent({ children }) {
  const token = localStorage.getItem('studentToken');
  if (!token) return <Navigate to="/student/login" replace />;
  return children;
}

function PrivateAdmin({ children }) {
  const token = localStorage.getItem('adminToken');
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}

function OnboardingScreen() {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="onboarding-logo flex flex-col items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-primary-600 flex items-center justify-center shadow-xl">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-primary-600 font-semibold text-lg">SMC Career Connect</p>
        <div className="w-32 h-1.5 bg-primary-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full animate-[shimmer_1.2s_ease-in-out_infinite] bg-[length:200%_100%]" style={{ backgroundImage: 'linear-gradient(90deg, #dbeafe 25%, #3b82f6 50%, #dbeafe 75%)' }} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [onboarding, setOnboarding] = useState(true);
  useEffect(() => {
    const seen = sessionStorage.getItem('onboardingSeen');
    const t = seen ? 600 : 2200;
    const id = setTimeout(() => {
      setOnboarding(false);
      sessionStorage.setItem('onboardingSeen', '1');
    }, t);
    return () => clearTimeout(id);
  }, []);

  if (onboarding) return <OnboardingScreen />;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/student" element={<PrivateStudent><StudentLayout /></PrivateStudent>}>
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="drives" element={<StudentDrives />} />
        <Route path="applications" element={<StudentApplications />} />
        <Route path="offers" element={<StudentOffers />} />
        <Route path="events" element={<StudentEvents />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="chat" element={<StudentChat />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="notifications" element={<StudentNotifications />} />
      </Route>
      <Route path="/admin" element={<PrivateAdmin><AdminLayout /></PrivateAdmin>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="companies" element={<AdminCompanies />} />
        <Route path="companies/:id" element={<AdminCompanyDetail />} />
        <Route path="drives" element={<AdminDrives />} />
        <Route path="drives/:driveId/students" element={<AdminDriveStudents />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="events/:eventId/registrations" element={<AdminEventRegistrations />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="chat" element={<AdminChat />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="placement-report" element={<AdminPlacementReport />} />
        <Route path="recycle-bin" element={<AdminRecycleBin />} />
        <Route path="audit-log" element={<AdminAuditLog />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
