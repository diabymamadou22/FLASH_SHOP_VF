import { PageId, RoleUtilisateur, SessionUtilisateur, Utilisateur } from '../types';

const CLE_SESSION = 'flash_shop_session_v1';
const CODE_MAITRE = '00223';

export const LIBELLES_ROLE: Record<RoleUtilisateur, string> = {
  super_admin: 'Administrateur',
  admin: 'Administrateur',
  comptable: 'Comptable',
  caissier: 'Caissier',
};

/**
 * Pages autorisées pour chaque rôle utilisateur.
 */
export const PAGES_PAR_ROLE: Record<RoleUtilisateur, PageId[]> = {
  super_admin: [
    'dashboard',
    'produits',
    'categories',
    'caisse',
    'credits',
    'historique',
    'stocks',
    'depenses',
    'rapports',
    'utilisateurs',
    'parametres',
  ],
  admin: [
    'dashboard',
    'produits',
    'categories',
    'caisse',
    'credits',
    'historique',
    'stocks',
    'depenses',
    'rapports',
    'utilisateurs',
    'parametres',
  ],
  comptable: ['dashboard', 'credits', 'historique', 'depenses', 'rapports'],
  caissier: ['produits', 'caisse', 'credits', 'historique'],
};

/**
 * Vérifie si un rôle a accès à un écran donné.
 */
export function peutAccederPage(role: RoleUtilisateur, page: PageId): boolean {
  return PAGES_PAR_ROLE[role].includes(page);
}

/**
 * Retourne la page d'accueil par défaut selon le rôle connecté.
 */
export function getPageDefautRole(role: RoleUtilisateur): PageId {
  if (role === 'comptable') return 'rapports';
  if (role === 'caissier') return 'caisse';
  return 'produits';
}

/**
 * Vérifie le mot de passe principal (invisible dans les paramètres).
 */
export function verifierMotDePasseSuperAdmin(saisie: string): boolean {
  return saisie.trim() === CODE_MAITRE;
}

/**
 * Authentifie avec le nom d'utilisateur et le mot de passe :
 * - Vérifie d'abord le compte administrateur principal ("admin")
 * - Sinon cherche parmi les utilisateurs créés dans Paramètres
 */
export function authentifierUtilisateur(
  nomUtilisateur: string,
  motDePasse: string,
  utilisateurs: Utilisateur[]
): SessionUtilisateur | null {
  const pseudoPropre = nomUtilisateur.trim().replace(/^@/, '').toLowerCase();
  const mdpPropre = motDePasse.trim();
  if (!pseudoPropre || !mdpPropre) return null;

  if (pseudoPropre === 'admin' && verifierMotDePasseSuperAdmin(mdpPropre)) {
    return {
      id: 'compte-principal',
      nom: 'Admin',
      nomUtilisateur: 'admin',
      role: 'super_admin',
    };
  }

  const trouve = utilisateurs.find((u) => {
    const pseudoCompte = (u.nomUtilisateur ?? u.nom).trim().replace(/^@/, '').toLowerCase();
    return pseudoCompte === pseudoPropre && u.motDePasse === mdpPropre;
  });
  if (!trouve) return null;

  const identifiant = trouve.nomUtilisateur?.trim() || trouve.nom;
  return {
    id: trouve.id,
    nom: identifiant,
    nomUtilisateur: identifiant,
    role: trouve.role,
  };
}

export function chargerSession(): SessionUtilisateur | null {
  try {
    const brut = localStorage.getItem(CLE_SESSION);
    if (!brut) return null;
    return JSON.parse(brut) as SessionUtilisateur;
  } catch {
    return null;
  }
}

export function sauvegarderSession(session: SessionUtilisateur | null): void {
  try {
    if (!session) {
      localStorage.removeItem(CLE_SESSION);
    } else {
      localStorage.setItem(CLE_SESSION, JSON.stringify(session));
    }
  } catch {
    // Ignoré si le stockage est bloqué
  }
}

export interface ResultatValidationUtilisateur {
  valide: boolean;
  erreur?: string;
  nomUtilisateurPropre?: string;
  motDePassePropre?: string;
}

/**
 * Valide et normalise les champs d'un formulaire de création ou modification d'utilisateur.
 */
export function validerUtilisateurForm(
  nomUtilisateur: string,
  motDePasse: string,
  utilisateursExistants: Utilisateur[],
  idEnEdition?: string
): ResultatValidationUtilisateur {
  const nomUtilisateurPropre = nomUtilisateur.trim().replace(/^@/, '');
  const motDePassePropre = motDePasse.trim();

  if (!nomUtilisateurPropre || !motDePassePropre) {
    return {
      valide: false,
      erreur: "Le nom d'utilisateur et le mot de passe sont obligatoires.",
    };
  }

  if (nomUtilisateurPropre.toLowerCase() === 'admin') {
    return {
      valide: false,
      erreur: "Ce nom d'utilisateur est réservé.",
    };
  }

  const doublonPseudo = utilisateursExistants.some(
    (u) =>
      (u.nomUtilisateur ?? u.nom).trim().replace(/^@/, '').toLowerCase() ===
        nomUtilisateurPropre.toLowerCase() && u.id !== idEnEdition
  );
  if (doublonPseudo) {
    return {
      valide: false,
      erreur: "Ce nom d'utilisateur est déjà attribué à un autre utilisateur.",
    };
  }

  if (verifierMotDePasseSuperAdmin(motDePassePropre)) {
    return {
      valide: false,
      erreur: "Ce mot de passe n'est pas disponible.",
    };
  }

  return {
    valide: true,
    nomUtilisateurPropre,
    motDePassePropre,
  };
}
