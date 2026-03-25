import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { studentApi } from '../../api/axios';
import { CardGridSkeleton } from '../../components/Skeleton';

export default function StudentProfile() {
  const [me, setMe] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: '', department: '', cgpa: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      studentApi.get('/me'),
      studentApi.get('/applications'),
    ])
      .then(([profileRes, appRes]) => {
        const profileData = profileRes.data;
        setMe(profileData);
        setApplications(appRes.data.applications || []);
        setForm({
          name: profileData.name || '',
          department: profileData.department || '',
          cgpa: profileData.cgpa != null ? String(profileData.cgpa) : '',
          email: profileData.email || '',
          phone: profileData.phone || '',
        });
      })
      .catch((err) => {
        setMe(null);
        console.error('Profile load error:', err?.response?.data || err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await studentApi.patch('/me', {
        name: form.name,
        department: form.department,
        cgpa: form.cgpa === '' ? null : form.cgpa,
        email: form.email,
        phone: form.phone || null,
      });
      setMe(data);
      setEditOpen(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const onResumeSelect = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const ext = (file.name || '').toLowerCase().split('.').pop();
    if (ext !== 'pdf') {
      toast.error('Please upload a PDF file.');
      return;
    }
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large (max 20MB).');
      return;
    }
    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const { data } = await studentApi.post('/me/resume', formData, {
        timeout: 120000,
        maxContentLength: 25 * 1024 * 1024,
        maxBodyLength: 25 * 1024 * 1024,
      });
      setMe(data);
      toast.success('Resume uploaded');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploadingResume(false);
      e.target.value = '';
    }
  };

  const downloadResume = async () => {
    try {
      const { data } = await studentApi.get('/me/resume', { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = me?.resume_path ? `resume_${me.name.replace(/\s+/g, '_')}.pdf` : 'resume.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Download failed');
    }
  };

  const removeResume = async () => {
    if (!confirm('Remove your resume?')) return;
    try {
      const { data } = await studentApi.delete('/me/resume');
      setMe(data);
      toast.success('Resume removed');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwdNew.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      toast.error('New passwords do not match');
      return;
    }
    setPwdLoading(true);
    try {
      await studentApi.post('/me/change-password', {
        currentPassword: pwdCurrent,
        newPassword: pwdNew,
        confirmPassword: pwdConfirm,
      });
      toast.success('Password updated. Use the new password next time you log in.');
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) return <CardGridSkeleton count={4} />;
  if (!me) return <div className="text-slate-500">Could not load profile.</div>;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* LinkedIn-style banner (no profile picture) */}
      <div className="rounded-t-2xl h-32 sm:h-40 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }} />

      {/* Intro card - overlaps banner */}
      <div className="relative -mt-16 sm:-mt-20 px-4 sm:px-6 pb-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.08)' }}>
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{me.name}</h1>
            <p className="text-slate-600 mt-1 font-medium">{me.department} · Roll No. {me.deptNo}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit profile
              </button>
              <Link to="/student/applications" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary-600 text-primary-600 font-medium hover:bg-primary-50 transition-colors">
                View applications
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contact & details - LinkedIn-style card */}
      <div className="mt-6 px-4 sm:px-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg">Contact & details</h2>
            <button type="button" onClick={() => setEditOpen(true)} className="text-primary-600 font-medium text-sm hover:underline">Edit</button>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</dt>
                <dd className="mt-1 text-slate-800">{me.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</dt>
                <dd className="mt-1 text-slate-800">{me.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department / Class</dt>
                <dd className="mt-1 text-slate-800">{me.department || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll number</dt>
                <dd className="mt-1 text-slate-800">{me.deptNo || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CGPA</dt>
                <dd className="mt-1 text-slate-800">{me.cgpa != null ? me.cgpa : '—'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Resume - LinkedIn-style card */}
      <div className="mt-6 px-4 sm:px-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-lg">Resume</h2>
          </div>
          <div className="p-6">
            {me.resume_path ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">Resume uploaded</p>
                    <p className="text-sm text-slate-500">PDF only · Max 20MB</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={downloadResume} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Download
                  </button>
                  <button type="button" onClick={removeResume} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm mb-3">Upload your resume (PDF only, max 20MB).</p>
            )}
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 cursor-pointer">
              <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={onResumeSelect} disabled={uploadingResume} />
              {uploadingResume ? (
                <span className="text-slate-500">Uploading…</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  {me.resume_path ? 'Replace resume' : 'Upload resume'}
                </>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="mt-6 px-4 sm:px-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-lg">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-lg">Change password</h2>
            <p className="text-slate-500 text-sm mt-0.5">Use DOB as current password if you have never changed it.</p>
          </div>
          <form onSubmit={changePassword} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current password</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded-lg border border-slate-200"
                value={pwdCurrent}
                onChange={(e) => setPwdCurrent(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded-lg border border-slate-200"
                value={pwdNew}
                onChange={(e) => setPwdNew(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
              <p className="text-xs text-slate-400 mt-1">At least 6 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded-lg border border-slate-200"
                value={pwdConfirm}
                onChange={(e) => setPwdConfirm(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={pwdLoading} className="btn-primary w-full disabled:opacity-50">
              {pwdLoading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>

      {/* Applications summary */}
      <div className="mt-6 px-4 sm:px-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-lg">Applications</h2>
          </div>
          <div className="p-6">
            <p className="text-slate-600">
              You have applied to <span className="font-semibold text-slate-800">{applications.length}</span> placement drive{applications.length !== 1 ? 's' : ''}.
            </p>
            <Link to="/student/applications" className="inline-flex items-center gap-1.5 mt-3 text-primary-600 font-medium text-sm hover:underline">
              Track application status <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Edit profile modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Edit profile</h3>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department / Class</label>
                <input type="text" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Roll number</label>
                <input type="text" value={me.deptNo} className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500" readOnly disabled />
                <p className="text-xs text-slate-400 mt-0.5">Roll number cannot be changed.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CGPA</label>
                <input type="text" inputMode="decimal" placeholder="e.g. 8.5" value={form.cgpa} onChange={(e) => setForm((f) => ({ ...f, cgpa: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Optional" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">Save</button>
                <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
