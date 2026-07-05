import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AdminQuestion, AdminCategory, Pagination } from '../../../models/admin.models';

@Component({
  selector: 'app-questions-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './questions-list.component.html',
  styleUrls: ['./questions-list.component.scss']
})
export class QuestionsListComponent implements OnInit {
  private adminService = inject(AdminService);

  readonly questions = signal<AdminQuestion[]>([]);
  readonly categories = signal<AdminCategory[]>([]);
  readonly pagination = signal<Pagination | null>(null);
  readonly isLoading = this.adminService.isLoading;
  readonly error = signal<string | null>(null);
  readonly deleteConfirm = signal<number | null>(null);

  searchQuery = '';
  selectedCategoryId: number | undefined;
  currentPage = 1;

  ngOnInit() {
    this.loadCategories();
    this.loadQuestions();
  }

  async loadCategories() {
    try {
      const data = await this.adminService.getCategories();
      this.categories.set(data.categories);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }

  async loadQuestions() {
    try {
      this.error.set(null);
      const data = await this.adminService.getQuestions(
        this.currentPage,
        20,
        this.selectedCategoryId,
        this.searchQuery
      );
      this.questions.set(data.questions);
      this.pagination.set(data.pagination);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load questions');
    }
  }

  onSearch() {
    this.currentPage = 1;
    this.loadQuestions();
  }

  onCategoryChange() {
    this.currentPage = 1;
    this.loadQuestions();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= (this.pagination()?.pages || 1)) {
      this.currentPage = page;
      this.loadQuestions();
    }
  }

  confirmDelete(id: number) {
    this.deleteConfirm.set(id);
  }

  cancelDelete() {
    this.deleteConfirm.set(null);
  }

  async deleteQuestion(id: number) {
    try {
      await this.adminService.deleteQuestion(id);
      this.deleteConfirm.set(null);
      this.loadQuestions();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to delete question');
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

  getDifficultyLabel(difficulty: string): string {
    const labels: Record<string, string> = {
      easy: 'Facile',
      medium: 'Moyen',
      hard: 'Difficile'
    };
    return labels[difficulty] || difficulty;
  }

  truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}
