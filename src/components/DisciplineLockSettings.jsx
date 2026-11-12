import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Eye,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Smartphone,
} from 'lucide-react';
import { useDisciplineLock } from '../hooks/useDisciplineLock';
import { DisciplineLockStatus } from './DisciplineLockStatus';
import { PermissionSetup } from './PermissionSetup';
import { GoalProgressCircle } from './GoalProgressCircle';

export const DisciplineLockSettings = ({ onNavigateGoals }) => {
  const {
    lockState,
    dailyProgress,
    decision,
    permissionStatus,
    syncing,
    isNativeAndroid,
    enableDisciplineLock,
    disableDisciplineLock,
    refreshPermissions,
    requestPermission,
    syncNow,
    previewLockScreen,
  } = useDisciplineLock();

  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const isEnabled = !!lockState?.enabled;
  const selectedGoals = dailyProgress?.goals || [];

  const handleToggle = async () => {
    if (isToggling) return;
    if (isEnabled) {
      // ON -> OFF: immediately disable blocking & monitoring, preserve all goals/tasks
      setIsToggling(true);
      try {
        await disableDisciplineLock();
      } finally {
        setIsToggling(false);
      }
    } else {
      // OFF -> ON: walk through explanation, permissions, verification, activation
      await refreshPermissions();
      setOnboardingStep(1);
      setShowOnboardingModal(true);
    }
  };

  const handleActivateDisciplineLock = async () => {
    setIsToggling(true);
    try {
      await enableDisciplineLock();
      setShowOnboardingModal(false);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Feature Header & Master Toggle */}
      <div className="bg-bg-card rounded-[28px] p-6 border border-border-light shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                isEnabled
                  ? 'bg-accent-blue/15 border-accent-blue/30 text-accent-blue'
                  : 'bg-bg-input border-border-light text-text-muted'
              }`}
            >
              <Lock size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-text-main tracking-tight">
                  Discipline Lock
                </h3>
                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    isEnabled
                      ? 'bg-accent-blue/15 text-accent-blue'
                      : 'bg-bg-input text-text-muted'
                  }`}
                >
                  {isEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-xs font-bold text-text-muted mt-1 leading-relaxed">
                Complete your first three goals before accessing Instagram.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            aria-label={`Discipline Lock: ${isEnabled ? 'enabled' : 'disabled'}`}
            disabled={isToggling}
            onClick={handleToggle}
            className={`w-14 h-7 rounded-full relative transition-colors shrink-0 self-start sm:self-center disabled:opacity-50 ${
              isEnabled ? 'bg-accent-blue' : 'bg-border-med'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${
                isEnabled ? 'translate-x-8' : 'translate-x-1'
              }`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Status, Revocation Warning & Sync Bar */}
        <DisciplineLockStatus
          lockState={lockState}
          decision={decision}
          permissionStatus={permissionStatus}
          isNativeAndroid={isNativeAndroid}
          syncing={syncing}
          onSyncNow={() => syncNow({ forceFirestore: true })}
          onOpenPermissions={() => {
            setOnboardingStep(2);
            setShowOnboardingModal(true);
          }}
        />

        {/* Web vs Native Android Disclosure */}
        {!isNativeAndroid && (
          <div className="p-3.5 rounded-2xl bg-bg-input/60 border border-border-light flex items-start gap-2.5 text-xs font-bold text-text-muted">
            <Smartphone size={16} className="text-accent-blue shrink-0 mt-0.5" />
            <span>
              Browser session detected: goal calculation, offline settings sync, and Lock Screen preview run here, while system-level Instagram blocking (<code className="text-text-main">com.instagram.android</code>) activates automatically on Android devices with the GoalForge APK.
            </span>
          </div>
        )}
      </div>

      {/* First Three Active Goals Progress Card */}
      <div className="bg-bg-card rounded-[28px] p-6 border border-border-light shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.15em]">
              Tracked First Three Active Goals ({dailyProgress?.date})
            </h4>
            <p className="text-xs font-bold text-text-muted mt-1">
              {dailyProgress?.completedRequiredTasks ?? 0} of {dailyProgress?.totalRequiredTasks ?? 0} required daily tasks completed ({dailyProgress?.remainingRequiredTasks ?? 0} remaining).
            </p>
          </div>

          <button
            type="button"
            onClick={previewLockScreen}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-dark-elem text-text-inverted hover:opacity-90 text-xs font-black uppercase tracking-wider transition-all active:scale-95 self-start sm:self-auto"
          >
            <Eye size={14} />
            <span>Preview Lock Screen</span>
          </button>
        </div>

        {selectedGoals.length === 0 ? (
          <div className="p-5 rounded-2xl bg-bg-input/50 border border-dashed border-border-med text-center space-y-2">
            <p className="text-sm font-black text-text-main">No Active Goals Available</p>
            <p className="text-xs font-bold text-text-muted max-w-md mx-auto">
              Completed, failed, archived, expired goals, and Missing Dreams are excluded. Add an active goal with daily tasks to unlock Instagram upon completion.
            </p>
            {onNavigateGoals && (
              <button
                type="button"
                onClick={onNavigateGoals}
                className="mt-2 inline-flex px-4 py-2 rounded-xl bg-accent-blue text-white text-xs font-black uppercase tracking-wider"
              >
                Go to Goals
              </button>
            )}
          </div>
        ) : (
          <div
            className={`grid gap-6 py-2 justify-items-center ${
              selectedGoals.length === 1
                ? 'grid-cols-1'
                : selectedGoals.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-3'
            }`}
          >
            {selectedGoals.map((goal) => (
              <GoalProgressCircle
                key={goal.id}
                title={goal.title}
                percentage={goal.completionPercentage}
                completedTasks={goal.completedTasks}
                totalTasks={goal.totalTasks}
                isRestDay={goal.isRestDay}
              />
            ))}
          </div>
        )}

        {isEnabled && dailyProgress?.totalRequiredTasks === 0 && selectedGoals.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs font-bold text-amber-300">
            Safe Empty-State Policy: These goals currently have 0 tasks scheduled for today, so Instagram remains locked to prevent empty-task bypasses. Add a task due today or toggle Discipline Lock OFF to unlock.
          </div>
        )}
      </div>

      {/* Android Permissions Section */}
      <div className="bg-bg-card rounded-[28px] p-6 border border-border-light shadow-sm">
        <PermissionSetup
          permissionStatus={permissionStatus}
          isNativeAndroid={isNativeAndroid}
          onRequestPermission={requestPermission}
          onRefreshPermissions={refreshPermissions}
        />
      </div>

      {/* First-Time Setup Instructions */}
      <div className="bg-bg-card rounded-[28px] p-6 border border-border-light shadow-sm">
        <button
          type="button"
          onClick={() => setShowInstructions((v) => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2.5">
            <Info size={17} className="text-accent-blue" />
            <span className="text-sm font-black text-text-main">
              First-Time Setup & Daily Reset Guide
            </span>
          </div>
          {showInstructions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showInstructions && (
          <ol className="mt-4 space-y-2.5 text-xs font-bold text-text-muted list-decimal list-inside leading-relaxed border-t border-border-light pt-4">
            <li>Ensure your top three priority goals are active and ordered as desired on the Goals page.</li>
            <li>Toggle <strong className="text-text-main">Discipline Lock</strong> ON and grant the <strong className="text-text-main">GoalForge Accessibility Service</strong> permission in Android Settings.</li>
            <li>Optionally grant <strong className="text-text-main">Display Over Other Apps</strong> and <strong className="text-text-main">Unrestricted Battery</strong> for reliable lock screen presentation on Android 10–15.</li>
            <li>Whenever Instagram (<code className="text-text-main">com.instagram.android</code>) is opened before all required daily tasks of those first three active goals are completed, GoalForge displays the pure-black Lock Screen.</li>
            <li>At each new local calendar day, daily requirements reset automatically even offline or after reboot.</li>
          </ol>
        )}
      </div>

      {/* OFF -> ON Step-by-Step Activation Modal */}
      {showOnboardingModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dl-onboarding-title"
          className="fixed inset-0 z-[220] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !isToggling && setShowOnboardingModal(false)}
        >
          <div
            className="bg-bg-card border border-border-light rounded-[32px] p-6 sm:p-7 w-full max-w-lg shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-accent-blue/15 text-accent-blue flex items-center justify-center shrink-0">
                <Shield size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-accent-blue uppercase tracking-widest">
                  Step {onboardingStep} of 2
                </p>
                <h3 id="dl-onboarding-title" className="text-lg font-black text-text-main">
                  {onboardingStep === 1 ? 'Enable Discipline Lock' : 'Android Permissions & Activation'}
                </h3>
              </div>
            </div>

            {onboardingStep === 1 ? (
              <div className="space-y-4">
                <p className="text-xs font-bold text-text-muted leading-relaxed">
                  Discipline Lock keeps Instagram (<code className="text-text-main">com.instagram.android</code>) locked until every required daily task across your <strong className="text-text-main">first three active goals</strong> is completed for the current calendar day.
                </p>
                <div className="p-4 rounded-2xl bg-bg-input/70 border border-border-light space-y-2 text-xs font-bold text-text-muted">
                  <p className="flex items-center gap-2 text-text-main font-black">
                    <CheckCircle2 size={14} className="text-emerald-400" /> Privacy First
                  </p>
                  <p>GoalForge only detects when Instagram launches in the foreground. It never reads messages, screen text, or keystrokes.</p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOnboardingModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-bg-input text-text-main font-black text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(2)}
                    className="px-5 py-2.5 rounded-xl bg-accent-blue text-white font-black text-xs uppercase tracking-wider"
                  >
                    Continue Setup
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <PermissionSetup
                  permissionStatus={permissionStatus}
                  isNativeAndroid={isNativeAndroid}
                  onRequestPermission={requestPermission}
                  onRefreshPermissions={refreshPermissions}
                />

                {isNativeAndroid && !permissionStatus?.accessibilityEnabled && (
                  <p className="text-[11px] font-bold text-amber-400">
                    Accessibility Service is not granted yet. You can still activate Discipline Lock now, and complete permission setup in Android Settings before blocking takes effect.
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(1)}
                    disabled={isToggling}
                    className="px-4 py-2.5 rounded-xl bg-bg-input text-text-main font-black text-xs uppercase tracking-wider"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleActivateDisciplineLock}
                    disabled={isToggling}
                    className="px-5 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-black text-xs uppercase tracking-wider disabled:opacity-50"
                  >
                    {isToggling ? 'Activating...' : 'Activate Discipline Lock'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DisciplineLockSettings;

