import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { SiteContentItem } from '../../models/admin.models';
import { ContentService } from '../../../services/content.service';

interface ContentSection {
  key: string;
  label: string;
  icon: string;
  items: SiteContentItem[];
}

@Component({
  selector: 'app-site-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './site-content.component.html',
  styleUrls: ['./site-content.component.scss']
})
export class SiteContentComponent implements OnInit {
  private adminService = inject(AdminService);
  private contentService = inject(ContentService);

  readonly allItems = signal<SiteContentItem[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly activeSection = signal<string>('header');

  // Track modified items
  readonly modifiedItems = signal<Map<number, string>>(new Map());

  readonly sectionConfig: { key: string; label: string; icon: string }[] = [
    { key: 'header', label: 'En-tete', icon: '🔝' },
    { key: 'hero', label: 'Section Hero', icon: '🏠' },
    { key: 'how_it_works', label: 'Comment ca marche', icon: '📋' },
    { key: 'quiz_info', label: 'Info Quiz', icon: '❓' },
    { key: 'footer', label: 'Pied de page', icon: '📌' },
  ];

  readonly sections = computed<ContentSection[]>(() => {
    const items = this.allItems();
    return this.sectionConfig.map(config => ({
      ...config,
      items: items.filter(i => i.section === config.key)
    }));
  });

  readonly currentSection = computed(() => {
    return this.sections().find(s => s.key === this.activeSection()) || null;
  });

  readonly hasChanges = computed(() => {
    return this.modifiedItems().size > 0;
  });

  ngOnInit() {
    this.loadContent();
  }

  async loadContent() {
    try {
      this.isLoading.set(true);
      this.error.set(null);
      const data = await this.adminService.getSiteContent();
      this.allItems.set(data.content);
      this.modifiedItems.set(new Map());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      this.isLoading.set(false);
    }
  }

  setActiveSection(key: string) {
    this.activeSection.set(key);
  }

  onValueChange(item: SiteContentItem, newValue: string) {
    const modified = new Map(this.modifiedItems());
    if (newValue !== item.content_value) {
      modified.set(item.id, newValue);
    } else {
      modified.delete(item.id);
    }
    this.modifiedItems.set(modified);
  }

  async saveChanges() {
    const modified = this.modifiedItems();
    if (modified.size === 0) return;

    try {
      this.isSaving.set(true);
      this.error.set(null);
      this.successMessage.set(null);

      const items = Array.from(modified.entries()).map(([id, value]) => ({ id, value }));
      const data = await this.adminService.updateSiteContent(items);

      this.allItems.set(data.content);
      this.modifiedItems.set(new Map());
      this.contentService.clearCache();
      this.contentService.loadContent();
      this.successMessage.set('Contenu sauvegardé avec succès');

      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    } finally {
      this.isSaving.set(false);
    }
  }

  async onImageUpload(item: SiteContentItem, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      this.isSaving.set(true);
      this.error.set(null);

      const data = await this.adminService.uploadSiteImage(item.id, file);

      // Update the item in the list
      const items = this.allItems().map(i =>
        i.id === item.id ? { ...i, content_value: data.path } : i
      );
      this.allItems.set(items);
      this.contentService.clearCache();
      this.contentService.loadContent();
      this.successMessage.set('Image uploadée avec succès');

      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur d\'upload');
    } finally {
      this.isSaving.set(false);
      // Reset file input
      input.value = '';
    }
  }

  getImageUrl(value: string): string {
    if (!value) return '';
    if (value.startsWith('http')) return value;
    if (value.startsWith('uploads/')) {
      return `${this.adminService['baseUrl']}/../${value}`;
    }
    return value;
  }

  getModifiedValue(item: SiteContentItem): string {
    return this.modifiedItems().get(item.id) ?? item.content_value;
  }

  discardChanges() {
    this.modifiedItems.set(new Map());
  }
}
