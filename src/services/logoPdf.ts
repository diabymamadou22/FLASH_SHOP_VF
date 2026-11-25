import { jsPDF } from 'jspdf';

export interface LogoPdfResolu {
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  largeur: number;
  hauteur: number;
}

const URL_LOGO_DEFAUT = '/pwa-192x192.png';
const cacheLogos = new Map<string, LogoPdfResolu>();
const chargementEnCours = new Map<string, Promise<LogoPdfResolu | null>>();

function normaliserCle(logoDataUrl?: string): string {
  const propre = logoDataUrl?.trim();
  return propre ? propre : URL_LOGO_DEFAUT;
}

function chargerViaImage(src: string): Promise<LogoPdfResolu | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const largeur = Math.max(1, img.naturalWidth || img.width || 192);
        const hauteur = Math.max(1, img.naturalHeight || img.height || 192);
        const canvas = document.createElement('canvas');
        canvas.width = largeur;
        canvas.height = hauteur;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, largeur, hauteur);
        const pngDataUrl = canvas.toDataURL('image/png');
        const res: LogoPdfResolu = {
          dataUrl: pngDataUrl,
          format: 'PNG',
          largeur,
          hauteur,
        };
        cacheLogos.set(src, res);
        resolve(res);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Précharge en mémoire le logo (personnalisé ou logo par défaut /pwa-192x192.png)
 * au format PNG normalisé pour une insertion immédiate et fiable dans les PDF.
 */
export function prechargerLogoPdf(logoDataUrl?: string): Promise<LogoPdfResolu | null> {
  const cle = normaliserCle(logoDataUrl);
  const enCache = cacheLogos.get(cle);
  if (enCache) return Promise.resolve(enCache);

  const promesseExistante = chargementEnCours.get(cle);
  if (promesseExistante) return promesseExistante;

  const promesse = chargerViaImage(cle).then(async (res) => {
    chargementEnCours.delete(cle);
    if (res) return res;
    if (cle !== URL_LOGO_DEFAUT) {
      return prechargerLogoPdf(undefined);
    }
    return null;
  });

  chargementEnCours.set(cle, promesse);
  return promesse;
}

/**
 * Retourne immédiatement le logo prêt pour jsPDF depuis le cache mémoire,
 * ou directement si un Data URL PNG/JPEG valide est déjà disponible.
 */
export function obtenirLogoPdfSync(logoDataUrl?: string): LogoPdfResolu | null {
  const cle = normaliserCle(logoDataUrl);
  const enCache = cacheLogos.get(cle);
  if (enCache) return enCache;

  if (logoDataUrl) {
    const trimmed = logoDataUrl.trim();
    if (trimmed.startsWith('data:image/png')) {
      return { dataUrl: trimmed, format: 'PNG', largeur: 192, hauteur: 192 };
    }
    if (trimmed.startsWith('data:image/jpeg') || trimmed.startsWith('data:image/jpg')) {
      return { dataUrl: trimmed, format: 'JPEG', largeur: 192, hauteur: 192 };
    }
  }

  return cacheLogos.get(URL_LOGO_DEFAUT) ?? null;
}

/**
 * Dessine le logo centré dans une zone carrée en respectant ses proportions d'origine.
 */
export function ajouterLogoDansPdf(
  doc: jsPDF,
  logo: LogoPdfResolu | null,
  boxX: number,
  boxY: number,
  boxTaille: number
): boolean {
  if (!logo) return false;
  try {
    const ratio = Math.min(boxTaille / logo.largeur, boxTaille / logo.hauteur);
    const w = logo.largeur * ratio;
    const h = logo.hauteur * ratio;
    const offsetX = boxX + (boxTaille - w) / 2;
    const offsetY = boxY + (boxTaille - h) / 2;
    doc.addImage(logo.dataUrl, logo.format, offsetX, offsetY, w, h);
    return true;
  } catch {
    return false;
  }
}

// Précharge automatiquement le logo par défaut dès le chargement de l'application
if (typeof window !== 'undefined') {
  void prechargerLogoPdf();
}
