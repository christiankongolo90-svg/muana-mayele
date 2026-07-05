import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { QuizSettingsAdmin } from '../../models/admin.models';

interface DayOption {
  value: number;
  label: string;
  shortLabel: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  private adminService = inject(AdminService);

  readonly settings = signal<QuizSettingsAdmin | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Form fields
  timeMinutes = 20;
  isOpen = true;

  // Schedule fields
  scheduleEnabled = false;
  scheduleDays: number[] = [];
  scheduleStartTime = '14:00';
  scheduleEndTime = '16:00';
  scheduleTimezone = 'Africa/Kinshasa';

  readonly daysOfWeek: DayOption[] = [
    { value: 0, label: 'Dimanche', shortLabel: 'Dim' },
    { value: 1, label: 'Lundi', shortLabel: 'Lun' },
    { value: 2, label: 'Mardi', shortLabel: 'Mar' },
    { value: 3, label: 'Mercredi', shortLabel: 'Mer' },
    { value: 4, label: 'Jeudi', shortLabel: 'Jeu' },
    { value: 5, label: 'Vendredi', shortLabel: 'Ven' },
    { value: 6, label: 'Samedi', shortLabel: 'Sam' }
  ];

  readonly timezones = [
    { value: 'Africa/Kinshasa', label: 'Kinshasa (UTC+1)' },
    { value: 'Africa/Lubumbashi', label: 'Lubumbashi (UTC+2)' },
    { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
    { value: 'Europe/Brussels', label: 'Bruxelles (UTC+1/+2)' },
    { value: 'Europe/Oslo', label: 'Oslo (UTC+1/+2)' },
    { value: 'Europe/Zurich', label: 'Zurich (UTC+1/+2)' },
    { value: 'Europe/Berlin', label: 'Berlin (UTC+1/+2)' },
    { value: 'Europe/London', label: 'Londres (UTC+0/+1)' },
    { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg (UTC+2)' },
    { value: 'Africa/Nairobi', label: 'Nairobi (UTC+3)' }
  ];

  ngOnInit() {
    this.loadSettings();
  }

  async loadSettings() {
    try {
      this.isLoading.set(true);
      this.error.set(null);
      const data = await this.adminService.getSettings();
      this.settings.set(data.settings);
      this.timeMinutes = Math.round(data.settings.time_limit / 60);
      this.isOpen = data.settings.is_open;
      this.scheduleEnabled = data.settings.schedule_enabled;
      this.scheduleDays = data.settings.schedule_days || [];
      this.scheduleStartTime = data.settings.schedule_start_time ? data.settings.schedule_start_time.substring(0, 5) : '14:00';
      this.scheduleEndTime = data.settings.schedule_end_time ? data.settings.schedule_end_time.substring(0, 5) : '16:00';
      this.scheduleTimezone = data.settings.schedule_timezone || 'Africa/Kinshasa';
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveSettings() {
    try {
      this.isSaving.set(true);
      this.error.set(null);
      this.successMessage.set(null);

      const timeLimitSeconds = this.timeMinutes * 60;

      const data = await this.adminService.updateSettings({
        time_limit: timeLimitSeconds,
        is_open: this.isOpen,
        schedule_enabled: this.scheduleEnabled,
        schedule_days: this.scheduleDays,
        schedule_start_time: this.scheduleStartTime,
        schedule_end_time: this.scheduleEndTime,
        schedule_timezone: this.scheduleTimezone
      });

      this.settings.set(data.settings);
      this.successMessage.set('Parametres sauvegardes avec succes');

      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    } finally {
      this.isSaving.set(false);
    }
  }

  toggleQuizStatus() {
    this.isOpen = !this.isOpen;
  }

  toggleSchedule() {
    this.scheduleEnabled = !this.scheduleEnabled;
  }

  toggleDay(day: number) {
    const idx = this.scheduleDays.indexOf(day);
    if (idx >= 0) {
      this.scheduleDays = this.scheduleDays.filter(d => d !== day);
    } else {
      this.scheduleDays = [...this.scheduleDays, day].sort();
    }
  }

  isDaySelected(day: number): boolean {
    return this.scheduleDays.includes(day);
  }

  selectAllDays() {
    this.scheduleDays = [0, 1, 2, 3, 4, 5, 6];
  }

  selectWeekdays() {
    this.scheduleDays = [1, 2, 3, 4, 5];
  }

  selectWeekend() {
    this.scheduleDays = [0, 6];
  }

  clearDays() {
    this.scheduleDays = [];
  }

  getTimezoneLabel(): string {
    const tz = this.timezones.find(t => t.value === this.scheduleTimezone);
    return tz ? tz.label : this.scheduleTimezone;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
