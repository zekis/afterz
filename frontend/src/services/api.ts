import { FrappeResponse, FrappeListResponse } from '../types'

// Base API configuration
const API_BASE = '/api/method'

export class FrappeAPI {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}/${endpoint}`
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Add CSRF token if available
    if (window.frappe_boot?.csrf_token) {
      defaultHeaders['X-Frappe-CSRF-Token'] = window.frappe_boot.csrf_token
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.exc) {
        throw new Error(data.exc)
      }
      
      return data
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error)
      throw error
    }
  }

  static async get<T>(endpoint: string): Promise<FrappeResponse<T>> {
    return this.request<FrappeResponse<T>>(endpoint, {
      method: 'GET',
    })
  }

  static async post<T>(endpoint: string, data: any): Promise<FrappeResponse<T>> {
    return this.request<FrappeResponse<T>>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async put<T>(endpoint: string, data: any): Promise<FrappeResponse<T>> {
    return this.request<FrappeResponse<T>>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  static async delete<T>(endpoint: string): Promise<FrappeResponse<T>> {
    return this.request<FrappeResponse<T>>(endpoint, {
      method: 'DELETE',
    })
  }

  // Frappe-specific methods
  static async getDoc<T>(doctype: string, name: string): Promise<FrappeResponse<T>> {
    return this.get<T>(`frappe.client.get?doctype=${doctype}&name=${name}`)
  }

  static async getList<T>(
    doctype: string,
    fields: string[] = ['name'],
    filters: Record<string, any> = {},
    orderBy: string = 'modified desc',
    limit: number = 20
  ): Promise<FrappeListResponse<T>> {
    const params = new URLSearchParams({
      doctype,
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      order_by: orderBy,
      limit_page_length: limit.toString(),
    })

    return this.get<T[]>(`frappe.client.get_list?${params}`)
  }

  static async insertDoc<T>(doctype: string, doc: Partial<T>): Promise<FrappeResponse<T>> {
    return this.post<T>('frappe.client.insert', {
      doctype,
      ...doc,
    })
  }

  static async updateDoc<T>(doctype: string, name: string, doc: Partial<T>): Promise<FrappeResponse<T>> {
    return this.post<T>('frappe.client.set_value', {
      doctype,
      name,
      fieldname: doc,
    })
  }

  static async deleteDoc(doctype: string, name: string): Promise<FrappeResponse<any>> {
    return this.delete(`frappe.client.delete?doctype=${doctype}&name=${name}`)
  }
}

// Global type declarations for Frappe boot data
declare global {
  interface Window {
    frappe_boot?: {
      csrf_token: string
      sitename: string
      user: {
        name: string
        full_name: string
        email: string
        user_image?: string
      }
    }
    frappeBootAvailable?: boolean
  }
}
