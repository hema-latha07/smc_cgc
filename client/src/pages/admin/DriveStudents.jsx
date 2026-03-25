import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/axios';
import { TableSkeleton } from '../../components/Skeleton';
import Breadcrumbs from '../../components/Breadcrumbs';
import StudentContextPanel from '../../components/StudentContextPanel';

export default function AdminDriveStudents() {
  const { driveId } = useParams();
  const navigate = useNavigate();
  const [drive, setDrive] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkRoundDecision, setBulkRoundDecision] = useState('');
  const [offerModal, setOfferModal] = useState(null);
  const [offerDeadline, setOfferDeadline] = useState('');
  const [offerFile, setOfferFile] = useState(null);
  const [contextStudentId, setContextStudentId] = useState(null);

  const fetch = () => {
    setLoading(true);
    adminApi.get(`/drives/${driveId}`).then(({ data }) => setDrive(data)).catch(() => navigate('/admin/drives'));
    adminApi.get(`/drives/${driveId}/students`, { params: statusFilter ? { status: statusFilter } : {} })
      .then(({ data }) => setList(data.students || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
  }, [driveId, statusFilter]);

  const updateStatus = async (applicationId, status) => {
    try {
      await adminApi.patch(`/applications/${applicationId}/status`, { status });
      toast.success('Status updated');
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const bulkUpdate = async () => {
    if (!bulkStatus || selected.size === 0) {
      toast.error('Select applications and a status');
      return;
    }
    for (const appId of selected) {
      try {
        await adminApi.patch(`/applications/${appId}/status`, { status: bulkStatus });
      } catch (_) {}
    }
    toast.success('Bulk update done');
    setSelected(new Set());
    setBulkStatus('');
    fetch();
  };

  const roundDecision = async (applicationId, decision) => {
    try {
      await adminApi.post(`/applications/${applicationId}/round-decision`, { decision });
      toast.success(decision === 'PASS' ? 'Marked pass for this round' : 'Marked not selected');
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const bulkRoundDecisionApply = async () => {
    if (!bulkRoundDecision || selected.size === 0) {
      toast.error('Select applications and choose Pass or Fail');
      return;
    }
    try {
      const { data } = await adminApi.post('/applications/round-decision-bulk', {
        applicationIds: Array.from(selected),
        decision: bulkRoundDecision,
      });
      toast.success(`Applied to ${data.count} application(s)`);
      setSelected(new Set());
      setBulkRoundDecision('');
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const uploadOffer = async (e) => {
    e.preventDefault();
    if (!offerDeadline || !offerFile) {
      toast.error('Set deadline and choose PDF');
      return;
    }
    const fd = new FormData();
    fd.append('offerPdf', offerFile);
    fd.append('offerDeadline', offerDeadline);
    try {
      await adminApi.post(`/applications/${offerModal.applicationId}/offer`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Offer uploaded');
      setOfferModal(null);
      setOfferDeadline('');
      setOfferFile(null);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    }
  };

  const downloadExport = async () => {
    try {
      const { data } = await adminApi.get(`/drives/${driveId}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drive_${driveId}_students.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_) {
      toast.error('Export failed');
    }
  };

  if (!drive && !loading) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[
        { label: 'Drives', to: '/admin/drives' },
        { label: drive ? `${drive.companyName} – ${drive.role}` : 'Drive', to: `/admin/drives` },
        { label: 'Students' },
      ]} />
      <div>
          <h1 className="text-2xl font-bold text-slate-800">{drive?.companyName} – {drive?.role}</h1>
          <p className="text-slate-500 text-sm">Applications</p>
        </div>
      <div className="flex flex-wrap gap-3 items-center">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-lg border border-slate-200">
          <option value="">All statuses</option>
          <option value="APPLIED">Applied</option>
          <option value="SHORTLISTED">Shortlisted</option>
          <option value="SELECTED">Selected</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button onClick={downloadExport} className="btn-secondary">Export Excel</button>
        {selected.size > 0 && (
          <>
            <span className="text-slate-500 text-sm">Round decision:</span>
            <select value={bulkRoundDecision} onChange={(e) => setBulkRoundDecision(e.target.value)} className="px-4 py-2 rounded-lg border border-slate-200">
              <option value="">Bulk round</option>
              <option value="PASS">Pass this round</option>
              <option value="FAIL">Fail (not selected)</option>
            </select>
            <button onClick={bulkRoundDecisionApply} className="btn-primary">Apply</button>
            <span className="text-slate-400">|</span>
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="px-4 py-2 rounded-lg border border-slate-200">
              <option value="">Bulk status</option>
              <option value="SHORTLISTED">Shortlist</option>
              <option value="SELECTED">Select</option>
              <option value="REJECTED">Reject</option>
            </select>
            <button onClick={bulkUpdate} className="btn-secondary">Apply status</button>
            <button onClick={() => setSelected(new Set())} className="text-slate-500 text-sm">Clear</button>
          </>
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : list.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h4l-3 8-4-16 3-8" /></svg>
            </div>
            <p className="text-slate-500 font-medium">No applications in this drive</p>
            <p className="text-slate-400 text-sm mt-1">Students will appear here when they apply</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4">
                    <input type="checkbox" checked={selected.size === list.length} onChange={(e) => setSelected(e.target.checked ? new Set(list.map((s) => s.applicationId)) : new Set())} />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Dept No</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">CGPA</th>
                  {list.some((s) => s.eligible !== undefined) && <th className="text-left py-3 px-4 font-semibold text-slate-700">Eligible</th>}
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Current round</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.applicationId} className="table-row-hover border-b border-slate-100 last:border-0">
                    <td className="py-3 px-4">
                      <input type="checkbox" checked={selected.has(s.applicationId)} onChange={() => toggleSelect(s.applicationId)} />
                    </td>
                    <td className="py-3 px-4">{s.deptNo}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => setContextStudentId(s.studentId)} className="text-primary-600 font-medium hover:underline text-left">{s.name}</button>
                    </td>
                    <td className="py-3 px-4">{s.department}</td>
                    <td className="py-3 px-4">{s.cgpa ?? '—'}</td>
                    {list.some((s) => s.eligible !== undefined) && (
                      <td className="py-3 px-4">
                        {s.eligible === true ? <span className="text-emerald-600 font-medium">Yes</span> : s.eligible === false ? <span className="text-amber-600">No</span> : '—'}
                      </td>
                    )}
                    <td className="py-3 px-4 text-slate-600 text-sm">
                      {s.currentRoundName ?? (s.currentRoundNumber != null ? `Round ${s.currentRoundNumber}` : '—')}
                    </td>
                    <td className="py-3 px-4">
                      <select value={s.status} onChange={(e) => updateStatus(s.applicationId, e.target.value)} className="text-sm border border-slate-200 rounded px-2 py-1">
                        <option value="APPLIED">Applied</option>
                        <option value="SHORTLISTED">Shortlisted</option>
                        <option value="SELECTED">Selected</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 flex flex-wrap gap-1">
                      {s.status !== 'REJECTED' && s.status !== 'SELECTED' && (
                        <>
                          <button type="button" onClick={() => roundDecision(s.applicationId, 'PASS')} className="text-emerald-600 text-sm font-medium hover:underline">Pass</button>
                          <span className="text-slate-300">|</span>
                          <button type="button" onClick={() => roundDecision(s.applicationId, 'FAIL')} className="text-red-600 text-sm font-medium hover:underline">Fail</button>
                          <span className="text-slate-300">|</span>
                        </>
                      )}
                      {s.status === 'SELECTED' && (
                        <button onClick={() => setOfferModal({ applicationId: s.applicationId, studentName: s.name })} className="text-primary-600 text-sm font-medium hover:underline">Upload offer</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {offerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setOfferModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Upload offer (PDF)</h2>
            <p className="text-slate-500 text-sm mb-4">For: {offerModal.studentName}</p>
            <form onSubmit={uploadOffer} className="space-y-3">
              <input required type="datetime-local" value={offerDeadline} onChange={(e) => setOfferDeadline(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <input required type="file" accept=".pdf" onChange={(e) => setOfferFile(e.target.files?.[0])} className="w-full text-sm" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">Upload</button>
                <button type="button" onClick={() => setOfferModal(null)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {contextStudentId && <StudentContextPanel studentId={contextStudentId} onClose={() => setContextStudentId(null)} />}
    </div>
  );
}
