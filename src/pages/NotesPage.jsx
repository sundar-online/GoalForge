import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotes } from '../hooks/useNotes';
import { 
  Plus, ArrowLeft, Trash2, FileText, ListChecks, 
  MoreVertical, Search, X, Clock 
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────
const fmtDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getPreview = (note) => {
  if (note.checklist && note.checklist.length > 0) {
    const done = note.checklist.filter(c => c.completed).length;
    return `${done}/${note.checklist.length} items completed`;
  }
  if (note.content) return note.content.slice(0, 80) + (note.content.length > 80 ? '…' : '');
  return 'Empty note';
};

// ── Style Constants ──────────────────────────────────────
const STYLES = {
  card: {
    background: 'var(--bg-card)', borderRadius: 20, padding: '18px 20px', boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-light)', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
  },
  fab: {
    position: 'fixed', bottom: 110, right: 'max(24px, calc(50% - 235px))', width: 56, height: 56,
    borderRadius: 18, background: 'var(--accent-blue)', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(77,124,255,0.45)',
    transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)', zIndex: 90,
  },
  input: {
    width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-med)', borderRadius: 14,
    padding: '12px 16px', fontSize: 14, fontWeight: 500, color: 'var(--text-main)', outline: 'none',
    fontFamily: 'inherit', transition: 'border 0.2s, box-shadow 0.2s',
  },
  btnPrimary: {
    background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 20px',
    fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
  },
  btnGhost: {
    background: 'transparent', color: 'var(--text-muted)', border: 'none', borderRadius: 12, padding: '10px 16px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
  }
};

const NewNote = ({ context }) => {
  useEffect(() => {
    setTimeout(() => context.titleRef.current?.focus(), 100);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => context.setView('list')} style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}><ArrowLeft size={18} /></button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>New Note</h1>
      </header>
      <div style={{ ...STYLES.card, cursor: 'default', display: 'flex', flexDirection: 'column', gap: 18, padding: '24px' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Title</label>
          <input ref={context.titleRef} value={context.newTitle} onChange={e => context.setNewTitle(e.target.value)} placeholder="Note title..." style={STYLES.input} onKeyDown={e => e.key === 'Enter' && context.handleCreateNote()} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'block' }}>Type</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ id: 'text', icon: FileText, label: 'Text' }, { id: 'checklist', icon: ListChecks, label: 'List' }].map(t => (
              <button key={t.id} onClick={() => context.setNewType(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 14px', borderRadius: 16, background: context.newType === t.id ? 'var(--accent-blue-light)' : 'var(--bg-input)', border: `2px solid ${context.newType === t.id ? 'var(--accent-blue)' : 'var(--border-med)'}`, cursor: 'pointer', color: context.newType === t.id ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                <t.icon size={22} /><span style={{ fontSize: 12, fontWeight: 700 }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={context.handleCreateNote} disabled={!context.newTitle.trim()} style={{ ...STYLES.btnPrimary, justifyContent: 'center', opacity: context.newTitle.trim() ? 1 : 0.5 }}><Plus size={18} /> Create Note</button>
      </div>
    </div>
  );
};

const NoteDetail = ({ context }) => {
  const note = context.activeNote;
  const isChecklist = Array.isArray(note.checklist);
  const doneCount = isChecklist ? note.checklist.filter(c => c.completed).length : 0;
  const totalCount = isChecklist ? note.checklist.length : 0;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => { context.setView('list'); }} style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}><ArrowLeft size={18} /></button>
        <div style={{ flex: 1 }}>
          <input value={note.title} onChange={e => context.handleUpdateTitle(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 20, fontWeight: 900, color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit', letterSpacing: '-0.5px' }} />
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {fmtDate(note.updated_at || note.created_at)}</p>
        </div>
        <button onClick={() => context.handleDeleteNote(note.id)} style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}><Trash2 size={17} /></button>
      </header>

      {isChecklist && totalCount > 0 && (
        <div style={{ ...STYLES.card, cursor: 'default', padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Progress</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: progressPct === 100 ? '#22c55e' : 'var(--accent-blue)' }}>{doneCount}/{totalCount} done</span>
          </div>
          <div style={{ background: 'var(--bg-input)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: 999, background: progressPct === 100 ? '#22c55e' : 'var(--accent-blue)', transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {isChecklist ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence initial={false}>
            {note.checklist.map(item => (
              <motion.div layout key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ layout: { type: "spring", stiffness: 350, damping: 25 } }} style={{ ...STYLES.card, cursor: 'default', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: item.completed ? 0.65 : 1 }}>
                <button onClick={() => context.handleToggleItem(item.id)} style={{ width: 28, height: 28, borderRadius: 10, background: item.completed ? 'var(--accent-blue)' : 'var(--bg-input)', border: `2px solid ${item.completed ? 'var(--accent-blue)' : 'var(--border-med)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.completed && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                </button>
                <input value={item.text} onChange={e => context.handleUpdateItemText(item.id, e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text-main)', outline: 'none', textDecoration: item.completed ? 'line-through' : 'none' }} />
                <button onClick={() => context.handleDeleteItem(item.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} /></button>
              </motion.div>
            ))}
          </AnimatePresence>
          <div style={{ ...STYLES.card, cursor: 'default', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderStyle: 'dashed' }}>
            <input ref={context.newItemRef} value={context.newItemText} onChange={e => context.setNewItemText(e.target.value)} placeholder="Add new item..." style={{ ...STYLES.input, background: 'transparent', border: 'none', padding: 0 }} onKeyDown={e => e.key === 'Enter' && context.handleAddItem()} />
            <button onClick={context.handleAddItem} disabled={!context.newItemText.trim()} style={{ ...STYLES.btnPrimary, padding: '8px 14px', fontSize: 12 }}>Add</button>
          </div>
        </div>
      ) : (
        <textarea value={note.content || ''} onChange={e => context.handleUpdateContent(e.target.value)} placeholder="Start writing..." style={{ ...STYLES.input, minHeight: 240, borderRadius: 20, padding: '20px' }} />
      )}
    </div>
  );
};

export const NotesPage = () => {
  const context = useNotes();
  const { view, setView, search, setSearch, filteredNotes, openNote, notes } = context;

  if (view === 'new') return <NewNote context={context} />;
  if (view === 'detail') return <NoteDetail context={context} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.8px' }}>Notes</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{notes.length} notes</p>
      </header>

      {notes.length > 0 && (
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." style={{ ...STYLES.input, paddingLeft: 42, borderRadius: 16 }} />
        </div>
      )}

      {filteredNotes.length === 0 ? (
        <div style={{ ...STYLES.card, cursor: 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px', gap: 12, textAlign: 'center' }}>
          <FileText size={48} color="var(--accent-blue-light)" />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{search ? 'No notes found' : 'No notes yet'}</p>
          {!search && <button onClick={() => setView('new')} style={{ ...STYLES.btnPrimary, marginTop: 4 }}><Plus size={18} /> Create Note</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredNotes.map(note => {
            const isChecklist = Array.isArray(note.checklist);
            return (
              <div key={note.id} onClick={() => openNote(note)} style={STYLES.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {isChecklist ? <ListChecks size={15} color="#a855f7" /> : <FileText size={15} color="var(--accent-blue)" />}
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{note.title}</h3>
                    </div>
                    <p style={{ margin: '0 0 0 24px', fontSize: 12, color: 'var(--text-muted)' }}>{getPreview(note)}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>{fmtDate(note.updated_at || note.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={() => setView('new')} style={STYLES.fab}><Plus size={26} color="white" /></button>
    </div>
  );
};

