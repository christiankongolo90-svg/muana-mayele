import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { ApiService, User } from '../../services/api.service';
import { environment } from '../../../environments/environment';

interface UserStats {
  total_quizzes: number;
  best_score: number;
  total_points: number;
  average_score: number;
  total_correct: number;
  total_wrong: number;
  accuracy: number;
  rank: number | null;
}

interface QuizHistory {
  session_id: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  score: number;
  time_taken: number;
  played_at: string;
}

interface UserProfile {
  user: User & { member_since: string };
  stats: UserStats;
  history: QuizHistory[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FooterComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  profile = signal<UserProfile | null>(null);
  isLoading = signal(true);
  error = signal('');

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  get currentUser() {
    return this.apiService.currentUser();
  }

  ngOnInit() {
    if (!this.currentUser) {
      this.router.navigate(['/']);
      return;
    }
    this.loadProfile();
  }

  async loadProfile() {
    if (!this.currentUser) return;

    this.isLoading.set(true);
    this.error.set('');

    try {
      const response = await fetch(`${environment.apiUrl}/user/stats?user_id=${this.currentUser.id}`);
      const data = await response.json();

      if (data.success) {
        this.profile.set(data.data);
      } else {
        this.error.set(data.error || 'Failed to load profile');
      }
    } catch (err) {
      console.error('Profile load error:', err);
      this.error.set('Unable to load profile. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  startQuiz() {
    this.router.navigate(['/quiz']);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getScoreClass(score: number): string {
    if (score >= 180) return 'excellent';
    if (score >= 140) return 'good';
    if (score >= 100) return 'average';
    return 'low';
  }

  getRankSuffix(rank: number): string {
    if (rank === 1) return 'er';
    return 'ème';
  }
}
