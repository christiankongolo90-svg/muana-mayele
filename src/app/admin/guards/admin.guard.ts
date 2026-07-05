import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { ApiService } from '../../services/api.service';

export const adminGuard: CanActivateFn = () => {
  const apiService = inject(ApiService);
  const router = inject(Router);

  // Try to load user from localStorage if signal is empty
  if (!apiService.currentUser()) {
    const storedUser = localStorage.getItem('quiz_user');
    if (storedUser) {
      try {
        apiService.currentUser.set(JSON.parse(storedUser));
      } catch {
        // Invalid data
      }
    }
  }

  const user = apiService.currentUser();
  if (!user || user.role !== 'admin') {
    // Also check admin_user localStorage as fallback
    const adminData = localStorage.getItem('admin_user');
    if (adminData) {
      try {
        const adminUser = JSON.parse(adminData);
        if (adminUser.role === 'admin') {
          apiService.currentUser.set(adminUser);
          return true;
        }
      } catch {
        localStorage.removeItem('admin_user');
      }
    }
    router.navigate(['/']);
    return false;
  }

  // Ensure admin_user is also set
  localStorage.setItem('admin_user', JSON.stringify(user));
  return true;
};
