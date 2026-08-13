import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'candidatures',
        loadComponent: () =>
          import('./features/candidatures/candidature-list/candidature-list.component').then(m => m.CandidatureListComponent),
      },
      {
        path: 'candidatures/:id',
        loadComponent: () =>
          import('./features/candidatures/candidature-detail/candidature-detail.component').then(m => m.CandidatureDetailComponent),
      },
      {
        path: 'chauffeurs',
        loadComponent: () =>
          import('./features/chauffeurs/chauffeur-list.component').then(m => m.ChauffeurListComponent),
      },
      {
        path: 'chauffeurs/:id/courses',
        loadComponent: () =>
          import('./features/chauffeurs/driver-courses.component').then(m => m.DriverCoursesComponent),
      },
      {
        path: 'courses',
        loadComponent: () =>
          import('./features/courses/course-list.component').then(m => m.CourseListComponent),
      },
      {
        path: 'courses/nouvelle',
        loadComponent: () =>
          import('./features/courses/course-create.component').then(m => m.CourseCreateComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
