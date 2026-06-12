import React, { useState } from 'react';
import { useAppContext, useGoals } from '../context/AppContext';
import {
  Sparkles, Brain, Bot, Zap, Clock, Target,
  CheckCircle2, CalendarDays, Sliders, Wrench,
  ChevronLeft, Plus, Flame, Trash2, Cpu,
  TrendingUp, TrendingDown, Activity, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AIInsights from './AIInsights';

// Subcomponent for Capturing sparks
const WorkspaceSparkForm = ({ addQuickThought, quickThoughts, deleteQuickThought }) => {
  const [text, setText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💡');
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const emojiOptions = ['💡', '🔥', '🧠', '✨', '⚡'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await addQuickThought(text.trim(), selectedEmoji);
      setText('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-bg-card rounded-[28px] p-6 border border-border-light shadow-sm space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Quick Note / Thought Spark</span>
          <div className="flex gap-1 bg-bg-input/60 p-0.5 rounded-xl border border-border-light/50">
            {emojiOptions.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedEmoji(emoji)}
                className={`text-xs w-6 h-6 rounded-lg flex items-center justify-center transition-all ${selectedEmoji === emoji ? 'bg-bg-card text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
                  }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        <div className="relative flex items-center bg-bg-input/50 border border-border-light rounded-2xl p-1.5 focus-within:border-accent-blue/50 transition-colors">
          <input
            type="text"
            placeholder="Capture a spark instantly..."
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={100}
            className="bg-transparent text-xs text-text-main flex-1 focus:outline-none pl-2 pr-8 py-2.5"
          />
          <button
            type="submit"
            disabled={!text.trim() || isSaving}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all active:scale-95 shadow-md shadow-accent-blue/20"
          >
            {success ? "✓" : "+"}
          </button>
        </div>
        {success && (
          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest text-center animate-pulse">Spark Captured Successfully</p>
        )}
      </form>

      {/* Sparks List */}
      <div className="border-t border-border-light/55 pt-4 space-y-2.5">
        <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Latest Sparks ({quickThoughts.length}/5)</p>
        {quickThoughts.length === 0 ? (
          <p className="text-xs text-text-muted italic py-1 text-center">No sparks captured today.</p>
        ) : (
          <div className="space-y-2">
            {quickThoughts.slice(0, 4).map(thought => (
              <div key={thought.id} className="flex items-center justify-between p-3 rounded-xl bg-bg-input/30 border border-border-light/40 hover:bg-bg-input/60 transition-colors group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm select-none">{thought.emoji}</span>
                  <p className="text-xs text-text-main truncate">{thought.content}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteQuickThought(thought.id)}
                  className="text-text-muted hover:text-red-500 p-1 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Delete thought"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const ForgeWorkspace = ({ setView }) => {
  const {
    goals, accuracy, alerts,
    allHabits, focusTime,
    disciplineScore, settings,
    updateAiSettings, isAiAnalyzing,
    triggerNeuralAudit, setGoalsAction,
    addQuickThought, quickThoughts, deleteQuickThought
  } = useAppContext();

  return (
    <div className="flex flex-col gap-6 lg:gap-8 max-w-full">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('dashboard')}
            className="w-10 h-10 rounded-xl bg-bg-card border border-border-light flex items-center justify-center text-text-muted hover:text-text-main transition-all active:scale-90 shadow-sm shrink-0"
            aria-label="Back to Dashboard"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <Sparkles size={18} className="text-indigo-400" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-text-main tracking-tight">Forge Workspace</h1>
            </div>
            <p className="text-xs text-text-muted font-medium pl-10">Distraction-free strategy and intelligence room.</p>
          </div>
        </div>

        {/* Header CTA: Neural Audit */}
        <button
          onClick={triggerNeuralAudit}
          disabled={isAiAnalyzing}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-accent-blue text-white font-black text-sm shadow-lg shadow-accent-blue/30 hover:opacity-90 active:scale-95 transition-all self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAiAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Analyzing Systems...
            </>
          ) : (
            <>
              <Cpu size={16} />
              Align Neural Pathways
            </>
          )}
        </button>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Discipline Index', val: disciplineScore, color: 'text-accent-blue', bg: 'bg-accent-blue/10', icon: Activity },
          { label: 'Smart Alerts', val: `${alerts.length} Active`, color: alerts.length > 0 ? 'text-amber-400' : 'text-emerald-400', bg: alerts.length > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10', icon: AlertCircle },
          { label: 'Habit Threads', val: allHabits.length, color: 'text-indigo-400', bg: 'bg-indigo-500/10', icon: Brain },
          { label: 'Accuracy Score', val: `${accuracy}%`, color: 'text-purple-400', bg: 'bg-purple-500/10', icon: Target },
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

      {/* Two-column layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

        {/* Left Column: Quick Actions + Spark Form */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="bg-bg-card rounded-[28px] p-6 border border-border-light shadow-sm space-y-4">
            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Workspace Shortcuts</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  title: "Deep Work Session",
                  desc: "Launch focus mode timer",
                  btn: "Start Focus",
                  icon: <Clock size={14} className="text-indigo-400" />,
                  action: () => setView('focus')
                },
                {
                  title: "New Goal System",
                  desc: "Forge goal & habit chain",
                  btn: "Create Goal",
                  icon: <Target size={14} className="text-accent-blue" />,
                  action: () => { setGoalsAction('add_goal'); setView('goals'); }
                },
                {
                  title: "Manage Daily Tasks",
                  desc: "Audit today's checkboxes",
                  btn: "View Tasks",
                  icon: <CheckCircle2 size={14} className="text-emerald-400" />,
                  action: () => setView('tasks')
                },
                {
                  title: "Scheduled Events",
                  desc: "Review timeline events",
                  btn: "Calendar",
                  icon: <CalendarDays size={14} className="text-purple-400" />,
                  action: () => setView('events')
                }
              ].map((item, i) => (
                <div key={i} className="bg-bg-input/30 border border-border-light/60 rounded-xl p-3 flex justify-between items-center gap-3 hover:border-border-med transition-colors">
                  <div className="flex gap-3 items-center min-w-0">
                    <div className="p-2 bg-bg-card rounded-xl border border-border-light/40 shrink-0">{item.icon}</div>
                    <div className="min-w-0">
                      <h5 className="text-[11px] font-black text-text-main truncate">{item.title}</h5>
                      <p className="text-[9px] text-text-muted leading-tight truncate mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={item.action}
                    className="px-3 py-1.5 rounded-lg bg-bg-card border border-border-light/60 hover:bg-bg-input text-[9px] font-black uppercase tracking-wider text-text-main transition-colors shrink-0"
                  >
                    {item.btn}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Spark capture Form */}
          <WorkspaceSparkForm
            addQuickThought={addQuickThought}
            quickThoughts={quickThoughts}
            deleteQuickThought={deleteQuickThought}
          />
        </div>

        {/* Right Column: AI Insights & Toolbox configuration */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Intelligence Hub Section */}
          <div className="bg-bg-card rounded-[28px] p-6 border border-border-light shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border-light/60 pb-3">
              <Brain size={16} className="text-accent-blue" />
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Forge Intelligence Pipeline</h3>
            </div>
            <AIInsights />
          </div>

          {/* Settings Section (Toolbox) */}
          <div className="bg-bg-card rounded-[28px] p-6 border border-border-light shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-border-light/60 pb-3">
              <Wrench size={16} className="text-indigo-400" />
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Workspace Configuration (Toolbox)</h3>
            </div>

            {/* Forge Intelligence Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted">Core Intelligence</h4>
                <div className="space-y-3">
                  {/* Live Insights */}
                  <label className="flex items-center justify-between cursor-pointer bg-bg-input/30 border border-border-light/50 px-4 py-3 rounded-xl hover:border-border-med transition-colors group">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-text-main group-hover:text-accent-blue transition-colors">Live Insights</p>
                      <p className="text-[10px] text-text-muted leading-tight">Dynamic consistency coaching</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.aiSettings?.liveInsightsEnabled ?? true}
                      onChange={(e) => updateAiSettings({ liveInsightsEnabled: e.target.checked })}
                      className="w-4 h-4 accent-accent-blue cursor-pointer"
                    />
                  </label>

                  {/* Weekly Review */}
                  <label className="flex items-center justify-between cursor-pointer bg-bg-input/30 border border-border-light/50 px-4 py-3 rounded-xl hover:border-border-med transition-colors group">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-text-main group-hover:text-accent-blue transition-colors">Weekly Review</p>
                      <p className="text-[10px] text-text-muted leading-tight">Background summaries</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.aiSettings?.weeklyReviewEnabled ?? true}
                      onChange={(e) => updateAiSettings({ weeklyReviewEnabled: e.target.checked })}
                      className="w-4 h-4 accent-accent-blue cursor-pointer"
                    />
                  </label>

                  {/* Monthly Review */}
                  <label className="flex items-center justify-between cursor-pointer bg-bg-input/30 border border-border-light/50 px-4 py-3 rounded-xl hover:border-border-med transition-colors group">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-text-main group-hover:text-accent-blue transition-colors">Monthly Review</p>
                      <p className="text-[10px] text-text-muted leading-tight">Long-term consistency trend reviews</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.aiSettings?.monthlyReviewEnabled ?? true}
                      onChange={(e) => updateAiSettings({ monthlyReviewEnabled: e.target.checked })}
                      className="w-4 h-4 accent-accent-blue cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Insight Preferences */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted">Insight Preferences</h4>
                <div className="space-y-2.5 bg-bg-input/10 border border-border-light/50 p-4 rounded-xl space-y-3">
                  {[
                    { key: 'streakRiskEnabled', label: 'Streak Risk Alerts' },
                    { key: 'recoveryEnabled', label: 'Recovery Suggestions' },
                    { key: 'motivationEnabled', label: 'Motivation Messages' },
                    { key: 'goalIntelEnabled', label: 'Goal Intel Suggestions' },
                    { key: 'accuracyIntelEnabled', label: 'Accuracy Insights' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center justify-between cursor-pointer group">
                      <span className="text-xs font-bold text-text-main group-hover:text-accent-blue transition-colors">{label}</span>
                      <input
                        type="checkbox"
                        checked={settings.aiSettings?.[key] ?? true}
                        onChange={(e) => updateAiSettings({ [key]: e.target.checked })}
                        className="w-4 h-4 accent-accent-blue cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Notification Controls & Personalization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border-light/60 pt-5">
              {/* Notification Controls */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted">Notification Controls</h4>
                <div className="space-y-3.5">
                  <label className="flex items-center justify-between cursor-pointer bg-bg-input/30 border border-border-light/50 px-4 py-3 rounded-xl hover:border-border-med transition-colors group">
                    <span className="text-xs font-bold text-text-main group-hover:text-accent-blue transition-colors">Send AI Notifications</span>
                    <input
                      type="checkbox"
                      checked={settings.aiSettings?.sendNotifications ?? true}
                      onChange={(e) => updateAiSettings({ sendNotifications: e.target.checked })}
                      className="w-4 h-4 accent-accent-blue cursor-pointer"
                    />
                  </label>

                  {/* Quiet Hours */}
                  <div className="space-y-2 bg-bg-input/10 border border-border-light/50 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Quiet Hours Configuration</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] font-bold text-text-muted block mb-1">Start Time</span>
                        <input
                          type="time"
                          value={settings.aiSettings?.quietHoursStart ?? '22:00'}
                          onChange={(e) => updateAiSettings({ quietHoursStart: e.target.value })}
                          className="w-full bg-bg-input border border-border-light rounded-xl px-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-accent-blue/50"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-text-muted block mb-1">End Time</span>
                        <input
                          type="time"
                          value={settings.aiSettings?.quietHoursEnd ?? '07:00'}
                          onChange={(e) => updateAiSettings({ quietHoursEnd: e.target.value })}
                          className="w-full bg-bg-input border border-border-light rounded-xl px-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-accent-blue/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personalization */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted">Personalization</h4>
                <div className="space-y-4 bg-bg-input/20 border border-border-light/50 p-4 rounded-xl">
                  {/* Insight Frequency */}
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Insight Frequency</p>
                    <select
                      value={settings.aiSettings?.insightFrequency ?? 'medium'}
                      onChange={(e) => updateAiSettings({ insightFrequency: e.target.value })}
                      className="w-full bg-bg-input border border-border-light rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-accent-blue/50 cursor-pointer"
                    >
                      <option value="low">Low (Fewer alerts)</option>
                      <option value="medium">Medium (Standard coaching)</option>
                      <option value="high">High (Maximum accountability)</option>
                    </select>
                  </div>

                  {/* Coaching Tone */}
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Coaching Tone</p>
                    <select
                      value={settings.aiSettings?.motivationStyle ?? 'supportive'}
                      onChange={(e) => updateAiSettings({ motivationStyle: e.target.value })}
                      className="w-full bg-bg-input border border-border-light rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-accent-blue/50 cursor-pointer"
                    >
                      <option value="supportive">Supportive (Encouraging)</option>
                      <option value="direct">Direct (Action-oriented)</option>
                      <option value="analytical">Analytical (Data-driven)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Status Footer */}
            <div className="border-t border-border-light/60 pt-4 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>Settings Autosaved</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ForgeWorkspace;
