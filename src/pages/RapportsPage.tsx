import { useMemo, useState } from 'react';
import { Calendar, Download, Printer, Trash2 } from 'lucide-react';
import ModalSuppressionCA from '../components/ModalSuppressionCA';
import {
  DonneesRapportPeriode,
  TypePeriodeRapport,
  imprimerOuTelechargerRapport,
  telechargerPdfRapport,
} from '../services/impressionRapport';
import { BaseDonnees, RoleUtilisateur } from '../types';
import { formatDateCourte, formatDateHeure, formatPrix } from '../utils/format';

interface RapportsPageProps {
  donnees: BaseDonnees;
  role: RoleUtilisateur;
  onSupprimerChiffreAffaires: () => void;
}

function cleDateLocale(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function libelleMoisAnnee(yyyyMm: string): string {
  const [anneeStr, moisStr] = yyyyMm.split('-');
  const annee = Number(anneeStr);
  const mois = Number(moisStr);
  if (!annee || !mois) return yyyyMm;
  const d = new Date(annee, mois - 1, 1);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function RapportsPage({
  donnees,
  role,
  onSupprimerChiffreAffaires,
}: RapportsPageProps) {
  const { produits, categories, ventes, depenses, parametres } = donnees;

  const aujourdhui = cleDateLocale(new Date().toISOString());
  const [typePeriode, setTypePeriode] = useState<TypePeriodeRapport>('mois');
  const [dateJour, setDateJour] = useState(aujourdhui);
  const [moisChoisi, setMoisChoisi] = useState(aujourdhui.slice(0, 7));
  const [anneeChoisie, setAnneeChoisie] = useState(aujourdhui.slice(0, 4));
  const [modalSuppressionOuverte, setModalSuppressionOuverte] = useState(false);
  const [infoImpression, setInfoImpression] = useState('');

  const peutSupprimerCA = role === 'super_admin' || role === 'admin';

  // Années disponibles à partir des ventes, dépenses et année courante
  const anneesDisponibles = useMemo(() => {
    const ensemble = new Set<string>([aujourdhui.slice(0, 4)]);
    ventes.forEach((v) => ensemble.add(cleDateLocale(v.date).slice(0, 4)));
    depenses.forEach((d) => ensemble.add(cleDateLocale(d.date).slice(0, 4)));
    return Array.from(ensemble).sort((a, b) => b.localeCompare(a));
  }, [ventes, depenses, aujourdhui]);

  const { ventesPeriode, depensesPeriode, titrePeriode, sousTitrePeriode, slugPeriode } =
    useMemo(() => {
      const correspondPeriode = (iso: string): boolean => {
        const cle = cleDateLocale(iso);
        if (typePeriode === 'jour') return cle === dateJour;
        if (typePeriode === 'mois') return cle.slice(0, 7) === moisChoisi;
        if (typePeriode === 'annee') return cle.slice(0, 4) === anneeChoisie;
        return true;
      };

      const vFiltrees = ventes.filter((v) => correspondPeriode(v.date));
      const dFiltrees = depenses.filter((d) => correspondPeriode(d.date));

      let titre = 'Rapport global';
      let sousTitre = 'Toutes périodes confondues';
      let slug = 'global';

      if (typePeriode === 'jour') {
        const dateFormatee = formatDateCourte(`${dateJour}T12:00:00`);
        titre = `Rapport du ${dateFormatee}`;
        sousTitre = `Journée du ${dateFormatee}`;
        slug = `jour_${dateJour}`;
      } else if (typePeriode === 'mois') {
        const moisLabel = libelleMoisAnnee(moisChoisi);
        titre = `Rapport — ${moisLabel}`;
        sousTitre = `Mois de ${moisLabel}`;
        slug = `mois_${moisChoisi}`;
      } else if (typePeriode === 'annee') {
        titre = `Rapport annuel ${anneeChoisie}`;
        sousTitre = `Année ${anneeChoisie}`;
        slug = `annee_${anneeChoisie}`;
      }

      return {
        ventesPeriode: vFiltrees,
        depensesPeriode: dFiltrees,
        titrePeriode: titre,
        sousTitrePeriode: sousTitre,
        slugPeriode: slug,
      };
    }, [ventes, depenses, typePeriode, dateJour, moisChoisi, anneeChoisie]);

  const bilan = useMemo(() => {
    const chiffreAffairesFacture = ventesPeriode.reduce((acc, v) => acc + v.total, 0);
    const chiffreAffaires = ventesPeriode.reduce(
      (acc, v) => acc + (v.estCredit ? Math.min(v.total, v.montantPaye ?? 0) : v.total),
      0
    );
    const creditsARecouvrer = ventesPeriode.reduce(
      (acc, v) => acc + (v.estCredit ? Math.max(0, v.total - (v.montantPaye ?? 0)) : 0),
      0
    );
    const coutMarchandises = ventesPeriode.reduce(
      (acc, v) =>
        acc + v.lignes.reduce((s, l) => s + l.prixAchatUnitaire * l.quantite, 0),
      0
    );
    const margeBrute = chiffreAffaires - coutMarchandises;
    const totalDepenses = depensesPeriode.reduce((acc, d) => acc + d.montant, 0);
    const beneficeNet = margeBrute - totalDepenses;

    const valeurStockVente = produits.reduce((acc, p) => acc + p.prixVente * p.stock, 0);

    const parCategorie = categories.map((cat) => {
      const items = produits.filter((p) => p.categorieId === cat.id);
      const unites = items.reduce((s, p) => s + p.stock, 0);
      const valeur = items.reduce((s, p) => s + p.prixAchat * p.stock, 0);
      return {
        id: cat.id,
        nom: cat.nom,
        nbProduits: items.length,
        unites,
        valeur,
      };
    });

    const maxValeur = Math.max(1, ...parCategorie.map((c) => c.valeur));

    return {
      chiffreAffairesFacture,
      chiffreAffaires,
      creditsARecouvrer,
      coutMarchandises,
      margeBrute,
      totalDepenses,
      beneficeNet,
      valeurStockVente,
      parCategorie,
      maxValeur,
    };
  }, [produits, categories, ventesPeriode, depensesPeriode]);

  const construireDonneesRapport = (): DonneesRapportPeriode => ({
    titrePeriode,
    sousTitrePeriode,
    ventes: ventesPeriode,
    depenses: depensesPeriode,
    produits,
    chiffreAffairesFacture: bilan.chiffreAffairesFacture,
    chiffreAffairesEncaisse: bilan.chiffreAffaires,
    creditsARecouvrer: bilan.creditsARecouvrer,
    coutMarchandises: bilan.coutMarchandises,
    margeBrute: bilan.margeBrute,
    totalDepenses: bilan.totalDepenses,
    beneficeNet: bilan.beneficeNet,
    valeurStockVente: bilan.valeurStockVente,
    parCategorie: bilan.parCategorie,
    parametres,
  });

  const afficherInfo = (msg: string) => {
    setInfoImpression(msg);
    setTimeout(() => setInfoImpression(''), 4000);
  };

  const gererImpression = () => {
    const mode = imprimerOuTelechargerRapport(construireDonneesRapport(), slugPeriode);
    if (mode === 'pdf_download') {
      afficherInfo(`${titrePeriode} téléchargé en PDF.`);
    }
  };

  const gererPdf = () => {
    telechargerPdfRapport(construireDonneesRapport(), slugPeriode);
    afficherInfo(`${titrePeriode} téléchargé en PDF.`);
  };

  return (
    <div className="space-y-5">
      {/* Barre de filtrage par période + boutons Imprimer / PDF (masquée à l'impression) */}
      <section className="no-print rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Calendar className="h-4 w-4 text-[#0A3072]" />
              Période :
            </span>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(
                [
                  { id: 'jour', label: 'Jour' },
                  { id: 'mois', label: 'Mois' },
                  { id: 'annee', label: 'Année' },
                  { id: 'tout', label: 'Global' },
                ] as { id: TypePeriodeRapport; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTypePeriode(opt.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    typePeriode === opt.id
                      ? 'bg-[#0A3072] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {typePeriode === 'jour' && (
              <input
                type="date"
                value={dateJour}
                onChange={(e) => e.target.value && setDateJour(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                aria-label="Choisir la date du rapport"
              />
            )}

            {typePeriode === 'mois' && (
              <input
                type="month"
                value={moisChoisi}
                onChange={(e) => e.target.value && setMoisChoisi(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                aria-label="Choisir le mois du rapport"
              />
            )}

            {typePeriode === 'annee' && (
              <select
                value={anneeChoisie}
                onChange={(e) => setAnneeChoisie(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                aria-label="Choisir l'année du rapport"
              >
                {anneesDisponibles.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={gererPdf}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Télécharger PDF
            </button>
            <button
              type="button"
              onClick={gererImpression}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0A3072] px-4 text-xs font-semibold text-white hover:bg-blue-900"
            >
              <Printer className="h-4 w-4" />
              Imprimer le rapport
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
          <span>
            Période affichée : <strong className="text-slate-800">{sousTitrePeriode}</strong>
          </span>
          <span>
            {ventesPeriode.length} vente(s) · {depensesPeriode.length} dépense(s)
          </span>
        </div>

        {infoImpression && (
          <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
            {infoImpression}
          </div>
        )}
      </section>

      {/* En-tête officiel visible uniquement à l'impression */}
      <div className="hidden border-b-2 border-[#0A3072] pb-4 print:block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={parametres.logoDataUrl || '/pwa-192x192.png'}
              alt={`Logo ${parametres.nomBoutique}`}
              loading="eager"
              decoding="sync"
              className="h-12 w-12 rounded-lg object-contain"
            />
            <div>
              <h1 className="text-xl font-extrabold text-[#0A3072]">{parametres.nomBoutique}</h1>
              <p className="text-xs text-slate-600">
                {parametres.sousTitre} · {parametres.adresse} · {parametres.telephone}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-[#0A3072]">{titrePeriode}</div>
            <div className="text-xs text-slate-500">
              Édité le {formatDateHeure(new Date().toISOString())}
            </div>
          </div>
        </div>
      </div>

      {/* Indicateurs financiers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Chiffre d&apos;affaires</span>
            {peutSupprimerCA && ventes.length > 0 && (
              <button
                type="button"
                onClick={() => setModalSuppressionOuverte(true)}
                className="no-print inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                title="Supprimer le chiffre d'affaires"
              >
                <Trash2 className="h-3 w-3" />
                Supprimer
              </button>
            )}
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {formatPrix(bilan.chiffreAffaires, parametres.devise)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500">Marge brute sur ventes</div>
          <div className="mt-2 font-mono text-xl font-bold text-blue-700 tabular-nums">
            {formatPrix(bilan.margeBrute, parametres.devise)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500">Total des dépenses</div>
          <div className="mt-2 font-mono text-xl font-bold text-amber-700 tabular-nums">
            {formatPrix(bilan.totalDepenses, parametres.devise)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500">Bénéfice net estimé</div>
          <div
            className={`mt-2 font-mono text-xl font-bold tabular-nums ${
              bilan.beneficeNet >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {formatPrix(bilan.beneficeNet, parametres.devise)}
          </div>
        </div>
      </div>

      {/* Détail comptable et répartition du stock par catégorie */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-base font-bold text-slate-900">
            Synthèse financière · {sousTitrePeriode}
          </h2>
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-600">Total facturé sur la période</dt>
              <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatPrix(bilan.chiffreAffairesFacture, parametres.devise)}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-600">Total des ventes encaissées</dt>
              <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatPrix(bilan.chiffreAffaires, parametres.devise)}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-600">Crédits clients à recouvrer</dt>
              <dd className="font-mono font-semibold text-orange-600 tabular-nums">
                {formatPrix(bilan.creditsARecouvrer, parametres.devise)}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-600">Coût d&apos;achat des articles vendus</dt>
              <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatPrix(bilan.coutMarchandises, parametres.devise)}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-600">Marge commerciale brute</dt>
              <dd className="font-mono font-semibold text-blue-700 tabular-nums">
                {formatPrix(bilan.margeBrute, parametres.devise)}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-600">Charges / Dépenses de la boutique</dt>
              <dd className="font-mono font-semibold text-amber-700 tabular-nums">
                {formatPrix(bilan.totalDepenses, parametres.devise)}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="font-semibold text-slate-900">Résultat net (Marge - Dépenses)</dt>
              <dd
                className={`font-mono font-bold tabular-nums ${
                  bilan.beneficeNet >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {formatPrix(bilan.beneficeNet, parametres.devise)}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-600">Valeur potentielle du stock à la vente</dt>
              <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatPrix(bilan.valeurStockVente, parametres.devise)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-base font-bold text-slate-900">
            Valeur du stock par catégorie
          </h2>
          <div className="space-y-3.5">
            {bilan.parCategorie.map((cat) => {
              const pourcentage = Math.round((cat.valeur / bilan.maxValeur) * 100);
              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {cat.nom} ({cat.nbProduits} réf. · {cat.unites} unités)
                    </span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatPrix(cat.valeur, parametres.devise)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${pourcentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Détail des ventes et dépenses de la période sélectionnée */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <h2 className="text-sm font-bold text-slate-900">
              Ventes de la période ({ventesPeriode.length})
            </h2>
            <span className="font-mono text-xs font-bold text-[#0A3072] tabular-nums">
              {formatPrix(bilan.chiffreAffaires, parametres.devise)}
            </span>
          </div>
          {ventesPeriode.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-500">
              Aucune vente enregistrée pour cette période.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[#0D357A] text-white">
                    <th className="px-3 py-2">Facture</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2 text-right">Encaissé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ventesPeriode.map((v) => {
                    const encaisse = v.estCredit
                      ? Math.min(v.total, v.montantPaye ?? 0)
                      : v.total;
                    return (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-semibold text-slate-900">
                          {v.numeroFacture}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {formatDateCourte(v.date)}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{v.clientNom}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatPrix(encaisse, parametres.devise)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <h2 className="text-sm font-bold text-slate-900">
              Dépenses de la période ({depensesPeriode.length})
            </h2>
            <span className="font-mono text-xs font-bold text-amber-700 tabular-nums">
              {formatPrix(bilan.totalDepenses, parametres.devise)}
            </span>
          </div>
          {depensesPeriode.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-500">
              Aucune dépense enregistrée pour cette période.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[#0D357A] text-white">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Libellé</th>
                    <th className="px-3 py-2">Catégorie</th>
                    <th className="px-3 py-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {depensesPeriode.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                        {formatDateCourte(d.date)}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{d.libelle}</td>
                      <td className="px-3 py-2 text-slate-600">{d.categorie}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatPrix(d.montant, parametres.devise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ModalSuppressionCA
        ouvert={modalSuppressionOuverte}
        role={role}
        titre="Supprimer le chiffre d'affaires ?"
        description="Cette action supprime toutes les factures de ventes enregistrées et remet le chiffre d'affaires à 0."
        onFermer={() => setModalSuppressionOuverte(false)}
        onConfirmer={onSupprimerChiffreAffaires}
      />
    </div>
  );
}
