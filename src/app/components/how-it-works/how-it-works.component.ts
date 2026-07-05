import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService } from '../../services/content.service';

@Component({
  selector: 'app-how-it-works',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './how-it-works.component.html',
  styleUrl: './how-it-works.component.scss'
})
export class HowItWorksComponent {
  readonly c = inject(ContentService);

  readonly sectionTitle = computed(() =>
    this.c.get('how_it_works', 'section_title', 'Comment ça marche?')
  );

  readonly steps = computed(() => {
    const steps = [];
    for (let i = 1; i <= 20; i++) {
      const title = this.c.get('how_it_works', `step_${i}_title`, '');
      if (!title) break;
      steps.push({
        number: i,
        title,
        description: this.c.get('how_it_works', `step_${i}_description`, '')
      });
    }
    return steps;
  });
}
