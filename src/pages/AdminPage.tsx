import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { DEFAULT_SETTINGS, DEFAULT_STATS, store } from '../store';
import { firebaseConfigurationError } from '../firebase';
import { imageFileToBase64, imageSrc } from '../imageUtils';
import type { Advertisement, BookCover, GameSettings } from '../types';
import sarasaviLogo from '../imports/sarasavi_email_logo.jpg';

// ─── Confirm dialog (replaces native confirm() to avoid harness conflicts) ────

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <p className="text-gray-800 text-sm mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700">Confirm</button>
        </div>
      </div>
    </div>
  );
}

function useConfirm() {
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);
  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise(resolve => setState({ message, resolve }));
  }, []);
  const dialog = state ? (
    <ConfirmDialog
      message={state.message}
      onConfirm={() => { state.resolve(true); setState(null); }}
      onCancel={() => { state.resolve(false); setState(null); }}
    />
  ) : null;
  return { confirm, dialog };
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-bold mb-1">{label}</p>
          <p className="text-3xl font-black text-gray-800">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function Overview() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [books, setBooks] = useState<BookCover[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([store.getStats(), store.getBooks(), store.getSettings(), store.getAds()])
      .then(([nextStats, nextBooks, nextSettings, nextAds]) => {
        if (cancelled) return;
        setStats(nextStats);
        setBooks(nextBooks);
        setSettings(nextSettings);
        setAds(nextAds);
        setLoading(false);
      })
      .catch(reason => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : 'Unable to load dashboard data.');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading dashboard data…</p>;
  if (error) return <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-xl font-bold text-gray-800">Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Total Book Covers" value={books.length} icon="📚" color="border-blue-500" />
        <StatCard label="Active Covers" value={books.filter(b => b.active).length} icon="✅" color="border-green-500" />
        <StatCard label="Game Duration" value={`${settings.duration}s`} icon="⏱️" color="border-purple-500" />
        <StatCard label="Active Ads" value={ads.filter(a => a.active).length} icon="📢" color="border-yellow-500" />
        <StatCard label="Total Games" value={stats.totalPlayed} icon="🎮" color="border-indigo-500" />
        <StatCard label="Completed" value={stats.totalCompleted} icon="🏆" color="border-emerald-500" />
        <StatCard label="Failed" value={stats.totalFailed} icon="❌" color="border-red-400" />
      </div>
      {books.filter(b => b.active).length < 8 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold text-red-700 text-sm">Not enough active book covers!</p>
            <p className="text-red-600 text-xs mt-0.5">You need at least 8 active book covers for the game. Currently: {books.filter(b => b.active).length} active.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Book Covers ──────────────────────────────────────────────────────────────

function BookCovers() {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [books, setBooks] = useState<BookCover[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', imageUrl: '' });
  const [previewUrl, setPreviewUrl] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    let cancelled = false;
    store.getBooks()
      .then(nextBooks => { if (!cancelled) { setBooks(nextBooks); setLoading(false); } })
      .catch(reason => { if (!cancelled) { showToast(reason instanceof Error ? reason.message : 'Unable to load books.'); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  async function saveBooks(nextBooks: BookCover[]): Promise<boolean> {
    setSaving(true);
    try {
      await store.saveBooks(nextBooks);
      setBooks(nextBooks);
      return true;
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to save books.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await imageFileToBase64(file, 'bookCover');
      setForm(current => ({ ...current, imageUrl: base64 }));
      setPreviewUrl(imageSrc(base64));
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to process this image.');
    } finally {
      e.target.value = '';
    }
  }

  async function submitBook(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.author || !form.imageUrl) { showToast('Title, author and image are required'); return; }
    if (editingId) {
      const updated = books.map(b => b.id === editingId ? { ...b, ...form } : b);
      if (!await saveBooks(updated)) return;
      showToast('Book updated!'); setEditingId(null);
    } else {
      const newBook: BookCover = { id: `b${Date.now()}`, ...form, active: true, createdAt: Date.now() };
      if (!await saveBooks([...books, newBook])) return;
      showToast('Book added!'); setShowAdd(false);
    }
    setForm({ title: '', author: '', isbn: '', imageUrl: '' }); setPreviewUrl('');
  }

  function startEdit(book: BookCover) {
    setForm({ title: book.title, author: book.author, isbn: book.isbn || '', imageUrl: book.imageUrl });
    setPreviewUrl(imageSrc(book.imageUrl)); setEditingId(book.id); setShowAdd(true);
  }

  async function toggleActive(id: string) {
    await saveBooks(books.map(b => b.id === id ? { ...b, active: !b.active } : b));
  }

  async function deleteBook(id: string) {
    if (!await confirm('Delete this book cover? This cannot be undone.')) return;
    if (await saveBooks(books.filter(b => b.id !== id))) showToast('Deleted.');
  }

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {confirmDialog}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-serif text-xl font-bold text-gray-800">Book Covers</h2>
        <button onClick={() => { setShowAdd(!showAdd); setEditingId(null); setForm({ title: '', author: '', isbn: '', imageUrl: '' }); setPreviewUrl(''); }}
          className="bg-[#1a50a0] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#143d7e] transition-colors">
          + Add Cover
        </button>
      </div>

      {toast && <div className="bg-green-100 text-green-800 text-sm rounded-xl px-4 py-2">{toast}</div>}
      {loading && <p className="text-sm text-gray-500">Loading book covers…</p>}

      {showAdd && (
        <form onSubmit={submitBook} className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 space-y-4">
          <h3 className="font-bold text-gray-700">{editingId ? 'Edit Book Cover' : 'Add New Book Cover'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Book Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" placeholder="Enter book title" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Author *</label>
              <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" placeholder="Author name" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">ISBN / Reference</label>
              <input value={form.isbn} onChange={e => setForm(f => ({ ...f, isbn: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" placeholder="Optional ISBN" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Cover Image *</label>
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-400 hover:border-[#1a50a0] hover:text-[#1a50a0] transition-colors">
                {previewUrl ? '↑ Replace image' : 'Click to upload (JPG, PNG, WebP, max 5MB)'}
              </button>
              {!previewUrl && (
                <input value={form.imageUrl && !form.imageUrl.startsWith('data:') ? form.imageUrl : ''}
                  onChange={e => { setForm(f => ({ ...f, imageUrl: e.target.value })); setPreviewUrl(e.target.value); }}
                  className="w-full mt-2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]"
                  placeholder="or paste an image URL" />
              )}
            </div>
          </div>
          {previewUrl && (
            <div className="flex items-start gap-3">
              <img src={previewUrl} alt="Preview" className="w-20 h-28 object-cover rounded-xl border border-gray-200" />
              <button type="button" onClick={() => { setPreviewUrl(''); setForm(f => ({ ...f, imageUrl: '' })); }} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-[#1a50a0] disabled:opacity-50 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-[#143d7e] transition-colors">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Book'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); setForm({ title: '', author: '', isbn: '', imageUrl: '' }); setPreviewUrl(''); }}
              className="text-sm text-gray-500 px-5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      <div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0] mb-3" placeholder="Search books…" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map(book => (
            <div key={book.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${book.active ? 'border-green-200' : 'border-gray-100 opacity-60'}`}>
              <div className="relative">
                <img src={imageSrc(book.imageUrl)} alt={book.title} className="w-full h-36 object-cover" />
                <button onClick={() => void toggleActive(book.id)} disabled={saving}
                  className={`absolute top-1.5 right-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full shadow ${book.active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                  {book.active ? 'Active' : 'Off'}
                </button>
              </div>
              <div className="p-2">
                <p className="text-xs font-bold text-gray-800 truncate">{book.title}</p>
                <p className="text-[10px] text-gray-400 truncate">{book.author}</p>
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => startEdit(book)} className="flex-1 text-[10px] font-bold bg-blue-50 text-[#1a50a0] rounded-lg py-1 hover:bg-blue-100 transition-colors">Edit</button>
                  <button onClick={() => deleteBook(book.id)} className="flex-1 text-[10px] font-bold bg-red-50 text-red-600 rounded-lg py-1 hover:bg-red-100 transition-colors">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-400 text-sm">No book covers found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Game Settings ────────────────────────────────────────────────────────────

function GameSettingsPanel() {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [s, setS] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    let cancelled = false;
    store.getSettings()
      .then(settings => {
        if (cancelled) return;
        setS(settings);
        setLogoPreview(imageSrc(settings.logoUrl));
        setLoading(false);
      })
      .catch(reason => { if (!cancelled) { showToast(reason instanceof Error ? reason.message : 'Unable to load settings.'); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (s.duration <= 0) { showToast('Duration must be > 0'); return; }
    setSaving(true);
    try {
      await store.saveSettings(s);
      showToast('Settings saved!');
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!await confirm('Reset all settings to defaults?')) return;
    setSaving(true);
    try {
      const defaults = await store.resetSettings();
      setS(defaults);
      setLogoPreview(null);
      showToast('Settings reset.');
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to reset settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await imageFileToBase64(file, 'logo');
      setLogoPreview(imageSrc(base64));
      setS(previous => ({ ...previous, logoUrl: base64 }));
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to process this logo.');
    } finally {
      e.target.value = '';
    }
  }

  const TIME_OPTS = [15, 30, 45, 60, 90];

  return (
    <form onSubmit={save} className="space-y-6">
      {confirmDialog}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-serif text-xl font-bold text-gray-800">Game Settings</h2>
        <div className="flex gap-2">
          <button type="button" onClick={reset} className="text-sm text-gray-500 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Reset to Default</button>
          <button type="submit" disabled={saving || loading} className="bg-[#1a50a0] disabled:opacity-50 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-[#143d7e] transition-colors">{saving ? 'Saving…' : 'Save Settings'}</button>
        </div>
      </div>
      {toast && <div className="bg-green-100 text-green-800 text-sm rounded-xl px-4 py-2">{toast}</div>}
      {loading && <p className="text-sm text-gray-500">Loading settings…</p>}

      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 space-y-4">
        <h3 className="font-bold text-gray-600 text-sm uppercase tracking-wide">General</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Game Title</label>
            <input value={s.gameTitle} onChange={e => setS(p => ({ ...p, gameTitle: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Instructions</label>
            <input value={s.instructions} onChange={e => setS(p => ({ ...p, instructions: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Sarasavi Logo</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
          <div className="flex items-center gap-3">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-12 h-12 object-contain border border-gray-200 rounded-xl" />
            ) : (
              <img src={sarasaviLogo} alt="Default logo" className="w-12 h-12 object-contain border border-gray-200 rounded-xl" />
            )}
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-sm text-[#1a50a0] border border-[#1a50a0] px-3 py-1.5 rounded-xl hover:bg-blue-50">
              {logoPreview ? 'Replace Logo' : 'Upload Logo'}
            </button>
            {logoPreview && (
              <button type="button" onClick={() => { setLogoPreview(null); setS(p => ({ ...p, logoUrl: null })); }}
                className="text-xs text-red-500 hover:text-red-700">Remove</button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 space-y-4">
        <h3 className="font-bold text-gray-600 text-sm uppercase tracking-wide">Timing</h3>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Game Duration</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {TIME_OPTS.map(t => (
              <button key={t} type="button" onClick={() => setS(p => ({ ...p, duration: t }))}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${s.duration === t ? 'bg-[#1a50a0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-50'}`}>
                {t}s
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Custom:</label>
            <input type="number" min={5} max={600} value={s.duration}
              onChange={e => { const v = parseInt(e.target.value); if (v > 0) setS(p => ({ ...p, duration: v })); }}
              className="w-24 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" />
            <span className="text-xs text-gray-400">seconds</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Mismatch Display (ms)</label>
            <input type="number" min={300} max={5000} value={s.mismatchDuration} onChange={e => setS(p => ({ ...p, mismatchDuration: parseInt(e.target.value) }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Success Screen (seconds)</label>
            <input type="number" min={3} max={60} value={s.successScreenDuration} onChange={e => setS(p => ({ ...p, successScreenDuration: parseInt(e.target.value) }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 space-y-4">
        <h3 className="font-bold text-gray-600 text-sm uppercase tracking-wide">Messages</h3>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Success Message (use \n for line break)</label>
          <textarea rows={2} value={s.successMessage} onChange={e => setS(p => ({ ...p, successMessage: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0] resize-none" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Timeout Message (use \n for line break)</label>
          <textarea rows={2} value={s.timeoutMessage} onChange={e => setS(p => ({ ...p, timeoutMessage: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0] resize-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
        <h3 className="font-bold text-gray-600 text-sm uppercase tracking-wide mb-4">Options</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { key: 'autoNewGame', label: 'Auto New Game' },
            { key: 'celebrationAnimation', label: 'Celebration Animation' },
            { key: 'soundEffects', label: 'Sound Effects' },
            { key: 'showAds', label: 'Show Advertisements' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setS(p => ({ ...p, [key]: !p[key as keyof GameSettings] }))}
                className={`w-10 h-6 rounded-full transition-colors relative ${(s as any)[key] ? 'bg-[#1a50a0]' : 'bg-gray-200'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${(s as any)[key] ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </form>
  );
}

// ─── Advertisements ───────────────────────────────────────────────────────────

function Advertisements() {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const now = new Date().toISOString().slice(0, 16);
  const blank: Omit<Advertisement, 'id' | 'createdAt'> = {
    title: '', type: 'text', text: '', buttonText: '', destinationUrl: '',
    position: 'below', startDate: now, endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    displayDuration: 10, priority: 1, active: true,
  };
  const [form, setForm] = useState({ ...blank });
  const [imgPreview, setImgPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const quickFileRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    let cancelled = false;
    store.getAds()
      .then(nextAds => { if (!cancelled) { setAds(nextAds); setLoading(false); } })
      .catch(reason => { if (!cancelled) { showToast(reason instanceof Error ? reason.message : 'Unable to load advertisements.'); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  async function saveAds(nextAds: Advertisement[]): Promise<boolean> {
    setSaving(true);
    try {
      await store.saveAds(nextAds);
      setAds(nextAds);
      return true;
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to save advertisements.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submitAd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) { showToast('Title is required'); return; }
    if (form.type === 'image' && !form.imageUrl) { showToast('Attach an ad image first'); return; }
    if (new Date(form.endDate).getTime() <= new Date(form.startDate).getTime()) { showToast('End date must be after the start date'); return; }
    if (editId) {
      if (!await saveAds(ads.map(a => a.id === editId ? { ...a, ...form } : a))) return;
      showToast('Ad updated!'); setEditId(null);
    } else {
      if (!await saveAds([...ads, { id: `ad${Date.now()}`, ...form, createdAt: Date.now() }])) return;
      showToast('Ad created!');
    }
    setForm({ ...blank }); setImgPreview(''); setShowForm(false);
  }

  function startEdit(ad: Advertisement) {
    setForm({ title: ad.title, type: ad.type, text: ad.text || '', buttonText: ad.buttonText || '',
      destinationUrl: ad.destinationUrl || '', position: ad.position, startDate: ad.startDate.slice(0,16),
      endDate: ad.endDate.slice(0,16), displayDuration: ad.displayDuration, priority: ad.priority, active: ad.active,
      imageUrl: ad.imageUrl, videoUrl: ad.videoUrl });
    setImgPreview(imageSrc(ad.imageUrl));
    setEditId(ad.id); setShowForm(true);
  }

  async function createAttachedAd(file: File, imageUrl: string) {
    const nextAd: Advertisement = {
      id: `ad${Date.now()}`,
      title: file.name.replace(/\.[^.]+$/, '') || 'Attached Ad',
      type: 'image',
      imageUrl,
      buttonText: '',
      destinationUrl: '',
      position: 'between',
      startDate: now,
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
      displayDuration: 10,
      priority: Math.max(1, ads.length + 1),
      active: true,
      createdAt: Date.now(),
    };
    if (await saveAds([nextAd, ...ads])) showToast('Image ad attached!');
  }

  async function handleImgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await imageFileToBase64(file, 'advertisement');
      setForm(current => ({ ...current, imageUrl: base64 }));
      setImgPreview(imageSrc(base64));
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to process this image.');
    } finally {
      e.target.value = '';
    }
  }

  async function handleQuickImgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await imageFileToBase64(file, 'advertisement');
      await createAttachedAd(file, base64);
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to process this image.');
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-5">
      {confirmDialog}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-serif text-xl font-bold text-gray-800">Advertisements</h2>
        <div className="flex flex-wrap gap-2">
          <input ref={quickFileRef} type="file" accept="image/*" onChange={handleQuickImgFile} className="hidden" />
          <button type="button" onClick={() => quickFileRef.current?.click()}
            className="bg-[#1a50a0] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#143d7e] transition-colors">
            Attach Image Ad
          </button>
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...blank, type: 'image' }); setImgPreview(''); }}
            className="border border-[#1a50a0] bg-white text-[#1a50a0] text-sm font-bold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">
            + New Ad
          </button>
        </div>
      </div>
      {toast && <div className="bg-green-100 text-green-800 text-sm rounded-xl px-4 py-2">{toast}</div>}
      {loading && <p className="text-sm text-gray-500">Loading advertisements…</p>}

      {showForm && (
        <form onSubmit={submitAd} className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 space-y-4">
          <h3 className="font-bold text-gray-700">{editId ? 'Edit Advertisement' : 'New Advertisement'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Advertisement['type'] }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]">
                <option value="text">Text Banner</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Position</label>
              <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value as Advertisement['position'] }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]">
                <option value="above">Above Game Board</option>
                <option value="below">Below Game Board</option>
                <option value="between">Between Header & Board</option>
                <option value="success">Success Popup</option>
                <option value="timeout">Timeout Popup</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Priority (lower = first)</label>
              <input type="number" min={1} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Start Date</label>
              <input type="datetime-local" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">End Date</label>
              <input type="datetime-local" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" />
            </div>
          </div>
          {form.type === 'text' && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Ad Text</label>
              <textarea rows={2} value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0] resize-none" />
            </div>
          )}
          {form.type === 'image' && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Ad Image</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImgFile} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-400 hover:border-[#1a50a0] hover:text-[#1a50a0] transition-colors">
                {imgPreview ? '↑ Replace image' : 'Click to upload image'}
              </button>
              {imgPreview && <img src={imgPreview} alt="Preview" className="mt-2 h-16 object-cover rounded-xl" />}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Button Text</label>
              <input value={form.buttonText} onChange={e => setForm(f => ({ ...f, buttonText: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" placeholder="e.g. Shop Now" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Destination URL</label>
              <input value={form.destinationUrl} onChange={e => setForm(f => ({ ...f, destinationUrl: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" placeholder="https://…" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => setForm(f => ({ ...f, active: !f.active }))}
              className={`w-10 h-6 rounded-full transition-colors relative ${form.active ? 'bg-[#1a50a0]' : 'bg-gray-200'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm text-gray-700">Active</span>
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-[#1a50a0] disabled:opacity-50 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-[#143d7e] transition-colors">
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Ad'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
              className="text-sm text-gray-500 px-5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {ads.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">No advertisements yet.</p>}
        {ads.map(ad => {
          const isExpired = new Date(ad.endDate).getTime() < Date.now();
          return (
            <div key={ad.id} className={`bg-white rounded-2xl shadow-sm border p-4 flex items-center gap-4 ${ad.active && !isExpired ? 'border-green-200' : 'border-gray-100 opacity-70'}`}>
              {ad.type === 'image' && ad.imageUrl && (
                <img src={imageSrc(ad.imageUrl)} alt={ad.title} className="h-16 w-24 shrink-0 rounded-xl border border-gray-100 bg-gray-50 object-contain" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-gray-800 truncate">{ad.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ad.active && !isExpired ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isExpired ? 'Expired' : ad.active ? 'Active' : 'Paused'}
                  </span>
                  <span className="text-[10px] bg-blue-50 text-[#1a50a0] px-2 py-0.5 rounded-full font-bold capitalize">{ad.type}</span>
                </div>
                <p className="text-xs text-gray-400">{ad.position} • Priority {ad.priority} • {ad.startDate?.slice(0,10)} → {ad.endDate?.slice(0,10)}</p>
                {ad.text && <p className="text-xs text-gray-500 mt-0.5 truncate">{ad.text}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { void saveAds(ads.map(a => a.id === ad.id ? { ...a, active: !a.active } : a)); }} disabled={saving}
                  className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${ad.active ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                  {ad.active ? 'Pause' : 'Resume'}
                </button>
                <button onClick={() => startEdit(ad)} className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 text-[#1a50a0] hover:bg-blue-100 transition-colors">Edit</button>
                <button onClick={async () => { if (!await confirm('Delete this ad?')) return; if (await saveAds(ads.filter(a => a.id !== ad.id))) showToast('Deleted.'); }}
                  className="text-xs font-bold px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const NAV = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'books', label: 'Book Covers', icon: '📚' },
  { id: 'settings', label: 'Game Settings', icon: '⚙️' },
  { id: 'ads', label: 'Advertisements', icon: 'Ad' },
];

function Dashboard({ user }: { user: User }) {
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  async function logout() {
    setLogoutError('');
    try {
      await store.adminLogout();
    } catch (reason) {
      setLogoutError(reason instanceof Error ? reason.message : 'Unable to sign out.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-60 bg-[#0f2d5e] flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-white/10 flex items-center gap-3">
          <div className="flex h-12 w-32 items-center justify-center rounded-xl bg-white px-3 shadow-lg ring-1 ring-white/40">
            <img src={sarasaviLogo} alt="Sarasavi" className="max-h-9 max-w-full object-contain" />
          </div>
          <div>
            <p className="text-white font-serif font-bold text-sm leading-tight">Sarasavi</p>
          </div>
        </div>
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {NAV.filter(item => item.id !== 'account').map(item => (
            <button
              key={item.id}
              onClick={() => { setTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors text-left ${tab === item.id ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="mb-2 truncate text-[10px] text-blue-300" title={user.email || ''}>{user.email}</p>
          <Link to="/" className="flex items-center gap-2 text-blue-300 hover:text-white text-sm transition-colors">
            <span>🎮</span> View Game
          </Link>
          <button onClick={logout} className="mt-3 flex w-full items-center gap-2 text-sm text-blue-300 transition-colors hover:text-white">
            <span>↪</span> Logout
          </button>
          {logoutError && <p className="mt-2 text-xs text-red-300">{logoutError}</p>}
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h1 className="font-serif font-bold text-gray-800 flex-1">
            {NAV.find(n => n.id === tab)?.label}
          </h1>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {tab === 'overview' && <Overview />}
          {tab === 'books' && <BookCovers />}
          {tab === 'settings' && <GameSettingsPanel />}
          {tab === 'ads' && <Advertisements />}
        </main>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(firebaseConfigurationError || '');

  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (firebaseConfigurationError) return;
    setSubmitting(true);
    setError('');
    try {
      await store.adminLogin(email.trim(), password);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to sign in.';
      setError(message.includes('auth/invalid-credential') ? 'Invalid email or password.' : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <form onSubmit={login} className="w-full max-w-sm rounded-3xl border border-blue-100 bg-white p-7 shadow-xl">
        <img src={sarasaviLogo} alt="Sarasavi" className="mx-auto mb-5 h-14 max-w-full object-contain" />
        <h1 className="text-center font-serif text-2xl font-bold text-[#1a50a0]">Admin Login</h1>
        <p className="mb-6 mt-1 text-center text-sm text-gray-500">Sign in with your Firebase administrator account.</p>
        {error && <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Email</label>
        <input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="mb-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" />
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Password</label>
        <input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="mb-5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a50a0]" />
        <button type="submit" disabled={submitting || Boolean(firebaseConfigurationError)} className="w-full rounded-xl bg-[#1a50a0] py-3 text-sm font-bold text-white transition-colors hover:bg-[#143d7e] disabled:opacity-50">
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
        <Link to="/" className="mt-4 block text-center text-sm text-[#1a50a0] hover:underline">← Back to game</Link>
      </form>
    </div>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => store.subscribeToAuth(currentUser => {
    setUser(currentUser);
    setAuthReady(true);
  }), []);

  if (!authReady) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm font-bold text-[#1a50a0]">Checking administrator session…</div>;
  }

  return user ? <Dashboard user={user} /> : <AdminLogin />;
}
