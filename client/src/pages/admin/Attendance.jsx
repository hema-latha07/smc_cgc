import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/axios';
import { TableSkeleton } from '../../components/Skeleton';

export default function AdminAttendance() {
  const [events, setEvents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rows, setRows] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadEvents = () => {
    setLoadingList(true);
    adminApi.get('/attendance/trainings')
      .then(({ data }) => setEvents(data.events || []))
      .catch(() => toast.error('Failed to load training sessions'))
      .finally(() => setLoadingList(false));
  };

  const loadDetail = (eventId) => {
    setSelectedId(eventId);
    setLoadingDetail(true);
    adminApi.get(`/attendance/trainings/${eventId}`)
      .then(({ data }) => {
        setSelectedEvent(data.event);
        setRows(data.registrations || []);
      })
      .catch((e) => {
        toast.error(e.response?.data?.error || 'Failed to load attendance');
        setSelectedEvent(null);
        setRows([]);
      })
      .finally(() => setLoadingDetail(false));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleToggle = (registrationId) => {
    setRows((prev) =>
      prev.map((r) =>
        r.registrationId === registrationId
          ? {
              ...r,
              attendanceStatus: r.attendanceStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT',
            }
          : r
      )
    );
  };

  const handleSave = async () => {
    if (!selectedId || rows.length === 0) return;
    setSaving(true);
    try {
      const updates = rows.map((r) => ({
        registrationId: r.registrationId,
        attendanceStatus: r.attendanceStatus || null,
      }));
      const { data } = await adminApi.post(`/attendance/trainings/${selectedId}/bulk`, { updates });
      toast.success(`Saved attendance for ${data.updated} registration(s)`);
      loadEvents();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !selectedId) {
      toast.error('Choose a file and a training session');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await adminApi.post(`/attendance/trainings/${selectedId}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Applied attendance from file. Updated ${data.updated} rows.`);
      if (data.warnings?.length) {
        console.warn('Attendance upload warnings:', data.warnings);
      }
      loadDetail(selectedId);
      loadEvents();
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const summary = (() => {
    const total = rows.length;
    const present = rows.filter((r) => r.attendanceStatus === 'PRESENT').length;
    const absent = rows.filter((r) => r.attendanceStatus === 'ABSENT').length;
    const unmarked = total - present - absent;
    return { total, present, absent, unmarked };
  })();

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Training attendance</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Mark attendance for training sessions that are linked to placement drives.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Training sessions list */}
        <section className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm">Training sessions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Only TRAINING events that are linked to drives are shown here.
            </p>
          </div>
          <div className="p-4 max-h-[480px] overflow-y-auto">
            {loadingList ? (
              <TableSkeleton rows={4} cols={3} />
            ) : events.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No training sessions found.</p>
            ) : (
              <ul className="space-y-2">
                {events.map((ev) => {
                  const isActive = ev.id === selectedId;
                  const registered = ev.registeredCount || 0;
                  const present = ev.presentCount || 0;
                  return (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => loadDetail(ev.id)}
                        className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all ${
                          isActive
                            ? 'border-primary-500 bg-primary-50/70 shadow-sm'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <p className="font-semibold text-slate-800">{ev.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ev.companyName && ev.driveRole
                            ? `${ev.companyName} – ${ev.driveRole}`
                            : 'Training'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {ev.startTime ? new Date(ev.startTime).toLocaleString() : ''}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Registered: {registered} · Present: {present}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Detail panel */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800 text-sm">Session attendance</h2>
              {selectedEvent ? (
                <>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedEvent.title}</p>
                  <p className="text-xs text-slate-400">
                    {selectedEvent.startTime ? new Date(selectedEvent.startTime).toLocaleString() : ''}{' '}
                    {selectedEvent.location ? `· ${selectedEvent.location}` : ''}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">Choose a training session from the list.</p>
              )}
            </div>
            {selectedEvent && (
              <div className="text-right text-xs text-slate-500">
                <p>
                  Total: <span className="font-semibold text-slate-700">{summary.total}</span>
                </p>
                <p>
                  Present:{' '}
                  <span className="font-semibold text-emerald-600">
                    {summary.present}
                  </span>{' '}
                  · Absent:{' '}
                  <span className="font-semibold text-rose-600">
                    {summary.absent}
                  </span>{' '}
                  · Not marked:{' '}
                  <span className="font-semibold text-slate-600">
                    {summary.unmarked}
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            {/* Upload block */}
            <form onSubmit={handleUpload} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Upload attendance from Excel / CSV</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    File should contain columns like <code className="font-mono">deptNo</code>,{' '}
                    <code className="font-mono">name</code>, and optional{' '}
                    <code className="font-mono">attendance</code> (present / absent / P / A).
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    disabled={!selectedEvent || uploading}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!file || !selectedEvent || uploading}
                    className="btn-secondary text-xs disabled:opacity-50"
                  >
                    {uploading ? 'Applying…' : 'Upload & apply'}
                  </button>
                </div>
              </div>
            </form>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {loadingDetail ? (
                <TableSkeleton rows={6} cols={6} />
              ) : !selectedEvent ? (
                <div className="p-8 text-sm text-slate-500 text-center">
                  Select a training session on the left to see registrations.
                </div>
              ) : rows.length === 0 ? (
                <div className="p-8 text-sm text-slate-500 text-center">
                  No students registered for this training session yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left py-2.5 px-4 font-semibold text-slate-700">Dept No</th>
                        <th className="text-left py-2.5 px-4 font-semibold text-slate-700">Name</th>
                        <th className="text-left py-2.5 px-4 font-semibold text-slate-700">Department</th>
                        <th className="text-left py-2.5 px-4 font-semibold text-slate-700">Email</th>
                        <th className="text-left py-2.5 px-4 font-semibold text-slate-700">Registered at</th>
                        <th className="text-left py-2.5 px-4 font-semibold text-slate-700">Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const status = r.attendanceStatus;
                        const badgeClass =
                          status === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : status === 'ABSENT'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200';
                        const label =
                          status === 'PRESENT'
                            ? 'Present'
                            : status === 'ABSENT'
                            ? 'Absent'
                            : 'Not marked';
                        return (
                          <tr key={r.registrationId} className="border-b border-slate-100 last:border-0">
                            <td className="py-2.5 px-4">{r.deptNo}</td>
                            <td className="py-2.5 px-4">{r.name}</td>
                            <td className="py-2.5 px-4">{r.department}</td>
                            <td className="py-2.5 px-4">{r.email}</td>
                            <td className="py-2.5 px-4 text-xs text-slate-500">
                              {r.registeredAt ? new Date(r.registeredAt).toLocaleString() : ''}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <label className="inline-flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={status === 'PRESENT'}
                                    onChange={() => handleToggle(r.registrationId)}
                                  />
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${badgeClass}`}
                                  >
                                    {label}
                                  </span>
                                </label>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedEvent && rows.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save attendance'}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

