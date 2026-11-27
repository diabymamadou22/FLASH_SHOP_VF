import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  CreditCard,
  History,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  UserCircle2,
  Users,
  Wallet,
} from 'lucide-react';
import { LIBELLES_ROLE, peutAccederPage } from '../services/auth';
import { PageId, Produit, SessionUtilisateur } from '../types';
import PWAInstallButton from './PWAInstallButton';

interface HeaderProps {
  pageActive: PageId;
  session: SessionUtilisateur;
  produitsEnAlerte: Produit[];
  onOuvrirMenu: () => void;
  onAllerPage: (page: PageId) => void;
  onDeconnexion: () => void;
}

const TITRES_PAGES: Record<PageId, { titre: string; icone: typeof Home }> = {
  dashboard: { titre: 'Tableau de bord', icone: Home },
  produits: { titre: 'Produits', icone: Package },
  categories: { titre: 'Catégories', icone: LayoutGrid },
  caisse: { titre: 'Ventes (Caisse)', icone: ShoppingCart },
  credits: { titre: 'Crédits clients', icone: CreditCard },
  historique: { titre: 'Historique des ventes', icone: History },
  stocks: { titre: 'Stocks', icone: Boxes },
  depenses: { titre: 'Dépenses', icone: Wallet },
  rapports: { titre: 'Rapports', icone: BarChart3 },
  utilisateurs: { titre: 'Utilisateurs & rôles', icone: Users },
  parametres: { titre: 'Paramètres', icone: Settings },
};

export default function Header({
  pageActive,
  session,
  produitsEnAlerte,
  onOuvrirMenu,
  onAllerPage,
  onDeconnexion,
}: HeaderProps) {
  const [alertesOuvertes, setAlertesOuvertes] = useState(false);
  const info = TITRES_PAGES[pageActive];
  const IconePage = info.icone;
  const peutGererStocks = peutAccederPage(session.role, 'stocks');
  const peutVoirParametres = peutAccederPage(session.role, 'parametres');

  return (
    <header className="no-print pt-safe sticky top-0 z-20 flex min-h-10 items-center justify-between gap-2 border-b border-slate-200 bg-white px-2.5 transition-colors dark:border-slate-800 dark:bg-slate-900 sm:min-h-11 sm:px-4">
      {/* Zone gauche : bouton mobile + titre de page */}
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onOuvrirMenu}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-3.5 w-3.5" />
        </button>
        <div className="flex min-w-0 items-center gap-1.5">
          <IconePage className="h-4 w-4 shrink-0 text-[#0A3072] dark:text-blue-400" />
          <h1 className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-base">
            {info.titre}
          </h1>
        </div>
      </div>

      {/* Zone droite : installation + alertes stock + compte connecté + déconnexion */}
      <div className="relative flex shrink-0 items-center gap-1 sm:gap-1.5">
        <PWAInstallButton />

        <button
          type="button"
          onClick={() => setAlertesOuvertes((prev) => !prev)}
          className="relative flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Alertes de stock"
        >
          <Bell className="h-3.5 w-3.5" />
          {produitsEnAlerte.length > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-red-600 px-0.5 text-[8px] font-bold text-white tabular-nums">
              {produitsEnAlerte.length}
            </span>
          )}
        </button>

        {alertesOuvertes && (
          <div className="absolute right-0 top-12 z-30 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Alertes stock ({produitsEnAlerte.length})
              </span>
              {peutGererStocks && (
                <button
                  type="button"
                  onClick={() => {
                    setAlertesOuvertes(false);
                    onAllerPage('stocks');
                  }}
                  className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
                >
                  Gérer les stocks
                </button>
              )}
            </div>
            {produitsEnAlerte.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                Tous les produits ont un stock suffisant.
              </p>
            ) : (
              <ul className="max-h-60 space-y-2 overflow-y-auto">
                {produitsEnAlerte.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs dark:bg-slate-800/80"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 shrink-0 ${
                          p.stock === 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      />
                      <span className="truncate font-medium text-slate-800 dark:text-slate-200">{p.nom}</span>
                    </div>
                    <span
                      className={`shrink-0 font-mono font-semibold tabular-nums ${
                        p.stock === 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {p.stock} restant(s)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => peutVoirParametres && onAllerPage('parametres')}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-1.5 py-0.5 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <UserCircle2 className="h-4 w-4 shrink-0 text-[#0A3072] dark:text-blue-400" />
          <div className="hidden sm:block">
            <div className="text-[11px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
              {session.nom}
              {session.nomUtilisateur && session.nomUtilisateur !== session.nom && (
                <span className="ml-1 font-mono text-[9px] font-normal text-slate-500 dark:text-slate-400">
                  (@{session.nomUtilisateur})
                </span>
              )}
            </div>
            <div className="text-[9px] leading-tight text-slate-500 dark:text-slate-400">
              {LIBELLES_ROLE[session.role]}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onDeconnexion}
          title="Se déconnecter"
          aria-label="Se déconnecter"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
