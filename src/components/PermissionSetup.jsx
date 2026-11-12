import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Layers,
  BatteryCharging,
  Activity,
  RefreshCw,
} from 'lucide-react';

const PERMISSION_ITEMS = [
  {
    key: 'accessibilityEnabled',
    type: 'accessibility',
    title: 'Accessibility Service (Required)',
    description:
      'Detects only when Instagram (com.instagram.android) opens. GoalForge never collects screen content, messages, or keystrokes.',
    icon: Shield,
    required: true,
  },
  {
    key: 'overlayGranted',
    type: 'overlay',
    title: 'Display Over Other Apps (Recommended)',
    description:
      'Allows GoalForge to display the native Discipline Lock screen cleanly over Instagram on Android 10+.',
    icon: Layers,
    required: false,
  },
  {
    key: 'usageStatsGranted',
    type: 'usage_access',
    title: 'Usage Access (Optional Fallback)',
    description:
      'Supports foreground Instagram status verification when checking app lock state.',
    icon: Activity,
    required: false,
  },
  {
    key: 'batteryOptimizationIgnored',
    type: 'battery',
    title: 'Unrestricted Battery Usage (Recommended)',
    description:
      'Prevents Android battery optimization from stopping the GoalForge lock service in the background.',
    icon: BatteryCharging,
    required: false,
  },
];

export const PermissionSetup = ({
  permissionStatus,
  isNativeAndroid,
  onRequestPermission,
  onRefreshPermissions,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-black text-text-main uppercase tracking-wider">
            Android System Permissions
          </h4>
          <p className="text-[11px] font-bold text-text-muted mt-0.5">
            {isNativeAndroid
              ? 'Grant Accessibility Service to enforce Instagram blocking on this device.'
              : 'Web browser mode detected. Native Android permissions apply inside the GoalForge Android APK.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefreshPermissions}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-input hover:bg-bg-input/80 border border-border-light text-[11px] font-black text-text-main transition-all active:scale-95 shrink-0"
        >
          <RefreshCw size={12} className="text-accent-blue" />
          <span>Verify</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {PERMISSION_ITEMS.map((item) => {
          const Icon = item.icon;
          const granted = !!permissionStatus?.[item.key];
          return (
            <div
              key={item.key}
              className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                granted
                  ? 'bg-emerald-500/5 border-emerald-500/25'
                  : 'bg-bg-input/50 border-border-light'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    granted ? 'bg-emerald-500/15 text-emerald-400' : 'bg-accent-blue/10 text-accent-blue'
                  }`}
                >
                  <Icon size={17} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-text-main">{item.title}</span>
                    {granted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={10} /> Granted
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                          item.required
                            ? 'text-amber-400 bg-amber-500/15'
                            : 'text-text-muted bg-bg-card'
                        }`}
                      >
                        <AlertCircle size={10} /> {item.required ? 'Required' : 'Optional'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-text-muted mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRequestPermission(item.type)}
                disabled={!isNativeAndroid && granted}
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all active:scale-95 ${
                  granted
                    ? 'bg-bg-card border border-border-light text-text-muted hover:text-text-main'
                    : 'bg-accent-blue hover:bg-accent-blue/90 text-white shadow-sm shadow-accent-blue/25'
                }`}
              >
                <span>{granted ? 'Manage' : 'Grant'}</span>
                <ExternalLink size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionSetup;

