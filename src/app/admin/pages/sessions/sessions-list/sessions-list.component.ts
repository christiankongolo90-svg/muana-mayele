import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AdminSession, Pagination } from '../../../models/admin.models';

@Component({
  selector: 'app-sessions-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './sessions-list.component.html',
  styleUrls: ['./sessions-list.component.scss']
})
export class SessionsListComponent implements OnInit {
  private adminService = inject(AdminService);

  readonly sessions = signal<AdminSession[]>([]);
  readonly pagination = signal<Pagination | null>(null);
  readonly isLoading = this.adminService.isLoading;
  readonly error = signal<string | null>(null);
  readonly deleteConfirm = signal<number | null>(null);

  currentPage = 1;

  ngOnInit() {
    this.loadSessions();
  }

  async loadSessions() {
    try {
      this.error.set(null);
      const data = await this.adminService.getSessions(this.currentPage, 20);
      this.sessions.set(data.sessions);
      this.pagination.set(data.pagination);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load sessions');
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= (this.pagination()?.pages || 1)) {
      this.currentPage = page;
      this.loadSessions();
    }
  }

  confirmDelete(id: number) {
    this.deleteConfirm.set(id);
  }

  cancelDelete() {
    this.deleteConfirm.set(null);
  }

  async deleteSession(id: number) {
    try {
      await this.adminService.deleteSession(id);
      this.deleteConfirm.set(null);
      this.loadSessions();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }

  getPages(): number[] {
    const total = this.pagination()?.pages || 1;
    const current = this.currentPage;
    const pages: number[] = [];

    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      pages.push(i);
    }

    return pages;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(seconds: number | null): string {
    if (seconds === null || seconds === undefined) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  getCorrect(session: any): number {
    if (session.is_completed) return session.correct_answers || 0;
    return session.live_correct || 0;
  }

  getPoints(session: any): number {
    if (session.is_completed) return session.total_points || 0;
    return session.live_points || 0;
  }

  getPercentage(session: any): string {
    const correct = this.getCorrect(session);
    const total = session.total_questions || 1;
    return ((correct / total) * 100).toFixed(2);
  }
}
