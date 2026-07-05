import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, Country } from '../../services/api.service';
import { ContentService } from '../../services/content.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  readonly c = inject(ContentService);
  isMenuOpen = false;
  showLoginModal = signal(false);
  showUserDropdown = signal(false);
  loginStep = signal<'phone' | 'passcode'>('phone');

  // Login form data
  loginData = {
    phone: '',
    countryCode: '+243',
    passcode: ''
  };

  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  countdown = signal(0);

  private countdownInterval: any;

  countries: Country[];

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    public apiService: ApiService
  ) {
    this.countries = this.apiService.countries;
  }

  get currentUser() {
    return this.apiService.currentUser();
  }

  get selectedCountry(): Country | undefined {
    return this.countries.find(c => c.code === this.loginData.countryCode);
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    this.updateBodyScroll();
  }

  closeMenu() {
    if (this.isMenuOpen) {
      this.isMenuOpen = false;
      this.updateBodyScroll();
    }
  }

  goHome() {
    this.closeMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private updateBodyScroll() {
    if (this.isMenuOpen || this.showLoginModal()) {
      this.document.body.classList.add('menu-open');
    } else {
      this.document.body.classList.remove('menu-open');
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 768 && this.isMenuOpen) {
      this.closeMenu();
    }
  }

  @HostListener('window:keydown.escape')
  onEscapeKey() {
    this.closeMenu();
    this.closeLoginModal();
    this.showUserDropdown.set(false);
  }

  // Login Modal Methods
  openLoginModal() {
    this.showLoginModal.set(true);
    this.loginStep.set('phone');
    this.resetLoginForm();
    this.updateBodyScroll();
  }

  closeLoginModal() {
    this.showLoginModal.set(false);
    this.resetLoginForm();
    this.updateBodyScroll();
  }

  resetLoginForm() {
    this.loginData = { phone: '', countryCode: '+243', passcode: '' };
    this.errorMessage.set('');
    this.successMessage.set('');

    this.stopCountdown();
  }

  async sendLoginCode() {
    if (!this.loginData.phone.trim()) {
      this.errorMessage.set('Le numéro de téléphone est obligatoire');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const response = await this.apiService.sendPasscode({
        phone: this.loginData.phone,
        country_code: this.loginData.countryCode,
        type: 'login'
      });

      this.successMessage.set('Code envoyé par WhatsApp!');
      this.loginStep.set('passcode');
      this.startCountdown(response.expires_in);


    } catch (error: any) {
      this.errorMessage.set(error.message || 'Erreur lors de l\'envoi du code');
    } finally {
      this.isLoading.set(false);
    }
  }

  async verifyLoginCode() {
    if (!this.loginData.passcode || this.loginData.passcode.length !== 6) {
      this.errorMessage.set('Veuillez entrer le code à 6 chiffres');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const result = await this.apiService.verifyPasscode({
        phone: this.loginData.phone,
        country_code: this.loginData.countryCode,
        passcode: this.loginData.passcode
      });

      this.closeLoginModal();
      // Redirect admin to admin dashboard, regular users to profile
      if (result.user.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/profile']);
      }
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Code invalide ou expiré');
    } finally {
      this.isLoading.set(false);
    }
  }

  onPasscodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.loginData.passcode = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = this.loginData.passcode;
  }

  private startCountdown(seconds: number) {
    this.stopCountdown();
    this.countdown.set(seconds);

    this.countdownInterval = setInterval(() => {
      const current = this.countdown();
      if (current > 0) {
        this.countdown.set(current - 1);
      } else {
        this.stopCountdown();
      }
    }, 1000);
  }

  private stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  formatCountdown(): string {
    const total = this.countdown();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  goBackToPhone() {
    this.loginStep.set('phone');
    this.loginData.passcode = '';
    this.errorMessage.set('');

  }

  // User Dropdown Methods
  toggleUserDropdown() {
    this.showUserDropdown.set(!this.showUserDropdown());
  }

  goToProfile() {
    this.showUserDropdown.set(false);
    this.closeMenu();
    this.router.navigate(['/profile']);
  }

  goToQuiz() {
    this.showUserDropdown.set(false);
    this.closeMenu();
    this.router.navigate(['/quiz']);
  }

  goToAdmin() {
    this.showUserDropdown.set(false);
    this.closeMenu();
    this.router.navigate(['/admin']);
  }

  logout() {
    this.apiService.logout();
    this.showUserDropdown.set(false);
    this.closeMenu();
    this.router.navigate(['/']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu') && this.showUserDropdown()) {
      this.showUserDropdown.set(false);
    }
  }
}
