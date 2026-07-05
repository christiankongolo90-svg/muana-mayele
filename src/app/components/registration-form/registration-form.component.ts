import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Country } from '../../services/api.service';

type FormStep = 'form' | 'passcode' | 'login';

@Component({
  selector: 'app-registration-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registration-form.component.html',
  styleUrl: './registration-form.component.scss'
})
export class RegistrationFormComponent {
  formData = {
    fullName: '',
    profession: '',
    neighborhood: '',
    phone: '',
    email: '',
    countryCode: '+243'
  };

  passcode = '';
  acceptTerms = false;
  currentStep = signal<FormStep>('form');
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  countdown = signal(0);


  private countdownInterval: any;

  countries: Country[];
  filteredLocations: string[] = [];
  showLocationDropdown = false;

  readonly drcLocations: string[] = [
    // Kinshasa - Communes
    'Bandalungwa', 'Barumbu', 'Bumbu', 'Gombe', 'Kalamu', 'Kasa-Vubu',
    'Kimbanseke', 'Kinshasa (ville)', 'Kintambo', 'Kisenso', 'Lemba',
    'Limete', 'Lingwala', 'Makala', 'Maluku', 'Masina', 'Matete',
    'Mont-Ngafula', 'Ndjili', 'Ngaba', 'Ngaliema', 'Ngiri-Ngiri',
    'Nsele', 'Selembao',
    // Kinshasa - Quartiers populaires
    'Bandal', 'Binza', 'Camp Luka', 'Debonhomme', 'Funa', 'Gambela',
    'Joli Parc', 'Kingabwa', 'Kingasani', 'Livulu', 'Matonge',
    'Mikondo', 'Ngaba', 'Pigeon', 'Righini', 'Rond-Point Ngaba',
    'UPN', 'Victoire', 'Yolo',
    // Lubumbashi
    'Lubumbashi', 'Annexe (Lubumbashi)', 'Kamalondo', 'Kampemba',
    'Katuba', 'Kenya (Lubumbashi)', 'Lubumbashi (commune)', 'Ruashi',
    // Autres grandes villes
    'Bukavu', 'Goma', 'Kisangani', 'Mbuji-Mayi', 'Kananga',
    'Kolwezi', 'Likasi', 'Tshikapa', 'Butembo', 'Beni',
    'Uvira', 'Matadi', 'Boma', 'Kikwit', 'Mbandaka',
    'Isiro', 'Bandundu', 'Gemena', 'Bunia', 'Kalemie',
    'Kindu', 'Fungurume', 'Kipushi', 'Kamina', 'Mwene-Ditu',
    // Provinces
    'Bas-Uele', 'Equateur', 'Haut-Katanga', 'Haut-Lomami',
    'Haut-Uele', 'Ituri', 'Kasai', 'Kasai Central', 'Kasai Oriental',
    'Kongo Central', 'Kwango', 'Kwilu', 'Lomami', 'Lualaba',
    'Mai-Ndombe', 'Maniema', 'Mongala', 'Nord-Kivu', 'Nord-Ubangi',
    'Sankuru', 'Sud-Kivu', 'Sud-Ubangi', 'Tanganyika', 'Tshopo', 'Tshuapa',
    // Diaspora
    'Bruxelles', 'Paris', 'Londres', 'Johannesburg', 'Nairobi',
    'Kigali', 'Brazzaville', 'Luanda', 'Dar es Salaam',
    'Cape Town', 'Montréal', 'Ottawa', 'New York', 'Oslo',
    'Anvers', 'Liège', 'Genève', 'Zurich', 'Berlin',
    'Autre'
  ].sort();

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {
    this.countries = this.apiService.countries;
  }

  onLocationInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.formData.neighborhood = value;
    if (value.length >= 2) {
      const search = value.toLowerCase();
      this.filteredLocations = this.drcLocations.filter(loc =>
        loc.toLowerCase().includes(search)
      ).slice(0, 8);
      this.showLocationDropdown = this.filteredLocations.length > 0;
    } else {
      this.showLocationDropdown = false;
    }
  }

  selectLocation(location: string) {
    this.formData.neighborhood = location;
    this.showLocationDropdown = false;
  }

  hideLocationDropdown() {
    setTimeout(() => this.showLocationDropdown = false, 200);
  }

  get selectedCountry(): Country | undefined {
    return this.countries.find(c => c.code === this.formData.countryCode);
  }

  async onSubmit() {
    if (!this.acceptTerms) return;
    if (!this.formData.fullName.trim()) {
      this.errorMessage.set('Le nom complet est obligatoire');
      return;
    }
    if (!this.formData.phone.trim()) {
      this.errorMessage.set('Le numéro de téléphone est obligatoire');
      return;
    }
    if (!this.formData.neighborhood.trim()) {
      this.errorMessage.set('Le quartier / ville est obligatoire');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const response = await this.apiService.sendPasscode({
        phone: this.formData.phone,
        country_code: this.formData.countryCode,
        type: 'register',
        full_name: this.formData.fullName,
        email: this.formData.email || undefined,
        profession: this.formData.profession || undefined,
        neighborhood: this.formData.neighborhood || undefined
      });

      this.successMessage.set('Code envoyé par WhatsApp!');
      this.currentStep.set('passcode');
      this.startCountdown(response.expires_in);

      // Show debug passcode in development

    } catch (error: any) {
      console.error('Send passcode failed:', error);
      this.errorMessage.set(error.message || 'Erreur lors de l\'envoi du code. Veuillez réessayer.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onLogin() {
    if (!this.formData.phone.trim()) {
      this.errorMessage.set('Le numéro de téléphone est obligatoire');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const response = await this.apiService.sendPasscode({
        phone: this.formData.phone,
        country_code: this.formData.countryCode,
        type: 'login'
      });

      this.successMessage.set('Code envoyé par WhatsApp!');
      this.currentStep.set('passcode');
      this.startCountdown(response.expires_in);


    } catch (error: any) {
      console.error('Login failed:', error);
      this.errorMessage.set(error.message || 'Erreur lors de la connexion. Veuillez réessayer.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async verifyPasscode() {
    if (!this.passcode || this.passcode.length !== 6) {
      this.errorMessage.set('Veuillez entrer le code à 6 chiffres');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.apiService.verifyPasscode({
        phone: this.formData.phone,
        country_code: this.formData.countryCode,
        passcode: this.passcode,
        full_name: this.formData.fullName || undefined,
        email: this.formData.email || undefined,
        profession: this.formData.profession || undefined,
        neighborhood: this.formData.neighborhood || undefined
      });

      this.router.navigate(['/quiz']);
    } catch (error: any) {
      console.error('Verification failed:', error);
      this.errorMessage.set(error.message || 'Code invalide ou expiré');
    } finally {
      this.isLoading.set(false);
    }
  }

  async resendPasscode() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const type = this.formData.fullName ? 'register' : 'login';
      const response = await this.apiService.sendPasscode({
        phone: this.formData.phone,
        country_code: this.formData.countryCode,
        type: type as 'login' | 'register',
        full_name: this.formData.fullName || undefined
      });

      this.successMessage.set('Nouveau code envoyé!');
      this.startCountdown(response.expires_in);


    } catch (error: any) {
      this.errorMessage.set(error.message || 'Erreur lors du renvoi du code');
    } finally {
      this.isLoading.set(false);
    }
  }

  switchToLogin() {
    this.currentStep.set('login');
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  switchToRegister() {
    this.currentStep.set('form');
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  goBack() {
    this.currentStep.set('form');
    this.passcode = '';
    this.errorMessage.set('');
    this.successMessage.set('');

    this.stopCountdown();
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

  onPasscodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // Only allow digits
    this.passcode = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = this.passcode;
  }

  startQuiz() {
    if (this.apiService.isLoggedIn()) {
      this.router.navigate(['/quiz']);
    } else {
      document.getElementById('inscription')?.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
