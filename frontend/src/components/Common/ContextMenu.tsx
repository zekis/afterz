import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'

interface ContextMenuItem {
  label: string
  onClick?: () => void
  icon?: React.ReactNode
  disabled?: boolean
  className?: string
  submenu?: ContextMenuItem[]
}

interface ContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  items: ContextMenuItem[]
  onClose: () => void
}

const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, position, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [hoveredSubmenu, setHoveredSubmenu] = useState<number | null>(null)
  const [submenuPosition, setSubmenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number }>(position)

  // Calculate adjusted position to prevent menu from going off-screen
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      let adjustedX = position.x
      let adjustedY = position.y
      
      // Check if menu would go off the right edge
      if (position.x + menuRect.width > viewportWidth) {
        adjustedX = viewportWidth - menuRect.width - 10 // 10px margin
      }
      
      // Check if menu would go off the bottom edge
      if (position.y + menuRect.height > viewportHeight) {
        adjustedY = viewportHeight - menuRect.height - 10 // 10px margin
      }
      
      // Ensure menu doesn't go off the left edge
      if (adjustedX < 10) {
        adjustedX = 10
      }
      
      // Ensure menu doesn't go off the top edge
      if (adjustedY < 10) {
        adjustedY = 10
      }
      
      setAdjustedPosition({ x: adjustedX, y: adjustedY })
    }
  }, [isOpen, position])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleItemMouseEnter = (index: number, event: React.MouseEvent) => {
    const item = items[index]
    if (item.submenu) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      setSubmenuPosition({
        x: rect.right + 5,
        y: rect.top
      })
      setHoveredSubmenu(index)
    }
  }

  const handleItemMouseLeave = () => {
    setHoveredSubmenu(null)
  }

  if (!isOpen) return null

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[150px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className="relative"
          onMouseEnter={(e) => handleItemMouseEnter(index, e)}
          onMouseLeave={handleItemMouseLeave}
        >
          <button
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick()
                onClose()
              }
            }}
            disabled={item.disabled}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
              item.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'
            } ${item.className || ''}`}
          >
            <div className="flex items-center space-x-2">
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </div>
            {item.submenu && (
              <ChevronRight className="w-3 h-3 text-gray-400" />
            )}
          </button>

          {/* Submenu */}
          {item.submenu && hoveredSubmenu === index && (
            <div
              className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[150px]"
              style={{
                left: submenuPosition.x,
                top: submenuPosition.y,
              }}
            >
              {item.submenu.map((subItem, subIndex) => (
                <button
                  key={subIndex}
                  onClick={() => {
                    if (!subItem.disabled && subItem.onClick) {
                      subItem.onClick()
                      onClose()
                    }
                  }}
                  disabled={subItem.disabled}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${
                    subItem.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'
                  } ${subItem.className || ''}`}
                >
                  {subItem.icon && <span className="flex-shrink-0">{subItem.icon}</span>}
                  <span>{subItem.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>,
    document.body
  )
}

export default ContextMenu
