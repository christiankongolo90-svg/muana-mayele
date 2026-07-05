import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AdminSession } from '../../../models/admin.models';

interface SessionAnswer {
  question_id: number;
  question: string;
  selected_answer: number;
  correct_answer: number;
  is_correct: boolean;
  points_earned: number;
}

@Component({
  selector: 'app-session-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './session-edit.component.html',
  styleUrls: ['./session-edit.component.scss']
})
export class SessionEditComponent implements OnInit {
  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly session = signal<AdminSession | null>(null);
  readonly answers = signal<SessionAnswer[]>([]);
  readonly isLoading = this.adminService.isLoading;
  readonly error = signal<string | null>(null);
  readonly isSaving = signal(false);

  formData = {
    correct_answers: 0,
    wrong_answers: 0,
    total_points: 0
  };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSession(+id);
    }
  }

  async loadSession(id: number) {
    try {
      this.error.set(null);
      const data = await this.adminService.getSession(id);
      this.session.set(data.session);
      this.answers.set(data.answers || []);

      this.formData = {
        correct_answers: data.session.correct_answers,
        wrong_answers: data.session.wrong_answers,
        total_points: data.session.total_points
      };
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load session');
    }
  }

  async onSubmit() {
    if (!this.session()) return;

    try {
      this.isSaving.set(true);
      this.error.set(null);

      await this.adminService.updateSession(this.session()!.id, {
        correct_answers: this.formData.correct_answers,
        wrong_answers: this.formData.wrong_answers,
        total_points: this.formData.total_points
      });

      this.router.navigate(['/admin/sessions']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to update session');
    } finally {
      this.isSaving.set(false);
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs} sec`;
  }
}
