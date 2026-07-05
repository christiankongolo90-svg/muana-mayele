export interface AdminUser {
  id: number;
  full_name: string;
  email: string | null;
  phone: string;
  country_code: string;
  profession: string | null;
  neighborhood: string | null;
  role: 'user' | 'admin';
}

export interface AdminQuestion {
  id: number;
  category_id: number;
  category_name: string;
  question: string;
  options: string[];
  correct_answer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  is_active: boolean;
}

export interface AdminCategory {
  id: number;
  name: string;
  description: string | null;
  question_count: number;
}

export interface AdminSession {
  id: number;
  user_id: number;
  full_name: string;
  phone: string;
  started_at: string;
  ended_at: string | null;
  time_taken: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  score: number;
  total_points: number;
  percentage: number;
  is_completed: boolean;
  live_correct?: number;
  live_answered?: number;
  live_points?: number;
  live_duration?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface QuizSettingsAdmin {
  time_limit: number;
  is_open: boolean;
  schedule_enabled: boolean;
  schedule_days: number[];
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  schedule_timezone: string;
  updated_at: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalQuestions: number;
  totalSessions: number;
  completedSessions: number;
  averageScore: number;
  recentUsers: AdminUser[];
  recentSessions: AdminSession[];
}

export interface SiteContentItem {
  id: number;
  section: string;
  content_key: string;
  content_value: string;
  content_type: 'text' | 'textarea' | 'image' | 'html';
  label: string;
  sort_order: number;
  updated_at: string;
}
