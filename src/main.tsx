import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error overlay helper for raw script errors
window.addEventListener('error', (event) => {
  renderCrashScreen(event.error || new Error(event.message || 'Unknown window runtime error'));
});

window.addEventListener('unhandledrejection', (event) => {
  renderCrashScreen(event.reason || new Error('Unhandled Promise Rejection'));
});

function renderCrashScreen(error: Error) {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="
        font-family: system-ui, -apple-system, sans-serif;
        background: #090d16;
        color: #f1f5f9;
        padding: 2rem;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        direction: rtl;
        text-align: center;
      ">
        <div style="
          max-width: 600px;
          background: #0f172a;
          border: 1px solid #334155;
          padding: 2.5rem;
          border-radius: 1rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        ">
          <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: #f43f5e; margin-bottom: 1rem;">
            خطای اجرای برنامه (Runtime Exception)
          </h1>
          <p style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem; line-height: 1.6;">
            خطایی در لود اولیه فرانت‌اند رخ داده است. این پیغام برای کمک به عیب‌یابی نمایش داده می‌شود.
          </p>
          <div style="
            background: #020617;
            border: 1px solid #1e293b;
            padding: 1rem;
            border-radius: 0.5rem;
            text-align: left;
            font-family: monospace;
            font-size: 0.8rem;
            color: #fb7185;
            overflow-x: auto;
            white-space: pre-wrap;
            margin-bottom: 1.5rem;
            max-height: 250px;
          ">${error?.message || 'Empty error message'}<br/><br/>${error?.stack || ''}</div>
          <button onclick="window.location.reload()" style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            font-size: 0.875rem;
            font-weight: 600;
            border-radius: 0.375rem;
            cursor: pointer;
            transition: background 0.2s;
          ">تلاش مجدد بارگذاری</button>
        </div>
      </div>
    `;
  }
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SafeErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React ErrorBoundary caught an error: ", error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#090d16] text-[#f1f5f9] p-8 font-sans" dir="rtl">
          <div className="max-w-xl w-full bg-[#0f172a] border border-slate-800 p-8 rounded-2xl shadow-2xl text-center">
            <span className="text-4xl block mb-4">⚙️</span>
            <h1 className="text-xl font-black text-rose-500 mb-2">خطا در بارگذاری مؤلفه‌ها</h1>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              با موفقیت خطای اجرای کامپوننت‌های فرانت‌اند توسط لایه محافظتی ردگیری شد. خطا:
            </p>
            <div className="bg-[#020617] border border-slate-900 p-4 rounded-xl text-left font-mono text-[10px] text-rose-450 overflow-x-auto white-space-pre-wrap max-h-60 mb-6">
              {this.state.error?.message}
              <br /><br />
              {this.state.error?.stack}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-6 rounded-lg transition-colors cursor-pointer"
            >
              تازه‌سازی صفحه
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SafeErrorBoundary>
      <App />
    </SafeErrorBoundary>
  </React.StrictMode>
);
