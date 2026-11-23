import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { ContentPack } from '../../shared/types';

export class ContentPackManager extends EventEmitter {
  private packs: Map<string, ContentPack> = new Map();
  private contentPacksDir: string;

  constructor(contentPacksDir: string) {
    super();
    this.contentPacksDir = contentPacksDir;
  }

  async initialize() {
    console.log('[ContentPackManager] Scanning content packs...');
    await fs.mkdir(this.contentPacksDir, { recursive: true });

    const widgets = await fs.readdir(this.contentPacksDir, { withFileTypes: true });
    
    for (const widgetEntry of widgets) {
      if (!widgetEntry.isDirectory()) continue;
      const widgetDir = path.join(this.contentPacksDir, widgetEntry.name);
      
      const contentTypes = await fs.readdir(widgetDir, { withFileTypes: true });
      for (const typeEntry of contentTypes) {
        if (!typeEntry.isDirectory()) continue;
        const typeDir = path.join(widgetDir, typeEntry.name);
        
        const packDirs = await fs.readdir(typeDir, { withFileTypes: true });
        for (const packEntry of packDirs) {
          if (!packEntry.isDirectory()) continue;
          
          const packDir = path.join(typeDir, packEntry.name);
          const manifestPath = path.join(packDir, 'manifest.json');
          
          try {
            const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestRaw);
            
            if (manifest.widget !== widgetEntry.name && manifest.widget !== '*') {
              console.warn(`⚠️ Pack "${manifest.id}" widget mismatch`);
              continue;
            }
            if (manifest.contentType !== typeEntry.name) {
              console.warn(`⚠️ Pack "${manifest.id}" contentType mismatch`);
              continue;
            }
            
            const licensed = manifest.free || await this.checkLicense(packDir);
            
            const pack: ContentPack = {
              ...manifest,
              licensed,
              path: packDir,
              items: (manifest.items || []).map((item: any) => ({
                ...item,
                packId: manifest.id,
                widget: manifest.widget,
                contentType: manifest.contentType,
              })),
            };
            
            this.packs.set(pack.id, pack);
            console.log(`✅ Loaded: [${pack.widget}/${pack.contentType}] ${pack.name}`);
          } catch (e) {
            console.warn(`⚠️ Failed to load pack from ${packDir}:`, e);
          }
        }
      }
    }
    
    this.emit('packs-updated', this.getAllPacks());
  }

  private async checkLicense(packDir: string): Promise<boolean> {
    const licensePath = path.join(packDir, 'license.key');
    try {
      await fs.access(licensePath);
      return true;
    } catch {
      return false;
    }
  }

  getAllPacks(): ContentPack[] {
    return Array.from(this.packs.values());
  }

  getPacksForWidget(widget: string, contentType?: string): ContentPack[] {
    return Array.from(this.packs.values()).filter(pack => 
      pack.licensed && 
      (pack.widget === widget || pack.widget === '*') &&
      (!contentType || pack.contentType === contentType)
    );
  }

  getItemPath(widget: string, contentType: string, packId: string, file: string): string | null {
    const pack = this.packs.get(packId);
    if (!pack || !pack.licensed) return null;
    if (pack.widget !== widget && pack.widget !== '*') return null;
    if (pack.contentType !== contentType) return null;
    
    const safeFile = path.basename(file);
    const fullPath = path.join(pack.path, 'animations', safeFile);
    
    return fullPath;
  }
}