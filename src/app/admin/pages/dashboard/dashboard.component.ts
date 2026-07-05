import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { DashboardStats, AdminUser, AdminSession } from '../../models/admin.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private adminService = inject(AdminService);

  readonly stats = signal<DashboardStats | null>(null);
  readonly isLoading = this.adminService.isLoading;
  readonly error = signal<string | null>(null);

  ngOnInit() {
    this.loadStats();
  }

  async loadStats() {
    try {
      this.error.set(null);
      const data = await this.adminService.getStats();
      this.stats.set(data);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load stats');
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
