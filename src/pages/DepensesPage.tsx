import { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { calculerSoldeDisponible, verifierDepenseAutorisee } from '../services/depenses';
import { ApportCaisse, Depense, Vente } from '../types';
import { formatDateCourte, formatPrix, genererId } from '../utils/format';

interface DepensesPageProps {
  depenses: Depense[];
  apportsCaisse: ApportCaisse[];
  ventes: Vente[];
  devise: string;
  utilisateurNom?: string;
  onAjouterDepense: (depense: Depense) => void;
  onSupprimerDepense: (id: string) => void;
  onAjouterApportCaisse: (apport: ApportCaisse) => void;
  onSupprimerApportCaisse: (id: string) => void;
}

function cleDateLocale(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

export default function DepensesPage({
  depenses,
  apportsCaisse,
  ventes,
  devise,
  utilisateurNom,
  onAjouterDepense,
  onSupprimerDepense,
  onAjouterApportCaisse,
  onSupprimerApportCaisse,
}: DepensesPageProps) {
  const [libelle, setLibelle] = useState('');
  const [categorie, setCategorie] = useState<Depense['categorie']>('Loyer');
  const [montant, setMontant] = useState('');
  const [erreur, setErreur] = useState('');

  // Filtres liste dépenses
  const [recherche, setRecherche] = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState<'toutes' | Depense['categorie']>('toutes');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  // Modale ajout apport / fond de caisse
  const [modalApportOuverte, setModalApportOuverte] = useState(false);
  const [libelleApport, setLibelleApport] = useState('Fond de caisse initial');
  const [montantApport, setMontantApport] = useState('');
  const [erreurApport, setErreurApport] = useState('');

  // Modale de confirmation de suppression (dépense ou apport)
  const [cibleSuppression, setCibleSuppression] = useState<
    | { type: 'depense'; item: Depense }
    | { type: 'apport'; item: ApportCaisse }
    | null
  >(null);

  const tresorerie = useMemo(
    () => calculerSoldeDisponible(ventes, depenses, apportsCaisse),
    [ventes, depenses, apportsCaisse]
  );

  const depensesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return depenses.filter((d) => {
      if (filtreCategorie !== 'toutes' && d.categorie !== filtreCategorie) return false;
      const cle = cleDateLocale(d.date);
      if (dateDebut && cle < dateDebut) return false;
      if (dateFin && cle > dateFin) return false;
      if (!terme) return true;
      return (
        d.libelle.toLowerCase().includes(terme) ||
        d.categorie.toLowerCase().includes(terme) ||
        (d.utilisateur ?? '').toLowerCase().includes(terme)
      );
    });
  }, [depenses, recherche, filtreCategorie, dateDebut, dateFin]);

  const totalDepenses = tresorerie.totalDepenses;
  const totalDepensesFiltrees = useMemo(
    () => depensesFiltrees.reduce((acc, d) => acc + d.montant, 0),
    [depensesFiltrees]
  );

  const filtresActifs =
    recherche.trim() !== '' ||
    filtreCategorie !== 'toutes' ||
    dateDebut !== '' ||
    dateFin !== '';

  const reinitialiserFiltres = () => {
    setRecherche('');
    setFiltreCategorie('toutes');
    setDateDebut('');
    setDateFin('');
  };

  const montantNumerique = Number(montant);
  const depassementEnDirect =
    montant !== '' &&
    Number.isFinite(montantNumerique) &&
    montantNumerique > 0 &&
    montantNumerique > tresorerie.soldeBrut;

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    const valeur = Number(montant);
    if (!libelle.trim()) {
      setErreur('Veuillez saisir un libellé pour la dépense.');
      return;
    }

    const verif = verifierDepenseAutorisee(valeur, ventes, depenses, devise, apportsCaisse);
    if (!verif.autorise) {
      setErreur(verif.erreur ?? 'Dépense refusée : solde insuffisant.');
      return;
    }

    onAjouterDepense({
      id: genererId('dep'),
      libelle: libelle.trim(),
      categorie,
      montant: valeur,
      date: new Date().toISOString(),
      utilisateur: utilisateurNom?.trim() || undefined,
    });

    setLibelle('');
    setMontant('');
    setErreur('');
  };

  const soumettreApport = (e: FormEvent) => {
    e.preventDefault();
    const valeur = Number(montantApport);
    if (!libelleApport.trim()) {
      setErreurApport('Veuillez saisir un motif pour cet apport.');
      return;
    }
    if (!Number.isFinite(valeur) || valeur <= 0) {
      setErreurApport('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }

    onAjouterApportCaisse({
      id: genererId('app'),
      libelle: libelleApport.trim(),
      montant: valeur,
      date: new Date().toISOString(),
      utilisateur: utilisateurNom?.trim() || undefined,
    });

    setLibelleApport('Fond de caisse initial');
    setMontantApport('');
    setErreurApport('');
    setModalApportOuverte(false);
  };

  return (
    <div className="space-y-4">
      {/* Synthèse de trésorerie : ce qu'on a vs ce qu'on a déjà dépensé */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Recettes encaissées</span>
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums dark:text-slate-100">
            {formatPrix(tresorerie.totalEncaisse, devise)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Ventes comptant &amp; remboursements reçus
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Fond de caisse / Apports</span>
            <Banknote className="h-4 w-4 text-[#0A3072] dark:text-blue-400" />
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-[#0A3072] tabular-nums dark:text-blue-400">
            {formatPrix(tresorerie.totalApports, devise)}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {apportsCaisse.length} apport(s)
            </span>
            <button
              type="button"
              onClick={() => {
                setErreurApport('');
                setModalApportOuverte(true);
              }}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-50 px-2.5 text-xs font-semibold text-[#0A3072] hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total des dépenses</span>
            <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-orange-600 tabular-nums dark:text-orange-400">
            {formatPrix(totalDepenses, devise)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {depenses.length} dépense(s) enregistrée(s)
          </div>
        </div>

        <div
          className={`rounded-xl border px-4 py-3 ${
            tresorerie.soldeDisponible <= 0
              ? 'border-red-200 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/40'
              : 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold ${
                tresorerie.soldeDisponible <= 0
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-emerald-800 dark:text-emerald-300'
              }`}
            >
              Solde disponible (Caisse)
            </span>
            <Wallet
              className={`h-4 w-4 ${
                tresorerie.soldeDisponible <= 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            />
          </div>
          <div
            className={`mt-1 font-mono text-lg font-bold tabular-nums ${
              tresorerie.soldeDisponible <= 0
                ? 'text-red-700 dark:text-red-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {formatPrix(tresorerie.soldeDisponible, devise)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
            Montant maximum autorisé par dépense
          </div>
        </div>
      </div>

      {/* Formulaire compact de saisie d'une dépense */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 sm:text-base dark:text-slate-100">
            Enregistrer une dépense
          </h2>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Max autorisé :{' '}
            <span
              className={`font-mono font-bold ${
                tresorerie.soldeDisponible <= 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {formatPrix(tresorerie.soldeDisponible, devise)}
            </span>
          </span>
        </div>

        {(erreur || depassementEnDirect) && (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {depassementEnDirect
                ? `Dépense refusée : le montant (${formatPrix(
                    montantNumerique,
                    devise
                  )}) dépasse ce que vous avez disponible en caisse (${formatPrix(
                    tresorerie.soldeDisponible,
                    devise
                  )}).`
                : erreur}
            </span>
          </div>
        )}

        <form
          onSubmit={soumettre}
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12"
        >
          <div className="lg:col-span-4">
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Libellé *</label>
            <input
              type="text"
              required
              value={libelle}
              onChange={(e) => {
                setLibelle(e.target.value);
                if (erreur) setErreur('');
              }}
              placeholder="Ex: Facture d'électricité"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="lg:col-span-3">
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Catégorie</label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as Depense['categorie'])}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="Loyer">Loyer</option>
              <option value="Electricite">Électricité / Eau</option>
              <option value="Transport">Transport / Livraison</option>
              <option value="Salaires">Salaires</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Montant ({devise}) *
            </label>
            <input
              type="number"
              min={1}
              required
              value={montant}
              onChange={(e) => {
                setMontant(e.target.value);
                if (erreur) setErreur('');
              }}
              placeholder="Ex: 25000"
              className={`h-9 w-full rounded-lg border px-2.5 text-sm tabular-nums focus:outline-none ${
                depassementEnDirect
                  ? 'border-red-400 bg-red-50/40 text-red-700 focus:border-red-600 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300'
                  : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'
              }`}
            />
          </div>

          <div className="flex items-end sm:col-span-2 lg:col-span-2">
            <button
              type="submit"
              disabled={depassementEnDirect || tresorerie.soldeDisponible <= 0}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 sm:text-sm"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Ajouter
            </button>
          </div>
        </form>
      </section>

      {/* Filtres des dépenses */}
      <section className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher une dépense (libellé, utilisateur)..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={filtreCategorie}
              onChange={(e) =>
                setFiltreCategorie(e.target.value as 'toutes' | Depense['categorie'])
              }
              aria-label="Filtrer par catégorie de dépense"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="toutes">Toutes catégories</option>
              <option value="Loyer">Loyer</option>
              <option value="Electricite">Électricité / Eau</option>
              <option value="Transport">Transport / Livraison</option>
              <option value="Salaires">Salaires</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 md:col-span-4">
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              aria-label="Date de début dépenses"
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <div className="flex gap-1.5">
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                aria-label="Date de fin dépenses"
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              {filtresActifs && (
                <button
                  type="button"
                  onClick={reinitialiserFiltres}
                  title="Réinitialiser les filtres"
                  aria-label="Réinitialiser les filtres"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tableau des dépenses */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 sm:text-base dark:text-slate-100">
            Dépenses enregistrées ({depensesFiltrees.length}
            {filtresActifs ? ` / ${depenses.length}` : ''})
          </h2>
          <div className="font-mono text-sm font-bold text-slate-900 tabular-nums dark:text-slate-100">
            Total : {formatPrix(totalDepensesFiltrees, devise)}
          </div>
        </div>

        {/* Vue cartes mobile (< md) */}
        <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
          {depensesFiltrees.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {depenses.length === 0
                ? 'Aucune dépense saisie.'
                : 'Aucune dépense ne correspond aux filtres.'}
            </p>
          ) : (
            depensesFiltrees.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{d.libelle}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {d.categorie} · {formatDateCourte(d.date)}
                    {d.utilisateur ? ` · @${d.utilisateur}` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums dark:text-slate-100">
                    {formatPrix(d.montant, devise)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCibleSuppression({ type: 'depense', item: d })}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700"
                    aria-label={`Supprimer ${d.libelle}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#0D357A] text-xs font-semibold text-white dark:bg-slate-800 dark:text-slate-100">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Libellé</th>
                <th className="px-3 py-2">Catégorie</th>
                <th className="px-3 py-2">Saisi par</th>
                <th className="px-3 py-2 text-right">Montant</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {depensesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {depenses.length === 0
                      ? 'Aucune dépense saisie.'
                      : 'Aucune dépense ne correspond aux filtres.'}
                  </td>
                </tr>
              ) : (
                depensesFiltrees.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                      {formatDateCourte(d.date)}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{d.libelle}</td>
                    <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">{d.categorie}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {d.utilisateur ? `@${d.utilisateur}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-mono font-bold text-slate-900 tabular-nums dark:text-slate-100">
                      {formatPrix(d.montant, devise)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setCibleSuppression({ type: 'depense', item: d })}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700"
                        title="Supprimer"
                        aria-label={`Supprimer ${d.libelle}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Historique des apports / fonds de caisse */}
      {apportsCaisse.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Fonds de caisse &amp; apports enregistrés ({apportsCaisse.length})
            </h2>
            <div className="font-mono text-sm font-bold text-[#0A3072] tabular-nums dark:text-blue-400">
              Total apports : {formatPrix(tresorerie.totalApports, devise)}
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {apportsCaisse.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{a.libelle}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateCourte(a.date)}
                    {a.utilisateur ? ` · @${a.utilisateur}` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                    +{formatPrix(a.montant, devise)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCibleSuppression({ type: 'apport', item: a })}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700"
                    aria-label={`Supprimer l'apport ${a.libelle}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modale d'ajout d'un fond de caisse / apport */}
      {modalApportOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4 dark:bg-slate-950/75">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 shadow-xl sm:p-6 dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-[#0A3072] dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Ajouter un fond de caisse / apport
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalApportOuverte(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={soumettreApport} className="space-y-4">
              {erreurApport && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {erreurApport}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Libellé / Motif *
                </label>
                <input
                  type="text"
                  required
                  value={libelleApport}
                  onChange={(e) => setLibelleApport(e.target.value)}
                  placeholder="Ex: Fond de caisse initial, Apport gérant..."
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Montant ({devise}) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={montantApport}
                  onChange={(e) => setMontantApport(e.target.value)}
                  placeholder="Ex: 50000"
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalApportOuverte(false)}
                  className="h-9 flex-1 rounded-lg border border-slate-200 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0A3072] px-3.5 text-xs font-semibold text-white hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 sm:text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Enregistrer l&apos;apport
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de confirmation de suppression */}
      {cibleSuppression && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4 dark:bg-slate-950/75">
          <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {cibleSuppression.type === 'depense'
                ? 'Supprimer cette dépense ?'
                : 'Supprimer cet apport en caisse ?'}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Voulez-vous vraiment supprimer{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {cibleSuppression.item.libelle}
              </span>{' '}
              ({formatPrix(cibleSuppression.item.montant, devise)}) ?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCibleSuppression(null)}
                className="h-9 rounded-lg border border-slate-200 px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cibleSuppression.type === 'depense') {
                    onSupprimerDepense(cibleSuppression.item.id);
                  } else {
                    onSupprimerApportCaisse(cibleSuppression.item.id);
                  }
                  setCibleSuppression(null);
                }}
                className="h-9 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 sm:text-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
