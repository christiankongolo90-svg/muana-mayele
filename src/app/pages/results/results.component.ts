import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results.component.html',
  styleUrl: './results.component.scss'
})
export class ResultsComponent implements OnInit {
  private apiService = inject(ApiService);

  results: any = null;
  userRank = signal<number | null>(null);
  totalParticipants = signal<number>(0);

  constructor(
    public quizService: QuizService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.results = this.quizService.getResults();

    if (this.results.answers.every((a: any) => a === null)) {
      this.router.navigate(['/']);
      return;
    }

    // Fetch user's rank
    try {
      const user = this.apiService.currentUser();
      if (user) {
        const data = await this.apiService.getLeaderboardWithRank(user.id);
        if (data.user_rank) {
          this.userRank.set(data.user_rank.rank);
        }
        this.totalParticipants.set(data.total);
      }
    } catch (e) {
      console.error('Failed to fetch rank:', e);
    }
  }

  get grade(): string {
    if (!this.results) return '';
    const percentage = this.results.percentage;

    if (percentage >= 90) return 'Excellent !';
    if (percentage >= 75) return 'Très bien !';
    if (percentage >= 60) return 'Bien !';
    if (percentage >= 50) return 'Passable';
    return 'À améliorer';
  }

  get gradeClass(): string {
    if (!this.results) return '';
    const percentage = this.results.percentage;

    if (percentage >= 75) return 'excellent';
    if (percentage >= 50) return 'good';
    return 'needs-work';
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  playAgain(): void {
    this.quizService.resetQuiz();
    this.router.navigate(['/quiz']);
  }

  goHome(): void {
    this.quizService.resetQuiz();
    this.router.navigate(['/']);
  }
}
