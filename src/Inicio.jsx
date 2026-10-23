import React, { Component, useCallback, useEffect, useRef, useState } from 'react'
import Login from './LoginView.jsx'
import App from './App.jsx'
import { getCurrentSession, loginWithGoogle, logout } from './services/authService.js'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111827',
          color: '#f9fafb',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ fontSize: '1.4rem', color: '#f87171', marginBottom: '12px' }}>
              Ocurrió un error inesperado
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '20px' }}>
              {this.state.error?.message || 'Hubo un inconveniente al renderizar la aplicación.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: '#c8102e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Recargar Aplicación
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default function AppInicial() {
  const [session, setSession] = useState(() => getCurrentSession())
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const loginInProgress = useRef(false)

  const handleGoogleCredential = useCallback(async (credential) => {
    if (loginInProgress.current) return
    loginInProgress.current = true

    setLoginLoading(true)
    setLoginError(null)

    try {
      const authenticatedSession = await loginWithGoogle(credential)
      setSession(authenticatedSession)
    } catch (error) {
      setLoginError(error.message || 'No fue posible iniciar sesión. Inténtalo de nuevo.')
    } finally {
      loginInProgress.current = false
      setLoginLoading(false)
    }
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    setSession(null)
    setLoginError(null)
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      logout()
      setSession(null)
      setLoginError('Tu sesión expiró o dejó de ser válida. Inicia sesión otra vez.')
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  if (!session) {
    return (
      <Login
        onContinue={handleGoogleCredential}
        loading={loginLoading}
        error={loginError}
      />
    )
  }

  return (
    <ErrorBoundary>
      <App user={session.user} onLogout={handleLogout} />
    </ErrorBoundary>
  )
}
