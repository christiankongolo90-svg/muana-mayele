import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AdminUser } from '../../../models/admin.models';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.scss']
})
export class UserEditComponent implements OnInit {
  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly user = signal<AdminUser | null>(null);
  readonly isLoading = this.adminService.isLoading;
  readonly error = signal<string | null>(null);
  readonly isSaving = signal(false);

  formData = {
    full_name: '',
    email: '',
    phone: '',
    country_code: '',
    profession: '',
    neighborhood: '',
    role: 'user' as 'user' | 'admin'
  };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadUser(+id);
    }
  }

  async loadUser(id: number) {
    try {
      this.error.set(null);
      const data = await this.adminService.getUser(id);
      this.user.set(data.user);
      this.formData = {
        full_name: data.user.full_name,
        email: data.user.email || '',
        phone: data.user.phone,
        country_code: data.user.country_code,
        profession: data.user.profession || '',
        neighborhood: data.user.neighborhood || '',
        role: data.user.role
      };
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load user');
    }
  }

  async onSubmit() {
    if (!this.user()) return;

    try {
      this.isSaving.set(true);
      this.error.set(null);

      await this.adminService.updateUser(this.user()!.id, {
        full_name: this.formData.full_name,
        email: this.formData.email || null,
        phone: this.formData.phone,
        country_code: this.formData.country_code,
        profession: this.formData.profession || null,
        neighborhood: this.formData.neighborhood || null,
        role: this.formData.role
      });

      this.router.navigate(['/admin/users']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      this.isSaving.set(false);
    }
  }
}
