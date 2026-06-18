import { Vibrant } from 'node-vibrant/node';
import axios from 'axios';

interface ExtractedPalette {
  dominant: string | null;
  vibrant: string | null;
  darkVibrant: string | null;
  lightVibrant: string | null;
  muted: string | null;
}

export class ColorExtractorService {
  // Кэш: URL обложки -> палитра
  private cache = new Map<string, ExtractedPalette>();
  private readonly MAX_CACHE_SIZE = 200;

  async extract(coverUrl: string | null | undefined): Promise<ExtractedPalette> {
    if (!coverUrl) {
      return this.emptyPalette();
    }

    // Возвращаем из кэша, если уже считали
    const cached = this.cache.get(coverUrl);
    if (cached) return cached;

    try {
      // Скачиваем картинку как буфер (обходим CORS)
      const response = await axios.get(coverUrl, {
        responseType: 'arraybuffer',
        timeout: 5000,
      });
      const buffer = Buffer.from(response.data);

      // Считаем палитру через node-vibrant
      const palette = await Vibrant.from(buffer).getPalette();

      const result: ExtractedPalette = {
        dominant: palette.Dominant?.hex ?? null,
        vibrant: palette.Vibrant?.hex ?? null,
        darkVibrant: palette.DarkVibrant?.hex ?? null,
        lightVibrant: palette.LightVibrant?.hex ?? null,
        muted: palette.Muted?.hex ?? null,
      };

      // Сохраняем в кэш с ограничением размера
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
      }
      this.cache.set(coverUrl, result);

      return result;
    } catch (err) {
      console.warn('⚠️ Failed to extract color from cover:', coverUrl, err);
      return this.emptyPalette();
    }
  }

  private emptyPalette(): ExtractedPalette {
    return {
      dominant: null,
      vibrant: null,
      darkVibrant: null,
      lightVibrant: null,
      muted: null,
    };
  }
}