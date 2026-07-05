import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AdminQuestion, AdminCategory } from '../../../models/admin.models';

@Component({
  selector: 'app-question-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './question-edit.component.html',
  styleUrls: ['./question-edit.component.scss']
})
export class QuestionEditComponent implements OnInit {
  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly question = signal<AdminQuestion | null>(null);
  readonly categories = signal<AdminCategory[]>([]);
  readonly isLoading = this.adminService.isLoading;
  readonly error = signal<string | null>(null);
  readonly isSaving = signal(false);
  readonly isNew = signal(true);

  formData = {
    category_id: 0,
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    is_active: true
  };

  ngOnInit() {
    this.loadCategories();

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isNew.set(false);
      this.loadQuestion(+id);
    }
  }

  async loadCategories() {
    try {
      const data = await this.adminService.getCategories();
      this.categories.set(data.categories);

      // Set default category if new
      if (this.isNew() && data.categories.length > 0) {
        this.formData.category_id = data.categories[0].id;
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }

  async loadQuestion(id: number) {
    try {
      this.error.set(null);
      const data = await this.adminService.getQuestion(id);
      this.question.set(data.question);

      this.formData = {
        category_id: data.question.category_id,
        question: data.question.question,
        options: [...data.question.options],
        correct_answer: data.question.correct_answer,
        difficulty: data.question.difficulty,
        is_active: data.question.is_active
      };

      // Ensure we have 4 options
      while (this.formData.options.length < 4) {
        this.formData.options.push('');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load question');
    }
  }

  async onSubmit() {
    // Validate
    if (!this.formData.question.trim()) {
      this.error.set('La question est requise');
      return;
    }

    const filledOptions = this.formData.options.filter(o => o.trim());
    if (filledOptions.length < 2) {
      this.error.set('Au moins 2 options sont requises');
      return;
    }

    if (this.formData.correct_answer < 0 || this.formData.correct_answer >= filledOptions.length) {
      this.error.set('Sélectionnez une réponse correcte valide');
      return;
    }

    try {
      this.isSaving.set(true);
      this.error.set(null);

      const payload = {
        category_id: this.formData.category_id,
        question: this.formData.question.trim(),
        options: this.formData.options.filter(o => o.trim()),
        correct_answer: this.formData.correct_answer,
        difficulty: this.formData.difficulty,
        is_active: this.formData.is_active
      };

      if (this.isNew()) {
        await this.adminService.createQuestion(payload);
      } else {
        await this.adminService.updateQuestion(this.question()!.id, payload);
      }

      this.router.navigate(['/admin/questions']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to save question');
    } finally {
      this.isSaving.set(false);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }
}
