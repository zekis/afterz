import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, CheckCircle, XCircle, Send } from 'lucide-react'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data?: any) => void
  title: string
  message: string
  type: 'submit' | 'approve' | 'reject' | 'unapprove' | 'delete' | 'submit-week' | 'approve-all'
  requiresInput?: boolean
  inputLabel?: string
  inputPlaceholder?: string
  confirmText?: string
  cancelText?: string
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type,
  requiresInput = false,
  inputLabel,
  inputPlaceholder,
  confirmText,
  cancelText = 'Cancel'
}) => {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    if (requiresInput && !inputValue.trim()) {
      return
    }

    setIsLoading(true)
    try {
      await onConfirm(requiresInput ? inputValue.trim() : undefined)
      setInputValue('')
      onClose()
    } catch (error) {
      // Error handling is done by the parent component
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setInputValue('')
    onClose()
  }

  const getTypeConfig = () => {
    switch (type) {
      case 'submit':
        return {
          icon: <Send className="w-6 h-6 text-blue-600" />,
          confirmButtonClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          defaultConfirmText: 'Submit Entry'
        }
      case 'approve':
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          confirmButtonClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          defaultConfirmText: 'Approve Entry'
        }
      case 'reject':
        return {
          icon: <XCircle className="w-6 h-6 text-red-600" />,
          confirmButtonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          defaultConfirmText: 'Reject Entry'
        }
      case 'unapprove':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-orange-600" />,
          confirmButtonClass: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
          defaultConfirmText: 'Un-approve Entry'
        }
      case 'delete':
        return {
          icon: <XCircle className="w-6 h-6 text-red-600" />,
          confirmButtonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          defaultConfirmText: 'Delete Entry'
        }
      case 'submit-week':
        return {
          icon: <Send className="w-6 h-6 text-blue-600" />,
          confirmButtonClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          defaultConfirmText: 'Submit Week'
        }
      case 'approve-all':
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          confirmButtonClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          defaultConfirmText: 'Approve All'
        }
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-gray-600" />,
          confirmButtonClass: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500',
          defaultConfirmText: 'Confirm'
        }
    }
  }

  const typeConfig = getTypeConfig()

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto z-[10000]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {typeConfig.icon}
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 mb-4 whitespace-pre-line">{message}</p>
            
            {requiresInput && (
              <div className="mb-4">
                {inputLabel && (
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {inputLabel}
                  </label>
                )}
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={inputPlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${typeConfig.confirmButtonClass}`}
              disabled={isLoading || (requiresInput && !inputValue.trim())}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                confirmText || typeConfig.defaultConfirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ConfirmationDialog
