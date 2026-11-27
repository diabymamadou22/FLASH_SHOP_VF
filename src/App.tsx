import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import MobileBottomNav from './components/MobileBottomNav';
import Sidebar from './components/Sidebar';
import { useToast } from './context/ToastContext';
import CategoriesPage from './pages/CategoriesPage';
import ConnexionPage from './pages/ConnexionPage';
import CreditsPage from './pages/CreditsPage';
import DashboardPage from './pages/DashboardPage';
import DepensesPage from './pages/DepensesPage';
import HistoriqueVentesPage from './pages/HistoriqueVentesPage';
import ParametresPage from './pages/ParametresPage';
import ProduitsPage from './pages/ProduitsPage';
import RapportsPage from './pages/RapportsPage';
import StocksPage from './pages/StocksPage';
import UtilisateursPage from './pages/UtilisateursPage';
import VentesCaissePage from './pages/VentesCaissePage';
import {
  authentifierUtilisateur,
  chargerSession,
  getPageDefautRole,
  peutAccederPage,
  sauvegarderSession,
} from './services/auth';
import {
  chargerBase,
  demanderStockagePersistant,
  sauvegarderBase,
  verifierRestaurationLocale,
} from './services/database';
import { verifierDepenseAutorisee } from './services/depenses';
import { prechargerLogoPdf } from './services/logoPdf';
import {
  ApportCaisse,
  BaseDonnees,
  Categorie,
  Depense,
  MouvementStock,
  PageId,
  PaiementCredit,
  ParametresBoutique,
  Produit,
  SessionUtilisateur,
  ThemeApparence,
  Utilisateur,
  Vente,
} from './types';
import { formatPrix, genererId, getStatutStock } from './utils/format';

export default function App() {
  const toast = useToast();
  // Chargement initial de la base locale et de la session
  const [donnees, setDonnees] = useState<BaseDonnees>(() => chargerBase());
  const [session, setSession] = useState<SessionUtilisateur | null>(() => chargerSession());
  const [pageActive, setPageActive] = useState<PageId>(() => {
    const s = chargerSession();
    return s ? getPageDefautRole(s.role) : 'produits';
  });
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);

  // Demande de stockage persistant + restauration depuis IndexedDB si nécessaire
  useEffect(() => {
    void demanderStockagePersistant();
    void verifierRestaurationLocale().then((restauree) => {
      if (restauree) {
        setDonnees(restauree);
      }
    });
  }, []);

  // Sauvegarde automatique dans localStorage et IndexedDB à chaque modification
  useEffect(() => {
    sauvegarderBase(donnees);
  }, [donnees]);

  // Sauvegarde de la session active
  useEffect(() => {
    sauvegarderSession(session);
  }, [session]);

  // Précharge le logo (par défaut ou personnalisé) pour l'impression et les PDF
  useEffect(() => {
    void prechargerLogoPdf(donnees.parametres.logoDataUrl);
  }, [donnees.parametres.logoDataUrl]);

  // Synchronise la classe .dark sur <html> et la couleur système selon les paramètres
  useEffect(() => {
    const estSombre = donnees.parametres.theme === 'sombre';
    document.documentElement.classList.toggle('dark', estSombre);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', estSombre ? '#0f172a' : '#0A3072');
    }
  }, [donnees.parametres.theme]);

  // Liste des produits ayant atteint ou dépassé leur seuil minimal
  const produitsEnAlerte = useMemo(
    () => donnees.produits.filter((p) => getStatutStock(p.stock, p.seuil) !== 'en_stock'),
    [donnees.produits]
  );

  // --- Authentification ---
  const gererConnexion = (nomUtilisateur: string, motDePasse: string): boolean => {
    const nouvelleSession = authentifierUtilisateur(
      nomUtilisateur,
      motDePasse,
      donnees.utilisateurs,
      donnees.parametres.codeMaitreAdmin
    );
    if (!nouvelleSession) {
      toast.erreur('Connexion refusée', "Nom d'utilisateur ou mot de passe incorrect.");
      return false;
    }
    setSession(nouvelleSession);
    setPageActive(getPageDefautRole(nouvelleSession.role));
    toast.succes('Connexion réussie', `Bienvenue, ${nouvelleSession.nom}.`);
    return true;
  };

  const gererDeconnexion = () => {
    setSession(null);
    setMenuMobileOuvert(false);
    toast.info('Session fermée', 'Vous êtes déconnecté.');
  };

  const changerPage = (page: PageId) => {
    if (!session) return;
    if (peutAccederPage(session.role, page)) {
      setPageActive(page);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  };

  // --- Opérations CRUD Produits ---
  const ajouterProduit = (produit: Produit) => {
    setDonnees((prev) => ({
      ...prev,
      produits: [produit, ...prev.produits],
    }));
    toast.succes('Produit ajouté', `${produit.nom} (${produit.reference}) ajouté au catalogue.`);
  };

  const modifierProduit = (produitModifie: Produit) => {
    setDonnees((prev) => ({
      ...prev,
      produits: prev.produits.map((p) => (p.id === produitModifie.id ? produitModifie : p)),
    }));
    toast.succes('Produit mis à jour', `${produitModifie.nom} a été enregistré.`);
  };

  const supprimerProduit = (id: string) => {
    const cible = donnees.produits.find((p) => p.id === id);
    setDonnees((prev) => ({
      ...prev,
      produits: prev.produits.filter((p) => p.id !== id),
    }));
    toast.succes(
      'Produit supprimé',
      cible ? `${cible.nom} a été retiré du catalogue.` : 'Produit supprimé.'
    );
  };

  // --- Opérations CRUD Catégories ---
  const ajouterCategorie = (categorie: Categorie) => {
    setDonnees((prev) => ({
      ...prev,
      categories: [...prev.categories, categorie],
    }));
    toast.succes('Catégorie ajoutée', `"${categorie.nom}" créée avec succès.`);
  };

  const modifierCategorie = (categorieModifiee: Categorie) => {
    setDonnees((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === categorieModifiee.id ? categorieModifiee : c
      ),
    }));
    toast.succes('Catégorie mise à jour', `"${categorieModifiee.nom}" enregistrée.`);
  };

  const supprimerCategorie = (id: string) => {
    const cible = donnees.categories.find((c) => c.id === id);
    setDonnees((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
    toast.succes(
      'Catégorie supprimée',
      cible ? `"${cible.nom}" a été supprimée.` : 'Catégorie supprimée.'
    );
  };

  // --- Ventes & Suppression du Chiffre d'affaires ---
  const validerVente = (vente: Vente) => {
    setDonnees((prev) => {
      const produitsMisAJour = prev.produits.map((produit) => {
        const ligne = vente.lignes.find((l) => l.produitId === produit.id);
        if (!ligne) return produit;
        return {
          ...produit,
          stock: Math.max(0, produit.stock - ligne.quantite),
        };
      });

      return {
        ...prev,
        produits: produitsMisAJour,
        ventes: [vente, ...prev.ventes],
      };
    });
    const montantFormate = formatPrix(vente.total, donnees.parametres.devise);
    toast.succes(
      vente.estCredit ? 'Vente à crédit enregistrée' : 'Vente validée',
      `${vente.numeroFacture} · ${vente.clientNom} (${montantFormate})`
    );
  };

  const supprimerVente = (id: string) => {
    const cible = donnees.ventes.find((v) => v.id === id);
    setDonnees((prev) => {
      const venteASupprimer = prev.ventes.find((v) => v.id === id);
      if (!venteASupprimer) return prev;

      const quantitesParProduit = new Map<string, number>();
      for (const ligne of venteASupprimer.lignes) {
        quantitesParProduit.set(
          ligne.produitId,
          (quantitesParProduit.get(ligne.produitId) ?? 0) + ligne.quantite
        );
      }

      const produitsRestaures = prev.produits.map((p) => {
        const qte = quantitesParProduit.get(p.id);
        return qte ? { ...p, stock: p.stock + qte } : p;
      });

      const maintenant = new Date().toISOString();
      const mouvementsRetour: MouvementStock[] = venteASupprimer.lignes.map((ligne) => ({
        id: genererId('mvt'),
        produitId: ligne.produitId,
        nomProduit: ligne.nomProduit,
        type: 'entree',
        quantite: ligne.quantite,
        motif: `Annulation facture ${venteASupprimer.numeroFacture}`,
        date: maintenant,
      }));

      return {
        ...prev,
        produits: produitsRestaures,
        ventes: prev.ventes.filter((v) => v.id !== id),
        mouvementsStock: [...mouvementsRetour, ...prev.mouvementsStock],
      };
    });
    toast.succes(
      'Facture annulée',
      cible
        ? `${cible.numeroFacture} supprimée et stock restauré.`
        : 'Facture supprimée et stock restauré.'
    );
  };

  const supprimerChiffreAffaires = () => {
    setDonnees((prev) => ({
      ...prev,
      ventes: [],
    }));
    toast.succes("Chiffre d'affaires réinitialisé", 'Toutes les factures ont été supprimées.');
  };

  const enregistrerPaiementCredit = (venteId: string, paiement: PaiementCredit) => {
    const cible = donnees.ventes.find((v) => v.id === venteId);
    setDonnees((prev) => ({
      ...prev,
      ventes: prev.ventes.map((v) => {
        if (v.id !== venteId) return v;
        const payeActuel = v.montantPaye ?? 0;
        const nouveauPaye = Math.min(v.total, payeActuel + paiement.montant);
        return {
          ...v,
          montantPaye: nouveauPaye,
          paiementsCredit: [...(v.paiementsCredit ?? []), paiement],
        };
      }),
    }));
    toast.succes(
      'Versement encaissé',
      `${formatPrix(paiement.montant, donnees.parametres.devise)}${
        cible ? ` reçu de ${cible.clientNom}` : ''
      }.`
    );
  };

  const modifierEcheanceCredit = (venteId: string, nouvelleDate?: string) => {
    setDonnees((prev) => ({
      ...prev,
      ventes: prev.ventes.map((v) =>
        v.id === venteId
          ? {
              ...v,
              dateEcheanceCredit: nouvelleDate?.trim() || undefined,
            }
          : v
      ),
    }));
    toast.succes(
      'Échéance mise à jour',
      nouvelleDate?.trim()
        ? 'Nouvelle date de paiement enregistrée.'
        : "Date d'échéance retirée."
    );
  };

  // --- Mouvement de stock manuel (entrée ou sortie) ---
  const enregistrerMouvementStock = (mouvement: MouvementStock) => {
    setDonnees((prev) => {
      const produitsMisAJour = prev.produits.map((p) => {
        if (p.id !== mouvement.produitId) return p;
        const nouveauStock =
          mouvement.type === 'entree'
            ? p.stock + mouvement.quantite
            : Math.max(0, p.stock - mouvement.quantite);
        return { ...p, stock: nouveauStock };
      });

      return {
        ...prev,
        produits: produitsMisAJour,
        mouvementsStock: [mouvement, ...prev.mouvementsStock],
      };
    });
    toast.succes(
      mouvement.type === 'entree' ? 'Entrée de stock enregistrée' : 'Sortie de stock enregistrée',
      `${mouvement.nomProduit} (${mouvement.type === 'entree' ? '+' : '-'}${mouvement.quantite}).`
    );
  };

  // --- Dépenses & Apports de caisse ---
  const ajouterDepense = (depense: Depense) => {
    const verif = verifierDepenseAutorisee(
      depense.montant,
      donnees.ventes,
      donnees.depenses,
      donnees.parametres.devise,
      donnees.apportsCaisse ?? []
    );
    if (!verif.autorise) {
      toast.erreur('Dépense refusée', verif.erreur ?? 'Solde disponible insuffisant.');
      return;
    }
    setDonnees((prev) => {
      const recheck = verifierDepenseAutorisee(
        depense.montant,
        prev.ventes,
        prev.depenses,
        prev.parametres.devise,
        prev.apportsCaisse ?? []
      );
      if (!recheck.autorise) return prev;
      return {
        ...prev,
        depenses: [depense, ...prev.depenses],
      };
    });
    toast.succes(
      'Dépense enregistrée',
      `${depense.libelle} · ${formatPrix(depense.montant, donnees.parametres.devise)}`
    );
  };

  const supprimerDepense = (id: string) => {
    const cible = donnees.depenses.find((d) => d.id === id);
    setDonnees((prev) => ({
      ...prev,
      depenses: prev.depenses.filter((d) => d.id !== id),
    }));
    toast.succes('Dépense supprimée', cible ? `"${cible.libelle}" supprimée.` : undefined);
  };

  const ajouterApportCaisse = (apport: ApportCaisse) => {
    setDonnees((prev) => ({
      ...prev,
      apportsCaisse: [apport, ...(prev.apportsCaisse ?? [])],
    }));
    toast.succes(
      'Apport en caisse ajouté',
      `${apport.libelle} · ${formatPrix(apport.montant, donnees.parametres.devise)}`
    );
  };

  const supprimerApportCaisse = (id: string) => {
    const cible = (donnees.apportsCaisse ?? []).find((a) => a.id === id);
    setDonnees((prev) => ({
      ...prev,
      apportsCaisse: (prev.apportsCaisse ?? []).filter((a) => a.id !== id),
    }));
    toast.succes('Apport supprimé', cible ? `"${cible.libelle}" supprimé.` : undefined);
  };

  const restaurerBase = (nouvelleBase: BaseDonnees) => {
    setDonnees(nouvelleBase);
    toast.succes('Sauvegarde restaurée', 'Les données de la boutique ont été restaurées.');
  };

  // --- Utilisateurs & Paramètres ---
  const ajouterUtilisateur = (utilisateur: Utilisateur) => {
    setDonnees((prev) => ({
      ...prev,
      utilisateurs: [...prev.utilisateurs, utilisateur],
    }));
    toast.succes('Utilisateur créé', `Compte "@${utilisateur.nomUtilisateur || utilisateur.nom}" ajouté.`);
  };

  const modifierUtilisateur = (utilisateurModifie: Utilisateur) => {
    setDonnees((prev) => ({
      ...prev,
      utilisateurs: prev.utilisateurs.map((u) =>
        u.id === utilisateurModifie.id ? utilisateurModifie : u
      ),
    }));
    setSession((prev) =>
      prev && prev.id === utilisateurModifie.id
        ? {
            id: utilisateurModifie.id,
            nom: utilisateurModifie.nom,
            nomUtilisateur: utilisateurModifie.nomUtilisateur,
            role: utilisateurModifie.role,
          }
        : prev
    );
    toast.succes(
      'Utilisateur mis à jour',
      `Compte "@${utilisateurModifie.nomUtilisateur || utilisateurModifie.nom}" modifié.`
    );
  };

  const supprimerUtilisateur = (id: string) => {
    const cible = donnees.utilisateurs.find((u) => u.id === id);
    setDonnees((prev) => ({
      ...prev,
      utilisateurs: prev.utilisateurs.filter((u) => u.id !== id),
    }));
    toast.succes(
      'Utilisateur supprimé',
      cible ? `Compte "@${cible.nomUtilisateur || cible.nom}" supprimé.` : undefined
    );
  };

  const sauvegarderParametres = (parametres: ParametresBoutique) => {
    setDonnees((prev) => ({
      ...prev,
      parametres,
    }));
  };

  const changerTheme = (nouveauTheme: ThemeApparence) => {
    const themeActuel = donnees.parametres.theme ?? 'clair';
    if (themeActuel === nouveauTheme) return;
    setDonnees((prev) => ({
      ...prev,
      parametres: {
        ...prev.parametres,
        theme: nouveauTheme,
      },
    }));
    toast.succes(
      nouveauTheme === 'sombre' ? 'Thème sombre activé' : 'Thème clair activé',
      'Préférence enregistrée.'
    );
  };

  // Écran de connexion si aucune session n'est active
  if (!session) {
    return <ConnexionPage parametres={donnees.parametres} onConnexion={gererConnexion} />;
  }

  const pageCourante = peutAccederPage(session.role, pageActive)
    ? pageActive
    : getPageDefautRole(session.role);

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-clip bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        pageActive={pageCourante}
        role={session.role}
        onChangerPage={changerPage}
        parametres={donnees.parametres}
        theme={donnees.parametres.theme ?? 'clair'}
        onChangerTheme={changerTheme}
        ouvertMobile={menuMobileOuvert}
        onFermerMobile={() => setMenuMobileOuvert(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          pageActive={pageCourante}
          session={session}
          produitsEnAlerte={produitsEnAlerte}
          onOuvrirMenu={() => setMenuMobileOuvert(true)}
          onAllerPage={changerPage}
          onDeconnexion={gererDeconnexion}
        />

        <main className="flex-1 p-3 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:p-6 lg:pb-6">
          {pageCourante === 'dashboard' && (
            <DashboardPage
              donnees={donnees}
              role={session.role}
              onAllerPage={changerPage}
            />
          )}

          {pageCourante === 'produits' && (
            <ProduitsPage
              produits={donnees.produits}
              categories={donnees.categories}
              devise={donnees.parametres.devise}
              lectureSeule={session.role === 'caissier'}
              onAjouterProduit={ajouterProduit}
              onModifierProduit={modifierProduit}
              onSupprimerProduit={supprimerProduit}
            />
          )}

          {pageCourante === 'categories' && (
            <CategoriesPage
              categories={donnees.categories}
              produits={donnees.produits}
              onAjouterCategorie={ajouterCategorie}
              onModifierCategorie={modifierCategorie}
              onSupprimerCategorie={supprimerCategorie}
            />
          )}

          {pageCourante === 'caisse' && (
            <VentesCaissePage
              produits={donnees.produits}
              ventes={donnees.ventes}
              parametres={donnees.parametres}
              nombreVentesExistantes={donnees.ventes.length}
              vendeurNom={session.nomUtilisateur || session.nom}
              onValiderVente={validerVente}
            />
          )}

          {pageCourante === 'credits' && (
            <CreditsPage
              ventes={donnees.ventes}
              parametres={donnees.parametres}
              role={session.role}
              onEnregistrerPaiementCredit={enregistrerPaiementCredit}
              onModifierEcheanceCredit={modifierEcheanceCredit}
              onSupprimerVente={supprimerVente}
              onSauvegarderParametres={sauvegarderParametres}
            />
          )}

          {pageCourante === 'historique' && (
            <HistoriqueVentesPage
              ventes={donnees.ventes}
              parametres={donnees.parametres}
              role={session.role}
              onSupprimerVente={supprimerVente}
              onSupprimerChiffreAffaires={supprimerChiffreAffaires}
            />
          )}

          {pageCourante === 'stocks' && (
            <StocksPage
              produits={donnees.produits}
              mouvements={donnees.mouvementsStock}
              onEnregistrerMouvement={enregistrerMouvementStock}
            />
          )}

          {pageCourante === 'depenses' && (
            <DepensesPage
              depenses={donnees.depenses}
              apportsCaisse={donnees.apportsCaisse ?? []}
              ventes={donnees.ventes}
              devise={donnees.parametres.devise}
              utilisateurNom={session.nomUtilisateur || session.nom}
              onAjouterDepense={ajouterDepense}
              onSupprimerDepense={supprimerDepense}
              onAjouterApportCaisse={ajouterApportCaisse}
              onSupprimerApportCaisse={supprimerApportCaisse}
            />
          )}

          {pageCourante === 'rapports' && (
            <RapportsPage
              donnees={donnees}
              role={session.role}
              onSupprimerChiffreAffaires={supprimerChiffreAffaires}
            />
          )}

          {pageCourante === 'utilisateurs' && (
            <UtilisateursPage
              utilisateurs={donnees.utilisateurs}
              utilisateurConnecteId={session.id}
              codeMaitreAdmin={donnees.parametres.codeMaitreAdmin}
              onAjouterUtilisateur={ajouterUtilisateur}
              onModifierUtilisateur={modifierUtilisateur}
              onSupprimerUtilisateur={supprimerUtilisateur}
              onRetourParametres={() => changerPage('parametres')}
            />
          )}

          {pageCourante === 'parametres' && (
            <ParametresPage
              donnees={donnees}
              onSauvegarderParametres={sauvegarderParametres}
              onRestaurerBase={restaurerBase}
              onAllerUtilisateurs={() => changerPage('utilisateurs')}
            />
          )}
        </main>
      </div>

      <MobileBottomNav
        pageActive={pageCourante}
        role={session.role}
        onChangerPage={changerPage}
        onOuvrirMenu={() => setMenuMobileOuvert(true)}
      />
    </div>
  );
}
