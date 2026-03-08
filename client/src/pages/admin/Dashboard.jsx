import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/axios';
import { CardGridSkeleton } from '../../components/Skeleton';

const StatCard = ({ icon, title, value, to, gradient, delay = 0 }) => (
  <Link
    to={to}
    className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:shadow-premium-lg hover:-translate-y-1 hover:border-slate-200/80 block"
    style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 0 0 1px rgb(0 0 0 / 0.02)', animationDelay: `${delay}ms` }}
  >
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 transition-opacity group-hover:opacity-20 ${gradient}`} />
    <div className="relative flex items-start justify-between">
      <div>
        <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${gradient} text-white shadow-lg mb-4`}>
          {icon}
        </div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-bold text-slate-800 mt-1 tracking-tight">{value}</p>
        <span className="inline-flex items-center gap-1.5 mt-4 text-primary-600 font-semibold text-sm group-hover:gap-2 transition-all">
          View <span className="group-hover:translate-x-0.5 inline-block">→</span>
        </span>
      </div>
    </div>
  </Link>
);

function isNetworkError(err) {
  return err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error');
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [placementReport, setPlacementReport] = useState(null);
  const [expiringOffers, setExpiringOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      adminApi.get('/dashboard'),
      adminApi.get('/placement-report').catch(() => ({ data: null })),
      adminApi.get('/expiring-offers').catch(() => ({ data: { offers: [] } })),
    ])
      .then(([dash, report, offers]) => {
        setData(dash.data);
        setPlacementReport(report.data);
        setExpiringOffers(offers.data?.offers ?? []);
      })
      .catch((err) => setError(isNetworkError(err) ? 'backend_unreachable' : 'failed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <CardGridSkeleton count={4} />;

  if (error === 'backend_unreachable') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-800">Backend server not running</h2>
        <p className="text-slate-600 mt-2 text-sm">
          The API could not be reached. Start the backend in a separate terminal:
        </p>
        <code className="mt-3 block text-left bg-slate-800 text-slate-100 px-4 py-3 rounded-xl text-sm font-mono">
          cd smc-career-connect/server<br />
          npm run dev
        </code>
        <p className="text-slate-500 text-xs mt-3">Then click Retry below.</p>
        <button
          type="button"
          onClick={fetchDashboard}
          className="mt-5 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-slate-600">Could not load dashboard.</p>
        <button type="button" onClick={fetchDashboard} className="mt-4 text-primary-600 font-medium hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Students',
      value: data.totalStudents,
      to: '/admin/students',
      gradient: 'bg-gradient-to-br from-primary-500 to-primary-600',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    },
    {
      title: 'Placed',
      value: data.placed,
      to: '/admin/drives',
      gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      title: 'Pending Applications',
      value: data.pendingApplications,
      to: '/admin/drives',
      gradient: 'bg-gradient-to-br from-amber-500 to-amber-600',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      title: 'Upcoming Drives',
      value: data.upcomingDrives,
      to: '/admin/drives',
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    },
    {
      title: 'Offers expiring (48h)',
      value: data.expiringOffersCount,
      to: '/admin/placement-report',
      gradient: 'bg-gradient-to-br from-rose-500 to-rose-600',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l4 4m4-4a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      title: 'Drives closing in 7 days',
      value: data.drivesClosingSoonCount,
      to: '/admin/drives',
      gradient: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    },
  ];

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-8 py-10 text-white" style={{ boxShadow: '0 20px 40px -12px rgb(0 0 0 / 0.25)' }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.2)_0%,_transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-primary-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Placement Office</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1 tracking-tight">Dashboard</h1>
          <p className="text-slate-400 mt-2 text-lg">Overview of placements and drives</p>
        </div>
      </div>

      {/* Action cards */}
      {(data.expiringOffersCount > 0 || data.pendingApplications > 0 || data.drivesClosingSoonCount > 0) && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.pendingApplications > 0 && (
              <Link
                to={data.firstDriveIdWithPending ? `/admin/drives/${data.firstDriveIdWithPending}/students?status=APPLIED` : '/admin/drives'}
                className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 hover:bg-amber-50 hover:border-amber-300 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{data.pendingApplications} pending applications</p>
                  <p className="text-sm text-amber-700">Review and update status</p>
                </div>
              </Link>
            )}
            {data.expiringOffersCount > 0 && (
              <Link
                to="/admin/placement-report"
                className="rounded-xl border border-red-200 bg-red-50/80 p-5 hover:bg-red-50 hover:border-red-300 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l4 4m4-4a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{data.expiringOffersCount} offers expiring in 48h</p>
                  <p className="text-sm text-red-700">Remind students to respond</p>
                </div>
              </Link>
            )}
            {data.drivesClosingSoonCount > 0 && (
              <Link
                to="/admin/drives"
                className="rounded-xl border border-blue-200 bg-blue-50/80 p-5 hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{data.drivesClosingSoonCount} drives closing in 7 days</p>
                  <p className="text-sm text-blue-700">Check deadlines</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Expiring offers list */}
      {expiringOffers.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-premium">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Offers expiring in 48 hours</h2>
            <Link to="/admin/placement-report" className="text-primary-600 font-medium text-sm hover:underline">View report</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {expiringOffers.slice(0, 10).map((o) => (
              <li key={o.id} className="flex items-center justify-between px-8 py-4 hover:bg-slate-50/80 transition-colors">
                <div>
                  <p className="font-medium text-slate-800">{o.studentName} ({o.deptNo})</p>
                  <p className="text-sm text-slate-500">{o.companyName} – {o.driveRole}</p>
                </div>
                <span className="text-sm text-slate-500">{new Date(o.offerDeadline).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI cards */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Key metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, i) => (
            <StatCard key={i} {...stat} delay={i * 50} />
          ))}
        </div>
      </div>

      {/* Charts - placed by department */}
      {placementReport?.byDepartment?.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-premium">
          <div className="px-8 py-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Placed by department</h2>
            <p className="text-sm text-slate-500 mt-0.5">Students selected per department</p>
          </div>
          <div className="p-8">
            <div className="space-y-4 max-w-md">
              {placementReport.byDepartment.map((row) => {
                const pct = row.total ? Math.round((Number(row.placed) / Number(row.total)) * 100) : 0;
                return (
                  <div key={row.department}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{row.department}</span>
                      <span className="text-slate-500">{row.placed} / {row.total} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Top companies */}
      {data.topCompanies && data.topCompanies.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-premium">
          <div className="px-8 py-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Top recruiting companies</h2>
            <p className="text-sm text-slate-500 mt-0.5">By number of students selected</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.topCompanies.map((c, i) => (
              <li key={i} className="flex items-center justify-between px-8 py-4 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                    {i + 1}
                  </div>
                  <span className="font-medium text-slate-800">{c.name}</span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-primary-700 font-semibold text-sm">
                  {c.count} selected
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Shortcuts */}
      <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-premium">
        <h2 className="text-lg font-semibold text-slate-800 mb-5">Quick links</h2>
        <div className="flex flex-wrap gap-4">
          <Link to="/admin/students" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all">
            Students
          </Link>
          <Link to="/admin/companies" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all">
            Companies
          </Link>
          <Link to="/admin/drives" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all">
            Drives
          </Link>
          <Link to="/admin/events" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all">
            Events
          </Link>
          <Link to="/admin/notifications" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20">
            Send notification
          </Link>
        </div>
      </div>
    </div>
  );
}
