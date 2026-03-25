import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/axios';
import { TableSkeleton } from '../../components/Skeleton';

const TYPES = ['DRIVE', 'WORKSHOP', 'TRAINING', 'TALK', 'DEADLINE'];
const TYPE_COLORS = { DRIVE: 'bg-blue-100 text-blue-800', WORKSHOP: 'bg-amber-100 text-amber-800', TRAINING: 'bg-emerald-100 text-emerald-800', TALK: 'bg-violet-100 text-violet-800', DEADLINE: 'bg-rose-100 text-rose-800' };

function AdminCalendarGrid({ events, currentMonth, onEdit }) {
  const { weeks, monthLabel } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();
    const days = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    const remainder = 7 - (days.length % 7);
    if (remainder < 7) for (let i = 0; i < remainder; i++) days.push(null);
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    return { weeks, monthLabel };
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const d = new Date(e.startTime);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  const dayKey = (d) => (d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : '');

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-semibold text-slate-800 text-center">{monthLabel}</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="bg-slate-50 py-2 text-center text-xs font-semibold text-slate-500">{day}</div>
          ))}
          {weeks.flat().map((d, i) => {
            const key = dayKey(d);
            const dayEvents = d ? (eventsByDay[key] || []) : [];
            const isToday = d && (() => { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); })();
            return (
              <div key={i} className={`min-h-[80px] bg-white p-1.5 ${!d ? 'bg-slate-50/50' : ''} ${isToday ? 'ring-2 ring-primary-500 ring-inset rounded' : ''}`}>
                {d && (
                  <>
                    <div className={`text-sm font-medium ${isToday ? 'text-primary-600' : 'text-slate-700'}`}>{d.getDate()}</div>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((e) => (
                        <button key={e.id} onClick={() => onEdit(e)} className="w-full text-left truncate text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200" title={e.title}>{e.title}</button>
                      ))}
                      {dayEvents.length > 2 && <span className="text-xs text-slate-500 pl-1">+{dayEvents.length - 2}</span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminEvents() {
  const [list, setList] = useState([]);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [view, setView] = useState('list');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ type: 'WORKSHOP', driveId: '', title: '', startTime: '', endTime: '', location: '', description: '' });
  const [startTimeError, setStartTimeError] = useState('');

  const fetch = () => {
    setLoading(true);
    Promise.all([
      adminApi.get('/events', { params: typeFilter ? { type: typeFilter } : {} }),
      adminApi.get('/drives'),
    ]).then(([ev, dr]) => {
      setList(ev.data.events || []);
      setDrives(dr.data.drives || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
  }, [typeFilter]);

  const save = async (e) => {
    e.preventDefault();
    setStartTimeError('');
    if (!form.type || !form.title || !form.startTime || !form.endTime) {
      toast.error('Type, title, start and end required');
      return;
    }
    try {
      const payload = { ...form, driveId: form.driveId ? parseInt(form.driveId, 10) : null };
      if (modal?.id) {
        await adminApi.patch(`/events/${modal.id}`, payload);
        toast.success('Updated');
      } else {
        await adminApi.post('/events', payload);
        toast.success('Event created');
      }
      setModal(null);
      fetch();
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed';
      if (msg.toLowerCase().includes('another event is already scheduled')) {
        setStartTimeError(msg);
      }
      toast.error(msg);
    }
  };

  const duplicate = async (id) => {
    try {
      await adminApi.post(`/events/${id}/duplicate`);
      toast.success('Event duplicated');
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const openEdit = (ev) => {
    setModal({ id: ev.id });
    setForm({
      type: ev.type,
      driveId: ev.driveId ? String(ev.driveId) : '',
      title: ev.title,
      startTime: ev.startTime ? ev.startTime.slice(0, 16) : '',
      endTime: ev.endTime ? ev.endTime.slice(0, 16) : '',
      location: ev.location ?? '',
      description: ev.description ?? '',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Events & Calendar</h1>
          <p className="text-slate-500 mt-1">Company drives, pre-placement talks, workshops, deadlines</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button type="button" onClick={() => setView('list')} className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>List</button>
            <button type="button" onClick={() => setView('calendar')} className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'calendar' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Calendar</button>
          </div>
          <button onClick={() => { setModal({}); setForm({ type: 'WORKSHOP', driveId: '', title: '', startTime: '', endTime: '', location: '', description: '' }); }} className="btn-primary">Add event</button>
        </div>
      </div>
      {view === 'list' && (
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2 rounded-lg border border-slate-200">
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
      {view === 'calendar' && (
        <>
          <div className="flex items-center justify-between gap-4 max-w-xs">
            <button type="button" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">‹</button>
            <span className="font-medium text-slate-700">{calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <button type="button" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">›</button>
          </div>
          {loading ? <TableSkeleton rows={6} cols={7} /> : <AdminCalendarGrid events={list} currentMonth={calendarMonth} onEdit={openEdit} />}
        </>
      )}
      {view === 'list' && <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : list.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-slate-500 font-medium">No events yet</p>
            <p className="text-slate-400 text-sm mt-1">Add an event to show on the calendar</p>
            <button onClick={() => { setModal({}); setForm({ type: 'WORKSHOP', driveId: '', title: '', startTime: '', endTime: '', location: '', description: '' }); }} className="mt-4 btn-primary">Add event</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Start</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">End</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Location</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((ev) => (
                  <tr key={ev.id} className="table-row-hover border-b border-slate-100 last:border-0">
                    <td className="py-3 px-4"><span className="px-2 py-1 rounded text-sm bg-slate-100">{ev.type}</span></td>
                    <td className="py-3 px-4">{ev.title}</td>
                    <td className="py-3 px-4 text-sm">{new Date(ev.startTime).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">{new Date(ev.endTime).toLocaleString()}</td>
                    <td className="py-3 px-4">{ev.location ?? '—'}</td>
                    <td className="py-3 px-4">
                      <Link to={`/admin/events/${ev.id}/registrations`} className="text-primary-600 text-sm font-medium mr-3 hover:underline">Registrations</Link>
                      <button onClick={() => duplicate(ev.id)} className="text-slate-600 text-sm font-medium mr-3 hover:underline">Duplicate</button>
                      <button onClick={() => openEdit(ev)} className="text-primary-600 text-sm font-medium mr-3 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">{modal.id ? 'Edit event' : 'Add event'}</h2>
            <form onSubmit={save} className="space-y-3">
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={form.driveId} onChange={(e) => setForm((f) => ({ ...f, driveId: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200">
                <option value="">No drive</option>
                {drives.map((d) => <option key={d.id} value={d.id}>{d.companyName} – {d.role}</option>)}
              </select>
              <input required placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <input
                required
                type="datetime-local"
                placeholder="Start"
                value={form.startTime}
                onChange={(e) => {
                  setForm((f) => ({ ...f, startTime: e.target.value }));
                  setStartTimeError('');
                }}
                className={`w-full px-4 py-2 rounded-lg border ${startTimeError ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-slate-200'}`}
              />
              {startTimeError && <p className="text-xs text-red-500 mt-1">{startTimeError}</p>}
              <input required type="datetime-local" placeholder="End" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <input placeholder="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-4 py-2 rounded-lg border border-slate-200" rows={2} />
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
