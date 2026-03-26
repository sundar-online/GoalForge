import React from 'react';
import { Home, Target, CalendarCheck, Timer, StickyNote } from 'lucide-react';

const NAV = [
  { id: 'dashboard', icon: Home,          label: 'Home'   },
  { id: 'goals',     icon: Target,        label: 'Goals'  },
  { id: 'tasks',     icon: CalendarCheck, label: 'Tasks'  },
  { id: 'notes',     icon: StickyNote,    label: 'Notes'  },
  { id: 'focus',     icon: Timer,         label: 'Focus'  },
];

export const Layout = ({ children, currentView, setView }) => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif', transition: 'background 0.3s' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px 20px 130px', minHeight: '100vh' }}>
        {children}
      </div>

      <nav style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--bg-float)', borderRadius: 28,
        boxShadow: 'var(--shadow-float)', border: '1px solid var(--border-light)', backdropFilter: 'blur(10px)',
        padding: '10px 8px',
        display: 'flex', alignItems: 'center', gap: 2,
        zIndex: 100, width: 'calc(100% - 40px)', maxWidth: 480,
      }}>
        {NAV.map(item => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '10px 0',
                borderRadius: 20,
                background: active ? 'var(--bg-dark-elem)' : 'transparent',
                border: 'none', cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                transform: active ? 'translateY(-1px)' : 'none',
              }}
              onMouseEnter={e => !active && (e.currentTarget.style.background = 'var(--bg-input)')}
              onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 2}
                color={active ? 'var(--text-inverted)' : 'var(--text-muted)'}
                style={{ transition: 'all 0.2s' }}
              />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: active ? 'var(--text-inverted)' : 'var(--text-muted)', lineHeight: 1, transition: 'color 0.2s' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
