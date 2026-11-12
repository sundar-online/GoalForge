import React from 'react';
import { ShieldAlert, ShieldCheck, ShieldOff, RefreshCw, AlertTriangle } from 'lucide-react';

function formatSyncTime(iso) {
  if (!iso) return 'Not synced yet';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Just now';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Synced';
  }
}

export const DisciplineLockStatus = ({
  lockState,
  decision,
  permissionStatus,
  isNativeAndroid,
  syncing,
  onSyncNow,
  onOpenPermissions,
}) => {
  const isEnabled = !!lockState?.enabled;
  const isLocked = !!decision?.shouldLockInstagram;
  const missingCritical =
    isEnabled && isNativeAndroid && !permissionStatus?.accessibilityEnabled;

  let badgeStyle = 'bg-bg-input text-text-muted border-border-light';
  let Icon = ShieldOff;

  if (isEnabled && isLocked) {
    badgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    Icon = ShieldAlert;
  } else if (isEnabled && !isLocked) {
    badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    Icon = ShieldCheck;
  }

  return (
    <div className="space-y-3">
      {/* Permission Revocation Warning */}
      {missingCritical && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Android Accessibility Permission Required
              </p>
              <p className="text-xs font-bold text-text-muted mt-0.5 leading-relaxed">
                Instagram monitoring cannot detect app launches until GoalForge Accessibility Service is enabled.
              </p>
            </div>
          </div>
          {onOpenPermissions && (
            <button
              type="button"
              onClick={onOpenPermissions}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider shrink-0 transition-all active:scale-95"
            >
              Restore Permission
            </button>
          )}
        </div>
      )}

      {/* Status + Sync Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-bg-input/70 border border-border-light">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-black ${badgeStyle}`}>
            <Icon size={15} />
            <span>{decision?.statusLabel || 'Disabled'}</span>
          </div>

          <div className="text-[11px] font-bold text-text-muted">
            <span className="block text-[9px] uppercase tracking-widest opacity-70">Last Sync</span>
            <span>{formatSyncTime(lockState?.lastSyncedAt)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSyncNow}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-card border border-border-light hover:border-accent-blue/40 text-xs font-black text-text-main transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin text-accent-blue' : 'text-accent-blue'} />
          <span>{syncing ? 'Syncing...' : 'Sync Status'}</span>
        </button>
      </div>
    </div>
  );
};

export default DisciplineLockStatus;

