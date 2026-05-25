import React from 'react';
import { AlertTriangle, RotateCcw, Trash2, Download, ChevronRight, ChevronDown, ShieldAlert } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught runtime error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all local application data? This will reset local settings and cached goals (synced goals in Firebase will be reloaded on next login).')) {
      try {
        localStorage.clear();
        // Also clear any cached databases/indexedDB if possible
        if (window.indexedDB) {
          window.indexedDB.databases().then((dbs) => {
            dbs.forEach((db) => {
              window.indexedDB.deleteDatabase(db.name);
            });
          });
        }
        alert('Local data cleared successfully! Reloading...');
        window.location.href = window.location.origin + window.location.pathname;
      } catch (err) {
        console.error('Error resetting app data:', err);
        alert('Failed to clear some local storage. Reloading anyway...');
        window.location.reload();
      }
    }
  };

  handleExportBackup = () => {
    try {
      const backup = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        backup[key] = localStorage.getItem(key);
      }
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `goalforge_local_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Failed to export backup: ' + err.message);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackType === 'widget') {
        return (
          <div 
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
            className="rounded-[32px] p-6 shadow-sm flex flex-col items-center justify-center text-center min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-3 animate-bounce">
              <AlertTriangle size={24} />
            </div>
            <h4 className="text-sm font-black text-text-main">Widget Error</h4>
            <p className="text-xs text-text-muted mt-1 max-w-[240px]">
              {this.props.errorMessage || 'This component encountered a rendering error.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-input border border-border-light text-xs font-black text-text-main hover:bg-bg-input/80 transition-all active:scale-95"
            >
              <RotateCcw size={12} /> Retry Component
            </button>
          </div>
        );
      }

      // Full screen application error page
      return (
        <div className="min-h-screen bg-[#0b0b14] text-slate-100 flex items-center justify-center p-4 sm:p-6 font-inter">
          {/* Futuristic ambient background glow */}
          <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-rose-500/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-accent-blue/10 blur-[100px] pointer-events-none" />

          <div className="w-full max-w-xl bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 sm:p-8 shadow-2xl relative z-10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <ShieldAlert size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">GoalForge Core Shield</p>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5 text-white">System Interrupted</h2>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              GoalForge has paused a rendering loop to prevent state corruption. This usually happens after a package update, network desync, or stale browser cache data.
            </p>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2.5 bg-accent-blue hover:bg-accent-blue/90 text-white font-black text-sm py-4 px-6 rounded-2xl shadow-lg shadow-accent-blue/20 transition-all active:scale-[0.98]"
              >
                <RotateCcw size={16} />
                Reload Application
              </button>

              <button
                onClick={this.handleClearData}
                className="flex items-center justify-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-sm py-4 px-6 rounded-2xl transition-all active:scale-[0.98]"
              >
                <Trash2 size={16} className="text-rose-400" />
                Clear Cache & Reset
              </button>

              <button
                onClick={this.handleExportBackup}
                className="col-span-full flex items-center justify-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-sm py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98]"
              >
                <Download size={15} className="text-emerald-400" />
                Export Local Data Backup
              </button>
            </div>

            {/* Technical details toggle */}
            <div className="border border-white/5 bg-slate-950/40 rounded-2xl overflow-hidden">
              <button
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-black text-slate-400 hover:text-white transition-colors"
              >
                <span className="uppercase tracking-widest">Diagnostic Details</span>
                {this.state.showDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {this.state.showDetails && (
                <div className="px-4 pb-4 pt-1 border-t border-white/5">
                  <div className="text-[11px] font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap max-h-48 leading-relaxed scrollbar-thin">
                    <strong>Error:</strong> {this.state.error?.toString() || 'Unknown Error'}
                    <br /><br />
                    <strong>Stack:</strong> {this.state.error?.stack || 'No stack trace available.'}
                    {this.state.errorInfo?.componentStack && (
                      <>
                        <br /><br />
                        <strong>Component Tree:</strong> {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
