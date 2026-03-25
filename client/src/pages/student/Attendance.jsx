import { useEffect, useState } from 'react';
import { studentApi } from '../../api/axios';
import { TableSkeleton } from '../../components/Skeleton';

export default function StudentAttendance() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    studentApi
      .get('/attendance')
      .then(({ data }) => setSessions(data.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TableSkeleton rows={6} cols={4} />;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Training attendance</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Attendance for training sessions linked to placement drives.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500 shadow-sm">
          No training attendance records yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">Your sessions</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {sessions.map((s) => {
              const status = s.attendanceStatus;
              let badgeClass =
                'bg-slate-50 text-slate-600 border-slate-200';
              let label = 'Not marked';
              if (status === 'PRESENT') {
                badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                label = 'Present';
              } else if (status === 'ABSENT') {
                badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                label = 'Absent';
              }
              return (
                <div key={s.eventId} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{s.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.companyName && s.driveRole ? `${s.companyName} – ${s.driveRole}` : 'Training'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {s.startTime ? new Date(s.startTime).toLocaleString() : ''}{' '}
                      {s.location ? `· ${s.location}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium ${badgeClass}`}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

