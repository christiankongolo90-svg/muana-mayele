import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users-list/users-list.component')
          .then(m => m.UsersListComponent)
      },
      {
        path: 'users/:id',
        loadComponent: () => import('./pages/users/user-edit/user-edit.component')
          .then(m => m.UserEditComponent)
      },
      {
        path: 'questions',
        loadComponent: () => import('./pages/questions/questions-list/questions-list.component')
          .then(m => m.QuestionsListComponent)
      },
      {
        path: 'questions/new',
        loadComponent: () => import('./pages/questions/question-edit/question-edit.component')
          .then(m => m.QuestionEditComponent)
      },
      {
        path: 'questions/:id',
        loadComponent: () => import('./pages/questions/question-edit/question-edit.component')
          .then(m => m.QuestionEditComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./pages/categories/categories-list.component')
          .then(m => m.CategoriesListComponent)
      },
      {
        path: 'sessions',
        loadComponent: () => import('./pages/sessions/sessions-list/sessions-list.component')
          .then(m => m.SessionsListComponent)
      },
      {
        path: 'sessions/:id',
        loadComponent: () => import('./pages/sessions/session-edit/session-edit.component')
          .then(m => m.SessionEditComponent)
      },
      {
        path: 'site-content',
        loadComponent: () => import('./pages/site-content/site-content.component')
          .then(m => m.SiteContentComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component')
          .then(m => m.SettingsComponent)
      }
    ]
  }
];
