import { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export const useNotes = () => {
  const { notes, addNote, updateNote, deleteNote } = useAppContext();
  const [view, setView] = useState('list'); // 'list' | 'detail' | 'new'
  const [activeNote, setActiveNote] = useState(null);
  const [search, setSearch] = useState('');
  const [menuId, setMenuId] = useState(null);
  const [newItemText, setNewItemText] = useState('');
  const titleRef = useRef(null);
  const newItemRef = useRef(null);

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('text');

  const filteredNotes = useMemo(() => {
    return notes.filter(n =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      (n.content || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [notes, search]);

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

  return {
    notes,
    view,
    setView,
    activeNote,
    search,
    setSearch,
    menuId,
    setMenuId,
    newItemText,
    setNewItemText,
    titleRef,
    newItemRef,
    newTitle,
    setNewTitle,
    newType,
    setNewType,
    filteredNotes,
    handleCreateNote,
    openNote,
    handleDeleteNote,
    handleUpdateTitle,
    handleUpdateContent,
    handleToggleItem,
    handleAddItem,
    handleDeleteItem,
    handleUpdateItemText,
    handleConvertToChecklist
  };
};
