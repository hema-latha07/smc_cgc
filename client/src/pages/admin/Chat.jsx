import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/axios';

function VoicePlayer({ path, api }) {
  const [src, setSrc] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    if (!path) return;
    api.get(`/chat/voice/${encodeURIComponent(path)}`, { responseType: 'blob' })
      .then(({ data }) => {
        if (ref.current) URL.revokeObjectURL(ref.current);
        ref.current = URL.createObjectURL(data);
        setSrc(ref.current);
      })
      .catch(() => {});
    return () => { if (ref.current) { URL.revokeObjectURL(ref.current); ref.current = null; } };
  }, [path, api]);
  if (!src) return <span className="text-xs opacity-70">Loading…</span>;
  return <audio controls className="max-w-full h-9" src={src} preload="metadata" />;
}

function MessageBubble({ msg, isMe }) {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`max-w-[75%] sm:max-w-[65%] flex flex-col items-${isMe ? 'end' : 'start'}`}>
        {!isMe && <span className="text-xs text-slate-500 mb-0.5 px-1">{msg.senderName}</span>}
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm ${
            isMe
              ? 'rounded-br-md bg-primary-600 text-white'
              : 'rounded-bl-md bg-white border border-slate-200 text-slate-800'
          }`}
        >
          {msg.voiceNotePath ? (
            <VoicePlayer path={msg.voiceNotePath} api={adminApi} />
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{msg.content || ''}</p>
          )}
        </div>
        <span className={`text-[10px] text-slate-400 mt-0.5 ${isMe ? 'mr-1' : 'ml-1'}`}>
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

export default function AdminChat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const roomIdParam = searchParams.get('room');
  const [adminId, setAdminId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [voiceFile, setVoiceFile] = useState(null);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    adminApi.get('/me').then(({ data }) => setAdminId(data.id)).catch(() => {});
  }, []);

  useEffect(() => {
    adminApi.get('/chat/rooms').then(({ data }) => setRooms(data.rooms || [])).catch((err) => {
      setRooms([]);
      toast.error(err.response?.status === 401 ? 'Please log in again' : 'Could not load chats. Is the backend running?');
    }).finally(() => setLoadingRooms(false));
  }, []);

  const selectedRoomId = selectedRoom ? selectedRoom.id : (roomIdParam ? parseInt(roomIdParam, 10) : null);
  const activeRoom = rooms.find((r) => r.id === selectedRoomId) || (selectedRoomId ? { id: selectedRoomId, companyName: 'Chat' } : null);

  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      setSelectedRoom(null);
      return;
    }
    setLoadingMessages(true);
    adminApi.get(`/chat/rooms/${selectedRoomId}/messages`).then(({ data }) => {
      setMessages(data.messages || []);
      setSelectedRoom(data.room || { id: selectedRoomId, companyName: data.room?.companyName || 'Chat' });
    }).catch(() => {
      toast.error('Could not load messages');
      setMessages([]);
    }).finally(() => setLoadingMessages(false));
  }, [selectedRoomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!selectedRoomId) return;
    setSearchParams({ room: selectedRoomId }, { replace: true });
  }, [selectedRoomId, setSearchParams]);

  useEffect(() => {
    if (!selectedRoomId) return;
    pollRef.current = setInterval(() => {
      adminApi.get(`/chat/rooms/${selectedRoomId}/messages`).then(({ data }) => {
        setMessages(data.messages || []);
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [selectedRoomId]);

  const sendText = async () => {
    const text = input.trim();
    if (!text || !selectedRoomId || sending) return;
    setSending(true);
    try {
      await adminApi.post(`/chat/rooms/${selectedRoomId}/messages`, { content: text });
      setInput('');
      const { data } = await adminApi.get(`/chat/rooms/${selectedRoomId}/messages`);
      setMessages(data.messages || []);
      adminApi.get('/chat/rooms').then(({ data: d }) => setRooms(d.rooms || [])).catch(() => {});
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const sendVoice = async () => {
    if (!voiceFile || !selectedRoomId || sending) return;
    setSending(true);
    const form = new FormData();
    form.append('voice', voiceFile);
    try {
      await adminApi.post(`/chat/rooms/${selectedRoomId}/voice`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setVoiceFile(null);
      const { data } = await adminApi.get(`/chat/rooms/${selectedRoomId}/messages`);
      setMessages(data.messages || []);
      adminApi.get('/chat/rooms').then(({ data: d }) => setRooms(d.rooms || [])).catch(() => {});
      toast.success('Voice message sent');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send voice');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-fade-in">
      <div className="flex flex-1 min-h-0">
        <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="font-bold text-slate-800">Company Chats</h2>
            <p className="text-xs text-slate-500 mt-0.5">View and reply to applicant chats</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingRooms ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-200 animate-pulse" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No company chats yet. Add companies to create chats.</div>
            ) : (
              rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRoom(r)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100 hover:bg-white transition-colors ${activeRoom?.id === r.id ? 'bg-white border-l-4 border-l-primary-600' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-lg shrink-0">
                    {r.companyName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate">{r.companyName}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {r.lastMessage ? (r.lastMessage.voiceNotePath ? '🎤 Voice' : (r.lastMessage.content || '').slice(0, 30)) : 'No messages'}
                    </p>
                  </div>
                  {r.unreadCount > 0 && (
                    <span className="shrink-0 min-w-[22px] h-[22px] rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                      {r.unreadCount > 99 ? '99+' : r.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-[#e5ddd5]">
          {!activeRoom ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <p className="font-medium">Select a company chat</p>
                <p className="text-sm mt-1">All company chats are listed here</p>
              </div>
            </div>
          ) : (
            <>
              <header className="h-14 px-4 flex items-center gap-3 bg-[#f0f2f5] border-b border-slate-200 shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                  {activeRoom.companyName?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{activeRoom.companyName || 'Chat'}</h3>
                  <p className="text-xs text-slate-500">Applicants & placement team</p>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">No messages yet.</div>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} isMe={msg.senderType === 'ADMIN' && msg.senderId === adminId} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 bg-[#f0f2f5] border-t border-slate-200 shrink-0">
                {voiceFile ? (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-slate-600 truncate flex-1">{voiceFile.name}</span>
                    <button type="button" onClick={() => setVoiceFile(null)} className="text-slate-400 hover:text-red-500">Cancel</button>
                    <button type="button" onClick={sendVoice} disabled={sending} className="btn-primary text-sm py-1.5 px-3">Send voice</button>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <label className="p-2 rounded-full hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors" title="Send voice note">
                    <input type="file" accept="audio/*,.webm,.ogg,.mp3,.m4a,.wav" className="hidden" onChange={(e) => e.target.files?.[0] && setVoiceFile(e.target.files[0])} />
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0V8a5 5 0 0110 0v6z" /></svg>
                  </label>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendText())}
                    className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-slate-800 placeholder-slate-400"
                  />
                  <button type="button" onClick={sendText} disabled={sending || !input.trim()} className="p-2.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors" title="Send">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
