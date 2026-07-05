import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContentService } from '../../services/content.service';
import { ApiService, ScheduleInfo } from '../../services/api.service';

@Component({
  selector: 'app-quiz-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-info.component.html',
  styleUrl: './quiz-info.component.scss'
})
export class QuizInfoComponent implements OnInit {
  private router = inject(Router);
  private apiService = inject(ApiService);
  readonly c = inject(ContentService);

  readonly quizOpen = signal(true);
  readonly schedule = signal<ScheduleInfo | null>(null);

  private readonly dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  private defaultItems = [
    '20 minutes maximum',
    "Jusqu'a 20 questions",
    'Classement en temps reel'
  ];

  readonly infoItems = computed(() => [
    this.c.get('quiz_info', 'info_1', this.defaultItems[0]),
    this.c.get('quiz_info', 'info_2', this.defaultItems[1]),
    this.c.get('quiz_info', 'info_3', this.defaultItems[2]),
  ]);

  async ngOnInit() {
    try {
      const settings = await this.apiService.getQuizSettings();
      this.quizOpen.set(settings.is_open);
      this.schedule.set(settings.schedule);
    } catch {
      this.quizOpen.set(true);
    }
  }

  startQuiz() {
    this.router.navigate(['/quiz']);
  }

  getNextSessionText(): string {
    const sched = this.schedule();
    if (!sched?.next_session) return '';

    const next = sched.next_session;
    const dayName = this.dayNames[next.day_of_week] || '';
    const startTime = next.start.substring(0, 5);
    const endTime = next.end.substring(0, 5);

    return `${dayName} de ${startTime} a ${endTime}`;
  }

  getScheduledDaysText(): string {
    const sched = this.schedule();
    if (!sched?.days?.length) return '';

    return sched.days.map(d => this.dayNames[d]).join(', ');
  }
}
