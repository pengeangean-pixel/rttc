// main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.toString() || 'Unknown Error' };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("React App Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#721c24', backgroundColor: '#f8d7da' }}>
          <h2>⚠️ មានបញ្ហាក្នុងការរ៉ាន់កម្មវិធី (React App Error)</h2>
          <pre>{this.state.error}</pre>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Try Reloading
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
