import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'inscription-vendeur',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/vendor-signup/vendor-signup.component').then(m => m.VendorSignupComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'candidatures',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/candidatures/candidature-list/candidature-list.component').then(m => m.CandidatureListComponent),
      },
      {
        path: 'candidatures/:id',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/candidatures/candidature-detail/candidature-detail.component').then(m => m.CandidatureDetailComponent),
      },
      {
        path: 'chauffeurs',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/chauffeurs/chauffeur-list.component').then(m => m.ChauffeurListComponent),
      },
      {
        path: 'chauffeurs/:id/courses',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/chauffeurs/driver-courses.component').then(m => m.DriverCoursesComponent),
      },
      {
        path: 'vendeurs',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/vendors/vendor-list.component').then(m => m.VendorListComponent),
      },
      {
        path: 'courses',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/courses/course-list.component').then(m => m.CourseListComponent),
      },
      {
        path: 'courses/nouvelle',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/courses/course-create.component').then(m => m.CourseCreateComponent),
      },
      {
        path: 'transactions',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/transactions/transaction-list.component').then(m => m.TransactionListComponent),
      },
      {
        // Accessible aux deux rôles : le composant adapte lui-même son
        // comportement (catalogue complet en lecture seule pour l'admin,
        // gestion de ses propres produits pour le vendeur).
        path: 'produits',
        loadComponent: () =>
          import('./features/products/product-list.component').then(m => m.ProductListComponent),
      },
      {
        path: 'commandes',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/products/product-order-list.component').then(m => m.ProductOrderListComponent),
      },
      {
        path: 'demandes',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/demandes/demande-list.component').then(m => m.DemandeListComponent),
      },
      {
        path: 'mes-demandes',
        loadComponent: () =>
          import('./features/demandes/my-demandes.component').then(m => m.MyDemandesComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
