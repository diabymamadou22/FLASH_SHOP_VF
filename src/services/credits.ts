import { ModeLimiteCredit, ParametresBoutique, Vente } from '../types';
import { formatDateCourte } from '../utils/format';

export interface RaccourciEcheanceCredit {
  id: string;
  label: string;
  date: string;
}

export interface StatutEcheanceCredit {
  type: 'retard' | 'aujourdhui' | 'a_venir';
  label: string;
}

export interface EtatLimiteCredit {
  active: boolean;
  depassee: boolean;
  limite: number;
  mode: ModeLimiteCredit;
  creditExistant: number;
  creditApresVente: number;
  disponible: number;
}

/**
 * Retourne une date locale au format YYYY-MM-DD.
 */
export function obtenirDateLocaleYMD(date: Date = new Date()): string {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

/**
 * Ajoute un nombre de jours à la date fournie et retourne YYYY-MM-DD.
 */
export function ajouterJoursYMD(jours: number, baseDate: Date = new Date()): string {
  const copie = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  copie.setDate(copie.getDate() + jours);
  return obtenirDateLocaleYMD(copie);
}

/**
 * Retourne le dernier jour du mois en cours au format YYYY-MM-DD.
 */
export function finDuMoisYMD(baseDate: Date = new Date()): string {
  const fin = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  return obtenirDateLocaleYMD(fin);
}

/**
 * Raccourcis rapides de date de paiement lors d'une vente à crédit.
 */
export function getRaccourcisEcheanceCredit(
  baseDate: Date = new Date()
): RaccourciEcheanceCredit[] {
  return [
    { id: '7j', label: '+7 jours', date: ajouterJoursYMD(7, baseDate) },
    { id: '15j', label: '+15 jours', date: ajouterJoursYMD(15, baseDate) },
    { id: '30j', label: '+30 jours', date: ajouterJoursYMD(30, baseDate) },
    { id: 'fin_mois', label: 'Fin du mois', date: finDuMoisYMD(baseDate) },
  ];
}

/**
 * Calcule l'état d'une échéance de crédit (en retard, aujourd'hui ou à venir).
 */
export function getStatutEcheanceCredit(
  dateEcheance: string | undefined,
  reste: number,
  baseDate: Date = new Date()
): StatutEcheanceCredit | null {
  if (!dateEcheance || reste <= 0) return null;
  const aujourdhui = obtenirDateLocaleYMD(baseDate);
  if (dateEcheance < aujourdhui) {
    return { type: 'retard', label: `En retard (${formatDateCourte(dateEcheance)})` };
  }
  if (dateEcheance === aujourdhui) {
    return { type: 'aujourdhui', label: "Échéance aujourd'hui" };
  }
  return { type: 'a_venir', label: `Échéance : ${formatDateCourte(dateEcheance)}` };
}

/**
 * Normalise un numéro de téléphone pour identifier un client malgré l'indicatif (+223 / 00223).
 */
export function normaliserTelephoneCredit(telephone?: string): string {
  const chiffres = (telephone ?? '').trim().replace(/^00/, '').replace(/\D/g, '');
  if (chiffres.length === 11 && chiffres.startsWith('223')) {
    return chiffres.slice(3);
  }
  return chiffres;
}

/**
 * Calcule le reste à payer d'une vente à crédit.
 */
export function getResteCreditVente(vente: Vente): number {
  if (!vente.estCredit) return 0;
  const paye = Math.min(vente.total, vente.montantPaye ?? 0);
  return Math.max(0, vente.total - paye);
}

/**
 * Calcule le montant total de tous les crédits non soldés de la boutique.
 */
export function calculerCreditEnCoursTotal(ventes: Vente[]): number {
  return ventes.reduce((acc, v) => acc + getResteCreditVente(v), 0);
}

/**
 * Calcule le cumul des crédits non soldés pour un client donné.
 */
export function calculerCreditEnCoursClient(
  ventes: Vente[],
  clientNom: string,
  clientTelephone?: string
): number {
  const telCible = normaliserTelephoneCredit(clientTelephone);
  const nomCible = clientNom.trim().toLowerCase();
  if (telCible.length < 6 && !nomCible) return 0;

  return ventes.reduce((acc, v) => {
    const reste = getResteCreditVente(v);
    if (reste <= 0) return acc;

    const telVente = normaliserTelephoneCredit(v.clientTelephone);
    const nomVente = v.clientNom.trim().toLowerCase();

    if (telCible.length >= 6 && telVente.length >= 6) {
      return telCible === telVente ? acc + reste : acc;
    }

    if (nomCible && nomVente === nomCible) {
      return acc + reste;
    }

    return acc;
  }, 0);
}

/**
 * Évalue si une nouvelle vente à crédit respecte la limite de crédit configurée.
 */
export function evaluerLimiteCredit(params: {
  ventes: Vente[];
  parametres: ParametresBoutique;
  clientNom: string;
  clientTelephone?: string;
  nouveauCredit: number;
}): EtatLimiteCredit {
  const limite = Math.max(0, Number(params.parametres.limiteCredit) || 0);
  const mode: ModeLimiteCredit = params.parametres.modeLimiteCredit ?? 'par_client';
  const nouveau = Math.max(0, params.nouveauCredit);

  if (limite <= 0) {
    return {
      active: false,
      depassee: false,
      limite: 0,
      mode,
      creditExistant: 0,
      creditApresVente: nouveau,
      disponible: Infinity,
    };
  }

  const creditExistant =
    mode === 'globale'
      ? calculerCreditEnCoursTotal(params.ventes)
      : calculerCreditEnCoursClient(params.ventes, params.clientNom, params.clientTelephone);

  const creditApresVente = creditExistant + nouveau;
  const disponible = Math.max(0, limite - creditExistant);

  return {
    active: true,
    depassee: creditApresVente > limite,
    limite,
    mode,
    creditExistant,
    creditApresVente,
    disponible,
  };
}
