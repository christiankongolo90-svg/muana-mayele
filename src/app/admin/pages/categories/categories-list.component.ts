import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { AdminCategory } from '../../models/admin.models';

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories-list.component.html',
  styleUrls: ['./categories-list.component.scss']
})
export class CategoriesListComponent implements OnInit {
  private adminService = inject(AdminService);

  readonly categories = signal<AdminCategory[]>([]);
  readonly isLoading = this.adminService.isLoading;
  readonly error = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly deleteConfirm = signal<number | null>(null);
  readonly showNewForm = signal(false);

  newCategory = { name: '', description: '' };
  editCategory = { name: '', description: '' };

  ngOnInit() {
    this.loadCategories();
  }

  async loadCategories() {
    try {
      this.error.set(null);
      const data = await this.adminService.getCategories();
      this.categories.set(data.categories);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load categories');
    }
  }

  startEdit(category: AdminCategory) {
    this.editingId.set(category.id);
    this.editCategory = {
      name: category.name,
      description: category.description || ''
    };
    this.showNewForm.set(false);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  toggleNewForm() {
    this.showNewForm.update(v => !v);
    if (this.showNewForm()) {
      this.newCategory = { name: '', description: '' };
      this.editingId.set(null);
    }
  }

  async createCategory() {
    if (!this.newCategory.name.trim()) {
      this.error.set('Le nom est requis');
      return;
    }

    try {
      this.error.set(null);
      await this.adminService.createCategory({
        name: this.newCategory.name.trim(),
        description: this.newCategory.description.trim() || undefined
      });
      this.showNewForm.set(false);
      this.newCategory = { name: '', description: '' };
      this.loadCategories();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to create category');
    }
  }

  async updateCategory(id: number) {
    if (!this.editCategory.name.trim()) {
      this.error.set('Le nom est requis');
      return;
    }

    try {
      this.error.set(null);
      await this.adminService.updateCategory(id, {
        name: this.editCategory.name.trim(),
        description: this.editCategory.description.trim() || undefined
      });
      this.editingId.set(null);
      this.loadCategories();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to update category');
    }
  }

  confirmDelete(id: number) {
    this.deleteConfirm.set(id);
  }

  cancelDelete() {
    this.deleteConfirm.set(null);
  }

  async deleteCategory(id: number) {
    try {
      await this.adminService.deleteCategory(id);
      this.deleteConfirm.set(null);
      this.loadCategories();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to delete category');
    }
  }
}
