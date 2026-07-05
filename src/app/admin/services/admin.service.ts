import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  AdminUser, AdminQuestion, AdminCategory, AdminSession,
  Pagination, DashboardStats, QuizSettingsAdmin, SiteContentItem
} from '../models/admin.models';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private baseUrl = environment.apiUrl;

  readonly isLoading = signal(false);
  readonly adminUser = signal<AdminUser | null>(null);

  constructor() {
    this.loadAdminUser();
  }

  private loadAdminUser() {
    // Try admin_user first, then fall back to quiz_user
    const adminData = localStorage.getItem('admin_user') || localStorage.getItem('quiz_user');
    if (adminData) {
      try {
        const user = JSON.parse(adminData);
        if (user.role === 'admin') {
          this.adminUser.set(user);
          localStorage.setItem('admin_user', JSON.stringify(user));
        }
      } catch {
        localStorage.removeItem('admin_user');
      }
    }
  }

  private getAdminUserId(): number | null {
    return this.adminUser()?.id || null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const adminId = this.getAdminUserId();

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(adminId ? { 'X-Admin-User-Id': adminId.toString() } : {})
      },
      ...options
    };

    try {
      this.isLoading.set(true);
      const response = await fetch(url, defaultOptions);
      const data: ApiResponse<T> = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Request failed');
      }

      return data.data as T;
    } finally {
      this.isLoading.set(false);
    }
  }

  // Dashboard
  async getStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('admin/stats');
  }

  // Users
  async getUsers(page = 1, limit = 20, search = ''): Promise<{ users: AdminUser[]; pagination: Pagination }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search ? { search } : {})
    });
    return this.request<{ users: AdminUser[]; pagination: Pagination }>(`admin/users?${params}`);
  }

  async getAllUsers(): Promise<AdminUser[]> {
    const allUsers: AdminUser[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const data = await this.getUsers(page, 100);
      allUsers.push(...data.users);
      totalPages = data.pagination.pages;
      page++;
    } while (page <= totalPages);

    return allUsers;
  }

  async getUser(id: number): Promise<{ user: AdminUser }> {
    return this.request<{ user: AdminUser }>(`admin/users/show?id=${id}`);
  }

  async updateUser(id: number, data: Partial<AdminUser>): Promise<{ user: AdminUser }> {
    return this.request<{ user: AdminUser }>('admin/users/update', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data })
    });
  }

  async deleteUser(id: number): Promise<void> {
    await this.request<void>('admin/users/delete', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
  }

  // Questions
  async getQuestions(page = 1, limit = 20, categoryId?: number, search = ''): Promise<{ questions: AdminQuestion[]; pagination: Pagination }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(categoryId ? { category_id: categoryId.toString() } : {}),
      ...(search ? { search } : {})
    });
    return this.request<{ questions: AdminQuestion[]; pagination: Pagination }>(`admin/questions?${params}`);
  }

  async getQuestion(id: number): Promise<{ question: AdminQuestion }> {
    return this.request<{ question: AdminQuestion }>(`admin/questions/show?id=${id}`);
  }

  async createQuestion(data: Omit<AdminQuestion, 'id' | 'category_name'>): Promise<{ question: AdminQuestion }> {
    return this.request<{ question: AdminQuestion }>('admin/questions/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateQuestion(id: number, data: Partial<AdminQuestion>): Promise<{ question: AdminQuestion }> {
    return this.request<{ question: AdminQuestion }>('admin/questions/update', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data })
    });
  }

  async deleteQuestion(id: number): Promise<void> {
    await this.request<void>('admin/questions/delete', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
  }

  // Categories
  async getCategories(): Promise<{ categories: AdminCategory[] }> {
    return this.request<{ categories: AdminCategory[] }>('admin/categories');
  }

  async createCategory(data: { name: string; description?: string }): Promise<{ category: AdminCategory }> {
    return this.request<{ category: AdminCategory }>('admin/categories/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateCategory(id: number, data: { name: string; description?: string }): Promise<{ category: AdminCategory }> {
    return this.request<{ category: AdminCategory }>('admin/categories/update', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data })
    });
  }

  async deleteCategory(id: number): Promise<void> {
    await this.request<void>('admin/categories/delete', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
  }

  // Sessions
  async getSessions(page = 1, limit = 20, userId?: number): Promise<{ sessions: AdminSession[]; pagination: Pagination }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(userId ? { user_id: userId.toString() } : {})
    });
    return this.request<{ sessions: AdminSession[]; pagination: Pagination }>(`admin/sessions?${params}`);
  }

  async getSession(id: number): Promise<{ session: AdminSession; answers: any[] }> {
    return this.request<{ session: AdminSession; answers: any[] }>(`admin/sessions/show?id=${id}`);
  }

  async updateSession(id: number, data: Partial<AdminSession>): Promise<{ session: AdminSession }> {
    return this.request<{ session: AdminSession }>('admin/sessions/update', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data })
    });
  }

  async deleteSession(id: number): Promise<void> {
    await this.request<void>('admin/sessions/delete', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
  }

  // Settings
  async getSettings(): Promise<{ settings: QuizSettingsAdmin }> {
    return this.request<{ settings: QuizSettingsAdmin }>('admin/settings');
  }

  async updateSettings(data: Partial<QuizSettingsAdmin>): Promise<{ settings: QuizSettingsAdmin }> {
    return this.request<{ settings: QuizSettingsAdmin }>('admin/settings/update', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Site Content
  async getSiteContent(): Promise<{ content: SiteContentItem[] }> {
    return this.request<{ content: SiteContentItem[] }>('admin/site-content');
  }

  async updateSiteContent(items: { id: number; value: string }[]): Promise<{ content: SiteContentItem[]; updated: number }> {
    return this.request<{ content: SiteContentItem[]; updated: number }>('admin/site-content/update', {
      method: 'PUT',
      body: JSON.stringify({ items })
    });
  }

  async uploadSiteImage(id: number, file: File): Promise<{ item: SiteContentItem; path: string }> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('id', id.toString());

    const adminId = this.getAdminUserId();
    const url = `${this.baseUrl}/admin/site-content/upload`;

    try {
      this.isLoading.set(true);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(adminId ? { 'X-Admin-User-Id': adminId.toString() } : {})
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      return data.data;
    } finally {
      this.isLoading.set(false);
    }
  }

  // Logout admin
  logout() {
    localStorage.removeItem('admin_user');
    this.adminUser.set(null);
  }
}
