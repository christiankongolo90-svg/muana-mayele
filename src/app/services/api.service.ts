import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  full_name: string;
  phone: string;
  country_code: string;
  email?: string;
  neighborhood?: string;
  role?: 'user' | 'admin';
}

export interface SendPasscodeResponse {
  message: string;
  phone: string;
  country_code: string;
  type: 'login' | 'register';
  expires_in: number;
  debug_passcode?: string;
}

export interface VerifyPasscodeResponse {
  user: User;
  is_new: boolean;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export interface ApiQuestion {
  id: number;
  question: string;
  options: string[];
  category: string;
  difficulty: string;
}

export interface QuizStartResponse {
  session_id: number;
  questions: ApiQuestion[];
  total_questions: number;
  time_limit: number;
  points_per_correct: number;
}

export interface AnswerResponse {
  is_correct: boolean;
  correct_answer: number;
  points_earned: number;
}

export interface QuizResults {
  session_id: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  score: number;
  total_points: number;
  percentage: number;
  time_taken: number;
}

export interface ScheduleInfo {
  enabled: boolean;
  days: number[];
  start_time: string;
  end_time: string;
  timezone: string;
  next_session: {
    date: string;
    start: string;
    end: string;
    datetime: string;
    day_of_week: number;
  } | null;
}

export interface QuizSettings {
  is_open: boolean;
  time_limit: number;
  schedule: ScheduleInfo | null;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  name: string;
  neighborhood: string;
  best_score: number;
  total_points: number;
  total_quizzes: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  readonly currentUser = signal<User | null>(null);
  readonly isLoading = signal(false);

  constructor() {
    // Load user from localStorage if exists
    const savedUser = localStorage.getItem('quiz_user');
    if (savedUser) {
      try {
        this.currentUser.set(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('quiz_user');
      }
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
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
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  // List of supported countries
  readonly countries: Country[] = [
    { code: '+243', name: 'RD Congo', flag: '🇨🇩' },
    { code: '+47', name: 'Norvège', flag: '🇳🇴' },
    { code: '+32', name: 'Belgique', flag: '🇧🇪' },
    { code: '+33', name: 'France', flag: '🇫🇷' },
    { code: '+1', name: 'USA/Canada', flag: '🇺🇸' },
    { code: '+44', name: 'Royaume-Uni', flag: '🇬🇧' },
    { code: '+41', name: 'Suisse', flag: '🇨🇭' },
    { code: '+49', name: 'Allemagne', flag: '🇩🇪' },
    { code: '+27', name: 'Afrique du Sud', flag: '🇿🇦' },
    { code: '+254', name: 'Kenya', flag: '🇰🇪' },
    { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
    { code: '+242', name: 'Congo-Brazzaville', flag: '🇨🇬' },
    { code: '+244', name: 'Angola', flag: '🇦🇴' },
    { code: '+250', name: 'Rwanda', flag: '🇷🇼' },
    { code: '+256', name: 'Ouganda', flag: '🇺🇬' },
    { code: '+255', name: 'Tanzanie', flag: '🇹🇿' },
    { code: '+260', name: 'Zambie', flag: '🇿🇲' }
  ];

  // Send passcode for login or registration
  async sendPasscode(data: {
    phone: string;
    country_code: string;
    type: 'login' | 'register';
    full_name?: string;
    email?: string;
    profession?: string;
    neighborhood?: string;
  }): Promise<SendPasscodeResponse> {
    return this.request<SendPasscodeResponse>('auth/send-passcode', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Verify passcode and complete login/registration
  async verifyPasscode(data: {
    phone: string;
    country_code: string;
    passcode: string;
    full_name?: string;
    email?: string;
    profession?: string;
    neighborhood?: string;
  }): Promise<VerifyPasscodeResponse> {
    const result = await this.request<VerifyPasscodeResponse>('auth/verify-passcode', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    const user = result.user;
    this.currentUser.set(user);
    localStorage.setItem('quiz_user', JSON.stringify(user));

    return result;
  }

  // Legacy user registration (without passcode)
  async register(userData: {
    full_name: string;
    phone: string;
    country_code?: string;
    email?: string;
    profession?: string;
    neighborhood?: string;
  }): Promise<User> {
    const result = await this.request<{ user: User }>('register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    const user = result.user;
    this.currentUser.set(user);
    localStorage.setItem('quiz_user', JSON.stringify(user));

    return user;
  }

  // Start a new quiz
  async startQuiz(): Promise<QuizStartResponse> {
    const user = this.currentUser();
    if (!user) {
      throw new Error('User not logged in');
    }

    return this.request<QuizStartResponse>('quiz/start', {
      method: 'POST',
      body: JSON.stringify({ user_id: user.id })
    });
  }

  // Submit an answer
  async submitAnswer(sessionId: number, questionId: number, selectedAnswer: number): Promise<AnswerResponse> {
    return this.request<AnswerResponse>('quiz/answer', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        question_id: questionId,
        selected_answer: selectedAnswer
      })
    });
  }

  // Complete the quiz
  async completeQuiz(sessionId: number, timeTaken: number): Promise<{ results: QuizResults; answers: any[] }> {
    return this.request<{ results: QuizResults; answers: any[] }>('quiz/complete', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        time_taken: timeTaken
      })
    });
  }

  // Get quiz results
  async getResults(sessionId: number): Promise<{ results: QuizResults; answers: any[] }> {
    return this.request<{ results: QuizResults; answers: any[] }>(`quiz/results?session_id=${sessionId}`);
  }

  // Get quiz settings (public - no auth required)
  async getQuizSettings(): Promise<QuizSettings> {
    return this.request<QuizSettings>('quiz/settings');
  }

  // Get leaderboard
  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const result = await this.request<{ leaderboard: LeaderboardEntry[] }>(`leaderboard?limit=${limit}`);
    return result.leaderboard;
  }

  // Get leaderboard with user rank
  async getLeaderboardWithRank(userId: number, limit: number = 10): Promise<any> {
    return this.request<any>(`leaderboard?limit=${limit}&user_id=${userId}`);
  }

  // Logout
  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('quiz_user');
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }
}
