import React, { useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!duration) return
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle2 className="toast-icon success" size={20} />,
    error: <AlertCircle className="toast-icon error" size={20} />,
    info: <Info className="toast-icon info" size={20} />,
  }

  return (
    <div className={`toast-notification toast-${type}`}>
      <div className="toast-content">
        {icons[type] || icons.info}
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Cerrar">
        <X size={16} />
      </button>
    </div>
  )
}
