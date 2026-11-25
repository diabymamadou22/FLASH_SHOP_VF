import {
  BarChart3,
  Boxes,
  CreditCard,
  History,
  Home,
  LayoutGrid,
  Package,
  Settings,
  ShoppingCart,
  Wallet,
  X,
} from 'lucide-react';
import { peutAccederPage } from '../services/auth';
import { PageId, ParametresBoutique, RoleUtilisateur } from '../types';

interface SidebarProps {
  pageActive: PageId;
  role: RoleUtilisateur;
  onChangerPage: (page: PageId) => void;
  parametres: ParametresBoutique;
  ouvertMobile: boolean;
  onFermerMobile: () => void;
}

const ELEMENTS_MENU: { id: PageId; label: string; icone: typeof Home }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icone: Home },
  { id: 'produits', label: 'Produits', icone: Package },
  { id: 'categories', label: 'Catégories', icone: LayoutGrid },
  { id: 'caisse', label: 'Ventes (Caisse)', icone: ShoppingCart },
  { id: 'credits', label: 'Crédits', icone: CreditCard },
  { id: 'historique', label: 'Historique des ventes', icone: History },
  { id: 'stocks', label: 'Stocks', icone: Boxes },
  { id: 'depenses', label: 'Dépenses', icone: Wallet },
  { id: 'rapports', label: 'Rapports', icone: BarChart3 },
  { id: 'parametres', label: 'Paramètres', icone: Settings },
];

export default function Sidebar({
  pageActive,
  role,
  onChangerPage,
  parametres,
  ouvertMobile,
  onFermerMobile,
}: SidebarProps) {
  const selectionner = (page: PageId) => {
    onChangerPage(page);
    onFermerMobile();
  };

  const menuAutorise = ELEMENTS_MENU.filter((item) => peutAccederPage(role, item.id));

  return (
    <>
      {ouvertMobile && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onFermerMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`no-print pt-safe pb-safe fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between bg-gradient-to-b from-[#0A3072] to-[#061E4A] text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 ${
          ouvertMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* En-tête de la marque */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <img
                src={parametres.logoDataUrl || '/pwa-192x192.png'}
                alt={`Logo ${parametres.nomBoutique}`}
                referrerPolicy="no-referrer"
                className="h-10 w-10 shrink-0 rounded-xl bg-white/10 object-contain"
              />
              <div className="min-w-0">
                <div className="truncate text-lg font-bold tracking-tight text-white">
                  {parametres.nomBoutique}
                </div>
                <div className="truncate text-xs text-blue-200">{parametres.sousTitre}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onFermerMobile}
              className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu principal filtré selon le rôle */}
          <nav className="space-y-1 px-3 py-4" aria-label="Navigation principale">
            {menuAutorise.map((item) => {
              const Icone = item.icone;
              const estActif =
                pageActive === item.id ||
                (item.id === 'parametres' && pageActive === 'utilisateurs');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectionner(item.id)}
                  className={`flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                    estActif
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icone className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
