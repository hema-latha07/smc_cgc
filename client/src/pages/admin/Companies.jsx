import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/axios';
import { TableSkeleton } from '../../components/Skeleton';

const LIMIT = 10;

export default function AdminCompanies() {
  const [list, setList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', industry: '', contactPerson: '', contactEmail: '', contactPhone: '', jobDescription: '', salaryPackage: '' });

  const fetch = () => {
    setLoading(true);
    setFetchError(null);
    const params = { limit: LIMIT, offset };
    if (search) params.search = search;
    adminApi.get('/companies', { params }).then(({ data }) => {
      setList(data.companies || []);
      setTotalCount(data.totalCount ?? 0);
    }).catch((err) => {
      setList([]);
      setTotalCount(0);
      setFetchError(err.response?.status === 401 ? 'Please log in again' : 'Could not load companies. Is the backend running on port 5000?');
      toast.error('Failed to load companies');
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
  }, [search, offset]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toast.error('Name required');
      return;
    }
    try {
      if (modal?.id) {
        await adminApi.patch(`/companies/${modal.id}`, form);
        toast.success('Updated');
      } else {
        await adminApi.post('/companies', form);
        toast.success('Company created');
      }
      setModal(null);
      setForm({ name: '', industry: '', contactPerson: '', contactEmail: '', contactPhone: '', jobDescription: '', salaryPackage: '' });
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const openEdit = (c) => {
    setModal({ id: c.id });
    setForm({ name: c.name, industry: c.industry ?? '', contactPerson: c.contactPerson ?? '', contactEmail: c.contactEmail ?? '', contactPhone: c.contactPhone ?? '', jobDescription: c.jobDescription ?? '', salaryPackage: c.salaryPackage ?? '' });
  };

  const downloadExcel = async () => {
    try {
      const { data } = await adminApi.get('/companies/export', { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'companies.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (_) {
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Companies</h1>
          <p className="text-slate-500 mt-1">Manage company details</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadExcel} className="btn-secondary">Export Excel</button>
          <button onClick={() => { setModal({}); setForm({ name: '', industry: '', contactPerson: '', contactEmail: '', contactPhone: '', jobDescription: '', salaryPackage: '' }); }} className="btn-primary">Add company</button>
        </div>
      </div>
      <input
        type="text"
        placeholder="Search companies"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
        className="px-4 py-2 rounded-lg border border-slate-200 w-64"
      />
      {fetchError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-amber-800 text-sm">{fetchError}</p>
          <button type="button" onClick={() => fetch()} className="text-amber-700 font-medium hover:underline text-sm">Retry</button>
        </div>
      )}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : list.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m3-13h2m-2 13h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <p className="text-slate-500 font-medium">No companies found</p>
            <p className="text-slate-400 text-sm mt-1">Add a company to get started</p>
            <button onClick={() => { setModal({}); setForm({ name: '', industry: '', contactPerson: '', contactEmail: '', contactPhone: '', jobDescription: '', salaryPackage: '' }); }} className="mt-4 btn-primary">Add company</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Industry</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Contact</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Salary</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="table-row-hover border-b border-slate-100 last:border-0">
                    <td className="py-3 px-4">{c.name}</td>
                    <td className="py-3 px-4">{c.industry ?? '—'}</td>
                    <td className="py-3 px-4">{c.contactPerson ?? '—'}</td>
                    <td className="py-3 px-4">{c.salaryPackage ?? '—'}</td>
                    <td className="py-3 px-4">
                      <Link to={`/admin/companies/${c.id}`} className="text-primary-600 text-sm font-medium mr-3 hover:underline">View</Link>
                      <button onClick={() => openEdit(c)} className="text-primary-600 text-sm font-medium mr-3 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-sm text-slate-500">
          Showing {list.length === 0 ? 0 : offset + 1}–{offset + list.length} of {totalCount}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setOffset((o) => Math.max(0, o - LIMIT))} disabled={offset === 0} className="btn-secondary disabled:opacity-50">Previous</button>
          <button onClick={() => setOffset((o) => o + LIMIT)} disabled={offset + list.length >= totalCount} className="btn-secondary disabled:opacity-50">Next</button>
        </div>
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">{modal.id ? 'Edit company' : 'Add company'}</h2>
            <form onSubmit={save} className="space-y-3">
              <input required placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <input placeholder="Industry" value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <input placeholder="Contact person" value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <input placeholder="Contact email" type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <input placeholder="Contact phone" value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <textarea placeholder="Job description" value={form.jobDescription} onChange={(e) => setForm((f) => ({ ...f, jobDescription: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" rows={2} />
              <input placeholder="Salary package" value={form.salaryPackage} onChange={(e) => setForm((f) => ({ ...f, salaryPackage: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
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
