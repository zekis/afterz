import React, { useState, useEffect } from 'react'
import { X, MessageSquare, Clock, User, Send, Loader2, Edit } from 'lucide-react'
import { HistoryService, HistoryEntry, CommentEntry } from '../../services/historyService'
import { formatDateTime } from '../../lib/utils'

type TimelineEntry = {
  type: 'history' | 'comment'
  id: string
  owner: string
  full_name?: string
  creation: string
  content?: string
  changes?: string[]
  change_type?: string
}

interface HistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  doctype: string
  docname: string
  title: string
  refreshTrigger?: number // Add optional refresh trigger
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  onClose,
  doctype,
  docname,
  title,
  refreshTrigger
}) => {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [comments, setComments] = useState<CommentEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)

  useEffect(() => {
    if (isOpen && doctype && docname) {
      loadData()
    }
  }, [isOpen, doctype, docname])

  // Watch for refresh trigger changes
  useEffect(() => {
    if (isOpen && doctype && docname && refreshTrigger) {
      loadData()
    }
  }, [refreshTrigger])

  const loadData = async () => {
    setLoading(true)
    try {
      const [historyData, commentsData] = await Promise.all([
        HistoryService.getDocumentHistory(doctype, docname),
        HistoryService.getDocumentComments(doctype, docname)
      ])
      setHistory(historyData)
      setComments(commentsData)
    } catch (error) {
      console.error('Failed to load history/comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setAddingComment(true)
    try {
      const result = await HistoryService.addComment(doctype, docname, newComment.trim())
      if (result.success) {
        setNewComment('')
        await loadData() // Reload to show new comment
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setAddingComment(false)
    }
  }

  const formatHistoryChange = (entry: HistoryEntry) => {
    if (entry.change_type === 'created') {
      return 'Document created'
    }
    
    if (entry.changes && entry.changes.length > 0) {
      // Backend now provides formatted change descriptions, so just join them
      return entry.changes.join(', ')
    }
    
    return 'Document updated'
  }

  // Create unified timeline by merging history and comments
  const getTimelineEntries = (): TimelineEntry[] => {
    const timelineEntries: TimelineEntry[] = []
    
    // Add history entries
    history.forEach(entry => {
      timelineEntries.push({
        type: 'history',
        id: entry.name,
        owner: entry.owner,
        creation: entry.creation,
        changes: entry.changes,
        change_type: entry.change_type
      })
    })
    
    // Add comment entries
    comments.forEach(comment => {
      timelineEntries.push({
        type: 'comment',
        id: comment.name,
        owner: comment.owner,
        full_name: comment.full_name,
        creation: comment.creation,
        content: comment.content
      })
    })
    
    // Sort by creation date (newest first)
    return timelineEntries.sort((a, b) => 
      new Date(b.creation).getTime() - new Date(a.creation).getTime()
    )
  }

  if (!isOpen) return null

  return (
    <div className="w-96 h-full bg-white border-l border-gray-200 flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{title}</h3>
          <p className="text-sm text-gray-500">{doctype}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Timeline Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Activity Timeline ({history.length + comments.length} items)
          </span>
        </div>
      </div>

      {/* Unified Timeline Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {getTimelineEntries().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No activity yet</p>
              </div>
            ) : (
              getTimelineEntries().map((entry) => (
                <div key={entry.id} className="relative">
                  {entry.type === 'comment' ? (
                    // Comment entry
                    <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {entry.full_name || entry.owner}
                            </span>
                            <span className="text-xs text-gray-500">
                              commented {formatDateTime(new Date(entry.creation))}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {entry.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // History entry
                    <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-400">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <Edit className="w-4 h-4 text-gray-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {entry.owner}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDateTime(new Date(entry.creation))}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {entry.change_type === 'created' ? 'Document created' : 
                             entry.changes && entry.changes.length > 0 ? entry.changes.join(', ') : 'Document updated'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Comment Form */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleAddComment} className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            disabled={addingComment}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newComment.trim() || addingComment}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {addingComment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Add Comment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default HistoryPanel
