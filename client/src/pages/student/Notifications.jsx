import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { studentApi } from '../../api/axios';
import { TableSkeleton } from '../../components/Skeleton';

const SECTIONS = [
  { key: 'applications', label: 'Applications', path: '/student/applications', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', headerClass: 'bg-blue-50 border-blue-200 text-blue-800', iconClass: 'bg-blue-100 text-blue-600' },
  { key: 'drives', label: 'Placement Drives', path: '/student/drives', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', headerClass: 'bg-amber-50 border-amber-200 text-amber-800', iconClass: 'bg-amber-100 text-amber-600' },
  { key: 'events', label: 'Events', path: '/student/events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', headerClass: 'bg-violet-50 border-violet-200 text-violet-800', iconClass: 'bg-violet-100 text-violet-600' },
  { key: 'offers', label: 'Offers', path: '/student/offers', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 001.414 0l2.414-2.414A1 1 0 0118.414 7H20a2 2 0 012 2v11a2 2 0 01-2 2z', headerClass: 'bg-emerald-50 border-emerald-200 text-emerald-800', iconClass: 'bg-emerald-100 text-emerald-600' },
  { key: 'chat', label: 'Chat', path: '/student/chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', headerClass: 'bg-sky-50 border-sky-200 text-sky-800', iconClass: 'bg-sky-100 text-sky-600' },
  { key: 'general', label: 'General', path: null, icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', headerClass: 'bg-slate-50 border-slate-200 text-slate-800', iconClass: 'bg-slate-100 text-slate-600' },
];

function getSectionKey(link) {
  if (!link) return 'general';
  const path = link.split('?')[0];
  const found = SECTIONS.find((s) => s.path && path.startsWith(s.path));
  return found ? found.key : 'general';
}

function SectionIcon({ d, className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function StudentNotifications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const bySection = useMemo(() => {
    const map = {};
    SECTIONS.forEach((s) => { map[s.key] = []; });
    list.forEach((n) => {
      const key = getSectionKey(n.link);
      if (!map[key]) map[key] = [];
      map[key].push(n);
    });
    return map;
  }, [list]);

  useEffect(() => {
    studentApi.get('/notifications').then(({ data }) => setList(data.notifications || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try {
      await studentApi.post(`/notifications/${id}/read`);
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: 1 } : n)));
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (_) {}
  };

  if (loading) return <TableSkeleton rows={8} cols={3} />;

  const hasAny = list.length > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
        <p className="text-slate-500 mt-1">Alerts and reminders by section</p>
      </div>

      {!hasAny && (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mb-4">
            <SectionIcon d={SECTIONS[5].icon} className="w-7 h-7" />
          </div>
          <p className="text-slate-600 font-medium">No notifications yet</p>
          <p className="text-slate-400 text-sm mt-1">When you get updates on drives, applications, or events, they’ll appear here.</p>
        </div>
      )}

      {SECTIONS.map((section) => {
        const items = bySection[section.key] || [];
        if (items.length === 0) return null;

        return (
          <section key={section.key} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className={`flex items-center gap-3 px-5 py-4 border-b border-l-4 ${section.headerClass}`}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${section.iconClass}`}>
                <SectionIcon d={section.icon} className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-slate-800">{section.label}</h2>
              <span className="text-sm text-slate-500 ml-auto">{items.length}</span>
            </div>
            <ul className="divide-y divide-slate-50">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`px-5 py-4 transition-colors ${n.isRead ? 'bg-white hover:bg-slate-50/50' : 'bg-primary-50/20 hover:bg-primary-50/30'}`}
                >
                  <div className="flex gap-4 items-start">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800">{n.title}</p>
                      {n.message && <p className="text-sm text-slate-600 mt-1">{n.message}</p>}
                      <p className="text-xs text-slate-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                      {n.link && (
                        <Link
                          to={n.link}
                          className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          View <span aria-hidden>→</span>
                        </Link>
                      )}
                    </div>
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="shrink-0 px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
