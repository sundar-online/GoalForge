import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import {
  Plus, ArrowLeft, Trash2, CheckSquare, Square,
  FileText, ListChecks, MoreVertical, Search, X, Clock
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
const card = {
  background: 'var(--bg-card)',
  borderRadius: 20,
  padding: '18px 20px',
  boxShadow: 'var(--shadow-sm)',
  border: '1px solid var(--border-light)',
  cursor: 'pointer',
  transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
};

const fab = {
  position: 'fixed',
  bottom: 110,
  right: 'max(24px, calc(50% - 235px))',
  width: 56,
  height: 56,
  borderRadius: 18,
  background: 'var(--accent-blue)',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 8px 28px rgba(77,124,255,0.45)',
  transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
  zIndex: 90,
};

const inputStyle = {
  width: '100%',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-med)',
  borderRadius: 14,
  padding: '12px 16px',
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--text-main)',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border 0.2s, box-shadow 0.2s',
};

const btnPrimary = {
  background: 'var(--accent-blue)',
  color: '#fff',
  border: 'none',
  borderRadius: 14,
  padding: '12px 20px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const btnGhost = {
  background: 'transparent',
  color: 'var(--text-muted)',
  border: 'none',
  borderRadius: 12,
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

// ── Main Component ───────────────────────────────────────
export const NotesPage = () => {
  const { notes, addNote, updateNote, deleteNote } = useAppContext();
  const [view, setView] = useState('list');          // 'list' | 'detail' | 'new'
  const [activeNote, setActiveNote] = useState(null);
  const [search, setSearch] = useState('');
  const [menuId, setMenuId] = useState(null);
  const [newItemText, setNewItemText] = useState('');
  const newItemRef = useRef(null);
  const titleRef = useRef(null);

  // ── New Note State ────────────────────────────────────
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('text'); // 'text' | 'checklist'

  // Filter notes
  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.content || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Handlers ──────────────────────────────────────────
  const handleCreateNote = () => {
    if (!newTitle.trim()) return;
    const note = {
      title: newTitle.trim(),
      content: '',
      checklist: newType === 'checklist' ? [] : null,
    };
    const created = addNote(note);
    setNewTitle('');
    setNewType('text');
    setActiveNote(created);
    setView('detail');
  };

  const openNote = (note) => {
    setActiveNote(note);
    setView('detail');
    setMenuId(null);
  };

  const handleDeleteNote = (id) => {
    deleteNote(id);
    setMenuId(null);
    if (activeNote && activeNote.id === id) {
      setView('list');
      setActiveNote(null);
    }
  };

  const handleUpdateTitle = (title) => {
    const updated = { ...activeNote, title, updated_at: new Date().toISOString() };
    setActiveNote(updated);
    updateNote(activeNote.id, { title, updated_at: updated.updated_at });
  };

  const handleUpdateContent = (content) => {
    const updated = { ...activeNote, content, updated_at: new Date().toISOString() };
    setActiveNote(updated);
    updateNote(activeNote.id, { content, updated_at: updated.updated_at });
  };

  const handleToggleItem = (itemId) => {
    const newChecklist = activeNote.checklist.map(c =>
      c.id === itemId ? { ...c, completed: !c.completed } : c
    );
    const updated = { ...activeNote, checklist: newChecklist, updated_at: new Date().toISOString() };
    setActiveNote(updated);
    updateNote(activeNote.id, { checklist: newChecklist, updated_at: updated.updated_at });
  };

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    const item = { id: Date.now().toString(), text: newItemText.trim(), completed: false };
    const newChecklist = [...(activeNote.checklist || []), item];
    const updated = { ...activeNote, checklist: newChecklist, updated_at: new Date().toISOString() };
    setActiveNote(updated);
    updateNote(activeNote.id, { checklist: newChecklist, updated_at: updated.updated_at });
    setNewItemText('');
    setTimeout(() => newItemRef.current?.focus(), 50);
  };

  const handleDeleteItem = (itemId) => {
    const newChecklist = activeNote.checklist.filter(c => c.id !== itemId);
    const updated = { ...activeNote, checklist: newChecklist, updated_at: new Date().toISOString() };
    setActiveNote(updated);
    updateNote(activeNote.id, { checklist: newChecklist, updated_at: updated.updated_at });
  };

  const handleUpdateItemText = (itemId, text) => {
    const newChecklist = activeNote.checklist.map(c =>
      c.id === itemId ? { ...c, text } : c
    );
    const updated = { ...activeNote, checklist: newChecklist, updated_at: new Date().toISOString() };
    setActiveNote(updated);
    updateNote(activeNote.id, { checklist: newChecklist, updated_at: updated.updated_at });
  };

  const handleConvertToChecklist = () => {
    const newChecklist = activeNote.content
      ? activeNote.content.split('\n').filter(l => l.trim()).map(l => ({
        id: Date.now().toString() + Math.random(),
        text: l.trim(),
        completed: false,
      }))
      : [];
    const updated = { ...activeNote, checklist: newChecklist, content: '', updated_at: new Date().toISOString() };
    setActiveNote(updated);
    updateNote(activeNote.id, { checklist: newChecklist, content: '', updated_at: updated.updated_at });
  };

  // Auto-focus title on new note
  useEffect(() => {
    if (view === 'new') setTimeout(() => titleRef.current?.focus(), 100);
  }, [view]);

  // ── RENDER: New Note ──────────────────────────────────
  if (view === 'new') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setView('list')}
            style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', transition: 'background 0.2s', flexShrink: 0 }}>
            <ArrowLeft size={18} />
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            New Note
          </h1>
        </header>

        {/* Form */}
        <div style={{ ...card, cursor: 'default', display: 'flex', flexDirection: 'column', gap: 18, padding: '24px' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Title</label>
            <input
              ref={titleRef}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Note title..."
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleCreateNote()}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'block' }}>Type</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { id: 'text', icon: FileText, label: 'Text Note' },
                { id: 'checklist', icon: ListChecks, label: 'Checklist' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setNewType(t.id)}
                  style={{
                    flex: 1,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '18px 14px',
                    borderRadius: 16,
                    background: newType === t.id ? 'var(--accent-blue-light)' : 'var(--bg-input)',
                    border: `2px solid ${newType === t.id ? 'var(--accent-blue)' : 'var(--border-med)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: newType === t.id ? 'var(--accent-blue)' : 'var(--text-muted)',
                  }}
                >
                  <t.icon size={22} strokeWidth={newType === t.id ? 2.5 : 2} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleCreateNote} disabled={!newTitle.trim()}
            style={{
              ...btnPrimary,
              justifyContent: 'center',
              opacity: newTitle.trim() ? 1 : 0.5,
              transform: newTitle.trim() ? 'none' : 'scale(0.98)',
            }}>
            <Plus size={18} strokeWidth={2.5} />
            Create Note
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER: Note Detail ───────────────────────────────
  if (view === 'detail' && activeNote) {
    const isChecklist = Array.isArray(activeNote.checklist);
    const doneCount = isChecklist ? activeNote.checklist.filter(c => c.completed).length : 0;
    const totalCount = isChecklist ? activeNote.checklist.length : 0;
    const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { setView('list'); setActiveNote(null); }}
            style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', transition: 'background 0.2s', flexShrink: 0 }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <input
              value={activeNote.title}
              onChange={e => handleUpdateTitle(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 20, fontWeight: 900, color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit', letterSpacing: '-0.5px', padding: 0 }}
              placeholder="Untitled"
            />
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} /> {fmtDate(activeNote.updated_at || activeNote.created_at)}
            </p>
          </div>
          <button onClick={() => handleDeleteNote(activeNote.id)}
            style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', transition: 'background 0.2s', flexShrink: 0 }}>
            <Trash2 size={17} />
          </button>
        </header>

        {/* Checklist Progress */}
        {isChecklist && totalCount > 0 && (
          <div style={{ ...card, cursor: 'default', padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Progress</span>
              <span style={{
                fontSize: 13, fontWeight: 800,
                color: progressPct === 100 ? '#22c55e' : 'var(--accent-blue)',
              }}>
                {doneCount}/{totalCount} done
              </span>
            </div>
            <div style={{ background: 'var(--bg-input)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
              <div style={{
                width: `${progressPct}%`,
                height: '100%',
                borderRadius: 999,
                background: progressPct === 100
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : 'linear-gradient(90deg, var(--accent-blue), #818cf8)',
                transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            </div>
            {progressPct === 100 && (
              <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 700, color: '#22c55e', textAlign: 'center' }}>
                🎉 All items completed!
              </p>
            )}
          </div>
        )}

        {/* Checklist Items */}
        {isChecklist && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence initial={false}>
              {[...activeNote.checklist]
                .sort((a, b) => Number(a.completed) - Number(b.completed))
                .map((item) => (
                  <motion.div 
                    layout
                    key={item.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ 
                      layout: { type: "spring", stiffness: 350, damping: 25 },
                      opacity: { duration: 0.2 }
                    }}
                    style={{
                      ...card,
                      cursor: 'default',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      opacity: item.completed ? 0.65 : 1,
                      transition: 'opacity 0.3s ease',
                      border: `1px solid ${item.completed ? 'var(--border-med)' : 'var(--border-light)'}`,
                    }}
                  >
                    <button
                      onClick={() => handleToggleItem(item.id)}
                      style={{
                        width: 28, height: 28, borderRadius: 10,
                        background: item.completed ? 'var(--accent-blue)' : 'var(--bg-input)',
                        border: `2px solid ${item.completed ? 'var(--accent-blue)' : 'var(--border-med)'}`,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                        flexShrink: 0,
                      }}
                    >
                      {item.completed && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                    <input
                      value={item.text}
                      onChange={e => handleUpdateItemText(item.id, e.target.value)}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        outline: 'none',
                        fontFamily: 'inherit',
                        padding: 0,
                        textDecoration: item.completed ? 'line-through' : 'none',
                        transition: 'color 0.2s',
                      }}
                    />
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', opacity: 0.5, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                    >
                      <X size={15} />
                    </button>
                  </motion.div>
                ))}
            </AnimatePresence>

            {/* Add New Item */}
            <div style={{ ...card, cursor: 'default', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderStyle: 'dashed' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 10,
                background: 'var(--bg-input)',
                border: '2px dashed var(--border-med)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Plus size={14} color="var(--text-muted)" />
              </div>
              <input
                ref={newItemRef}
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                placeholder="Add new item..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  padding: 0,
                }}
                onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              />
              {newItemText.trim() && (
                <button onClick={handleAddItem}
                  style={{ ...btnPrimary, padding: '8px 14px', fontSize: 12, borderRadius: 10 }}>
                  Add
                </button>
              )}
            </div>
          </div>
        )}

        {/* Text Content (for non-checklist notes) */}
        {!isChecklist && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <textarea
              value={activeNote.content || ''}
              onChange={e => handleUpdateContent(e.target.value)}
              placeholder="Start writing..."
              style={{
                ...inputStyle,
                minHeight: 240,
                resize: 'vertical',
                lineHeight: 1.7,
                fontSize: 15,
                borderRadius: 20,
                padding: '20px',
              }}
            />
            <button onClick={handleConvertToChecklist} style={{ ...btnGhost, display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
              <ListChecks size={15} /> Convert to checklist
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── RENDER: Notes List ────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <header>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.8px' }}>
          Notes
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </p>
      </header>

      {/* Search */}
      {notes.length > 0 && (
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes..."
            style={{ ...inputStyle, paddingLeft: 42, borderRadius: 16 }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {/* Notes Grid */}
      {filtered.length === 0 ? (
        <div style={{
          ...card,
          cursor: 'default',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '48px 20px', gap: 12, textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'var(--accent-blue-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileText size={28} color="var(--accent-blue)" />
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
            {search ? 'No notes found' : 'No notes yet'}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', maxWidth: 260, lineHeight: 1.5 }}>
            {search ? 'Try a different search term' : 'Create your first note to get started. Use text notes or checklists to stay organized.'}
          </p>
          {!search && (
            <button onClick={() => setView('new')} style={{ ...btnPrimary, marginTop: 4 }}>
              <Plus size={18} strokeWidth={2.5} /> Create Note
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(note => {
            const isChecklist = Array.isArray(note.checklist);
            const doneCount = isChecklist ? note.checklist.filter(c => c.completed).length : 0;
            const totalCount = isChecklist ? note.checklist.length : 0;
            const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

            return (
              <div
                key={note.id}
                onClick={() => openNote(note)}
                style={card}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 10,
                        background: isChecklist ? 'rgba(168,85,247,0.12)' : 'var(--accent-blue-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {isChecklist
                          ? <ListChecks size={15} color="#a855f7" strokeWidth={2.5} />
                          : <FileText size={15} color="var(--accent-blue)" strokeWidth={2.5} />
                        }
                      </div>
                      <h3 style={{
                        margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-main)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {note.title}
                      </h3>
                    </div>
                    <p style={{ margin: '0 0 0 38px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {getPreview(note)}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                      {fmtDate(note.updated_at || note.created_at)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuId(menuId === note.id ? null : note.id); }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', borderRadius: 8, transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <MoreVertical size={15} />
                    </button>
                  </div>
                </div>

                {/* Checklist mini-progress */}
                {isChecklist && totalCount > 0 && (
                  <div style={{ marginTop: 12, marginLeft: 38 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, background: 'var(--bg-input)', borderRadius: 999, height: 5, overflow: 'hidden' }}>
                        <div style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: progressPct === 100
                            ? '#22c55e'
                            : 'linear-gradient(90deg, var(--accent-blue), #818cf8)',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                        color: progressPct === 100 ? '#22c55e' : 'var(--accent-blue)',
                      }}>
                        {doneCount}/{totalCount}
                      </span>
                    </div>
                  </div>
                )}

                {/* Context Menu */}
                {menuId === note.id && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      marginTop: 10,
                      background: 'var(--bg-float)',
                      borderRadius: 14,
                      boxShadow: 'var(--shadow-md)',
                      padding: 6,
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'transparent',
                        border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700, color: '#ef4444',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Trash2 size={15} /> Delete Note
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setView('new')}
        style={fab}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(77,124,255,0.55)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(77,124,255,0.45)'; }}
      >
        <Plus size={26} color="white" strokeWidth={2.5} />
      </button>
    </div>
  );
};
