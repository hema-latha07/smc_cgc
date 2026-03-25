import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { studentApi } from '../api/axios';

const nav = [
  { to: '/student/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/student/drives', label: 'Drives', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { to: '/student/applications', label: 'Applications', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { to: '/student/offers', label: 'Offers', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 001.414 0l2.414-2.414A1 1 0 0118.414 7H20a2 2 0 012 2v11a2 2 0 01-2 2z' },
  { to: '/student/events', label: 'Events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: '/student/attendance', label: 'Attendance', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 001.414 0l2.414-2.414A1 1 0 0118.414 7H20a2 2 0 012 2v11a2 2 0 01-2 2z' },
  { to: '/student/chat', label: 'Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { to: '/student/notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
];

const Icon = ({ d }) => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUnreadCount = () => {
    studentApi.get('/notifications/unread-count').then(({ data }) => setUnreadCount(data.unreadCount ?? 0)).catch(() => {});
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname]);

  useEffect(() => {
    const onUpdate = () => fetchUnreadCount();
    window.addEventListener('notifications-updated', onUpdate);
    return () => window.removeEventListener('notifications-updated', onUpdate);
  }, []);

  const logout = () => {
    localStorage.removeItem('studentToken');
    navigate('/student/login');
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex">
      {/* Sidebar */}
      <aside className={`bg-white border-r border-slate-200/80 transition-all duration-300 ease-out flex flex-col z-20 ${sidebarOpen ? 'w-64' : 'w-[72px]'}`} style={{ boxShadow: '2px 0 24px -4px rgb(0 0 0 / 0.04)' }}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <span className="font-bold text-slate-800 tracking-tight">SMC Career</span>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25 mx-auto">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
          )}
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{sidebarOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />}</svg>
          </button>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {nav.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== '/student/dashboard' && location.pathname.startsWith(item.to + '/'));
            const showNotificationDot = item.to === '/student/notifications' && unreadCount > 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${sidebarOpen ? 'pl-3' : 'justify-center px-0'} ${isActive ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
              >
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-600 rounded-r-full" />}
                <span className="relative inline-flex">
                  <Icon d={item.icon} />
                  {showNotificationDot && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" title={`${unreadCount} unread`} />
                  )}
                </span>
                {sidebarOpen && <span className="flex items-center gap-2">{item.label}{showNotificationDot && <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">{unreadCount > 99 ? '99+' : unreadCount}</span>}</span>}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-100 space-y-0.5">
          <NavLink
            to="/student/profile"
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 relative ${sidebarOpen ? 'pl-3' : 'justify-center px-0'} ${location.pathname === '/student/profile' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
          >
            {location.pathname === '/student/profile' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-600 rounded-r-full" />}
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            {sidebarOpen && <span>Profile</span>}
          </NavLink>
          <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors font-medium">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>
      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 md:px-8 shrink-0" style={{ boxShadow: '0 1px 0 0 rgb(0 0 0 / 0.03)' }}>
          <div className="text-sm text-slate-500 font-medium">Student Portal</div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-slate-600">Welcome back</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold shadow-md">S</div>
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          <div className="p-6 md:p-8 lg:p-10 animate-fade-in max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
