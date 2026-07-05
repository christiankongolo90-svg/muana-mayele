import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { HeroComponent } from '../../components/hero/hero.component';
import { RegistrationFormComponent } from '../../components/registration-form/registration-form.component';
import { HowItWorksComponent } from '../../components/how-it-works/how-it-works.component';
import { LeaderboardComponent } from '../../components/leaderboard/leaderboard.component';
import { QuizInfoComponent } from '../../components/quiz-info/quiz-info.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { ContentService } from '../../services/content.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    HeroComponent,
    RegistrationFormComponent,
    HowItWorksComponent,
    LeaderboardComponent,
    QuizInfoComponent,
    FooterComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private contentService = inject(ContentService);

  ngOnInit() {
    this.contentService.loadContent();
  }
}
