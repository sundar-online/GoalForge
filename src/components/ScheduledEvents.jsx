import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Plus, Clock, Trash2, CheckCircle2, Circle,
  Bell, BellOff, ChevronLeft, ChevronRight, X, Edit3,
  Target, Zap, AlertCircle, Calendar, ChevronDown,
  Repeat2, AlarmClock, RotateCcw, RefreshCw
} from 'lucide-react';
import { TODAY } from '../utils/dateUtils';

// ── Constants ──────────────────────────────────────────
const REMINDER_OPTIONS = [
  { value: 0,    label: 'At time',    sublabel: 'On the dot'   },
  { value: 5,    label: '5 min',      sublabel: 'Before'       },
  { value: 15,   label: '15 min',     sublabel: 'Before'       },
  { value: 30,   label: '30 min',     sublabel: 'Before'       },
  { value: 60,   label: '1 hour',     sublabel: 'Before'       },
  { value: 1440, label: '1 day',      sublabel: 'Before'       },
];

const REPEAT_OPTIONS = [
  { value: 'once',    label: 'Once'    },
  { value: 'daily',   label: 'Daily'   },
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly'  },
];

const WEEK_DAYS = [
  { id: 'Mon', label: 'M' },
  { id: 'Tue', label: 'T' },
  { id: 'Wed', label: 'W' },
  { id: 'Thu', label: 'T' },
  { id: 'Fri', label: 'F' },
  { id: 'Sat', label: 'S' },
  { id: 'Sun', label: 'S' },
];

const SNOOZE_DURATIONS = [
  { value: 5,  label: '5 min'  },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
];

// ── Recurring event expansion utility ──────────────────
function expandRecurringEvents(events, today, maxFuture = 90) {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + maxFuture);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const results = [];

  for (const ev of events) {
    const repeat = ev.repeat || 'once';
    if (repeat === 'once') {
      results.push(ev);
      continue;
    }

    // Generate up to 5 upcoming instances from the master event
    const interval = ev.repeatInterval || 1;
    const repeatDays = ev.repeatDays || [];

    let current = new Date(ev.date + 'T00:00:00');
    let instanceCount = 0;
    const maxInstances = 5;

    while (instanceCount < maxInstances) {
      const dateStr = current.toISOString().split('T')[0];
      if (dateStr > cutoffStr) break;

      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][current.getDay()];
      const meetsWeeklyFilter = repeat !== 'weekly' || repeatDays.length === 0 || repeatDays.includes(dayName);

      if (dateStr >= today && meetsWeeklyFilter) {
        results.push({
          ...ev,
          id: `${ev.id}_inst_${dateStr}`,
          masterId: ev.id,
          date: dateStr,
          isInstance: true,
        });
        instanceCount++;
      }

      // Advance to next occurrence
      if (repeat === 'daily') {
        current.setDate(current.getDate() + interval);
      } else if (repeat === 'weekly') {
        current.setDate(current.getDate() + 1);
      } else if (repeat === 'monthly') {
        current.setMonth(current.getMonth() + interval);
      } else if (repeat === 'yearly') {
        current.setFullYear(current.getFullYear() + interval);
      } else {
        break;
      }
    }
  }

  return results;
}

// ── Repeat label helper ─────────────────────────────────
function repeatLabel(ev) {
  const repeat = ev.repeat || 'once';
  if (repeat === 'once') return null;
  const interval = ev.repeatInterval || 1;
  const days = ev.repeatDays || [];
  if (repeat === 'daily')   return interval === 1 ? 'Daily' : `Every ${interval} days`;
  if (repeat === 'weekly') {
    const base = interval === 1 ? 'Weekly' : `Every ${interval} wks`;
    return days.length > 0 ? `${base} · ${days.slice(0,3).join(' ')}${days.length > 3 ? '…' : ''}` : base;
  }
  if (repeat === 'monthly') return interval === 1 ? 'Monthly' : `Every ${interval} mo`;
  if (repeat === 'yearly')  return 'Yearly';
  return null;
}

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

// ── Wheel picker constants ───────────────────────────────
const ITEM_H = 36; // h-9 = 2.25rem = 36px — height of each wheel row

// ── WheelColumn — top-level so React never recreates it ─
function WheelColumn({ items, selectedValue, onSelect, format, width = 'flex-1' }) {
  const containerRef = React.useRef(null);

  // Store callbacks and values in refs to prevent stale closures in event listeners
  const onSelectRef = React.useRef(onSelect);
  const itemsRef = React.useRef(items);
  const selectedValueRef = React.useRef(selectedValue);

  React.useEffect(() => { onSelectRef.current = onSelect; });
  React.useEffect(() => { itemsRef.current = items; });
  React.useEffect(() => { selectedValueRef.current = selectedValue; });

  // Initial scroll to center selected item on mount
  React.useEffect(() => {
    const el = containerRef.current;
    if (el) {
      const idx = items.indexOf(selectedValue);
      const targetScrollTop = Math.max(0, idx) * ITEM_H;
      el.scrollTop = targetScrollTop;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen to native scroll events to update selection dynamically as user scrolls/swipes
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(itemsRef.current.length - 1, idx));
      const newItem = itemsRef.current[clamped];
      if (newItem !== selectedValueRef.current) {
        onSelectRef.current(newItem);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${width} h-28 overflow-y-auto scrollbar-none snap-y snap-mandatory text-center flex flex-col`}
    >
      <div className="h-9 shrink-0" />
      {items.map((item) => {
        const sel = selectedValue === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => {
              onSelect(item);
              if (containerRef.current) {
                const targetScrollTop = items.indexOf(item) * ITEM_H;
                containerRef.current.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
              }
            }}
            className={`h-9 flex items-center justify-center text-sm font-black snap-center shrink-0 transition-all duration-150 ${
              sel ? 'text-accent-blue scale-110' : 'text-text-muted/50 hover:text-text-muted'
            }`}
          >
            {format ? format(item) : item}
          </button>
        );
      })}
      <div className="h-9 shrink-0" />
    </div>
  );
}



// ── Shared wheel layout component ────────────────────────
function WheelPicker({ hoursList, minutesList, hour12, minute, period, updateTime }) {
  return (
    <div className="relative flex gap-2 bg-bg-input/30 rounded-2xl border border-border-light/50 h-36 items-center justify-center overflow-hidden">
      {/* Selection highlight bar */}
      <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-9 border-y border-accent-blue/30 bg-accent-blue/5 pointer-events-none rounded-lg z-20" />
      {/* Fade top */}
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-bg-card to-transparent pointer-events-none z-10" />
      {/* Fade bottom */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-bg-card to-transparent pointer-events-none z-10" />

      <WheelColumn
        items={hoursList}
        selectedValue={hour12}
        onSelect={(h) => updateTime(h, minute, period)}
        format={(h) => String(h).padStart(2, '0')}
      />

      <span className="text-text-muted/60 font-black text-base z-20 shrink-0 pb-0.5">:</span>

      <WheelColumn
        items={minutesList}
        selectedValue={minute}
        onSelect={(m) => updateTime(hour12, m, period)}
        format={(m) => String(m).padStart(2, '0')}
      />

      <WheelColumn
        items={['AM', 'PM']}
        selectedValue={period}
        onSelect={(p) => updateTime(hour12, minute, p)}
        width="w-14"
      />
    </div>
  );
}

// ── Custom Time Picker Component ────────────────────────
function CustomTimePicker({ value, onChange, id }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = React.useRef(null);

  // Resize listener
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Parse 24h value → hour12 / minute / period
  const { hour12, minute, period } = useMemo(() => {
    if (!value) return { hour12: 9, minute: 0, period: 'AM' };
    const [hStr, mStr] = value.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const p = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return { hour12: h12, minute: m, period: p };
  }, [value]);

  // Click-outside for desktop popover
  React.useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen && !isMobile) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, isMobile]);

  // Convert 12h + period → 24h string and fire onChange
  const updateTime = (newH12, newMin, newPeriod) => {
    let h = newH12;
    if (newPeriod === 'PM' && h < 12) h += 12;
    if (newPeriod === 'AM' && h === 12) h = 0;
    onChange(`${String(h).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`);
  };

  const hoursList   = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutesList = Array.from({ length: 60 }, (_, i) => i);
  const displayValue = `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(p => !p)}
        className="w-full bg-bg-input border-2 border-border-light rounded-2xl px-4 py-3.5 pr-10 text-sm text-text-main font-bold focus:outline-none focus:border-accent-blue/60 focus:bg-accent-blue/5 transition-all text-left flex items-center justify-between cursor-pointer"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span>{displayValue}</span>
        <Clock size={15} className="text-text-muted" />
      </button>

      {/* ── Desktop Popover ──────────────────────────── */}
      {!isMobile && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="absolute left-0 right-0 sm:right-auto sm:w-52 mt-2 bg-bg-card border-2 border-border-light rounded-2xl shadow-float z-[310] p-3"
            >
              <WheelPicker
                hoursList={hoursList}
                minutesList={minutesList}
                hour12={hour12}
                minute={minute}
                period={period}
                updateTime={updateTime}
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="mt-2.5 w-full py-2 rounded-xl bg-accent-blue text-white text-[11px] font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-sm shadow-accent-blue/20"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Mobile Bottom Sheet ──────────────────────── */}
      {isMobile && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[400] flex items-end"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 32 }}
                className="relative w-full bg-bg-card border-t border-border-light rounded-t-[32px] px-6 pt-4 pb-8 flex flex-col gap-4 shadow-float z-10"
              >
                <div className="w-10 h-1 rounded-full bg-border-med opacity-60 mx-auto mb-1" />
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-text-main">Set Event Time</h3>
                  <span className="text-sm font-black text-accent-blue">{displayValue}</span>
                </div>
                <WheelPicker
                  hoursList={hoursList}
                  minutesList={minutesList}
                  hour12={hour12}
                  minute={minute}
                  period={period}
                  updateTime={updateTime}
                />
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3 rounded-xl bg-accent-blue text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-accent-blue/25"
                >
                  Done
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
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
  const [reminderMinutes, setReminderMinutes] = useState(editEvent?.reminderMinutes ?? 15);
  const [linkedGoalId,    setLinkedGoalId]    = useState(editEvent?.linkedGoalId    || '');
  const [error,           setError]           = useState('');
  const [isDropdownOpen,  setIsDropdownOpen]  = useState(false);

  // ── New scheduling fields ──
  const [repeat,         setRepeat]         = useState(editEvent?.repeat         || 'once');
  const [repeatInterval, setRepeatInterval] = useState(editEvent?.repeatInterval || 1);
  const [repeatDays,     setRepeatDays]     = useState(editEvent?.repeatDays     || []);
  const [snoozeEnabled,  setSnoozeEnabled]  = useState(editEvent?.snoozeEnabled  ?? false);
  const [snoozeDuration, setSnoozeDuration] = useState(editEvent?.snoozeDuration || 10);

  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Hide bottom nav while modal is open
  React.useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  React.useEffect(() => {
    if (!date) {
      setError('');
      return;
    }
    const now = new Date();
    const nowYMD = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    
    if (date < nowYMD) {
      setError('Date cannot be in the past.');
    } else if (date === nowYMD && time) {
      const [hours, minutes] = time.split(':');
      const selectedTime = new Date();
      selectedTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      if (selectedTime < now) {
        setError('Time cannot be in the past for today.');
      } else {
        setError('');
      }
    } else {
      setError('');
    }
  }, [date, time]);

  const toggleRepeatDay = (dayId) => {
    setRepeatDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !date || error) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      date,
      time,
      reminderEnabled,
      reminderMinutes,
      linkedGoalId: linkedGoalId || null,
      // New scheduling fields
      repeat,
      repeatInterval: (repeat === 'daily' || repeat === 'weekly' || repeat === 'monthly') ? (repeatInterval || 1) : 1,
      repeatDays: repeat === 'weekly' ? repeatDays : [],
      snoozeEnabled,
      snoozeDuration: snoozeEnabled ? snoozeDuration : 10,
    });
    onClose();
  };

  const isEditing = !!editEvent;
  const canSubmit = title.trim().length > 0 && !!date && !error;

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
                  min={TODAY()}
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
              <CustomTimePicker id="event-time" value={time} onChange={setTime} />
            </div>
          </div>

          {/* Validation Error or Selected date badge */}
          {error ? (
            <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={14} className="flex-shrink-0" />
              <p className="text-[11px] font-bold">{error}</p>
            </div>
          ) : (
            date && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-blue/8 border border-accent-blue/15">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse flex-shrink-0" />
                <p className="text-[11px] font-black text-accent-blue">{formattedDate}{time && ` · ${time}`}</p>
              </div>
            )
          )}

          {/* ── Repeat Section ───────────────────────────── */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
              <Repeat2 size={10} className="text-text-muted" />
              Repeat
            </p>
            {/* Repeat pill selector */}
            <div className="grid grid-cols-5 gap-1.5">
              {REPEAT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRepeat(opt.value)}
                  aria-pressed={repeat === opt.value}
                  className={`py-2 rounded-xl border-2 text-[11px] font-black transition-all active:scale-95 ${
                    repeat === opt.value
                      ? 'bg-accent-blue/10 border-accent-blue text-accent-blue shadow-sm shadow-accent-blue/10'
                      : 'bg-bg-input border-border-light text-text-muted hover:border-border-med hover:text-text-main'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Day-of-week strip (Weekly only) */}
            <AnimatePresence>
              {repeat === 'weekly' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2 px-1">On these days</p>
                  <div className="flex gap-1.5">
                    {WEEK_DAYS.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleRepeatDay(d.id)}
                        aria-pressed={repeatDays.includes(d.id)}
                        className={`flex-1 h-9 rounded-xl text-xs font-black border-2 transition-all active:scale-95 ${
                          repeatDays.includes(d.id)
                            ? 'bg-accent-blue text-white border-accent-blue shadow-sm shadow-accent-blue/25'
                            : 'bg-bg-input border-border-light text-text-muted hover:border-border-med hover:text-text-main'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Every X interval (Daily / Weekly / Monthly) */}
            <AnimatePresence>
              {(repeat === 'daily' || repeat === 'weekly' || repeat === 'monthly') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 bg-bg-input/40 border border-border-light rounded-2xl px-4 py-3">
                    <span className="text-[11px] font-black text-text-muted whitespace-nowrap">Every</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={repeatInterval}
                      onChange={e => setRepeatInterval(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 bg-bg-card border border-border-med rounded-xl px-2 py-1.5 text-center text-sm font-black text-text-main focus:outline-none focus:border-accent-blue/60 transition-all"
                    />
                    <span className="text-[11px] font-black text-text-muted">
                      {repeat === 'daily' ? (repeatInterval === 1 ? 'day' : 'days')
                        : repeat === 'weekly' ? (repeatInterval === 1 ? 'week' : 'weeks')
                        : (repeatInterval === 1 ? 'month' : 'months')}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
                  <div className="grid grid-cols-3 gap-1.5">
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

          {/* Snooze Section */}
          <div className="space-y-3">
            {/* Snooze toggle row */}
            <div className="flex items-center justify-between bg-bg-input/60 border-2 border-border-light rounded-2xl px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${snoozeEnabled ? 'bg-purple-500/15' : 'bg-bg-input'}`}>
                  <AlarmClock size={15} className={snoozeEnabled ? 'text-purple-400' : 'text-text-muted'} />
                </div>
                <div>
                  <p className="text-sm font-black text-text-main leading-tight">Snooze</p>
                  <p className="text-[10px] text-text-muted font-semibold">
                    {snoozeEnabled ? `${snoozeDuration} min delay on dismiss` : 'No snooze configured'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={snoozeEnabled}
                aria-label="Toggle snooze"
                onClick={() => setSnoozeEnabled(p => !p)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${snoozeEnabled ? 'bg-purple-500 shadow-md shadow-purple-500/30' : 'bg-border-med'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${snoozeEnabled ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Snooze duration pills */}
            <AnimatePresence>
              {snoozeEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2.5 px-1">
                    Snooze duration
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SNOOZE_DURATIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSnoozeDuration(opt.value)}
                        aria-pressed={snoozeDuration === opt.value}
                        className={`py-2.5 px-1 rounded-xl border-2 text-[11px] font-black transition-all active:scale-95 ${
                          snoozeDuration === opt.value
                            ? 'bg-purple-500/10 border-purple-500 text-purple-400 shadow-sm shadow-purple-500/10'
                            : 'bg-bg-input border-border-light text-text-muted hover:border-border-med hover:text-text-main'
                        }`}
                      >
                        {opt.label}
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
              <div className="relative" ref={dropdownRef}>
                <button
                  id="event-goal"
                  type="button"
                  onClick={() => setIsDropdownOpen(p => !p)}
                  className="w-full bg-bg-input border-2 border-border-light rounded-2xl px-4 py-3.5 text-sm text-text-main font-bold focus:outline-none focus:border-accent-blue/60 focus:bg-accent-blue/5 transition-all text-left flex items-center justify-between cursor-pointer"
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                >
                  <span className={linkedGoalId ? 'text-text-main' : 'text-text-muted font-normal'}>
                    {goals.find(g => g.id === linkedGoalId)?.title || 'No goal linked'}
                  </span>
                  <ChevronDown size={16} className={`text-text-muted transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 mt-2 bg-bg-card border-2 border-border-light rounded-2xl shadow-float z-[310] max-h-60 overflow-y-auto py-1.5 focus:outline-none"
                      role="listbox"
                      aria-label="Goals"
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={!linkedGoalId}
                        onClick={() => {
                          setLinkedGoalId('');
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-xs font-bold transition-all flex items-center justify-between
                          ${!linkedGoalId 
                            ? 'text-accent-blue bg-accent-blue-light' 
                            : 'text-text-muted hover:bg-bg-input hover:text-text-main'}`}
                      >
                        No goal linked
                      </button>
                      {goals.filter(g => !g.isMissingDream).map(g => {
                        const isSelected = linkedGoalId === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setLinkedGoalId(g.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-xs font-bold transition-all flex items-center justify-between
                              ${isSelected 
                                ? 'text-accent-blue bg-accent-blue-light' 
                                : 'text-text-main hover:bg-bg-input hover:text-accent-blue'}`}
                          >
                            <span>{g.title}</span>
                            {isSelected && <CheckCircle2 size={12} className="text-accent-blue" />}
                          </button>
                        );
                      })}
                      {goals.filter(g => !g.isMissingDream).length === 0 && (
                        <div className="px-4 py-3 text-xs text-text-muted italic">
                          No active goals available
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
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
  const repeatText = repeatLabel(event);

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
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${statusClass}`}>
            {statusLabel}
          </span>
          {repeatText && (
            <span className="text-[9px] font-black px-2 py-1 rounded-lg border bg-indigo-500/10 text-indigo-400 border-indigo-500/25 flex items-center gap-1">
              <Repeat2 size={8} />
              {repeatText}
            </span>
          )}
        </div>
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

      {/* Meta: date · time · reminder · snooze · goal */}
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
            {event.reminderMinutes === 0 ? 'At time' : `${event.reminderMinutes < 60 ? event.reminderMinutes + ' min' : (event.reminderMinutes === 60 ? '1 hr' : '1 day')}`}
          </span>
        )}
        {event.snoozeEnabled && (
          <span className="flex items-center gap-1 text-purple-400/70">
            <AlarmClock size={10} />
            {event.snoozeDuration || 10} min snooze
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
  const isCompleted = filterLabel === 'Done';
  const isRecurring = filterLabel === 'Recurring';
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-bg-card rounded-[24px] border-2 border-dashed border-border-med">
      <div className="w-12 h-12 rounded-2xl bg-bg-input flex items-center justify-center mb-3">
        {isRecurring
          ? <Repeat2 size={22} className="text-indigo-400 opacity-60" />
          : <Calendar size={22} className="text-text-muted opacity-60" />
        }
      </div>
      <p className="font-black text-text-main mb-1">
        {filterLabel === 'Upcoming' ? 'No upcoming events'
          : isCompleted ? 'Nothing completed yet'
          : isRecurring ? 'No recurring events'
          : 'No events scheduled'}
      </p>
      <p className="text-xs text-text-muted font-bold mb-4 leading-relaxed">
        {isCompleted  ? 'Mark an event as done to see it here.'
          : isRecurring ? 'Create an event with Daily, Weekly, Monthly, or Yearly repeat.'
          : 'Add your first event to start planning.'}
      </p>
      {!isCompleted && (
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
    if (activeFilter === 'upcoming')  {
      const base = scheduledEvents.filter(e => !e.completed && e.date >= today);
      return expandRecurringEvents(base, today);
    }
    if (activeFilter === 'completed') return scheduledEvents.filter(e => e.completed);
    if (activeFilter === 'recurring') return scheduledEvents.filter(e => e.repeat && e.repeat !== 'once');
    // 'all' — expand recurring events
    return expandRecurringEvents(scheduledEvents, today);
  }, [scheduledEvents, activeFilter, today]);

  const eventsOnSelectedDate = useMemo(() =>
    scheduledEvents.filter(e => e.date === selectedDate),
    [scheduledEvents, selectedDate]
  );

  // Stats
  const totalEvents    = scheduledEvents.length;
  const completedCount = scheduledEvents.filter(e => e.completed).length;
  const overdueCount   = scheduledEvents.filter(e => e.date < today && !e.completed).length;
  const recurringCount = scheduledEvents.filter(e => e.repeat && e.repeat !== 'once').length;

  // ── Handlers ──────────────────────────────────────────
  const handleSave = async (data) => {
    if (editingEvent) await updateScheduledEvent(editingEvent.id, data);
    else              await addScheduledEvent(data);
  };

  const openAdd  = () => { setEditingEvent(null); setShowForm(true); };
  const openEdit = (ev) => { setEditingEvent(ev); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingEvent(null); };

  const FILTERS = [
    { id: 'all',       label: 'All'       },
    { id: 'upcoming',  label: 'Upcoming'  },
    { id: 'recurring', label: 'Recurring' },
    { id: 'completed', label: 'Done'      },
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Scheduled', val: totalEvents,    color: 'text-accent-blue',  bg: 'bg-accent-blue/10',   icon: CalendarDays },
          { label: 'Recurring', val: recurringCount, color: 'text-indigo-400',   bg: 'bg-indigo-500/10',   icon: Repeat2      },
          { label: 'Completed', val: completedCount, color: 'text-emerald-400',  bg: 'bg-emerald-500/10',  icon: CheckCircle2 },
          { label: 'Overdue',   val: overdueCount,   color: 'text-red-400',      bg: 'bg-red-500/10',      icon: AlertCircle  },
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
