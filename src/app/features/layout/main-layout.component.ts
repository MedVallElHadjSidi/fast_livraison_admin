import { Component, computed, inject } from '@angular/core';
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

const ADMIN_NAV = [
  { label: 'Tableau de bord', icon: 'dashboard',        route: '/dashboard'         },
  { label: 'Chauffeurs',      icon: 'two_wheeler',      route: '/chauffeurs'        },
  { label: 'Vendeurs',        icon: 'storefront',       route: '/vendeurs'          },
  { label: 'Courses',        icon: 'local_shipping',   route: '/courses'           },
  { label: 'Lancer une course', icon: 'delivery_dining', route: '/courses/nouvelle' },
  { label: 'Transactions',   icon: 'receipt_long',    route: '/transactions'      },
  { label: 'Produits',       icon: 'inventory_2',     route: '/produits'          },
  { label: 'Commandes',      icon: 'shopping_bag',    route: '/commandes'         },
  { label: 'Demandes',       icon: 'local_shipping',  route: '/demandes'          },
];

const VENDOR_NAV = [
  { label: 'Mes produits', icon: 'inventory_2',    route: '/produits'      },
  { label: 'Mes demandes', icon: 'local_shipping', route: '/mes-demandes' },
];

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

  navItems = computed(() => this.authSvc.role() === 'vendor' ? VENDOR_NAV : ADMIN_NAV);

  logout(): void { this.authSvc.logout(); }
}
