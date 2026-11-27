import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MessageCircle,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import FactureImprimable, { FormatImpression } from '../components/FactureImprimable';
import ModalSuppressionCA from '../components/ModalSuppressionCA';
import {
  imprimerOuTelechargerFacture,
  telechargerPdfFacture,
} from '../services/impressionFacture';
import {
  DesignFactureA4,
  ModePaiement,
  ParametresBoutique,
  RoleUtilisateur,
  Vente,
} from '../types';
import { formatDateHeure, formatPrix } from '../utils/format';

interface HistoriqueVentesPageProps {
  ventes: Vente[];
  parametres: ParametresBoutique;
  role: RoleUtilisateur;
  onSupprimerVente: (id: string) => void;
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

export default function HistoriqueVentesPage({
  ventes,
  parametres,
  role,
  onSupprimerVente,
  onSupprimerChiffreAffaires,
}: HistoriqueVentesPageProps) {
  const [recherche, setRecherche] = useState('');
  const [filtreType, setFiltreType] = useState<'tous' | 'comptant' | 'credit'>('tous');
  const [filtreMode, setFiltreMode] = useState<'tous' | ModePaiement>('tous');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [pageActuelle, setPageActuelle] = useState(1);
  const [parPage, setParPage] = useState(10);

  const [venteSelectionnee, setVenteSelectionnee] = useState<Vente | null>(null);
  const [formatImpression, setFormatImpression] = useState<FormatImpression>('a4_pro');
  const [designA4, setDesignA4] = useState<DesignFactureA4>(
    parametres.designFactureA4 ?? 'classique_bleu'
  );
  const [cibleSuppression, setCibleSuppression] = useState<'tout' | Vente | null>(null);
  const [infoImpression, setInfoImpression] = useState('');

  useEffect(() => {
    setDesignA4(parametres.designFactureA4 ?? 'classique_bleu');
  }, [parametres.designFactureA4]);

  const afficherInfoImpression = (msg: string) => {
    setInfoImpression(msg);
    setTimeout(() => setInfoImpression(''), 5000);
  };

  const gererImpression = (vente: Vente) => {
    const mode = imprimerOuTelechargerFacture(vente, parametres, formatImpression, designA4);
    if (mode === 'pdf_download') {
      afficherInfoImpression(`Facture ${vente.numeroFacture} téléchargée en PDF pour impression.`);
    }
  };

  const gererPdf = (vente: Vente) => {
    telechargerPdfFacture(vente, parametres, formatImpression, designA4);
    afficherInfoImpression(`Facture ${vente.numeroFacture} téléchargée en PDF.`);
  };

  const peutSupprimerCA = role === 'super_admin' || role === 'admin';

  const ventesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return ventes.filter((v) => {
      if (filtreType === 'comptant' && v.estCredit) return false;
      if (filtreType === 'credit' && !v.estCredit) return false;
      if (filtreMode !== 'tous' && v.modePaiement !== filtreMode) return false;

      const cleDate = cleDateLocale(v.date);
      if (dateDebut && cleDate < dateDebut) return false;
      if (dateFin && cleDate > dateFin) return false;

      if (!terme) return true;
      return (
        v.numeroFacture.toLowerCase().includes(terme) ||
        v.clientNom.toLowerCase().includes(terme) ||
        (v.clientTelephone ?? '').toLowerCase().includes(terme) ||
        (v.vendeur ?? '').toLowerCase().includes(terme)
      );
    });
  }, [ventes, recherche, filtreType, filtreMode, dateDebut, dateFin]);

  const totalPages = Math.max(1, Math.ceil(ventesFiltrees.length / parPage));
  const pageSecurisee = Math.min(pageActuelle, totalPages);
  const debut = (pageSecurisee - 1) * parPage;
  const ventesPage = ventesFiltrees.slice(debut, debut + parPage);

  const filtresActifs =
    recherche.trim() !== '' ||
    filtreType !== 'tous' ||
    filtreMode !== 'tous' ||
    dateDebut !== '' ||
    dateFin !== '';

  const reinitialiserFiltres = () => {
    setRecherche('');
    setFiltreType('tous');
    setFiltreMode('tous');
    setDateDebut('');
    setDateFin('');
    setPageActuelle(1);
  };

  const totalFacture = ventesFiltrees.reduce((acc, v) => acc + v.total, 0);
  const totalEncaisse = ventesFiltrees.reduce(
    (acc, v) => acc + (v.estCredit ? Math.min(v.total, v.montantPaye ?? 0) : v.total),
    0
  );

  const getLienWhatsAppRecu = (vente: Vente) => {
    let chiffres = (vente.clientTelephone ?? '').trim().replace(/^00/, '').replace(/\D/g, '');
    if (chiffres.length === 8) {
      chiffres = `223${chiffres}`;
    }

    const devise = parametres.devise || 'FCFA';
    const paye = vente.estCredit ? Math.min(vente.total, vente.montantPaye ?? 0) : vente.total;
    const reste = Math.max(0, vente.total - paye);

    const lignesArticles = vente.lignes
      .map((l) => `• ${l.quantite} x ${l.nomProduit} : ${formatPrix(l.sousTotal, devise)}`)
      .join('\n');

    const blocRemise =
      (vente.remise ?? 0) > 0
        ? [
            `Sous-total : ${formatPrix(
              vente.sousTotalBrut ?? vente.total + (vente.remise ?? 0),
              devise
            )}`,
            `Remise : -${formatPrix(vente.remise ?? 0, devise)}`,
          ]
        : [];

    const blocPaiement = vente.estCredit
      ? reste > 0
        ? `Règlement : Crédit client\nPayé : ${formatPrix(paye, devise)}\nReste à payer : ${formatPrix(reste, devise)}`
        : `Règlement : Crédit soldé (${formatPrix(paye, devise)})`
      : `Paiement : ${vente.modePaiement} (Payée)`;

    const message = [
      `*REÇU - ${parametres.nomBoutique}*`,
      `Facture N° : ${vente.numeroFacture}`,
      `Date : ${formatDateHeure(vente.date)}`,
      `Client : ${vente.clientNom}`,
      ...(vente.vendeur ? [`Vendeur : @${vente.vendeur}`] : []),
      '',
      '*Articles :*',
      lignesArticles,
      '',
      ...blocRemise,
      `*TOTAL : ${formatPrix(vente.total, devise)}*`,
      blocPaiement,
      '',
      `${parametres.adresse ? `${parametres.adresse} · ` : ''}Tél : ${parametres.telephone}`,
      parametres.piedFacture?.trim() || 'Merci pour votre confiance !',
    ].join('\n');

    return chiffres
      ? `https://wa.me/${chiffres}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-4">
      {/* Barre de recherche et filtres */}
      <section className="no-print space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                setPageActuelle(1);
              }}
              placeholder="N° facture, client, téléphone, vendeur..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 md:col-span-4">
            <select
              value={filtreType}
              onChange={(e) => {
                setFiltreType(e.target.value as 'tous' | 'comptant' | 'credit');
                setPageActuelle(1);
              }}
              aria-label="Filtrer par type de règlement"
              className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="tous">Comptant &amp; Crédit</option>
              <option value="comptant">Comptant uniquement</option>
              <option value="credit">Crédit uniquement</option>
            </select>

            <select
              value={filtreMode}
              onChange={(e) => {
                setFiltreMode(e.target.value as 'tous' | ModePaiement);
                setPageActuelle(1);
              }}
              aria-label="Filtrer par mode de paiement"
              className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="tous">Tous modes</option>
              <option value="Especes">Espèces</option>
              <option value="Orange Money">Orange Money</option>
              <option value="Moov Money">Moov Money</option>
              <option value="Carte">Carte bancaire</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 md:col-span-4">
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => {
                setDateDebut(e.target.value);
                setPageActuelle(1);
              }}
              aria-label="Date de début"
              title="À partir du"
              className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <div className="flex gap-1.5">
              <input
                type="date"
                value={dateFin}
                onChange={(e) => {
                  setDateFin(e.target.value);
                  setPageActuelle(1);
                }}
                aria-label="Date de fin"
                title="Jusqu'au"
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              {filtresActifs && (
                <button
                  type="button"
                  onClick={reinitialiserFiltres}
                  title="Réinitialiser les filtres"
                  aria-label="Réinitialiser les filtres"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="no-print overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5 sm:py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Historique des factures ({ventesFiltrees.length}
              {filtresActifs ? ` / ${ventes.length}` : ''})
            </h2>
            <p className="font-mono text-xs font-semibold text-slate-500 tabular-nums dark:text-slate-400">
              CA encaissé : {formatPrix(totalEncaisse, parametres.devise)}
              {totalFacture > totalEncaisse &&
                ` · Total facturé : ${formatPrix(totalFacture, parametres.devise)}`}
            </p>
          </div>

          {peutSupprimerCA && ventes.length > 0 && (
            <button
              type="button"
              onClick={() => setCibleSuppression('tout')}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer le chiffre d&apos;affaires
            </button>
          )}
        </div>

        {/* Vue cartes mobile (< md) */}
        <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
          {ventesPage.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              {ventes.length === 0
                ? 'Aucune vente enregistrée pour le moment.'
                : 'Aucune facture ne correspond à votre recherche ou aux filtres.'}
            </p>
          ) : (
            ventesPage.map((v) => {
              const paye = v.estCredit ? Math.min(v.total, v.montantPaye ?? 0) : v.total;
              const reste = Math.max(0, v.total - paye);
              return (
                <div key={v.id} className="space-y-2.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                          {v.numeroFacture}
                        </span>
                        {v.estCredit && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              reste > 0
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {reste > 0 ? 'Crédit' : 'Crédit soldé'}
                          </span>
                        )}
                        {(v.remise ?? 0) > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Remise -{formatPrix(v.remise ?? 0, parametres.devise)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{v.clientNom}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDateHeure(v.date)} ·{' '}
                        {v.estCredit ? `Payé: ${formatPrix(paye, parametres.devise)}` : v.modePaiement}
                        {v.vendeur ? ` · @${v.vendeur}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm font-bold text-slate-900 tabular-nums dark:text-slate-100">
                        {formatPrix(v.total, parametres.devise)}
                      </div>
                      {v.estCredit && reste > 0 ? (
                        <div className="font-mono text-[11px] font-semibold text-orange-600 tabular-nums dark:text-orange-400">
                          Reste : {formatPrix(reste, parametres.devise)}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
                          {v.lignes.reduce((s, l) => s + l.quantite, 0)} article(s)
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={getLienWhatsAppRecu(v)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#16A34A] px-3 text-xs font-semibold text-white hover:bg-[#15803D]"
                      title={`Envoyer le reçu ${v.numeroFacture} par WhatsApp`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => setVenteSelectionnee(v)}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                      Voir / Imprimer
                    </button>
                    {peutSupprimerCA && (
                      <button
                        type="button"
                        onClick={() => setCibleSuppression(v)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700"
                        aria-label={`Supprimer ${v.numeroFacture}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#0D357A] text-xs font-semibold text-white dark:bg-slate-800 dark:text-slate-100">
                <th className="px-4 py-3">N° Facture</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Client / Vendeur</th>
                <th className="px-4 py-3">Paiement</th>
                <th className="px-4 py-3 text-right">Articles</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ventesPage.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    {ventes.length === 0
                      ? 'Aucune vente enregistrée pour le moment.'
                      : 'Aucune facture ne correspond à votre recherche ou aux filtres.'}
                  </td>
                </tr>
              ) : (
                ventesPage.map((v) => {
                  const paye = v.estCredit ? Math.min(v.total, v.montantPaye ?? 0) : v.total;
                  const reste = Math.max(0, v.total - paye);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                        <div>{v.numeroFacture}</div>
                        {v.estCredit && (
                          <span
                            className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              reste > 0
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {reste > 0 ? 'Crédit' : 'Crédit soldé'}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {formatDateHeure(v.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{v.clientNom}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {v.clientTelephone ? `${v.clientTelephone} · ` : ''}
                          {v.vendeur ? `Vendeur : @${v.vendeur}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                        <div>
                          {v.estCredit
                            ? reste > 0
                              ? `Crédit (reste ${formatPrix(reste, parametres.devise)})`
                              : 'Crédit soldé'
                            : v.modePaiement}
                        </div>
                        {(v.remise ?? 0) > 0 && (
                          <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Remise -{formatPrix(v.remise ?? 0, parametres.devise)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums dark:text-slate-300">
                        {v.lignes.reduce((s, l) => s + l.quantite, 0)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums dark:text-slate-100">
                        {formatPrix(v.total, parametres.devise)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={getLienWhatsAppRecu(v)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center gap-1 rounded-md bg-[#16A34A] px-2.5 text-xs font-semibold text-white hover:bg-[#15803D]"
                            title={`Envoyer le reçu ${v.numeroFacture} par WhatsApp`}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                          <button
                            type="button"
                            onClick={() => setVenteSelectionnee(v)}
                            className="inline-flex h-8 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Détail
                          </button>
                          {peutSupprimerCA && (
                            <button
                              type="button"
                              onClick={() => setCibleSuppression(v)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700"
                              title="Supprimer cette vente"
                              aria-label={`Supprimer ${v.numeroFacture}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600 sm:flex-row dark:border-slate-800 dark:text-slate-400">
          <div className="tabular-nums">
            Affichage de {ventesFiltrees.length === 0 ? 0 : debut + 1} à{' '}
            {Math.min(debut + parPage, ventesFiltrees.length)} sur {ventesFiltrees.length}{' '}
            facture(s)
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={parPage}
              onChange={(e) => {
                setParPage(Number(e.target.value));
                setPageActuelle(1);
              }}
              aria-label="Nombre de factures par page"
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value={10}>10 par page</option>
              <option value={20}>20 par page</option>
              <option value={50}>50 par page</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pageSecurisee <= 1}
                onClick={() => setPageActuelle((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Page précédente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-1.5 font-medium text-slate-800 tabular-nums dark:text-slate-200">
                {pageSecurisee} / {totalPages}
              </span>
              <button
                type="button"
                disabled={pageSecurisee >= totalPages}
                onClick={() => setPageActuelle((p) => Math.min(totalPages, p + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Page suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modale de consultation / impression de facture */}
      {venteSelectionnee && (
        <div className="print-container fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4 dark:bg-slate-950/75">
          <div
            className={`print-sheet max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 shadow-xl sm:p-6 dark:border dark:border-slate-800 dark:bg-slate-900 ${
              formatImpression === 'a4_pro'
                ? 'max-w-3xl'
                : formatImpression === 'a5_compact'
                  ? 'max-w-xl'
                  : 'max-w-md'
            }`}
          >
            <div className="no-print mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Facture {venteSelectionnee.numeroFacture}
              </h3>
              <button
                type="button"
                onClick={() => setVenteSelectionnee(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <FactureImprimable
              vente={venteSelectionnee}
              parametres={parametres}
              format={formatImpression}
              onChangerFormat={setFormatImpression}
              designA4={designA4}
              onChangerDesignA4={setDesignA4}
            />

            {infoImpression && (
              <div className="no-print mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                {infoImpression}
              </div>
            )}

            <div className="no-print mt-5 flex flex-wrap justify-end gap-2">
              <a
                href={getLienWhatsAppRecu(venteSelectionnee)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#16A34A] px-3.5 text-xs font-semibold text-white hover:bg-[#15803D] sm:text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                Envoyer par WhatsApp
              </a>
              <button
                type="button"
                onClick={() => gererPdf(venteSelectionnee)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:text-sm"
              >
                <Download className="h-4 w-4" />
                Télécharger PDF
              </button>
              <button
                type="button"
                onClick={() => gererImpression(venteSelectionnee)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0A3072] px-3.5 text-xs font-semibold text-white hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 sm:text-sm"
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </button>
              <button
                type="button"
                onClick={() => setVenteSelectionnee(null)}
                className="h-9 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 sm:text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalSuppressionCA
        ouvert={cibleSuppression !== null}
        role={role}
        codeMaitreAdmin={parametres.codeMaitreAdmin}
        titre={
          cibleSuppression === 'tout'
            ? "Supprimer tout le chiffre d'affaires ?"
            : `Supprimer la facture ${cibleSuppression?.numeroFacture ?? ''} ?`
        }
        description={
          cibleSuppression === 'tout'
            ? "Toutes les ventes enregistrées seront supprimées et le chiffre d'affaires sera remis à 0."
            : "Cette facture sera retirée de l'historique et du chiffre d'affaires, et les articles vendus seront automatiquement remis en stock."
        }
        onFermer={() => setCibleSuppression(null)}
        onConfirmer={() => {
          if (cibleSuppression === 'tout') {
            onSupprimerChiffreAffaires();
          } else if (cibleSuppression) {
            onSupprimerVente(cibleSuppression.id);
          }
        }}
      />
    </div>
  );
}
