import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/axios';
import { TableSkeleton } from '../../components/Skeleton';

async function downloadDriveExport(driveId) {
  const { data } = await adminApi.get(`/drives/${driveId}/export`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `drive_${driveId}_students.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadDrivesListExport() {
  try {
    const { data } = await adminApi.get('/drives/export', { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drives.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export downloaded');
  } catch (_) {
    toast.error('Export failed');
  }
}

export default function AdminDrives() {
  const [drives, setDrives] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ companyId: '', role: '', ctc: '', eligibility: '', deadline: '', status: 'UPCOMING', timelineStart: '', timelineEnd: '', minCgpa: '', roundCount: 1, rounds: [{ roundNumber: 1, name: 'Round 1', isFinal: true }] });

  const fetch = () => {
    setLoading(true);
    setFetchError(null);
    Promise.all([
      adminApi.get('/drives', { params: statusFilter ? { status: statusFilter } : {} }),
      adminApi.get('/companies'),
    ]).then(([dr, co]) => {
      setDrives(dr.data.drives || []);
      setCompanies(co.data.companies || []);
    }).catch((err) => {
      setDrives([]);
      setCompanies([]);
      setFetchError(err.response?.status === 401 ? 'Please log in again' : 'Could not load drives. Is the backend running on port 5000?');
      toast.error('Failed to load drives');
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
  }, [statusFilter]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.companyId || !form.role) {
      toast.error('Company and role required');
      return;
    }
    try {
      const payload = { ...form, companyId: parseInt(form.companyId, 10) };
      if (payload.deadline === '') payload.deadline = null;
      if (payload.timelineStart === '') payload.timelineStart = null;
      if (payload.timelineEnd === '') payload.timelineEnd = null;
      if (payload.minCgpa === '') payload.minCgpa = null; else if (payload.minCgpa != null) payload.minCgpa = parseFloat(payload.minCgpa);
      payload.rounds = (payload.rounds || []).map((r, i) => ({ roundNumber: i + 1, name: r.name || `Round ${i + 1}`, isFinal: i === (payload.rounds?.length || 1) - 1 }));
      delete payload.roundCount;
      if (modal?.id) {
        await adminApi.patch(`/drives/${modal.id}`, payload);
        toast.success('Updated');
      } else {
        await adminApi.post('/drives', payload);
        toast.success('Drive created');
      }
      setModal(null);
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const openEdit = async (d) => {
    setModal({ id: d.id });
    let drive = d;
    try {
      const { data } = await adminApi.get(`/drives/${d.id}`);
      drive = data;
    } catch (_) {}
    const rounds = drive.rounds?.length ? drive.rounds.map((r) => ({ roundNumber: r.roundNumber, name: r.name, isFinal: !!r.isFinal })) : [{ roundNumber: 1, name: 'Round 1', isFinal: true }];
    setForm({
      companyId: String(drive.companyId),
      role: drive.role,
      ctc: drive.ctc ?? '',
      eligibility: drive.eligibility ?? '',
      deadline: drive.deadline ? drive.deadline.slice(0, 16) : '',
      status: drive.status,
      timelineStart: drive.timelineStart ? drive.timelineStart.slice(0, 16) : '',
      timelineEnd: drive.timelineEnd ? drive.timelineEnd.slice(0, 16) : '',
      minCgpa: drive.minCgpa != null ? String(drive.minCgpa) : '',
      roundCount: rounds.length,
      rounds,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Drives</h1>
          <p className="text-slate-500 mt-1">Create and manage placement drives</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadDrivesListExport} className="btn-secondary">Export Excel (all drives)</button>
          <button onClick={() => { setModal({}); setForm({ companyId: '', role: '', ctc: '', eligibility: '', deadline: '', status: 'UPCOMING', timelineStart: '', timelineEnd: '', minCgpa: '', roundCount: 1, rounds: [{ roundNumber: 1, name: 'Round 1', isFinal: true }] }); }} className="btn-primary">Create drive</button>
        </div>
      </div>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-lg border border-slate-200">
        <option value="">All statuses</option>
        <option value="UPCOMING">Upcoming</option>
        <option value="ONGOING">Ongoing</option>
        <option value="COMPLETED">Completed</option>
      </select>
      {fetchError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-amber-800 text-sm">{fetchError}</p>
          <button type="button" onClick={() => fetch()} className="text-amber-700 font-medium hover:underline text-sm">Retry</button>
        </div>
      )}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : drives.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-slate-500 font-medium">No drives yet</p>
            <p className="text-slate-400 text-sm mt-1">Create a drive to start collecting applications</p>
            <button onClick={() => { setModal({}); setForm({ companyId: '', role: '', ctc: '', eligibility: '', deadline: '', status: 'UPCOMING', timelineStart: '', timelineEnd: '', minCgpa: '', roundCount: 1, rounds: [{ roundNumber: 1, name: 'Round 1', isFinal: true }] }); }} className="mt-4 btn-primary">Create drive</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Company</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">CTC</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Deadline</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drives.map((d) => (
                  <tr key={d.id} className="table-row-hover border-b border-slate-100 last:border-0">
                    <td className="py-3 px-4">{d.companyName}</td>
                    <td className="py-3 px-4">{d.role}</td>
                    <td className="py-3 px-4">{d.ctc ?? '—'}</td>
                    <td className="py-3 px-4"><span className="px-2 py-1 rounded text-sm bg-slate-100">{d.status}</span></td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{d.deadline ? new Date(d.deadline).toLocaleString() : '—'}</td>
                    <td className="py-3 px-4">
                      <Link to={`/admin/drives/${d.id}/students`} className="text-primary-600 text-sm font-medium mr-3 hover:underline">Students</Link>
                      <button type="button" onClick={() => downloadDriveExport(d.id)} className="text-primary-600 text-sm font-medium mr-3 hover:underline">Export</button>
                      <button onClick={() => openEdit(d)} className="text-primary-600 text-sm font-medium mr-3 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">{modal.id ? 'Edit drive' : 'Create drive'}</h2>
            <form onSubmit={save} className="space-y-3">
              <select required value={form.companyId} onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200">
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input required placeholder="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <input placeholder="CTC" value={form.ctc} onChange={(e) => setForm((f) => ({ ...f, ctc: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <textarea placeholder="Eligibility" value={form.eligibility} onChange={(e) => setForm((f) => ({ ...f, eligibility: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" rows={2} />
              <input type="number" step="0.01" min="0" max="10" placeholder="Min CGPA (optional)" value={form.minCgpa} onChange={(e) => setForm((f) => ({ ...f, minCgpa: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <input type="datetime-local" placeholder="Deadline" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200">
                <option value="UPCOMING">Upcoming</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <input type="datetime-local" placeholder="Timeline start" value={form.timelineStart} onChange={(e) => setForm((f) => ({ ...f, timelineStart: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <input type="datetime-local" placeholder="Timeline end" value={form.timelineEnd} onChange={(e) => setForm((f) => ({ ...f, timelineEnd: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Placement rounds</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.roundCount}
                  onChange={(e) => {
                    const n = Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1));
                    setForm((f) => ({
                      ...f,
                      roundCount: n,
                      rounds: Array.from({ length: n }, (_, i) =>
                        f.rounds[i] || { roundNumber: i + 1, name: `Round ${i + 1}`, isFinal: i === n - 1 }
                      ),
                    }));
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                />
                <p className="text-xs text-slate-500 mt-0.5">Number of selection rounds (e.g. 3 for Round 1, 2, 3). Last round is final.</p>
                {form.rounds?.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {form.rounds.map((r, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="text-slate-500 w-16">Round {i + 1}</span>
                        <input type="text" value={r.name} onChange={(e) => setForm((f) => ({ ...f, rounds: f.rounds.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder={`Round ${i + 1}`} className="flex-1 px-3 py-1.5 rounded border border-slate-200 text-sm" />
                        {i === form.rounds.length - 1 && <span className="text-xs text-slate-500">(final)</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">Save</button>
                <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
