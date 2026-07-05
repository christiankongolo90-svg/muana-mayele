import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface SiteContent {
  [section: string]: {
    [key: string]: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private baseUrl = environment.apiUrl;
  private contentCache: SiteContent | null = null;

  readonly content = signal<SiteContent>({});
  readonly isLoaded = signal(false);

  async loadContent(): Promise<SiteContent> {
    if (this.contentCache) {
      return this.contentCache;
    }

    try {
      const response = await fetch(`${this.baseUrl}/site-content`);
      const data = await response.json();

      if (data.success && data.data) {
        this.contentCache = data.data;
        this.content.set(data.data);
        this.isLoaded.set(true);
        return data.data;
      }
    } catch (error) {
      console.error('Failed to load site content:', error);
    }

    return {};
  }

  get(section: string, key: string, fallback: string = ''): string {
    const c = this.content();
    return c[section]?.[key] ?? fallback;
  }

  getImageUrl(section: string, key: string, fallback: string = ''): string {
    const value = this.get(section, key, fallback);
    if (!value) return fallback;
    if (value.startsWith('http')) return value;
    if (value.startsWith('uploads/')) {
      return `${this.baseUrl}/${value}`;
    }
    return value;
  }

  clearCache() {
    this.contentCache = null;
    this.isLoaded.set(false);
  }
}
