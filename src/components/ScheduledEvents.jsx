import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Plus, Clock, Trash2, CheckCircle2, Circle,
  Bell, BellOff, ChevronLeft, ChevronRight, X, Edit3,
  Target, Zap, AlertCircle, Calendar
} from 'lucide-react';
import { TODAY } from '../utils/dateUtils';

// ── Constants ──────────────────────────────────────────
const REMINDER_OPTIONS = [
  { value: 0,    label: 'At time',    sublabel: 'On the dot'   },
  { value: 15,   label: '15 min',     sublabel: 'Before'       },
  { value: 30,   label: '30 min',     sublabel: 'Before'       },
  { value: 60,   label: '1 hour',     sublabel: 'Before'       },
  { value: 1440, label: '1 day',      sublabel: 'Before'       },
];

const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS         = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Mini Calendar ──────────────────────────────────────
function MiniCalendar({ selectedDate, onSelectDate, events }) {
  const today = TODAY();
  const [viewDate, setViewDate] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const firstDay    = new Date(viewDate.year, viewDate.month, 1).getDay();
  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();

  const prevMonth = () =>
    setViewDate(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 });
  const nextMonth = () =>
    setViewDate(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 });

  const eventDays = useMemo(() => {
    const set = new Set();
    events.forEach(e => {
      const d = new Date(e.date + 'T00:00:00');
      if (d.getFullYear() === viewDate.year && d.getMonth() === viewDate.month) set.add(d.getDate());
    });
    return set;
  }, [events, viewDate]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-bg-card rounded-[28px] p-5 border border-border-light shadow-sm">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-8 h-8 rounded-xl hover:bg-bg-input flex items-center justify-center text-text-muted hover:text-text-main transition-colors">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-black text-text-main tracking-tight">
          {MONTHS[viewDate.month]} {viewDate.year}
        </p>
        <button onClick={nextMonth} className="w-8 h-8 rounded-xl hover:bg-bg-input flex items-center justify-center text-text-muted hover:text-text-main transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[9px] font-black text-text-muted uppercase tracking-wider py-1">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const dateStr    = `${viewDate.year}-${String(viewDate.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isToday    = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasEvent   = eventDays.has(day);
          return (
            <button
              key={day}
              onClick={() => onSelectDate(dateStr)}
              className={`
                relative aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all hover:scale-105
                ${isSelected ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/30'
                  : isToday  ? 'bg-bg-input text-accent-blue ring-1 ring-accent-blue/50'
                  :            'text-text-muted hover:bg-bg-input hover:text-text-main'}
              `}
            >
              {day}
              {hasEvent && !isSelected && (
                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isToday ? 'bg-accent-blue' : 'bg-accent-blue/60'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Premium Event Form Modal ────────────────────────────
function EventFormModal({ initialDate, editEvent, onSave, onClose, goals }) {
  const [title,           setTitle]           = useState(editEvent?.title           || '');
  const [description,     setDescription]     = useState(editEvent?.description     || '');
  const [date,            setDate]            = useState(editEvent?.date            || initialDate || TODAY());
  const [time,            setTime]            = useState(editEvent?.time            || '09:00');
  const [reminderEnabled, setReminderEnabled] = useState(editEvent?.reminderEnabled ?? false);
  const [reminderMinutes, setReminderMinutes] = useState(editEvent?.reminderMinutes ?? 30);
  const [linkedGoalId,    setLinkedGoalId]    = useState(editEvent?.linkedGoalId    || '');

  // Hide bottom nav while modal is open
  React.useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    onSave({ title: title.trim(), description: description.trim(), date, time, reminderEnabled, reminderMinutes, linkedGoalId: linkedGoalId || null });
    onClose();
  };

  const isEditing = !!editEvent;
  const canSubmit = title.trim().length > 0 && !!date;

  // Format chosen date for the display badge
  const formattedDate = (() => {
    if (!date) return 'Pick a date';
    const [y, m, d] = date.split('-');
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dt = new Date(date + 'T00:00:00');
    return `${dayNames[dt.getDay()]}, ${parseInt(d)} ${MONTHS_SHORT[parseInt(m)-1]} ${y}`;
  })();

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Edit Event' : 'Create New Event'}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
        className="relative w-full sm:max-w-lg bg-bg-card sm:rounded-[32px] rounded-t-[32px] shadow-float border border-border-light z-10 flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 2rem)' }}
      >
        {/* ── Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border-med opacity-60" />
        </div>

        {/* ── Header ──────────────────────────────────── */}
        <div className="px-6 pt-4 pb-5 border-b border-border-light/50 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center flex-shrink-0">
                <CalendarDays size={18} className="text-accent-blue" />
              </div>
              <div>
                <h2 className="text-lg font-black text-text-main tracking-tight leading-tight">
                  {isEditing ? 'Edit Event' : 'New Event'}
                </h2>
                <p className="text-[11px] text-text-muted font-semibold mt-0.5">
                  {isEditing ? 'Update event details' : 'Schedule your next milestone'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-bg-input flex items-center justify-center text-text-muted hover:text-text-main hover:bg-border-med transition-all active:scale-95 flex-shrink-0 ml-2"
              aria-label="Close modal"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Scrollable Form Body ─────────────────────── */}
        <form
          id="event-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5"
        >
          {/* Event Title */}
          <div className="space-y-2">
            <label
              htmlFor="event-title"
              className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5"
            >
              <span className="w-1 h-3 rounded-full bg-accent-blue inline-block" />
              Event Title <span className="text-accent-blue">*</span>
            </label>
            <input
              id="event-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What's happening?"
              maxLength={80}
              required
              autoFocus
              aria-required="true"
              className="w-full bg-bg-input border-2 border-border-light rounded-2xl px-4 py-3.5 text-sm text-text-main font-bold placeholder:text-text-muted placeholder:font-normal focus:outline-none focus:border-accent-blue/60 focus:bg-accent-blue/5 transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label
              htmlFor="event-description"
              className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5"
            >
              <span className="w-1 h-3 rounded-full bg-border-med inline-block" />
              Description
            </label>
            <textarea
              id="event-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add details (optional)"
              rows={2}
              maxLength={300}
              className="w-full bg-bg-input border-2 border-border-light rounded-2xl px-4 py-3.5 text-sm text-text-main font-bold placeholder:text-text-muted placeholder:font-normal focus:outline-none focus:border-accent-blue/60 focus:bg-accent-blue/5 transition-all resize-none"
            />
          </div>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            <div className="space-y-2">
              <label
                htmlFor="event-date"
                className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5"
              >
                <CalendarDays size={10} className="text-text-muted" />
                Date <span className="text-accent-blue">*</span>
              </label>
              <div className="relative">
                <input
                  id="event-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  aria-required="true"
                  className="w-full bg-bg-input border-2 border-border-light rounded-2xl px-4 py-3.5 pr-10 text-sm text-text-main font-bold focus:outline-none focus:border-accent-blue/60 focus:bg-accent-blue/5 transition-all appearance-none date-input-no-icon"
                />
                <CalendarDays size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <label
                htmlFor="event-time"
                className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5"
              >
                <Clock size={10} className="text-text-muted" />
                Time
              </label>
              <div className="relative">
                <input
                  id="event-time"
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-bg-input border-2 border-border-light rounded-2xl px-4 py-3.5 pr-10 text-sm text-text-main font-bold focus:outline-none focus:border-accent-blue/60 focus:bg-accent-blue/5 transition-all appearance-none date-input-no-icon"
                />
                <Clock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Selected date badge */}
          {date && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-blue/8 border border-accent-blue/15">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse flex-shrink-0" />
              <p className="text-[11px] font-black text-accent-blue">{formattedDate}{time && ` · ${time}`}</p>
            </div>
          )}

          {/* Reminder Section */}
          <div className="space-y-3">
            {/* Toggle row */}
            <div className="flex items-center justify-between bg-bg-input/60 border-2 border-border-light rounded-2xl px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${reminderEnabled ? 'bg-accent-blue/15' : 'bg-bg-input'}`}>
                  {reminderEnabled
                    ? <Bell size={15} className="text-accent-blue" />
                    : <BellOff size={15} className="text-text-muted" />
                  }
                </div>
                <div>
                  <p className="text-sm font-black text-text-main leading-tight">Reminder</p>
                  <p className="text-[10px] text-text-muted font-semibold">
                    {reminderEnabled ? 'Will notify you before the event' : 'No notification set'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={reminderEnabled}
                aria-label="Toggle reminder"
                onClick={() => setReminderEnabled(p => !p)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${reminderEnabled ? 'bg-accent-blue shadow-md shadow-accent-blue/30' : 'bg-border-med'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${reminderEnabled ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Reminder time pills */}
            <AnimatePresence>
              {reminderEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2.5 px-1">
                    Notify me
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {REMINDER_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setReminderMinutes(opt.value)}
                        aria-pressed={reminderMinutes === opt.value}
                        className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border-2 transition-all active:scale-95 ${
                          reminderMinutes === opt.value
                            ? 'bg-accent-blue/10 border-accent-blue text-accent-blue shadow-sm shadow-accent-blue/10'
                            : 'bg-bg-input border-border-light text-text-muted hover:border-border-med hover:text-text-main'
                        }`}
                      >
                        <span className="text-[11px] font-black leading-tight">{opt.label}</span>
                        <span className="text-[8px] font-bold opacity-70 leading-tight mt-0.5">{opt.sublabel}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Goal link */}
          {goals && goals.length > 0 && (
            <div className="space-y-2">
              <label
                htmlFor="event-goal"
                className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5"
              >
                <Target size={10} className="text-text-muted" />
                Link to Goal
                <span className="text-text-muted/50 font-bold normal-case tracking-normal text-[9px]"> · optional</span>
              </label>
              <div className="relative">
                <select
                  id="event-goal"
                  value={linkedGoalId}
                  onChange={e => setLinkedGoalId(e.target.value)}
                  className="w-full bg-bg-input border-2 border-border-light rounded-2xl px-4 py-3.5 text-sm text-text-main font-bold focus:outline-none focus:border-accent-blue/60 focus:bg-accent-blue/5 transition-all appearance-none cursor-pointer pr-10"
                >
                  <option value="">No goal linked</option>
                  {goals.filter(g => !g.isMissingDream).map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
                <Target size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
          )}

          {/* Bottom padding so content clears the sticky footer */}
          <div className="h-2" />
        </form>

        {/* ── Sticky CTA Footer ──────────────────────── */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-border-light/50 bg-bg-card rounded-b-[32px]">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3.5 rounded-2xl bg-bg-input border border-border-light text-text-muted hover:text-text-main hover:bg-border-light text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex-shrink-0"
              aria-label="Cancel and close"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="event-form"
              disabled={!canSubmit}
              className={`flex-1 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg ${
                canSubmit
                  ? 'bg-accent-blue text-white shadow-accent-blue/25 hover:opacity-95'
                  : 'bg-bg-input text-text-muted cursor-not-allowed opacity-50'
              }`}
              aria-label={isEditing ? 'Save changes' : 'Create event'}
            >
              {isEditing ? (
                <>
                  <Edit3 size={15} strokeWidth={2.5} />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus size={15} strokeWidth={2.5} />
                  Create Event
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Event Card — compact, no categories ────────────────
function EventCard({ event, onComplete, onDelete, onEdit, goals }) {
  const today   = TODAY();
  const isPast  = event.date < today && !event.completed;
  const isToday = event.date === today;

  const [y, m, d] = event.date.split('-');
  const dateLabel = `${parseInt(d, 10)} ${MONTHS_SHORT[parseInt(m, 10) - 1]} ${y}`;
  const linkedGoal = goals?.find(g => g.id === event.linkedGoalId);

  // Status pill config
  let statusLabel, statusClass;
  if (event.completed)  { statusLabel = 'Completed'; statusClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'; }
  else if (isPast)      { statusLabel = 'Overdue';   statusClass = 'bg-red-500/15    text-red-400    border-red-500/30';     }
  else if (isToday)     { statusLabel = 'Today';     statusClass = 'bg-accent-blue/15 text-accent-blue border-accent-blue/30'; }
  else                  { statusLabel = 'Upcoming';  statusClass = 'bg-bg-input text-text-muted border-border-light';          }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className={`
        group relative bg-bg-card rounded-[22px] p-5 border-2 shadow-sm transition-all hover:shadow-md
        ${event.completed ? 'border-emerald-500/15 opacity-70'
          : isPast        ? 'border-red-500/20'
          : isToday       ? 'border-accent-blue/30'
          :                 'border-border-light hover:border-border-med'}
      `}
    >
      {/* Top row: status + actions */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${statusClass}`}>
          {statusLabel}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(event)} className="w-7 h-7 rounded-lg hover:bg-bg-input flex items-center justify-center text-text-muted hover:text-text-main transition-colors">
            <Edit3 size={13} />
          </button>
          <button onClick={() => onDelete(event.id)} className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-text-muted hover:text-red-400 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className={`text-sm font-black tracking-tight leading-snug mb-3 ${event.completed ? 'line-through text-text-muted' : 'text-text-main'}`}>
        {event.title}
      </h3>

      {/* Meta: date · time · goal */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-text-muted">
        <span className="flex items-center gap-1">
          <CalendarDays size={11} />
          {dateLabel}
        </span>
        {event.time && (
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {event.time}
          </span>
        )}
        {event.reminderEnabled && (
          <span className="flex items-center gap-1 text-accent-blue/70">
            <Bell size={10} />
            Reminder
          </span>
        )}
        {linkedGoal && (
          <span className="flex items-center gap-1 text-accent-blue/70">
            <Target size={10} />
            {linkedGoal.title}
          </span>
        )}
      </div>

      {/* Complete toggle */}
      <button
        onClick={() => onComplete(event.id, !event.completed)}
        className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
          event.completed
            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            : 'bg-bg-input text-text-muted hover:text-text-main hover:bg-bg-input/80'
        }`}
      >
        {event.completed ? <><CheckCircle2 size={13} /> Completed</> : <><Circle size={13} /> Mark as Done</>}
      </button>
    </motion.div>
  );
}

// ── Compact empty state ─────────────────────────────────
function EmptyState({ onAdd, filterLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-bg-card rounded-[24px] border-2 border-dashed border-border-med">
      <div className="w-12 h-12 rounded-2xl bg-bg-input flex items-center justify-center mb-3">
        <Calendar size={22} className="text-text-muted opacity-60" />
      </div>
      <p className="font-black text-text-main mb-1">
        {filterLabel === 'Upcoming' ? 'No upcoming events' : filterLabel === 'Completed' ? 'Nothing completed yet' : 'No events scheduled'}
      </p>
      <p className="text-xs text-text-muted font-bold mb-4 leading-relaxed">
        {filterLabel === 'Completed' ? 'Mark an event as done to see it here.' : 'Add your first event to start planning.'}
      </p>
      {filterLabel !== 'Completed' && (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-blue text-white font-black text-xs shadow-lg shadow-accent-blue/25 hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus size={14} /> Create First Event
        </button>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────
export const ScheduledEvents = () => {
  const { scheduledEvents, addScheduledEvent, updateScheduledEvent, deleteScheduledEvent, goals, loading } = useAppContext();

  const [selectedDate,  setSelectedDate]  = useState(TODAY());
  const [showForm,      setShowForm]      = useState(false);
  const [editingEvent,  setEditingEvent]  = useState(null);
  const [activeFilter,  setActiveFilter]  = useState('all');   // 'all' | 'upcoming' | 'completed'

  const today = TODAY();

  // ── Derived data ──────────────────────────────────────
  const upcomingEvents = useMemo(() =>
    scheduledEvents.filter(e => !e.completed && e.date >= today),
    [scheduledEvents, today]
  );

  const todayEvents = useMemo(() =>
    scheduledEvents.filter(e => e.date === today),
    [scheduledEvents, today]
  );

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'upcoming')  return scheduledEvents.filter(e => !e.completed && e.date >= today);
    if (activeFilter === 'completed') return scheduledEvents.filter(e => e.completed);
    return scheduledEvents;
  }, [scheduledEvents, activeFilter, today]);

  const eventsOnSelectedDate = useMemo(() =>
    scheduledEvents.filter(e => e.date === selectedDate),
    [scheduledEvents, selectedDate]
  );

  // Stats
  const totalEvents    = scheduledEvents.length;
  const completedCount = scheduledEvents.filter(e => e.completed).length;
  const overdueCount   = scheduledEvents.filter(e => e.date < today && !e.completed).length;

  // ── Handlers ──────────────────────────────────────────
  const handleSave = async (data) => {
    if (editingEvent) await updateScheduledEvent(editingEvent.id, data);
    else              await addScheduledEvent(data);
  };

  const openAdd  = () => { setEditingEvent(null); setShowForm(true); };
  const openEdit = (ev) => { setEditingEvent(ev); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingEvent(null); };

  const FILTERS = [
    { id: 'all',       label: 'All Events' },
    { id: 'upcoming',  label: 'Upcoming'   },
    { id: 'completed', label: 'Completed'  },
  ];

  const filterLabel = FILTERS.find(f => f.id === activeFilter)?.label ?? 'All Events';

  return (
    <div className="flex flex-col gap-6 lg:gap-8 max-w-full">

      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <CalendarDays size={18} className="text-indigo-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-text-main tracking-tight">Scheduled Events</h1>
          </div>
          <p className="text-xs text-text-muted font-medium pl-10">Plan ahead. Stay on track.</p>
        </div>
        <button
          onClick={openAdd}
          id="add-event-btn"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-accent-blue text-white font-black text-sm shadow-lg shadow-accent-blue/30 hover:opacity-90 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus size={18} /> New Event
        </button>
      </header>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Scheduled', val: totalEvents,    color: 'text-accent-blue',  bg: 'bg-accent-blue/10',  icon: CalendarDays },
          { label: 'Completed', val: completedCount, color: 'text-emerald-400',  bg: 'bg-emerald-500/10',  icon: CheckCircle2 },
          { label: 'Overdue',   val: overdueCount,   color: 'text-red-400',       bg: 'bg-red-500/10',      icon: AlertCircle  },
        ].map(({ label, val, color, bg, icon: Icon }) => (
          <div key={label} className="bg-bg-card rounded-[22px] p-4 border border-border-light shadow-sm flex flex-col items-center gap-2 text-center">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={17} className={color} />
            </div>
            <p className={`text-2xl font-black tracking-tighter leading-none ${color}`}>{val}</p>
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

        {/* Left column: Calendar + Selected Day + Next Up */}
        <div className="lg:col-span-4 flex flex-col gap-5">

          {/* Calendar */}
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            events={scheduledEvents}
          />

          {/* Selected day panel */}
          <div className="bg-bg-card rounded-[28px] p-5 border border-border-light shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Selected Day</p>
                <p className="text-base font-black text-text-main tracking-tight">
                  {selectedDate === today ? 'Today' : (() => {
                    const [y, m, d] = selectedDate.split('-');
                    return `${parseInt(d,10)} ${MONTHS_SHORT[parseInt(m,10)-1]} ${y}`;
                  })()}
                </p>
              </div>
              <button
                onClick={openAdd}
                className="w-8 h-8 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue hover:bg-accent-blue/20 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            {eventsOnSelectedDate.length === 0 ? (
              <div className="py-5 text-center">
                <p className="text-xs text-text-muted font-bold">No events on this day</p>
                <button onClick={openAdd} className="mt-2 text-[10px] font-black text-accent-blue hover:underline underline-offset-4">+ Add event</button>
              </div>
            ) : (
              <div className="space-y-2">
                {eventsOnSelectedDate.map(ev => {
                  const isToday = ev.date === today;
                  const isPast  = ev.date < today && !ev.completed;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => openEdit(ev)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border-light hover:border-border-med bg-bg-input/30 hover:bg-bg-input/60 cursor-pointer transition-all group"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${ev.completed ? 'bg-emerald-400' : isPast ? 'bg-red-400' : isToday ? 'bg-accent-blue animate-pulse' : 'bg-text-muted/40'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black truncate ${ev.completed ? 'line-through text-text-muted' : 'text-text-main'}`}>{ev.title}</p>
                        {ev.time && <p className="text-[9px] text-text-muted font-bold">{ev.time}</p>}
                      </div>
                      {ev.completed && <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next Up strip */}
          {upcomingEvents.length > 0 && (
            <div className="bg-gradient-to-br from-accent-blue/10 via-indigo-500/5 to-transparent rounded-[28px] p-5 border border-accent-blue/20 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={13} className="text-accent-blue" fill="currentColor" />
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Next Up</p>
              </div>
              <div className="space-y-2">
                {upcomingEvents.slice(0, 3).map(ev => {
                  const [, m, d] = ev.date.split('-');
                  return (
                    <div key={ev.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-bg-card border border-border-light flex flex-col items-center justify-center shrink-0">
                        <span className="text-[7px] font-black text-text-muted uppercase leading-none">{MONTHS_SHORT[parseInt(m,10)-1]}</span>
                        <span className="text-sm font-black text-text-main leading-none">{parseInt(d,10)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-text-main truncate">{ev.title}</p>
                        {ev.time && <p className="text-[9px] text-text-muted">{ev.time}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Filter + Event List */}
        <div className="lg:col-span-8 flex flex-col gap-5">

          {/* Filter bar — 3 pills only */}
          <div className="flex gap-1.5 p-1 bg-bg-card border border-border-light rounded-2xl shadow-sm">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  activeFilter === f.id
                    ? 'bg-bg-dark-elem text-text-inverted shadow-md'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-36 bg-bg-card rounded-[22px] border border-border-light animate-pulse" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState onAdd={openAdd} filterLabel={filterLabel} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredEvents.map(ev => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    goals={goals}
                    onComplete={(id, val) => updateScheduledEvent(id, { completed: val })}
                    onDelete={deleteScheduledEvent}
                    onEdit={openEdit}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <EventFormModal
            initialDate={selectedDate}
            editEvent={editingEvent}
            onSave={handleSave}
            onClose={closeForm}
            goals={goals}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
