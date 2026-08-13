import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../core/services/auth.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterModule,
    MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatToolbarModule,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private authSvc = inject(AuthService);
  private breakpointObserver = inject(BreakpointObserver);

  isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map(r => r.matches)),
    { initialValue: false },
  );

  navItems = [
    { label: 'Tableau de bord', icon: 'dashboard',        route: '/dashboard'         },
    { label: 'Chauffeurs',      icon: 'two_wheeler',      route: '/chauffeurs'        },
    { label: 'Courses',        icon: 'local_shipping',   route: '/courses'           },
    { label: 'Lancer une course', icon: 'delivery_dining', route: '/courses/nouvelle' },
  ];

  logout(): void { this.authSvc.logout(); }
}
