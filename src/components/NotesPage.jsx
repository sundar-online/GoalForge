import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import {
  Plus, ArrowLeft, Trash2, CheckSquare, Square, Check,
  FileText, ListChecks, MoreVertical, Search, X, Clock, Pin,
  Folder, FolderPlus, ChevronDown
} from 'lucide-react';

// -- Helpers --
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
  const [newNoteFolder, setNewNoteFolder] = useState('');

  // ── Folder States ─────────────────────────────────────
  const [selectedFolder, setSelectedFolder] = useState('');
  const [activeFolderDropdown, setActiveFolderDropdown] = useState(false);
  const [typedFolderName, setTypedFolderName] = useState('');
  const [isTypingNewFolder, setIsTypingNewFolder] = useState(false);

  // Extract all unique folder names dynamically
  const allFolders = Array.from(new Set(notes.map(n => n.folder).filter(Boolean)));

  // Filter notes by search query and folder
  const filtered = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
      (n.content || '').toLowerCase().includes(search.toLowerCase());
    const matchesFolder = selectedFolder ? n.folder === selectedFolder : true;
    return matchesSearch && matchesFolder;
  });
  const pinnedNotes = filtered.filter(n => n.pinned);
  const otherNotes = filtered.filter(n => !n.pinned);

  // ── Handlers ──────────────────────────────────────────
  const handleCreateNote = () => {
    if (!newTitle.trim()) return;
    const note = {
      title: newTitle.trim(),
      content: '',
      checklist: newType === 'checklist' ? [] : null,
      folder: newNoteFolder.trim() || '',
    };
    const created = addNote(note);
    setNewTitle('');
    setNewType('text');
    setNewNoteFolder('');
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

  const handleTogglePin = (note) => {
    const pinned = !note.pinned;
    const updated = { ...note, pinned, updated_at: new Date().toISOString() };
    if (activeNote && activeNote.id === note.id) {
      setActiveNote(updated);
    }
    updateNote(note.id, { pinned, updated_at: updated.updated_at });
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
      <div className="flex flex-col gap-6">
        <header className="flex items-center gap-4">
          <button 
            onClick={() => setView('list')}
            className="w-11 h-11 rounded-xl bg-bg-card border border-border-light flex items-center justify-center text-text-main hover:bg-bg-input transition-all active:scale-90"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-black text-text-main tracking-tight">New Note</h1>
        </header>

        <div className="bg-bg-card border border-border-light p-6 rounded-3xl flex flex-col gap-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Title</label>
            <input
              ref={titleRef}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Give your note a title..."
              className="w-full bg-bg-input border border-border-med rounded-xl px-4 py-3 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleCreateNote()}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Structure</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'text', icon: FileText, label: 'Free Text' },
                { id: 'checklist', icon: ListChecks, label: 'Checklist' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setNewType(t.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    newType === t.id 
                    ? 'bg-accent-blue/10 border-accent-blue text-accent-blue' 
                    : 'bg-bg-input border-border-med text-text-muted grayscale hover:grayscale-0'
                  }`}
                >
                  <t.icon size={20} strokeWidth={2.5} />
                  <span className="text-xs font-black">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Folder (Optional)</label>
            
            {allFolders.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {allFolders.map(folder => (
                    <button
                      key={folder}
                      type="button"
                      onClick={() => setNewNoteFolder(newNoteFolder === folder ? '' : folder)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                        newNoteFolder === folder
                          ? 'bg-accent-blue/10 border-accent-blue text-accent-blue'
                          : 'bg-bg-input border-border-med text-text-muted hover:border-border-light'
                      }`}
                    >
                      <Folder size={12} /> {folder}
                    </button>
                  ))}
                </div>
                
                <div className="relative mt-1">
                  <input
                    value={newNoteFolder}
                    onChange={e => setNewNoteFolder(e.target.value)}
                    placeholder="Or type a new folder name..."
                    className="w-full bg-bg-input border border-border-med rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-text-main outline-hidden focus:border-accent-blue transition-colors"
                  />
                  <FolderPlus size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted" />
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={newNoteFolder}
                  onChange={e => setNewNoteFolder(e.target.value)}
                  placeholder="e.g. Work, Ideas, Fitness..."
                  className="w-full bg-bg-input border border-border-med rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue transition-colors"
                />
                <FolderPlus size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted" />
              </div>
            )}
          </div>

          <button 
            onClick={handleCreateNote}
            className="w-full py-4 rounded-2xl bg-accent-blue text-white font-black text-sm hover:opacity-90 transition-opacity"
          >
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
      <div className="flex flex-col gap-6 pb-32 md:pb-10">
        {/* Header */}
        <header className="flex items-center gap-4">
          <button onClick={() => { setView('list'); setActiveNote(null); }}
            className="w-11 h-11 rounded-xl bg-bg-card border border-border-light flex items-center justify-center text-text-main hover:bg-bg-input transition-all active:scale-90 shadow-sm flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <input
              value={activeNote.title}
              onChange={e => handleUpdateTitle(e.target.value)}
              className="w-full bg-transparent border-none text-2xl font-black text-text-main outline-hidden p-0 tracking-tight"
              placeholder="Untitled System"
            />
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={10} /> {fmtDate(activeNote.updated_at || activeNote.created_at)}
              </p>
              
              {/* Folder badge / toggle */}
              <div className="relative inline-block">
                <button
                  onClick={() => setActiveFolderDropdown(!activeFolderDropdown)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black tracking-wider uppercase transition-all ${
                    activeNote.folder
                      ? 'bg-accent-blue/10 border-accent-blue/20 text-accent-blue'
                      : 'bg-bg-input border-border-med text-text-muted hover:text-text-main hover:border-border-light'
                  }`}
                >
                  <Folder size={9} />
                  {activeNote.folder || 'Add to Folder'}
                  <ChevronDown size={8} />
                </button>

                {activeFolderDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setActiveFolderDropdown(false); setIsTypingNewFolder(false); }} />
                    <div className="absolute left-0 mt-1.5 w-48 bg-bg-card border border-border-med rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1 text-xs normal-case">
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest px-2 py-1 border-b border-border-light mb-1">Select Folder</p>
                      
                      <button
                        onClick={() => {
                          updateNote(activeNote.id, { folder: '' });
                          setActiveNote(prev => ({ ...prev, folder: '' }));
                          setActiveFolderDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-all ${
                          !activeNote.folder ? 'bg-accent-blue/10 text-accent-blue' : 'hover:bg-bg-input text-text-main'
                        }`}
                      >
                        <X size={10} /> None
                      </button>

                      {allFolders.map(folder => (
                        <button
                          key={folder}
                          onClick={() => {
                            updateNote(activeNote.id, { folder });
                            setActiveNote(prev => ({ ...prev, folder }));
                            setActiveFolderDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg font-bold flex items-center gap-2 truncate transition-all ${
                            activeNote.folder === folder ? 'bg-accent-blue/10 text-accent-blue' : 'hover:bg-bg-input text-text-muted hover:text-text-main'
                          }`}
                        >
                          <Folder size={10} /> {folder}
                        </button>
                      ))}

                      {isTypingNewFolder ? (
                        <div className="p-1 mt-1 border-t border-border-light pt-2 flex flex-col gap-1.5">
                          <input
                            autoFocus
                            value={typedFolderName}
                            onChange={e => setTypedFolderName(e.target.value)}
                            placeholder="New folder name..."
                            className="w-full bg-bg-input border border-border-med rounded-lg px-2 py-1 text-xs font-bold text-text-main outline-hidden"
                            onKeyDown={e => {
                              if (e.key === 'Enter' && typedFolderName.trim()) {
                                const folder = typedFolderName.trim();
                                updateNote(activeNote.id, { folder });
                                setActiveNote(prev => ({ ...prev, folder }));
                                setTypedFolderName('');
                                setIsTypingNewFolder(false);
                                setActiveFolderDropdown(false);
                              }
                            }}
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                if (typedFolderName.trim()) {
                                  const folder = typedFolderName.trim();
                                  updateNote(activeNote.id, { folder });
                                  setActiveNote(prev => ({ ...prev, folder }));
                                  setTypedFolderName('');
                                  setIsTypingNewFolder(false);
                                  setActiveFolderDropdown(false);
                                }
                              }}
                              className="flex-1 py-1 bg-accent-blue text-white rounded-md text-[10px] font-black text-center"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => { setIsTypingNewFolder(false); setTypedFolderName(''); }}
                              className="px-2 py-1 bg-bg-input border border-border-med text-text-muted rounded-md text-[10px] font-black text-center"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsTypingNewFolder(true)}
                          className="w-full text-left px-2 py-1.5 rounded-lg font-bold flex items-center gap-2 text-accent-blue hover:bg-accent-blue/5 border-t border-border-light mt-1 transition-all"
                        >
                          <Plus size={10} /> Create New...
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => handleTogglePin(activeNote)}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all active:scale-90 flex-shrink-0 ${activeNote.pinned ? 'bg-accent-blue/10 border-accent-blue/20 text-accent-blue' : 'bg-bg-card border-border-light text-text-muted hover:bg-bg-input'}`}>
            <Pin size={18} className={activeNote.pinned ? 'fill-current' : 'rotate-45'} />
          </button>
          <button onClick={() => handleDeleteNote(activeNote.id)}
            className="w-11 h-11 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-500 transition-all active:scale-90 flex-shrink-0">
            <Trash2 size={18} />
          </button>
        </header>

        {/* Checklist Progress */}
        {isChecklist && totalCount > 0 && (
          <div className="bg-bg-card border border-border-light p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Synchronization</span>
              <span className={`text-xs font-black ${progressPct === 100 ? 'text-emerald-500' : 'text-accent-blue'}`}>
                {doneCount}/{totalCount} Units Active
              </span>
            </div>
            <div className="bg-bg-input rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${progressPct === 100 ? 'bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-accent-blue shadow-[0_0_12px_rgba(77,124,255,0.4)]'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Checklist Items */}
        {isChecklist && (
          <div className="flex flex-col gap-3">
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
                    className={`bg-bg-card border p-4 rounded-2xl flex items-center gap-4 transition-all ${item.completed ? 'border-border-med opacity-60' : 'border-border-light shadow-xs'}`}
                  >
                    <button
                      onClick={() => handleToggleItem(item.id)}
                      className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                        item.completed 
                        ? 'bg-accent-blue border-accent-blue' 
                        : 'bg-bg-input border-border-med'
                      }`}
                    >
                      {item.completed && <Check size={14} strokeWidth={4} className="text-white" />}
                    </button>
                    <input
                      value={item.text}
                      onChange={e => handleUpdateItemText(item.id, e.target.value)}
                      className={`flex-1 bg-transparent border-none text-sm font-bold text-text-main outline-hidden p-0 ${item.completed ? 'line-through' : ''}`}
                    />
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-text-muted opacity-30 hover:opacity-100 hover:text-red-500 transition-all p-1"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
            </AnimatePresence>

            <div className="bg-bg-card border-2 border-dashed border-border-med p-4 rounded-2xl flex items-center gap-4 group focus-within:border-accent-blue transition-colors">
              <div className="w-7 h-7 rounded-lg border-2 border-dashed border-border-med flex items-center justify-center">
                <Plus size={14} className="text-text-muted" />
              </div>
              <input
                ref={newItemRef}
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                placeholder="Add sub-task..."
                className="flex-1 bg-transparent border-none text-sm font-medium text-text-main outline-hidden p-0"
                onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              />
              {newItemText.trim() && (
                <button 
                  onClick={handleAddItem}
                  className="bg-accent-blue text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shrink-0"
                >
                  Append
                </button>
              )}
            </div>
          </div>
        )}

        {/* Text Content */}
        {!isChecklist && (
          <div className="flex flex-col gap-4">
            <textarea
              value={activeNote.content || ''}
              onChange={e => handleUpdateContent(e.target.value)}
              placeholder="Start forging your thoughts..."
              className="w-full min-h-[300px] bg-bg-card border border-border-light rounded-[32px] p-8 text-base font-medium text-text-main leading-relaxed outline-hidden focus:border-accent-blue transition-colors shadow-sm resize-none"
            />
            <button 
              onClick={handleConvertToChecklist} 
              className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest hover:text-accent-blue transition-colors px-4"
            >
              <ListChecks size={14} /> Convert to operational checklist
            </button>
          </div>
        )}
      </div>
    );
  }

  // -- Helper to render a Note Card --
  const renderNoteCard = (note) => {
    const isChecklist = Array.isArray(note.checklist);
    const doneCount = isChecklist ? note.checklist.filter(c => c.completed).length : 0;
    const totalCount = isChecklist ? note.checklist.length : 0;
    const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    return (
      <div
        key={note.id}
        onClick={() => openNote(note)}
        className={`bg-bg-card border p-5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.99] relative ${
          note.pinned 
            ? 'border-accent-blue/30 bg-gradient-to-br from-bg-card to-accent-blue/[0.02]' 
            : 'border-border-light hover:border-accent-blue/30'
        }`}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isChecklist ? 'bg-purple-500/10 text-purple-500' : 'bg-accent-blue/10 text-accent-blue'}`}>
                {isChecklist ? <ListChecks size={16} strokeWidth={2.5} /> : <FileText size={16} strokeWidth={2.5} />}
              </div>
              <h3 className="font-black text-text-main tracking-tight truncate flex items-center gap-2">
                {note.title}
                {note.pinned && (
                  <Pin size={10} className="text-accent-blue fill-current rotate-45 flex-shrink-0" />
                )}
              </h3>
            </div>
            <p className="text-xs font-bold text-text-muted line-clamp-1 pl-11">
              {getPreview(note)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
              {fmtDate(note.updated_at || note.created_at)}
            </span>
            {note.folder && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent-blue/5 border border-accent-blue/10 text-[9px] font-black tracking-wider uppercase text-accent-blue">
                <Folder size={8} /> {note.folder}
              </span>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleTogglePin(note); }}
                className={`p-1.5 rounded-lg transition-all ${
                  note.pinned 
                    ? 'text-accent-blue bg-accent-blue/10' 
                    : 'text-text-muted opacity-30 hover:opacity-100 hover:bg-bg-input hover:text-text-main'
                }`}
              >
                <Pin size={12} className={note.pinned ? 'fill-current' : 'rotate-45'} />
              </button>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuId(menuId === note.id ? null : note.id); }}
                  className="p-1.5 rounded-lg text-text-muted hover:bg-bg-input hover:text-text-main transition-colors"
                >
                  <MoreVertical size={14} />
                </button>
                
                {menuId === note.id && (
                  <div className="absolute top-10 right-0 w-40 bg-bg-card border border-border-light rounded-xl shadow-float z-50 p-1 animate-in fade-in zoom-in-95">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTogglePin(note); setMenuId(null); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-main hover:bg-bg-input text-xs font-black transition-colors"
                    >
                      <Pin size={14} className="rotate-45" /> {note.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/10 text-xs font-black transition-colors"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {isChecklist && totalCount > 0 && (
          <div className="mt-4 pl-11">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-bg-input rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${progressPct === 100 ? 'bg-emerald-500' : 'bg-accent-blue'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className={`text-[10px] font-black ${progressPct === 100 ? 'text-emerald-500' : 'text-text-muted'}`}>
                {doneCount}/{totalCount}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // -- RENDER: Notes List --
  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">System Logs</h1>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-1">
            {notes.length} {notes.length === 1 ? 'Stored Record' : 'Stored Records'}
          </p>
        </div>
      </header>

      {/* Search */}
      {notes.length > 0 && (
        <div className="relative group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-blue transition-colors" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search through records..."
            className="w-full bg-bg-card border border-border-light rounded-2xl pl-12 pr-12 py-4 text-sm font-bold text-text-main outline-hidden focus:border-accent-blue transition-all shadow-xs"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-1">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Folder Filters — Only When Needed! */}
      {allFolders.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mt-1 scrollbar-none">
          <button
            onClick={() => setSelectedFolder('')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex-shrink-0 border transition-all ${
              selectedFolder === ''
                ? 'bg-accent-blue/10 border-accent-blue/20 text-accent-blue shadow-xs'
                : 'bg-bg-card border-border-light text-text-muted hover:border-border-med hover:text-text-main'
            }`}
          >
            All Logs
          </button>
          
          {allFolders.map(folder => (
            <button
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex-shrink-0 border transition-all flex items-center gap-1.5 ${
                selectedFolder === folder
                  ? 'bg-accent-blue/10 border-accent-blue/20 text-accent-blue shadow-xs'
                  : 'bg-bg-card border-border-light text-text-muted hover:border-border-med hover:text-text-main'
              }`}
            >
              <Folder size={11} className={selectedFolder === folder ? 'fill-current' : ''} />
              {folder}
            </button>
          ))}
        </div>
      )}

      {/* Notes Grid */}
      {filtered.length === 0 ? (
        <div className="bg-bg-card border border-border-light p-12 rounded-[32px] flex flex-col items-center text-center gap-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-bg-input flex items-center justify-center text-text-muted">
            <FileText size={32} />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-black text-text-main">
              {search ? 'No Matches Found' : 'Neural Net Empty'}
            </p>
            <p className="text-sm text-text-muted font-medium max-w-[240px] leading-relaxed">
              {search ? 'Adjust your query parameters.' : 'Initialize your first record to begin tracking strategies and observations.'}
            </p>
          </div>
          {!search && (
            <button onClick={() => setView('new')} className="mt-2 bg-accent-blue hover:bg-accent-blue/90 px-6 py-3 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-accent-blue/20">
              New Record
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-1.5 px-1">
                <Pin size={12} className="text-accent-blue rotate-45 fill-current" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Pinned Logs</span>
              </div>
              <div className="flex flex-col gap-3">
                {pinnedNotes.map(note => renderNoteCard(note))}
              </div>
            </div>
          )}

          {otherNotes.length > 0 && (
            <div className="space-y-3">
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-1.5 px-1 pt-2">
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">All Logs</span>
                </div>
              )}
              <div className="flex flex-col gap-3">
                {otherNotes.map(note => renderNoteCard(note))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setView('new')}
        className="fixed bottom-24 right-6 md:right-8 lg:right-12 w-14 h-14 rounded-2xl bg-accent-blue text-white shadow-lg shadow-accent-blue/30 flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-50 group"
      >
        <Plus size={28} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </div>
  );
};
