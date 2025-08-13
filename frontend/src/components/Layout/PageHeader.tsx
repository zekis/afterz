import React from 'react'

interface PageHeaderProps {
  title: string
  description: string
  breadcrumb?: string
  children?: React.ReactNode
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumb,
  children
}) => {
  return (
    <div className="flex-shrink-0 p-6 border-b border-slate-200 bg-white">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          {breadcrumb && (
            <div className="text-sm text-slate-500 mb-1">{breadcrumb}</div>
          )}
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-600 mt-1">{description}</p>
        </div>
        {children && (
          <div className="flex items-center space-x-3">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

export default PageHeader
