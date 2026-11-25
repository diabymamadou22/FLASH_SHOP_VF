import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import MobileBottomNav from './components/MobileBottomNav';
import Sidebar from './components/Sidebar';
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
import { prechargerLogoPdf } from './services/logoPdf';
import {
  BaseDonnees,
  Categorie,
  Depense,
  MouvementStock,
  PageId,
  PaiementCredit,
  ParametresBoutique,
  Produit,
  SessionUtilisateur,
  Utilisateur,
  Vente,
} from './types';
import { getStatutStock } from './utils/format';

export default function App() {
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
      donnees.utilisateurs
    );
    if (!nouvelleSession) return false;
    setSession(nouvelleSession);
    setPageActive(getPageDefautRole(nouvelleSession.role));
    return true;
  };

  const gererDeconnexion = () => {
    setSession(null);
    setMenuMobileOuvert(false);
  };

  const changerPage = (page: PageId) => {
    if (!session) return;
    if (peutAccederPage(session.role, page)) {
      setPageActive(page);
    }
  };

  // --- Opérations CRUD Produits ---
  const ajouterProduit = (produit: Produit) => {
    setDonnees((prev) => ({
      ...prev,
      produits: [produit, ...prev.produits],
    }));
  };

  const modifierProduit = (produitModifie: Produit) => {
    setDonnees((prev) => ({
      ...prev,
      produits: prev.produits.map((p) => (p.id === produitModifie.id ? produitModifie : p)),
    }));
  };

  const supprimerProduit = (id: string) => {
    setDonnees((prev) => ({
      ...prev,
      produits: prev.produits.filter((p) => p.id !== id),
    }));
  };

  // --- Opérations CRUD Catégories ---
  const ajouterCategorie = (categorie: Categorie) => {
    setDonnees((prev) => ({
      ...prev,
      categories: [...prev.categories, categorie],
    }));
  };

  const modifierCategorie = (categorieModifiee: Categorie) => {
    setDonnees((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === categorieModifiee.id ? categorieModifiee : c
      ),
    }));
  };

  const supprimerCategorie = (id: string) => {
    setDonnees((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
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
  };

  const supprimerVente = (id: string) => {
    setDonnees((prev) => ({
      ...prev,
      ventes: prev.ventes.filter((v) => v.id !== id),
    }));
  };

  const supprimerChiffreAffaires = () => {
    setDonnees((prev) => ({
      ...prev,
      ventes: [],
    }));
  };

  const enregistrerPaiementCredit = (venteId: string, paiement: PaiementCredit) => {
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
  };

  // --- Dépenses ---
  const ajouterDepense = (depense: Depense) => {
    setDonnees((prev) => ({
      ...prev,
      depenses: [depense, ...prev.depenses],
    }));
  };

  const supprimerDepense = (id: string) => {
    setDonnees((prev) => ({
      ...prev,
      depenses: prev.depenses.filter((d) => d.id !== id),
    }));
  };

  // --- Utilisateurs & Paramètres ---
  const ajouterUtilisateur = (utilisateur: Utilisateur) => {
    setDonnees((prev) => ({
      ...prev,
      utilisateurs: [...prev.utilisateurs, utilisateur],
    }));
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
  };

  const supprimerUtilisateur = (id: string) => {
    setDonnees((prev) => ({
      ...prev,
      utilisateurs: prev.utilisateurs.filter((u) => u.id !== id),
    }));
  };

  const sauvegarderParametres = (parametres: ParametresBoutique) => {
    setDonnees((prev) => ({
      ...prev,
      parametres,
    }));
  };

  // Écran de connexion si aucune session n'est active
  if (!session) {
    return <ConnexionPage parametres={donnees.parametres} onConnexion={gererConnexion} />;
  }

  const pageCourante = peutAccederPage(session.role, pageActive)
    ? pageActive
    : getPageDefautRole(session.role);

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden bg-slate-50 text-slate-900">
      <Sidebar
        pageActive={pageCourante}
        role={session.role}
        onChangerPage={changerPage}
        parametres={donnees.parametres}
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
              parametres={donnees.parametres}
              nombreVentesExistantes={donnees.ventes.length}
              onValiderVente={validerVente}
            />
          )}

          {pageCourante === 'credits' && (
            <CreditsPage
              ventes={donnees.ventes}
              parametres={donnees.parametres}
              role={session.role}
              onEnregistrerPaiementCredit={enregistrerPaiementCredit}
              onSupprimerVente={supprimerVente}
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
              devise={donnees.parametres.devise}
              onAjouterDepense={ajouterDepense}
              onSupprimerDepense={supprimerDepense}
            />
          )}

          {pageCourante === 'rapports' && (
            <RapportsPage
              donnees={donnees}
              role={session.role}
              onSupprimerChiffreAffaires={supprimerChiffreAffaires}
            />
          )}

          {pageCourante === 'parametres' && (
            <ParametresPage
              donnees={donnees}
              utilisateurConnecteId={session.id}
              onSauvegarderParametres={sauvegarderParametres}
              onAjouterUtilisateur={ajouterUtilisateur}
              onModifierUtilisateur={modifierUtilisateur}
              onSupprimerUtilisateur={supprimerUtilisateur}
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
