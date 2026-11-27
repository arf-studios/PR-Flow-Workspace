import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Terjadi kesalahan yang tidak terduga pada aplikasi.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('PRFlow ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    let friendlyDetail =
      'Terjadi kendala saat menyinkronkan data workspace. Silakan muat ulang tampilan.';
    try {
      const parsed = JSON.parse(this.state.message) as { error?: string; operationType?: string };
      if (parsed?.error) {
        friendlyDetail = parsed.error.toLowerCase().includes('permission')
          ? 'Akses ke data kru ditolak oleh server keamanan. Kemungkinan peran atau keanggotaan Anda telah diperbarui.'
          : parsed.error;
      }
    } catch {
      if (this.state.message && this.state.message.length < 240) {
        friendlyDetail = this.state.message;
      }
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#9EC7DA] via-[#B1CEE0] to-[#C6D0DC] dark:from-[#040B14] dark:via-[#071422] dark:to-[#0C1320]">
        <div className="max-w-md w-full p-7 rounded-[28px] glass-panel text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Gangguan Sinkronisasi Workspace
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {friendlyDetail}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] text-white text-xs font-semibold shadow-md shadow-[#17B5E8]/25 hover:brightness-105 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }
}
