import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Shield,
  Bell,
  Brain,
  Palette,
  Sun,
  Moon,
  Monitor,
  Sliders,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DisciplineLockSettings } from './DisciplineLockSettings';
import {
  checkNotificationPermission,
  requestNotificationPermission,
} from '../utils/notificationUtils';

export const SettingsPage = ({ setView }) => {
  const {
    theme,
    setTheme,
    themeSource,
    settings,
    updateAiSettings,
  } = useAppContext();

  const [activeCategory, setActiveCategory] = useState('productivity');
  const [pushPerm, setPushPerm] = useState('default');

  useEffect(() => {
    checkNotificationPermission().then(setPushPerm).catch(() => {});
  }, []);

  const handleToggleNotifications = async () => {
    if (pushPerm === 'granted') {
      alert('Notifications are already granted. Disable them in device settings if needed.');
      return;
    }
    const perm = await requestNotificationPermission();
    setPushPerm(perm);
  };

  const categories = [
    { id: 'productivity', label: 'Productivity', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'ai', label: 'AI Coaching', icon: Brain },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="flex flex-col gap-6 lg:gap-8 pb-24 max-w-4xl mx-auto w-full">
      {/* Header */}
      <header className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setView('dashboard')}
          aria-label="Back to Dashboard"
          className="w-10 h-10 rounded-xl bg-bg-card border border-border-light flex items-center justify-center text-text-muted hover:text-text-main transition-all active:scale-90 shadow-sm shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-accent-blue" />
            <h1 className="text-2xl md:text-3xl font-black text-text-main tracking-tight">
              Settings
            </h1>
          </div>
          <p className="text-xs font-bold text-text-muted mt-0.5">
            Settings → {categories.find((c) => c.id === activeCategory)?.label}
            {activeCategory === 'productivity' ? ' → Discipline Lock' : ''}
          </p>
        </div>
      </header>

      {/* Category Pills */}
      <nav aria-label="Settings categories" className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide transition-all border ${
                isActive
                  ? 'bg-accent-blue text-white border-accent-blue shadow-md shadow-accent-blue/25'
                  : 'bg-bg-card text-text-muted border-border-light hover:text-text-main hover:bg-bg-input'
              }`}
            >
              <Icon size={15} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Category Content */}
      {activeCategory === 'productivity' && (
        <section aria-label="Productivity Settings" className="space-y-4">
          <div className="px-1">
            <h2 className="text-[11px] font-black text-text-muted uppercase tracking-[0.18em]">
              Productivity → Discipline Lock
            </h2>
          </div>
          <DisciplineLockSettings onNavigateGoals={() => setView('goals')} />
        </section>
      )}

      {activeCategory === 'notifications' && (
        <section
          aria-label="Notification Settings"
          className="bg-bg-card rounded-[28px] p-6 border border-border-light shadow-sm space-y-4"
        >
          <h2 className="text-xs font-black text-text-muted uppercase tracking-[0.15em]">
            Notifications
          </h2>
          <div className="flex items-center justify-between p-4 bg-bg-input rounded-2xl border border-border-light">
            <div>
              <p className="text-sm font-black text-text-main">Smart Notifications</p>
              <p className="text-xs font-bold text-text-muted mt-0.5">
                Receive evening reminders if goals remain incomplete.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleNotifications}
              role="switch"
              aria-checked={pushPerm === 'granted'}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                pushPerm === 'granted' ? 'bg-accent-blue' : 'bg-border-med'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  pushPerm === 'granted' ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>
      )}

      {activeCategory === 'ai' && (
        <section
          aria-label="AI Coaching Settings"
          className="bg-bg-card rounded-[28px] p-6 border border-border-light shadow-sm space-y-4"
        >
          <h2 className="text-xs font-black text-text-muted uppercase tracking-[0.15em]">
            AI Coaching Engine
          </h2>
          {[
            { key: 'liveInsightsEnabled', label: 'Live Behavioral Insights' },
            { key: 'weeklyReviewEnabled', label: 'Weekly Performance Review' },
            { key: 'monthlyReviewEnabled', label: 'Monthly Strategic Review' },
          ].map((item) => {
            const checked = settings.aiSettings?.[item.key] ?? true;
            return (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 bg-bg-input rounded-2xl border border-border-light"
              >
                <span className="text-sm font-black text-text-main">{item.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  onClick={() => updateAiSettings({ [item.key]: !checked })}
                  className={`w-12 h-6 rounded-full relative transition-colors ${
                    checked ? 'bg-accent-blue' : 'bg-border-med'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      checked ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </section>
      )}

      {activeCategory === 'appearance' && (
        <section
          aria-label="Appearance Settings"
          className="bg-bg-card rounded-[28px] p-6 border border-border-light shadow-sm space-y-4"
        >
          <h2 className="text-xs font-black text-text-muted uppercase tracking-[0.15em]">
            Theme Mode
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'dark', label: 'Dark', icon: Moon, active: themeSource !== 'system' && theme === 'dark', onClick: () => setTheme('dark', 'manual') },
              { id: 'light', label: 'Light', icon: Sun, active: themeSource !== 'system' && theme === 'light', onClick: () => setTheme('light', 'manual') },
              { id: 'system', label: 'System', icon: Monitor, active: themeSource === 'system', onClick: () => setTheme(null, 'system') },
            ].map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={opt.onClick}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 text-xs font-black transition-all ${
                    opt.active
                      ? 'bg-accent-blue/15 border-accent-blue text-accent-blue'
                      : 'bg-bg-input border-border-light text-text-muted hover:text-text-main'
                  }`}
                >
                  <Icon size={18} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default SettingsPage;

