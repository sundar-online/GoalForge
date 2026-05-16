import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { BADGE_DEFINITIONS, LEVEL_THRESHOLDS, getLevelFromXP } from '../utils/gamificationEngine';
import { Award, Zap, Target, Clock, Flame, TrendingUp, Star, Lock, ChevronRight, Bell, BellOff, BookOpen, Trash2, Sparkles, History } from 'lucide-react';
import {requestNotificationPermission, checkNotificationPermission } from '../utils/notificationUtils';

export const ProfilePage = () => {
  const {
    xpData: rawXpData, goals, tasks, notes,
    focusTime, focusHistory, accuracy,
    disciplineScore, allHabits,
    memories = [], deleteMemory,
    clearProfileData
  } = useAppContext();
  const { displayName, user } = useAuth();
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [activeReplayMemory, setActiveReplayMemory] = useState(null);
  const [pushPerm, setPushPerm] = useState('default');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const fetchPerm = async () => {
      const perm = await checkNotificationPermission();
      setPushPerm(perm);
    };
    fetchPerm();
  }, []);

  const handleClearConfirm = async () => {
    try {
      await clearProfileData();
      setShowClearConfirm(false);
      alert("All goals, habits, tasks, history, and AI coaching insights have been completely reset.");
    } catch (err) {
      console.error("Failed to reset profile:", err);
      alert("An error occurred while resetting your data. Please try again.");
    }
  };


  const handleToggleNotifications = async () => {
    if (pushPerm === 'granted') {
      alert('Notifications are already granted. You must disable them from your device settings if you wish to turn them off.');
      return;
    }
    const perm = await requestNotificationPermission();
    setPushPerm(perm);
    if (perm === 'granted') {
      alert('Smart notifications enabled! We will remind you to crush your goals.');
    } else if (perm === 'denied') {
      alert('Notification permission was denied. You can enable them manually in your device settings.');
    }
  };

  const xpData = rawXpData || { totalXP: 0, earnedBadges: [], badgeUnlockDates: {}, xpHistory: [], totalCompletions: 0, perfectDays: 0, comebackCount: 0 };
  const { totalXP, earnedBadges = [], badgeUnlockDates = {}, xpHistory = [] } = xpData;
  const levelInfo = getLevelFromXP(totalXP);

  // Stats
  const totalFocusSeconds = Object.values(focusHistory || {}).reduce((a, b) => a + b, 0) + (focusTime || 0);
  const totalFocusHours = Math.floor(totalFocusSeconds / 3600);
  const totalFocusMins = Math.floor((totalFocusSeconds % 3600) / 60);
  const longestStreak = Math.max(
    0,
    ...goals.flatMap(g => (g.habits || []).map(h => h.streak || 0)),
    ...tasks.map(t => t.currentStreak || 0)
  );
  const totalCompletions = xpData.totalCompletions || 0;
  const perfectDays = xpData.perfectDays || 0;

  const initial = displayName ? displayName[0].toUpperCase() : 'U';

  const R = 58; const CIRC = 2 * Math.PI * R;
  const xpOffset = CIRC - (CIRC * levelInfo.progress) / 100;

  return (
    <div className="flex flex-col gap-6 lg:gap-8 max-w-full">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-2xl md:text-3xl font-black text-text-main tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
            <Award size={24} className="text-accent-blue" />
          </div>
          Profile & Achievements
        </h2>
        <p className="text-sm text-text-muted font-medium ml-1">Your journey, your identity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8">

          {/* Player Card */}
          <section className="bg-gradient-to-br from-bg-dark-elem to-[#1e1e2e] rounded-[32px] p-6 md:p-8 shadow-2xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-20 -right-20 opacity-5">
              <Star size={300} className="text-white" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              {/* Level Ring */}
              <div className="relative w-36 h-36 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 136 136">
                  <circle cx="68" cy="68" r={R} fill="none" className="stroke-white/10" strokeWidth="8" />
                  <circle
                    cx="68" cy="68" r={R} fill="none" stroke="#5a85ff" strokeWidth="8"
                    strokeDasharray={CIRC} strokeDashoffset={xpOffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(90, 133, 255, 0.5))' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white tracking-tighter leading-none">{levelInfo.level}</span>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">Level</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left space-y-3">
                <div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Rank Title</p>
                  <h3 className="text-3xl font-black text-white tracking-tighter">{levelInfo.title}</h3>
                </div>
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white text-lg font-black">
                    {initial}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white/90">{displayName}</p>
                    <p className="text-[10px] font-bold text-white/40">{user?.email}</p>
                  </div>
                </div>

                {/* XP Progress */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-black text-white/60">
                    <span>{totalXP.toLocaleString()} XP Total</span>
                    <span>
                      {levelInfo.isMaxLevel ? 'MAX LEVEL' : `${levelInfo.xpForNext.toLocaleString()} XP`}
                    </span>
                  </div>
                  <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent-blue to-indigo-400 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${levelInfo.progress}%`, boxShadow: '0 0 15px rgba(90,133,255,0.5)' }}
                    />
                  </div>
                  {!levelInfo.isMaxLevel && (
                    <p className="text-[10px] font-bold text-white/30 text-right">
                      {levelInfo.xpForNext - totalXP} XP to Level {levelInfo.level + 1}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Top Badges Preview */}
            {earnedBadges.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10 relative z-10">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Earned Badges</p>
                <div className="flex flex-wrap gap-2">
                  {earnedBadges.map(id => {
                    const badge = BADGE_DEFINITIONS.find(b => b.id === id);
                    if (!badge) return null;
                    return (
                      <div
                        key={id}
                        onClick={() => setSelectedBadge(badge)}
                        className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                      >
                        <span className="text-lg">{badge.icon}</span>
                        <span className="text-xs font-black text-white/80">{badge.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Badge Showcase */}
          <section className="space-y-5">
            <div className="flex items-center gap-2 px-2">
              <Award size={18} className="text-accent-blue" />
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Identity Badges</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BADGE_DEFINITIONS.map(badge => {
                const isEarned = earnedBadges.includes(badge.id);
                const unlockDate = badgeUnlockDates[badge.id];

                return (
                  <div
                    key={badge.id}
                    onClick={() => isEarned && setSelectedBadge(badge)}
                    className={`
                      rounded-[24px] p-5 border-2 transition-all duration-300 relative overflow-hidden
                      ${isEarned
                        ? 'bg-bg-card border-accent-blue/30 shadow-md hover:shadow-lg hover:scale-[1.02] cursor-pointer'
                        : 'bg-bg-card/50 border-border-light opacity-60 grayscale'
                      }
                    `}
                  >
                    {/* Earned glow */}
                    {isEarned && (
                      <div className="absolute -top-8 -right-8 w-24 h-24 bg-accent-blue/10 rounded-full blur-2xl" />
                    )}

                    <div className="relative z-10 flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isEarned ? 'bg-accent-blue/10 border border-accent-blue/20' : 'bg-bg-input border border-border-light'}`}>
                        {isEarned ? (
                          <span className="text-2xl">{badge.icon}</span>
                        ) : (
                          <Lock size={20} className="text-text-muted/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black tracking-tight ${isEarned ? 'text-text-main' : 'text-text-muted'}`}>
                          {badge.title}
                        </p>
                        <p className="text-xs font-bold text-text-muted mt-1 leading-relaxed">
                          {isEarned ? badge.description : badge.hint}
                        </p>
                        {isEarned && unlockDate && (
                          <p className="text-[9px] font-black text-accent-blue mt-2 uppercase tracking-widest">
                            Unlocked {new Date(unlockDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Story Moment Memories Timeline */}
          <section className="space-y-5">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-accent-blue" />
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Story Moment Memories</h3>
              </div>
              <span className="text-xs font-bold text-accent-blue bg-accent-blue/10 px-2.5 py-1 rounded-full">
                {memories.length} {memories.length === 1 ? 'Memory' : 'Memories'}
              </span>
            </div>

            {memories.length === 0 ? (
              <div className="bg-bg-card border border-border-light rounded-[32px] p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-bg-input border border-border-light flex items-center justify-center mx-auto text-3xl">
                  📖
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-text-main">Your achievements book is empty</h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                    Complete any goal to 100% to trigger the celebration and save your first permanent story reflection!
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative border-l border-border-med ml-4 pl-6 space-y-6">
                {memories.map((memory) => {
                  return (
                    <div key={memory.id} className="relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-bg-app border-2 border-accent-blue flex items-center justify-center shadow-lg group-hover:scale-125 transition-transform" />

                      {/* Memory Polaroid Card */}
                      <div className="bg-bg-card border border-border-light hover:border-border-med rounded-[28px] p-5 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                        {/* Header color accent glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue/5 rounded-full blur-2xl pointer-events-none" />

                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between relative z-10">
                          {/* Left Profile details */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-bg-input border border-border-med flex items-center justify-center text-2xl shadow-inner select-none">
                              {memory.userPhoto || '🏆'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-text-main truncate group-hover:text-accent-blue transition-colors">
                                {memory.title}
                              </h4>
                              <p className="text-[10px] font-bold text-text-muted mt-0.5 uppercase tracking-widest">
                                Completed {new Date(memory.completionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>

                          {/* Right Stats Quick Info */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black bg-amber-400/10 text-amber-400 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                              🔥 {memory.streak || 0} Streak
                            </span>
                            <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg shrink-0">
                              {memory.consistency || 100}% Fit
                            </span>
                          </div>
                        </div>

                        {/* Journal reflection notes */}
                        {memory.userNote && (
                          <div className="mt-4 p-3 bg-bg-input/40 border-l-2 border-accent-blue/30 rounded-r-xl">
                            <p className="text-xs text-text-muted italic leading-relaxed font-medium">
                              "{memory.userNote}"
                            </p>
                          </div>
                        )}

                        {/* Actions line */}
                        <div className="mt-4 pt-3 border-t border-border-light flex items-center justify-between">
                          <button
                            onClick={() => setActiveReplayMemory(memory)}
                            className="text-[10px] font-black text-accent-blue uppercase tracking-widest hover:text-indigo-400 flex items-center gap-1 transition-colors"
                          >
                            <History size={12} /> Relive Memory Replay
                          </button>
                          
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this memory from your permanent achievements? This cannot be undone.')) {
                                deleteMemory(memory.id);
                              }
                            }}
                            className="text-text-muted/40 hover:text-red-400 p-1 rounded-lg transition-colors"
                            title="Delete Memory"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* XP History Feed */}
          {xpHistory.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <TrendingUp size={18} className="text-accent-blue" />
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Recent XP Gains</h3>
              </div>

              <div className="bg-bg-card rounded-[28px] border border-border-light shadow-sm divide-y divide-border-light overflow-hidden">
                {xpHistory.slice(0, 15).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-bg-input/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center shrink-0">
                        <Zap size={14} className="text-accent-blue" />
                      </div>
                      <p className="text-sm font-bold text-text-main truncate">{entry.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-black text-accent-blue">+{entry.amount} XP</span>
                      <span className="text-[9px] font-bold text-text-muted">{formatTimeAgo(entry.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column / Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">

          {/* Level Roadmap */}
          <section className="bg-bg-card rounded-[32px] p-6 shadow-sm border border-border-light">
            <div className="flex items-center gap-2 mb-5">
              <Star size={18} className="text-accent-blue" />
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Level Roadmap</h3>
            </div>
            <div className="flex flex-col gap-2.5">
              {LEVEL_THRESHOLDS.map((tier) => {
                const isCurrent = tier.level === levelInfo.level;
                const isReached = totalXP >= tier.xpRequired;
                return (
                  <div
                    key={tier.level}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${isCurrent ? 'bg-accent-blue/10 border border-accent-blue/20 scale-[1.02]' : isReached ? 'bg-bg-input/50' : 'opacity-40'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${isCurrent ? 'bg-accent-blue text-white' : isReached ? 'bg-bg-input text-text-main' : 'bg-bg-input text-text-muted'}`}>
                        {tier.level}
                      </div>
                      <span className={`text-sm font-black ${isCurrent ? 'text-accent-blue' : 'text-text-main'}`}>{tier.title}</span>
                    </div>
                    <span className="text-[10px] font-bold text-text-muted">{tier.xpRequired.toLocaleString()} XP</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Lifetime Stats */}
          <section className="bg-bg-card rounded-[32px] p-6 shadow-sm border border-border-light">
            <div className="flex items-center gap-2 mb-5">
              <Zap size={18} className="text-orange-500" fill="currentColor" />
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Lifetime Stats</h3>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Total XP', value: totalXP.toLocaleString(), icon: <Zap size={16} className="text-accent-blue" />, color: 'text-accent-blue' },
                { label: 'Completions', value: totalCompletions, icon: <Target size={16} className="text-emerald-500" />, color: 'text-emerald-500' },
                { label: 'Focus Time', value: `${totalFocusHours}h ${totalFocusMins}m`, icon: <Clock size={16} className="text-purple-500" />, color: 'text-purple-500' },
                { label: 'Longest Streak', value: `${longestStreak}d`, icon: <Flame size={16} className="text-orange-500" />, color: 'text-orange-500' },
                { label: 'Perfect Days', value: perfectDays, icon: <Star size={16} className="text-amber-500" />, color: 'text-amber-500' },
                { label: 'Badges Earned', value: `${earnedBadges.length} / ${BADGE_DEFINITIONS.length}`, icon: <Award size={16} className="text-indigo-500" />, color: 'text-indigo-500' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-bg-input flex items-center justify-center">
                      {stat.icon}
                    </div>
                    <span className="text-xs font-black text-text-muted uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <span className={`text-base font-black tracking-tighter ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Discipline Score */}
          <div className="bg-bg-dark-elem rounded-[28px] p-6 shadow-xl text-center">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Discipline Score</p>
            <p className="text-5xl font-black text-white tracking-tighter leading-none mb-2">{disciplineScore}</p>
            <p className="text-xs font-bold text-white/40">Today's Performance</p>
          </div>

          {/* App Settings */}
          <section className="bg-bg-card rounded-[32px] p-6 shadow-sm border border-border-light">
            <div className="flex items-center gap-2 mb-5">
              <Bell size={18} className="text-accent-blue" />
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">App Settings</h3>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-bg-input rounded-2xl border border-border-light">
              <div>
                <p className="text-sm font-black text-text-main">Smart Notifications</p>
                <p className="text-[10px] font-bold text-text-muted mt-0.5 max-w-[200px]">Get daily PWA pushes if you're falling behind on goals.</p>
              </div>
              <button 
                onClick={handleToggleNotifications}
                className={`w-12 h-6 rounded-full relative transition-colors ${pushPerm === 'granted' ? 'bg-accent-blue' : 'bg-border-med'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${pushPerm === 'granted' ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-bg-card rounded-[32px] p-6 shadow-sm border border-border-light">
            <div className="flex items-center gap-2 mb-5">
              <Trash2 size={18} className="text-red-500" />
              <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.15em]">Danger Zone</h3>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
              <div>
                <p className="text-sm font-black text-text-main">Clear Profile Data</p>
                <p className="text-[10px] font-bold text-text-muted mt-0.5 max-w-[200px]">Permanently reset your Goals, Habits, Tasks, and related data.</p>
              </div>
              <button 
                id="c9w2zm"
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-black text-xs tracking-wider uppercase transition-all shadow-md shadow-red-500/20 self-start md:self-auto"
              >
                Clear Profile Data
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Clear Profile Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200" onClick={() => setShowClearConfirm(false)}>
          <div 
            className="bg-bg-card rounded-[32px] p-6 md:p-8 w-full max-w-sm shadow-float border border-border-light text-center space-y-6 animate-in zoom-in-95 duration-200" 
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 shadow-lg">
              <Trash2 size={32} />
            </div>
            
            <div className="space-y-3" id="g8s1tm">
              <h3 className="text-lg font-black text-text-main tracking-tight leading-snug">
                Are you sure you want to clear all Goals and Tasks?
              </h3>
              <p className="text-xs font-bold text-text-muted">
                This will create a fresh new start.
              </p>
              <p className="text-xs font-black text-red-500 uppercase tracking-widest mt-1">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button 
                onClick={() => setShowClearConfirm(false)} 
                className="flex-1 py-3 rounded-xl bg-bg-input text-text-main font-black text-xs uppercase tracking-wider hover:bg-bg-input/80 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button 
                onClick={handleClearConfirm}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-black text-xs tracking-wider uppercase transition-all shadow-md shadow-red-500/20"
              >
                Yes, Clear Data
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={() => setSelectedBadge(null)}>
          <div className="bg-bg-card rounded-[32px] p-8 w-full max-w-sm shadow-float border border-border-light animate-in fade-in zoom-in-95 text-center space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-20 h-20 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center mx-auto">
              <span className="text-4xl">{selectedBadge.icon}</span>
            </div>
            <h3 className="text-xl font-black text-text-main tracking-tight">{selectedBadge.title}</h3>
            <p className="text-sm font-bold text-text-muted leading-relaxed">{selectedBadge.description}</p>
            {badgeUnlockDates[selectedBadge.id] && (
              <p className="text-xs font-black text-accent-blue uppercase tracking-widest">
                Earned on {new Date(badgeUnlockDates[selectedBadge.id]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            <button onClick={() => setSelectedBadge(null)} className="mt-4 px-8 py-3 rounded-xl bg-bg-input text-text-main font-black text-sm hover:bg-bg-input/80 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
      {/* Story Moment Replay / History Modal */}
      {activeReplayMemory && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300" 
          onClick={() => setActiveReplayMemory(null)}
        >
          <div 
            className="bg-[#0e0e11] border border-white/10 rounded-[32px] p-6 md:p-8 w-full max-w-md shadow-2xl relative overflow-hidden text-center space-y-6 animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Ambient background glow */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-accent-blue/15 blur-3xl pointer-events-none" />

            {/* Emoji Emblem */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-accent-blue/10 to-indigo-500/15 border border-white/10 flex items-center justify-center text-4xl mx-auto shadow-xl">
              {activeReplayMemory.userPhoto || '🏆'}
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black tracking-[0.3em] uppercase text-accent-blue">
                Mastered Journey Story
              </span>
              <h3 className="text-2xl font-black text-white tracking-tight leading-tight">
                {activeReplayMemory.title}
              </h3>
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider">
                Completed on {new Date(activeReplayMemory.completionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Achievement Details */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-white/40">Peak Streak</p>
                <p className="text-xl font-extrabold text-amber-400 mt-1">🔥 {activeReplayMemory.streak || 0} Days</p>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-white/40">Consistency</p>
                <p className="text-xl font-extrabold text-emerald-400 mt-1">{activeReplayMemory.consistency || 100}% Fit</p>
              </div>
            </div>

            {/* Journal Entry Reflection */}
            {activeReplayMemory.userNote ? (
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-left relative">
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span>📝</span> Personal Reflection Note
                </p>
                <p className="text-xs text-white/80 leading-relaxed italic font-medium">
                  "{activeReplayMemory.userNote}"
                </p>
              </div>
            ) : (
              <p className="text-xs text-white/30 italic">No reflection note was written for this memory.</p>
            )}

            {/* Motivational Replay Praise */}
            <div className="bg-accent-blue/5 border border-accent-blue/10 rounded-2xl p-4 text-xs text-accent-blue/80 font-bold leading-relaxed">
              ⭐ "Your level of discipline on this journey was stellar! This moment remains permanently etched in your achievements as a symbol of your growth."
            </div>

            <button 
              onClick={() => setActiveReplayMemory(null)} 
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent-blue to-indigo-500 text-white font-extrabold text-xs tracking-wider uppercase hover:shadow-lg hover:shadow-accent-blue/20 transition-all transform active:translate-y-0 hover:-translate-y-0.5"
            >
              Back to Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper
function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
