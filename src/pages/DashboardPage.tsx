import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CreditCard,
  Package,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { peutAccederPage } from '../services/auth';
import { BaseDonnees, PageId, RoleUtilisateur } from '../types';
import { formatDateHeure, formatPrix, getStatutStock } from '../utils/format';

interface DashboardPageProps {
  donnees: BaseDonnees;
  role: RoleUtilisateur;
  onAllerPage: (page: PageId) => void;
}

export default function DashboardPage({ donnees, role, onAllerPage }: DashboardPageProps) {
  const { produits, ventes, depenses, parametres } = donnees;

  const resume = useMemo(() => {
    const chiffreAffaires = ventes.reduce(
      (acc, v) => acc + (v.estCredit ? Math.min(v.total, v.montantPaye ?? 0) : v.total),
      0
    );
    const creditsEnCours = ventes.reduce(
      (acc, v) => acc + (v.estCredit ? Math.max(0, v.total - (v.montantPaye ?? 0)) : 0),
      0
    );
    const nbCreditsOuverts = ventes.filter(
      (v) => v.estCredit && v.total - (v.montantPaye ?? 0) > 0
    ).length;
    const valeurStock = produits.reduce((acc, p) => acc + p.prixAchat * p.stock, 0);
    const totalDepenses = depenses.reduce((acc, d) => acc + d.montant, 0);
    const alertes = produits.filter((p) => getStatutStock(p.stock, p.seuil) !== 'en_stock');

    return {
      chiffreAffaires,
      creditsEnCours,
      nbCreditsOuverts,
      valeurStock,
      totalDepenses,
      nombreVentes: ventes.length,
      alertes,
    };
  }, [produits, ventes, depenses]);

  const dernieresVentes = ventes.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Cartes statistiques principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">CA encaissé</span>
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
            {formatPrix(resume.chiffreAffaires, parametres.devise)}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {resume.nombreVentes} vente(s) · Crédits dus :{' '}
            <span className="font-semibold text-orange-600 dark:text-orange-400">
              {formatPrix(resume.creditsEnCours, parametres.devise)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Valeur du stock (achat)
            </span>
            <Boxes className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
            {formatPrix(resume.valeurStock, parametres.devise)}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {produits.length} référence(s) au catalogue
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total des dépenses
            </span>
            <ShoppingCart className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
            {formatPrix(resume.totalDepenses, parametres.devise)}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {depenses.length} dépense(s) saisie(s)
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Alertes de stock
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 tabular-nums dark:text-amber-400">
            {resume.alertes.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Produits à réapprovisionner
          </div>
        </div>
      </div>

      {/* Raccourcis d'action filtrés selon le rôle */}
      <div className="flex flex-wrap gap-2">
        {peutAccederPage(role, 'caisse') && (
          <button
            type="button"
            onClick={() => onAllerPage('caisse')}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white hover:bg-blue-800"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Ouvrir la caisse
          </button>
        )}
        {peutAccederPage(role, 'produits') && (
          <button
            type="button"
            onClick={() => onAllerPage('produits')}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Package className="h-3.5 w-3.5" />
            Gérer les produits
          </button>
        )}
        {peutAccederPage(role, 'credits') && (
          <button
            type="button"
            onClick={() => onAllerPage('credits')}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-800/70 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-900/40"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Gérer les crédits ({resume.nbCreditsOuverts})
          </button>
        )}
        {peutAccederPage(role, 'stocks') && (
          <button
            type="button"
            onClick={() => onAllerPage('stocks')}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Boxes className="h-3.5 w-3.5" />
            Entrée de stock
          </button>
        )}
      </div>

      {/* Deux colonnes : Dernières ventes + Alertes stock */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Dernières ventes
            </h2>
            <button
              type="button"
              onClick={() => onAllerPage('historique')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
            >
              Tout voir <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {dernieresVentes.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Aucune vente enregistrée pour le moment.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dernieresVentes.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {v.numeroFacture} · {v.clientNom}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateHeure(v.date)} · {v.modePaiement}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-slate-900 tabular-nums dark:text-slate-100">
                    {formatPrix(v.total, parametres.devise)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Produits sous le seuil
            </h2>
            {peutAccederPage(role, 'stocks') && (
              <button
                type="button"
                onClick={() => onAllerPage('stocks')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
              >
                Réapprovisionner <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {resume.alertes.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Tous les articles ont un niveau de stock normal.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {resume.alertes.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="min-w-0 pr-3">
                    <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                      {p.nom}
                    </div>
                    <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      Réf: {p.reference} · Seuil: {p.seuil}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-xs font-bold tabular-nums ${
                      p.stock === 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {p.stock === 0 ? 'Rupture (0)' : `${p.stock} en stock`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
