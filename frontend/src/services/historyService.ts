import { FrappeAPI } from './api'

export interface HistoryEntry {
  name: string
  owner: string
  creation: string
  changes: string[]
  change_type: 'created' | 'modified'
}

export interface CommentEntry {
  name: string
  owner: string
  creation: string
  content: string
  comment_type: string
  full_name?: string
}

export class HistoryService {
  static async getDocumentHistory(doctype: string, name: string): Promise<HistoryEntry[]> {
    try {
      const res = await FrappeAPI.post<{ history: HistoryEntry[]; comments: CommentEntry[] }>('afterz.afterz.history_api.get_document_history', {
        doctype,
        name
      })
      return res.message?.history || []
    } catch (error) {
      console.error('Failed to load document history:', error)
      return []
    }
  }

  static async getDocumentComments(doctype: string, name: string): Promise<CommentEntry[]> {
    try {
      const res = await FrappeAPI.post<CommentEntry[]>('afterz.afterz.history_api.get_document_comments', {
        doctype,
        name
      })
      return res.message || []
    } catch (error) {
      console.error('Failed to load document comments:', error)
      return []
    }
  }

  static async addComment(doctype: string, name: string, content: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await FrappeAPI.post('afterz.afterz.history_api.add_comment', {
        doctype,
        name,
        content
      })
      return { success: true }
    } catch (error: any) {
      console.error('Failed to add comment:', error)
      return {
        success: false,
        error: error.message || 'Failed to add comment'
      }
    }
  }
}
