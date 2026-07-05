import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AdminService } from '../services/admin.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
  private adminService = inject(AdminService);
  private router = inject(Router);

  readonly sidebarCollapsed = signal(false);
  readonly adminUser = this.adminService.adminUser;

  readonly navItems: NavItem[] = [
    { path: '/admin/dashboard', label: 'Tableau de bord', icon: '📊' },
    { path: '/admin/users', label: 'Utilisateurs', icon: '👥' },
    { path: '/admin/questions', label: 'Questions', icon: '❓' },
    { path: '/admin/categories', label: 'Catégories', icon: '📁' },
    { path: '/admin/sessions', label: 'Sessions Quiz', icon: '📝' },
    { path: '/admin/site-content', label: 'Contenu du site', icon: '✏️' },
    { path: '/admin/settings', label: 'Paramètres', icon: '⚙️' }
  ];

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  logout() {
    this.adminService.logout();
    this.router.navigate(['/']);
  }
}
