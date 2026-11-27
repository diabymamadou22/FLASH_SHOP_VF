import { FormEvent, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, RotateCcw, Search } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { MouvementStock, Produit } from '../types';
import { formatDateHeure, genererId } from '../utils/format';

interface StocksPageProps {
  produits: Produit[];
  mouvements: MouvementStock[];
  onEnregistrerMouvement: (mouvement: MouvementStock) => void;
}

function cleDateLocale(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

export default function StocksPage({
  produits,
  mouvements,
  onEnregistrerMouvement,
}: StocksPageProps) {
  const toast = useToast();
  const [filtreProduitSelect, setFiltreProduitSelect] = useState('');
  const [produitId, setProduitId] = useState(produits[0]?.id ?? '');
  const [type, setType] = useState<'entree' | 'sortie'>('entree');
  const [quantite, setQuantite] = useState('1');
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState('');

  // Filtres journal des mouvements
  const [rechercheJournal, setRechercheJournal] = useState('');
  const [filtreType, setFiltreType] = useState<'tous' | 'entree' | 'sortie'>('tous');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const produitsSelectFiltres = useMemo(() => {
    const terme = filtreProduitSelect.trim().toLowerCase();
    if (!terme) return produits;
    return produits.filter(
      (p) =>
        p.nom.toLowerCase().includes(terme) ||
        p.reference.toLowerCase().includes(terme) ||
        p.codeBarre.toLowerCase().includes(terme)
    );
  }, [produits, filtreProduitSelect]);

  const mouvementsFiltres = useMemo(() => {
    const terme = rechercheJournal.trim().toLowerCase();
    return mouvements.filter((m) => {
      if (filtreType !== 'tous' && m.type !== filtreType) return false;
      const cle = cleDateLocale(m.date);
      if (dateDebut && cle < dateDebut) return false;
      if (dateFin && cle > dateFin) return false;
      if (!terme) return true;
      return (
        m.nomProduit.toLowerCase().includes(terme) ||
        m.motif.toLowerCase().includes(terme)
      );
    });
  }, [mouvements, rechercheJournal, filtreType, dateDebut, dateFin]);

  const filtresJournalActifs =
    rechercheJournal.trim() !== '' ||
    filtreType !== 'tous' ||
    dateDebut !== '' ||
    dateFin !== '';

  const reinitialiserFiltresJournal = () => {
    setRechercheJournal('');
    setFiltreType('tous');
    setDateDebut('');
    setDateFin('');
  };

  const produitSelectionneActif =
    produitsSelectFiltres.find((p) => p.id === produitId)?.id ??
    produitsSelectFiltres[0]?.id ??
    '';

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    const produit = produits.find((p) => p.id === produitSelectionneActif);
    const qte = Number(quantite);

    const signaleErreur = (msg: string) => {
      setErreur(msg);
      toast.erreur('Mouvement refusé', msg);
    };

    if (!produit) {
      signaleErreur('Veuillez sélectionner un produit.');
      return;
    }
    if (Number.isNaN(qte) || qte <= 0) {
      signaleErreur('La quantité doit être supérieure à 0.');
      return;
    }
    if (type === 'sortie' && qte > produit.stock) {
      signaleErreur(`Stock insuffisant : seulement ${produit.stock} unité(s) disponible(s).`);
      return;
    }

    onEnregistrerMouvement({
      id: genererId('mvt'),
      produitId: produit.id,
      nomProduit: produit.nom,
      type,
      quantite: qte,
      motif:
        motif.trim() ||
        (type === 'entree' ? 'Approvisionnement boutique' : 'Sortie manuelle de stock'),
      date: new Date().toISOString(),
    });

    setQuantite('1');
    setMotif('');
    setErreur('');
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Formulaire de mouvement de stock */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
        <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
          Mouvement de stock
        </h2>

        <form onSubmit={soumettre} className="space-y-4">
          {erreur && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border dark:border-red-800/70 dark:bg-red-950/40 dark:text-red-300">
              {erreur}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Produit *
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filtreProduitSelect}
                onChange={(e) => setFiltreProduitSelect(e.target.value)}
                placeholder="Filtrer un produit (nom, réf)..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
              />
            </div>
            <select
              value={produitSelectionneActif}
              onChange={(e) => setProduitId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {produitsSelectFiltres.length === 0 ? (
                <option value="">Aucun produit trouvé</option>
              ) : (
                produitsSelectFiltres.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.reference} — {p.nom} (Stock: {p.stock})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Type d&apos;opération
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('entree')}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold sm:text-sm ${
                  type === 'entree'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <ArrowDownCircle className="h-4 w-4" />
                Entrée (+)
              </button>
              <button
                type="button"
                onClick={() => setType('sortie')}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold sm:text-sm ${
                  type === 'sortie'
                    ? 'border-red-600 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/50 dark:text-red-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <ArrowUpCircle className="h-4 w-4" />
                Sortie (-)
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Quantité *
            </label>
            <input
              type="number"
              min={1}
              required
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Motif
            </label>
            <input
              type="text"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex: Réception commande fournisseur"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            className="h-9 w-full rounded-lg bg-blue-700 px-3.5 text-xs font-semibold text-white hover:bg-blue-800 sm:text-sm"
          >
            Enregistrer le mouvement
          </button>
        </form>
      </section>

      {/* Historique des mouvements */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
        <div className="space-y-3 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Journal des mouvements ({mouvementsFiltres.length}
              {filtresJournalActifs ? ` / ${mouvements.length}` : ''})
            </h2>
            {filtresJournalActifs && (
              <button
                type="button"
                onClick={reinitialiserFiltresJournal}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
            <div className="relative sm:col-span-5">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={rechercheJournal}
                onChange={(e) => setRechercheJournal(e.target.value)}
                placeholder="Produit ou motif..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={filtreType}
                onChange={(e) => setFiltreType(e.target.value as 'tous' | 'entree' | 'sortie')}
                aria-label="Filtrer par type de mouvement"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="tous">Entrées &amp; Sorties</option>
                <option value="entree">Entrées (+)</option>
                <option value="sortie">Sorties (-)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:col-span-4">
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                aria-label="Date début mouvements"
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                aria-label="Date fin mouvements"
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Vue cartes mobile (< md) */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
          {mouvementsFiltres.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              {mouvements.length === 0
                ? 'Aucun mouvement de stock enregistré.'
                : 'Aucun mouvement ne correspond à vos filtres.'}
            </p>
          ) : (
            mouvementsFiltres.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {m.nomProduit}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{m.motif}</div>
                  <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {formatDateHeure(m.date)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${
                      m.type === 'entree'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {m.type === 'entree' ? `+${m.quantite}` : `-${m.quantite}`}
                  </span>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {m.type === 'entree' ? 'Entrée' : 'Sortie'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#0D357A] text-xs font-semibold text-white dark:bg-slate-800 dark:text-slate-100">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Quantité</th>
                <th className="px-4 py-3">Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {mouvementsFiltres.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    {mouvements.length === 0
                      ? 'Aucun mouvement de stock enregistré.'
                      : 'Aucun mouvement ne correspond à vos filtres.'}
                  </td>
                </tr>
              ) : (
                mouvementsFiltres.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      {formatDateHeure(m.date)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {m.nomProduit}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {m.type === 'entree' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          <ArrowDownCircle className="h-3.5 w-3.5" /> Entrée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400">
                          <ArrowUpCircle className="h-3.5 w-3.5" /> Sortie
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold tabular-nums dark:text-slate-100">
                      {m.type === 'entree' ? `+${m.quantite}` : `-${m.quantite}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      {m.motif}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
