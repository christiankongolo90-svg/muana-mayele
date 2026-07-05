import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

interface Player {
  rank: number;
  name: string;
  stars: number;
  points: number;
  avatar: string;
  bestTime: number | null;
  isTop?: boolean;
  isCurrentUser?: boolean;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.scss'
})
export class LeaderboardComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);

  players = signal<Player[]>([]);
  isLoading = signal(false);
  private refreshInterval: any;

  private avatars = ['👨🏿‍💼', '👩🏿‍🎓', '👩🏿‍💻', '👨🏿‍🔬', '👩🏿‍🏫', '👨🏿‍⚕️', '👨🏿‍🎨', '👩🏿‍🔧'];

  async ngOnInit() {
    await this.loadLeaderboard();
    // Auto-refresh every 10 seconds
    this.refreshInterval = setInterval(() => this.loadLeaderboard(), 10000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadLeaderboard() {
    try {
      const entries = await this.apiService.getLeaderboard(10);
      const currentUser = this.apiService.currentUser();

      const players = entries.map((entry, index) => ({
        rank: entry.rank,
        name: this.formatName(entry.name),
        stars: this.calculateStars(entry.best_score),
        points: entry.best_score,
        bestTime: (entry as any).best_time ?? null,
        avatar: this.avatars[index % this.avatars.length],
        isTop: entry.rank === 1,
        isCurrentUser: currentUser ? entry.user_id === currentUser.id : false
      }));
      this.players.set(players);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private formatName(fullName: string): string {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
    }
    return fullName;
  }

  private calculateStars(points: number): number {
    if (points >= 900) return 5;
    if (points >= 700) return 4;
    if (points >= 500) return 3;
    if (points >= 300) return 2;
    return 1;
  }

  getStarsArray(count: number): number[] {
    return Array(count).fill(0);
  }

  getRankIcon(rank: number): string {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  }

  formatTime(seconds: number | null): string {
    if (seconds === null) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m${s.toString().padStart(2, '0')}s` : `${s}s`;
  }
}
