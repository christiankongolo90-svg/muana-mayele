import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AdminUser, Pagination } from '../../../models/admin.models';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit {
  private adminService = inject(AdminService);

  readonly users = signal<AdminUser[]>([]);
  readonly pagination = signal<Pagination | null>(null);
  readonly isLoading = this.adminService.isLoading;
  readonly error = signal<string | null>(null);
  readonly deleteConfirm = signal<number | null>(null);

  readonly isExporting = signal(false);
  searchQuery = '';
  currentPage = 1;

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    try {
      this.error.set(null);
      const data = await this.adminService.getUsers(this.currentPage, 20, this.searchQuery);
      this.users.set(data.users);
      this.pagination.set(data.pagination);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load users');
    }
  }

  onSearch() {
    this.currentPage = 1;
    this.loadUsers();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= (this.pagination()?.pages || 1)) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  confirmDelete(id: number) {
    this.deleteConfirm.set(id);
  }

  cancelDelete() {
    this.deleteConfirm.set(null);
  }

  async deleteUser(id: number) {
    try {
      await this.adminService.deleteUser(id);
      this.deleteConfirm.set(null);
      this.loadUsers();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to delete user');
    }
  }

  async exportToExcel() {
    try {
      this.isExporting.set(true);
      const users = await this.adminService.getAllUsers();

      const BOM = '\uFEFF';
      const headers = ['ID', 'Nom', 'Code Pays', 'Téléphone', 'Email', 'Profession', 'Quartier/Ville', 'Rôle', 'Date d\'inscription'];
      const rows = users.map(u => [
        u.id,
        `"${(u.full_name || '').replace(/"/g, '""')}"`,
        `"${u.country_code || ''}"`,
        `"${u.phone || ''}"`,
        `"${(u.email || '').replace(/"/g, '""')}"`,
        `"${(u.profession || '').replace(/"/g, '""')}"`,
        `"${((u as any).neighborhood || '').replace(/"/g, '""')}"`,
        u.role || 'user',
        `"${(u as any).created_at || ''}"`,
      ]);

      const csv = BOM + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `utilisateurs_muana_mayele_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.error.set('Erreur lors de l\'exportation');
    } finally {
      this.isExporting.set(false);
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
}
