import { ApportCaisse, Depense, Vente } from '../types';
import { formatPrix } from '../utils/format';

export interface EtatTresorerie {
  totalEncaisse: number;
  totalApports: number;
  totalDepenses: number;
  soldeBrut: number;
  soldeDisponible: number;
}

export interface VerificationDepense {
  autorise: boolean;
  erreur?: string;
  soldeDisponible: number;
}

/**
 * Calcule le total réellement encaissé (ventes comptant + acomptes/remboursements crédit),
 * les apports/fonds de caisse, le total des dépenses et le solde disponible restant.
 */
export function calculerSoldeDisponible(
  ventes: Vente[],
  depenses: Depense[],
  apportsCaisse: ApportCaisse[] = []
): EtatTresorerie {
  const totalEncaisse = ventes.reduce(
    (acc, v) => acc + (v.estCredit ? Math.min(v.total, v.montantPaye ?? 0) : v.total),
    0
  );
  const totalApports = apportsCaisse.reduce((acc, a) => acc + a.montant, 0);
  const totalDepenses = depenses.reduce((acc, d) => acc + d.montant, 0);
  const soldeBrut = totalEncaisse + totalApports - totalDepenses;
  const soldeDisponible = Math.max(0, soldeBrut);

  return {
    totalEncaisse,
    totalApports,
    totalDepenses,
    soldeBrut,
    soldeDisponible,
  };
}

/**
 * Vérifie si une dépense d'un montant donné peut être enregistrée sans dépasser le solde disponible.
 */
export function verifierDepenseAutorisee(
  montant: number,
  ventes: Vente[],
  depenses: Depense[],
  devise = 'FCFA',
  apportsCaisse: ApportCaisse[] = []
): VerificationDepense {
  const { soldeBrut, soldeDisponible } = calculerSoldeDisponible(ventes, depenses, apportsCaisse);

  if (!Number.isFinite(montant) || montant <= 0) {
    return {
      autorise: false,
      erreur: 'Veuillez saisir un montant valide supérieur à 0.',
      soldeDisponible,
    };
  }

  if (soldeBrut <= 0) {
    return {
      autorise: false,
      erreur: `Dépense refusée : votre solde disponible est de ${formatPrix(0, devise)}.`,
      soldeDisponible: 0,
    };
  }

  if (montant > soldeBrut) {
    return {
      autorise: false,
      erreur: `Dépense refusée : le montant (${formatPrix(
        montant,
        devise
      )}) dépasse ce que vous avez en caisse (${formatPrix(soldeDisponible, devise)}).`,
      soldeDisponible,
    };
  }

  return {
    autorise: true,
    soldeDisponible,
  };
}
