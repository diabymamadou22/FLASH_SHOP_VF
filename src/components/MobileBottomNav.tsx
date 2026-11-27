import { Boxes, Home, Menu, Package, ShoppingCart } from 'lucide-react';
import { peutAccederPage } from '../services/auth';
import { PageId, RoleUtilisateur } from '../types';

interface MobileBottomNavProps {
  pageActive: PageId;
  role: RoleUtilisateur;
  onChangerPage: (page: PageId) => void;
  onOuvrirMenu: () => void;
}

export default function MobileBottomNav({
  pageActive,
  role,
  onChangerPage,
  onOuvrirMenu,
}: MobileBottomNavProps) {
  const tousOnglets: { id: PageId; label: string; icone: typeof Home }[] = [
    { id: 'dashboard', label: 'Accueil', icone: Home },
    { id: 'produits', label: 'Produits', icone: Package },
    { id: 'caisse', label: 'Caisse', icone: ShoppingCart },
    { id: 'stocks', label: 'Stocks', icone: Boxes },
  ];

  const ongletsAutorises = tousOnglets.filter((o) => peutAccederPage(role, o.id));
  const estAutrePage = !ongletsAutorises.some((o) => o.id === pageActive);

  return (
    <nav
      aria-label="Navigation mobile"
      className="no-print pb-safe fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
    >
      <div className="flex h-14 items-center justify-around">
        {ongletsAutorises.map((onglet) => {
          const Icone = onglet.icone;
          const actif = pageActive === onglet.id;
          return (
            <button
              key={onglet.id}
              type="button"
              onClick={() => onChangerPage(onglet.id)}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors ${
                actif
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Icone className="h-[18px] w-[18px]" />
              <span>{onglet.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOuvrirMenu}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors ${
            estAutrePage
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          <Menu className="h-[18px] w-[18px]" />
          <span>Plus</span>
        </button>
      </div>
    </nav>
  );
}
