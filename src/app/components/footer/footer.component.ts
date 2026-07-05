import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService } from '../../services/content.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  readonly c = inject(ContentService);
  currentYear = new Date().getFullYear();

  menuLinks = [
    { label: 'Accueil', href: '#' },
    { label: 'Classement', href: '#classement' },
    { label: 'Règles', href: '#regles' }
  ];

  helpLinks = [
    { label: "Conditions d'utilisation", href: '#' },
    { label: 'Politique de confidentialité', href: '#' },
    { label: 'Contact', href: '#' }
  ];

  readonly socialLinks = computed(() => [
    { icon: 'facebook', href: this.c.get('footer', 'facebook_url', '#'), label: 'Facebook' },
    { icon: 'twitter', href: this.c.get('footer', 'twitter_url', '#'), label: 'Twitter' },
    { icon: 'instagram', href: this.c.get('footer', 'instagram_url', '#'), label: 'Instagram' }
  ]);
}
