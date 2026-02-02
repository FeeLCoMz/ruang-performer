import React from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript errors in the component tree and displays fallback UI
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by ErrorBoundary:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h1>Oops! Terjadi Kesalahan</h1>
            <p className="error-message">
              Maaf, terjadi kesalahan yang tidak terduga. Tim kami sedang menangani masalah ini.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Detail Error (Development Mode)</summary>
                <pre className="error-stack">
                  <strong>{this.state.error.toString()}</strong>
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <button onClick={this.handleReset} className="btn-reset">
              Kembali ke Beranda
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
