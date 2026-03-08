import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/axios';
import { TableSkeleton } from '../../components/Skeleton';

const ENTITY_TYPES = [
  { value: 'students', label: 'Students' },
  { value: 'companies', label: 'Companies' },
  { value: 'drives', label: 'Drives' },
  { value: 'events', label: 'Events' },
];

export default function AdminRecycleBin() {
  const [entityType, setEntityType] = useState('students');
  const [activeList, setActiveList] = useState([]);
  const [activeLoading, setActiveLoading] = useState(true);
  const [activeError, setActiveError] = useState(null);
  const [search, setSearch] = useState('');
  const [deletedList, setDeletedList] = useState([]);
  const [deletedLoading, setDeletedLoading] = useState(true);
  const [deletedError, setDeletedError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmStep, setConfirmStep] = useState(0);
  const [confirmItems, setConfirmItems] = useState([]);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const fetchActive = useCallback(() => {
    setActiveLoading(true);
    setActiveError(null);
    const params = { limit: 500 };
    if (entityType === 'students') {
      if (search) params.search = search;
    } else if (entityType === 'companies') {
      if (search) params.search = search;
    }
    const endpoint = entityType === 'students' ? '/students' : entityType === 'companies' ? '/companies' : entityType === 'drives' ? '/drives' : '/events';
    const key = entityType === 'students' ? 'students' : entityType === 'companies' ? 'companies' : entityType === 'drives' ? 'drives' : 'events';
    adminApi.get(endpoint, { params })
      .then(({ data }) => setActiveList(data[key] || []))
      .catch((err) => {
        setActiveList([]);
        setActiveError(err.response?.data?.error || 'Failed to load');
      })
      .finally(() => setActiveLoading(false));
  }, [entityType, search]);

  const fetchDeleted = useCallback(() => {
    setDeletedLoading(true);
    setDeletedError(null);
    const endpoint = `/recycle-bin/${entityType}`;
    const key = entityType === 'students' ? 'students' : entityType === 'companies' ? 'companies' : entityType === 'drives' ? 'drives' : 'events';
    adminApi.get(endpoint)
      .then(({ data }) => setDeletedList(data[key] || []))
      .catch((err) => {
        setDeletedList([]);
        setDeletedError(err.response?.data?.error || 'Failed to load');
      })
      .finally(() => setDeletedLoading(false));
  }, [entityType]);

  useEffect(() => { fetchActive(); }, [fetchActive]);
  useEffect(() => { fetchDeleted(); }, [fetchDeleted]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === activeList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(activeList.map((x) => x.id)));
  };

  const openConfirmStep1 = () => {
    const items = activeList.filter((x) => selectedIds.has(x.id));
    setConfirmItems(items);
    setConfirmStep(1);
  };

  const proceedToStep2 = () => setConfirmStep(2);
  const closeConfirm = () => {
    setConfirmStep(0);
    setConfirmItems([]);
    setDeleteConfirmText('');
    setSelectedIds(new Set());
  };

  const doBulkDelete = async () => {
    if (deleteConfirmText.trim() !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }
    setBulkDeleting(true);
    try {
      const { data } = await adminApi.post('/recycle-bin/delete', { entityType, ids: [...selectedIds] });
      toast.success(`${data.deleted} item(s) moved to recycle bin`);
      if (data.errors?.length) toast.error(`${data.errors.length} row(s) had errors`);
      closeConfirm();
      fetchActive();
      fetchDeleted();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const restore = async (id) => {
    setRestoringId(id);
    try {
      await adminApi.post(`/recycle-bin/${entityType}/${id}/restore`);
      toast.success('Restored');
      fetchDeleted();
      fetchActive();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Restore failed');
    } finally {
      setRestoringId(null);
    }
  };

  const renderActiveRow = (item) => {
    if (entityType === 'students') return <><td className="py-3 px-4">{item.deptNo}</td><td className="py-3 px-4">{item.name}</td><td className="py-3 px-4">{item.department}</td><td className="py-3 px-4">{item.email}</td></>;
    if (entityType === 'companies') return <><td className="py-3 px-4">{item.name}</td><td className="py-3 px-4">{item.industry ?? '—'}</td><td className="py-3 px-4">{item.contactEmail ?? '—'}</td></>;
    if (entityType === 'drives') return <><td className="py-3 px-4">{item.role}</td><td className="py-3 px-4">{item.companyName ?? '—'}</td><td className="py-3 px-4">{item.deadline ? new Date(item.deadline).toLocaleString() : '—'}</td><td className="py-3 px-4">{item.status ?? '—'}</td></>;
    if (entityType === 'events') return <><td className="py-3 px-4">{item.title}</td><td className="py-3 px-4">{item.type ?? '—'}</td><td className="py-3 px-4">{item.startTime ? new Date(item.startTime).toLocaleString() : '—'}</td></>;
    return null;
  };

  const renderDeletedRow = (item) => {
    const deletedAt = item.deletedAt ? new Date(item.deletedAt).toLocaleString() : '—';
    if (entityType === 'students') return <><td className="py-3 px-4">{item.deptNo}</td><td className="py-3 px-4">{item.name}</td><td className="py-3 px-4">{item.department}</td><td className="py-3 px-4">{item.email}</td><td className="py-3 px-4 text-slate-500 text-sm">{deletedAt}</td></>;
    if (entityType === 'companies') return <><td className="py-3 px-4">{item.name}</td><td className="py-3 px-4">{item.industry ?? '—'}</td><td className="py-3 px-4 text-slate-500 text-sm">{deletedAt}</td></>;
    if (entityType === 'drives') return <><td className="py-3 px-4">{item.role}</td><td className="py-3 px-4">{item.companyName ?? '—'}</td><td className="py-3 px-4 text-slate-500 text-sm">{deletedAt}</td></>;
    if (entityType === 'events') return <><td className="py-3 px-4">{item.title}</td><td className="py-3 px-4">{item.type ?? '—'}</td><td className="py-3 px-4 text-slate-500 text-sm">{deletedAt}</td></>;
    return null;
  };

  const activeHeaders = entityType === 'students' ? ['Dept No', 'Name', 'Department', 'Email'] : entityType === 'companies' ? ['Name', 'Industry', 'Contact email'] : entityType === 'drives' ? ['Role', 'Company', 'Deadline', 'Status'] : ['Title', 'Type', 'Start time'];
  const deletedHeaders = entityType === 'students' ? [...activeHeaders, 'Deleted at'] : entityType === 'companies' ? [...activeHeaders, 'Deleted at'] : entityType === 'drives' ? [...activeHeaders, 'Deleted at'] : [...activeHeaders, 'Deleted at'];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Recycle bin</h1>
        <p className="text-slate-500 mt-1">Deleted students, companies, drives, and events are stored here and can be restored. Use the section below to move items to the recycle bin.</p>
      </div>

      {/* Section 1: Delete items */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Delete items (move to recycle bin)</h2>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {ENTITY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => { setEntityType(t.value); setSearch(''); setSelectedIds(new Set()); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${entityType === t.value ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {(entityType === 'students' || entityType === 'companies') && (
          <input
            type="text"
            placeholder={entityType === 'students' ? 'Search name, dept no, email' : 'Search companies'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 px-4 py-2 rounded-xl border border-slate-200 w-64 text-sm"
          />
        )}
        {activeError && <p className="text-amber-600 text-sm mb-2">{activeError}</p>}
        {activeLoading ? (
          <TableSkeleton rows={5} cols={activeHeaders.length + 2} />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 w-10">
                      <input type="checkbox" checked={activeList.length > 0 && selectedIds.size === activeList.length} onChange={toggleSelectAll} className="rounded border-slate-300" />
                    </th>
                    {activeHeaders.map((h) => <th key={h} className="text-left py-3 px-4 font-semibold text-slate-700">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {activeList.map((item) => (
                    <tr key={item.id} className="table-row-hover border-b border-slate-100 last:border-0">
                      <td className="py-3 px-4"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded border-slate-300" /></td>
                      {renderActiveRow(item)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {activeList.length === 0 && <p className="text-slate-500 py-6 text-center">No active {entityType} to show.</p>}
            <div className="mt-4">
              <button type="button" onClick={openConfirmStep1} disabled={selectedIds.size === 0} className="btn-primary disabled:opacity-50">Delete selected ({selectedIds.size})</button>
            </div>
          </>
        )}
      </section>

      {/* Section 2: Deleted items */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Deleted items (restore or keep)</h2>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {ENTITY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setEntityType(t.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${entityType === t.value ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {deletedError && <p className="text-amber-600 text-sm mb-2">{deletedError}</p>}
        {deletedLoading ? (
          <TableSkeleton rows={5} cols={deletedHeaders.length + 1} />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {deletedHeaders.map((h) => <th key={h} className="text-left py-3 px-4 font-semibold text-slate-700">{h}</th>)}
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedList.map((item) => (
                    <tr key={item.id} className="table-row-hover border-b border-slate-100 last:border-0">
                      {renderDeletedRow(item)}
                      <td className="py-3 px-4">
                        <button type="button" onClick={() => restore(item.id)} disabled={restoringId === item.id} className="text-primary-600 text-sm font-medium hover:underline disabled:opacity-50">{restoringId === item.id ? 'Restoring…' : 'Restore'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {deletedList.length === 0 && <p className="text-slate-500 py-6 text-center">No deleted {entityType}. Deleted items will appear here.</p>}
          </>
        )}
      </section>

      {/* Confirmation modal: Step 1 & 2 */}
      {confirmStep > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={confirmStep === 1 ? closeConfirm : undefined}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 md:p-8 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            {confirmStep === 1 && (
              <>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm deletion</h3>
                <p className="text-slate-600 text-sm mb-4">You are about to move the following to the recycle bin. You can restore them later from the Deleted items section.</p>
                <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 mb-4 text-sm">
                  <ul className="space-y-1">
                    {confirmItems.slice(0, 20).map((item) => (
                      <li key={item.id} className="text-slate-700">
                        {entityType === 'students' && `${item.deptNo} – ${item.name} (${item.department})`}
                        {entityType === 'companies' && item.name}
                        {entityType === 'drives' && `${item.role} – ${item.companyName}`}
                        {entityType === 'events' && item.title}
                      </li>
                    ))}
                    {confirmItems.length > 20 && <li className="text-slate-500">… and {confirmItems.length - 20} more</li>}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={closeConfirm} className="btn-secondary flex-1">Cancel</button>
                  <button type="button" onClick={proceedToStep2} className="btn-primary flex-1">Continue</button>
                </div>
              </>
            )}
            {confirmStep === 2 && (
              <>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Final confirmation</h3>
                <p className="text-slate-600 text-sm mb-4">Type <strong>DELETE</strong> (in capital letters) to proceed. These items will be moved to the recycle bin.</p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 mb-4"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmStep(1)} className="btn-secondary flex-1">Back</button>
                  <button type="button" onClick={doBulkDelete} disabled={deleteConfirmText.trim() !== 'DELETE' || bulkDeleting} className="btn-primary flex-1 disabled:opacity-50">{bulkDeleting ? 'Moving…' : 'Move to recycle bin'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
