import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });

  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-app text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-surface p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-red-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-400 mb-2">Application Error</h1>
            <p className="text-text-muted mb-6">A critical component failed to render. Please see the details below.</p>

            <div className="bg-black/40 rounded-lg p-4 text-left overflow-auto max-h-[300px] font-mono text-sm border border-white/5 mb-6">
              <div className="text-red-300 font-bold mb-2">{this.state.error?.toString()}</div>
              <div className="text-gray-400 whitespace-pre-wrap">{this.state.errorInfo?.componentStack || this.state.error?.stack}</div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-semibold"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
