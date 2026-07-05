import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, ScheduleInfo } from '../../services/api.service';
import { ContentService } from '../../services/content.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private apiService = inject(ApiService);
  readonly c = inject(ContentService);

  readonly quizOpen = signal(true);
  readonly checkingStatus = signal(true);
  readonly schedule = signal<ScheduleInfo | null>(null);
  readonly countdown = signal('');
  readonly countdownDays = signal(0);
  readonly countdownHours = signal(0);
  readonly countdownMinutes = signal(0);
  readonly countdownSeconds = signal(0);
  private countdownInterval: any;

  private readonly dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  async ngOnInit() {
    try {
      const settings = await this.apiService.getQuizSettings();
      this.quizOpen.set(settings.is_open);
      this.schedule.set(settings.schedule);

      if (!settings.is_open) {
        if (settings.schedule?.next_session) {
          this.startCountdown(settings.schedule.next_session.datetime);
        } else {
          this.startCountdown(this.getNextSaturday());
        }
      }
    } catch {
      this.quizOpen.set(true);
    } finally {
      this.checkingStatus.set(false);
    }
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  startQuiz() {
    if (!this.quizOpen()) return;
    this.router.navigate(['/quiz']);
  }

  playQuiz() {
    if (!this.apiService.isLoggedIn()) {
      alert('Veuillez vous inscrire ou vous connecter avant de jouer.');
      document.getElementById('inscription')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (this.quizOpen()) {
      this.router.navigate(['/quiz']);
    } else {
      const nextText = this.getNextSessionText();
      const message = nextText
        ? `Le quiz est actuellement fermé.\n\nProchaine session : ${nextText}`
        : this.c.get('hero', 'closed_message', 'Le quiz est actuellement fermé. Revenez bientôt !');
      alert(message);
    }
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

  private getNextSaturday(): string {
    const now = new Date();
    const day = now.getDay();
    let daysUntilSat = 6 - day;
    if (daysUntilSat <= 0) daysUntilSat += 7;
    const next = new Date(now);
    next.setDate(now.getDate() + daysUntilSat);
    next.setHours(14, 0, 0, 0);
    return next.toISOString();
  }

  private startCountdown(targetDatetime: string) {
    const update = () => {
      const now = new Date().getTime();
      const target = new Date(targetDatetime).getTime();
      const diff = target - now;

      if (diff <= 0) {
        this.countdown.set('');
        clearInterval(this.countdownInterval);
        // Recheck status
        this.ngOnInit();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      this.countdownDays.set(days);
      this.countdownHours.set(hours);
      this.countdownMinutes.set(minutes);
      this.countdownSeconds.set(seconds);

      let parts: string[] = [];
      if (days > 0) parts.push(`${days}j`);
      if (hours > 0) parts.push(`${hours}h`);
      parts.push(`${minutes.toString().padStart(2, '0')}min`);
      parts.push(`${seconds.toString().padStart(2, '0')}s`);

      this.countdown.set(parts.join(' '));
    };

    update();
    this.countdownInterval = setInterval(update, 1000);
  }
}
