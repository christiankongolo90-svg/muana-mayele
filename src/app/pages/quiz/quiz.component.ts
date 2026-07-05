import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuizService, Question } from '../../services/quiz.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.scss'
})
export class QuizComponent implements OnInit, OnDestroy {
  private timerInterval: any;

  currentQuestion = signal<Question | null>(null);
  selectedAnswer = signal<number | null>(null);
  showFeedback = signal(false);
  isCorrect = signal(false);
  isLoading = signal(false);
  isSubmitting = signal(false);

  readonly quizState = computed(() => this.quizService.quizState());

  readonly progress = computed(() => {
    const state = this.quizState();
    const total = this.quizService.totalQuestions();
    return total > 0 ? ((state.currentQuestionIndex + 1) / total) * 100 : 0;
  });

  readonly formattedTime = computed(() => {
    const seconds = this.quizState().timeRemaining;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  readonly isTimeLow = computed(() => this.quizState().timeRemaining <= 60);

  constructor(
    public quizService: QuizService,
    private apiService: ApiService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    // Check if user is logged in
    if (!this.apiService.isLoggedIn()) {
      this.router.navigate(['/']);
      return;
    }

    this.isLoading.set(true);

    try {
      // Check if quiz is open before starting
      const settings = await this.apiService.getQuizSettings();
      if (!settings.is_open) {
        if (settings.schedule?.next_session) {
          const next = settings.schedule.next_session;
          const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
          const dayName = days[next.day_of_week] || '';
          alert(`Le quiz n'est pas encore ouvert. Prochaine session : ${dayName} de ${next.start.substring(0,5)} a ${next.end.substring(0,5)}.`);
        } else {
          alert('Le quiz est actuellement ferme. Revenez plus tard.');
        }
        this.router.navigate(['/']);
        return;
      }

      await this.quizService.startQuiz();
      this.loadCurrentQuestion();
      this.startTimer();
    } catch (error: any) {
      console.error('Failed to start quiz:', error);
      const message = error?.message || 'Erreur de connexion. Veuillez réessayer.';
      alert(message);
      this.router.navigate(['/']);
    } finally {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      const currentTime = this.quizState().timeRemaining;
      if (currentTime > 0) {
        this.quizService.updateTime(currentTime - 1);
      } else {
        this.stopTimer();
        this.completeAndNavigate();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private loadCurrentQuestion(): void {
    const question = this.quizService.getCurrentQuestion();
    this.currentQuestion.set(question);
    this.selectedAnswer.set(null);
    this.showFeedback.set(false);
  }

  selectAnswer(index: number): void {
    if (this.showFeedback() || this.isSubmitting()) return;
    this.selectedAnswer.set(index);
  }

  async submitAnswer(): Promise<void> {
    const selected = this.selectedAnswer();
    if (selected === null || this.showFeedback() || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    try {
      const correct = await this.quizService.answerQuestion(selected);
      this.isCorrect.set(correct);
      this.showFeedback.set(true);

      // Auto advance after showing feedback
      setTimeout(() => {
        this.goToNext();
      }, 1500);
    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert('Erreur lors de la soumission. Veuillez réessayer.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  goToNext(): void {
    const hasNext = this.quizService.nextQuestion();
    if (hasNext) {
      this.loadCurrentQuestion();
    } else {
      this.stopTimer();
      this.completeAndNavigate();
    }
  }

  private async completeAndNavigate(): Promise<void> {
    await this.quizService.completeQuiz();
    this.router.navigate(['/results']);
  }

  goToPrevious(): void {
    if (this.quizService.previousQuestion()) {
      this.loadCurrentQuestion();
    }
  }

  quitQuiz(): void {
    if (confirm('Êtes-vous sûr de vouloir quitter le quiz ? Votre progression sera perdue.')) {
      this.stopTimer();
      this.quizService.resetQuiz();
      this.router.navigate(['/']);
    }
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
