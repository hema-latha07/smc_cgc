import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/axios';

const NOTIFICATION_TEMPLATES = [
  { name: 'Drive reminder', title: 'Drive reminder', message: 'This is a reminder about the upcoming placement drive. Please ensure your profile and resume are updated.', link: '/student/drives' },
  { name: 'Shortlist result', title: 'Shortlist update', message: 'The shortlist for the drive has been published. Check your application status in the portal.', link: '/student/applications' },
  { name: 'Event reminder', title: 'Event reminder', message: 'You have an upcoming event. Please be present at the scheduled time and venue.', link: '/student/events' },
  { name: 'Offer deadline', title: 'Offer response required', message: 'Your offer letter is pending response. Please accept or reject before the deadline.', link: '/student/offers' },
];

export default function AdminNotifications() {
  const [drives, setDrives] = useState([]);
  const [target, setTarget] = useState('all');
  const [department, setDepartment] = useState('');
  const [driveId, setDriveId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);

  const applyTemplate = (t) => {
    setTitle(t.title);
    setMessage(t.message);
    setLink(t.link);
  };

  useEffect(() => {
    adminApi.get('/drives').then(({ data }) => setDrives(data.drives || [])).catch(() => {});
  }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title required');
      return;
    }
    setSending(true);
    try {
      const { data } = await adminApi.post('/notifications/broadcast', {
        target,
        department: target === 'department' ? department : undefined,
        driveId: (target === 'drive' || target === 'selected') ? driveId : undefined,
        title: title.trim(),
        message: message.trim() || undefined,
        link: link.trim() || undefined,
      });
      toast.success(`Sent to ${data.count} students`);
      setTitle('');
      setMessage('');
      setLink('');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Send notification</h1>
        <p className="text-slate-500 mt-1">Broadcast to students in clear steps</p>
      </div>

      <form onSubmit={send} className="space-y-6">
        {/* Section 1: Template */}
        <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-100 text-primary-600 text-sm font-bold">1</span>
              Choose template (optional)
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Pre-fill title, message and link</p>
          </div>
          <div className="p-5">
            <select
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
              onChange={(e) => {
                const t = NOTIFICATION_TEMPLATES.find((x) => x.name === e.target.value);
                if (t) applyTemplate(t);
              }}
            >
              <option value="">No template — write from scratch</option>
              {NOTIFICATION_TEMPLATES.map((t) => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Section 2: Audience */}
        <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-100 text-primary-600 text-sm font-bold">2</span>
              Audience
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Who receives this notification</p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Target</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All students</option>
                <option value="department">By department</option>
                <option value="drive">Drive applicants</option>
                <option value="selected">Selected (in drive)</option>
              </select>
            </div>
            {target === 'department' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. CSE, ECE"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}
            {(target === 'drive' || target === 'selected') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Drive</label>
                <select
                  value={driveId}
                  onChange={(e) => setDriveId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700"
                >
                  <option value="">Select drive</option>
                  {drives.map((d) => (
                    <option key={d.id} value={d.id}>{d.companyName} – {d.role}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Content */}
        <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-100 text-primary-600 text-sm font-bold">3</span>
              Content
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Title, message and link</p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Title *</label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Optional message body"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Link</label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="e.g. /student/drives"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="btn-primary w-full py-3 rounded-xl font-semibold"
            >
              {sending ? 'Sending…' : 'Send notification'}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
