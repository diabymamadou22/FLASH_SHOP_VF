import { FileText, Palette, Receipt, StickyNote } from 'lucide-react';
import { DesignFactureA4, ParametresBoutique, Vente } from '../types';
import { formatDateCourte, formatDateHeure, formatPrix } from '../utils/format';

export type FormatImpression = 'a4_pro' | 'ticket_80' | 'a5_compact';

export const DESIGNS_FACTURE_A4: {
  id: DesignFactureA4;
  label: string;
  pastille: string;
  accent: string;
}[] = [
  { id: 'classique_bleu', label: 'Classique Bleu', pastille: '#0A3072', accent: '#F97316' },
  { id: 'moderne_emeraude', label: 'Moderne Émeraude', pastille: '#065F46', accent: '#10B981' },
  { id: 'prestige_noir', label: 'Prestige Noir & Or', pastille: '#0F172A', accent: '#D97706' },
  { id: 'minimal_epure', label: 'Minimaliste Épuré', pastille: '#334155', accent: '#94A3B8' },
];

interface FactureImprimableProps {
  vente: Vente;
  parametres: ParametresBoutique;
  format: FormatImpression;
  onChangerFormat: (format: FormatImpression) => void;
  designA4?: DesignFactureA4;
  onChangerDesignA4?: (design: DesignFactureA4) => void;
}

const OPTIONS_FORMAT: { id: FormatImpression; label: string; icone: typeof FileText }[] = [
  { id: 'a4_pro', label: 'Facture A4 Pro', icone: FileText },
  { id: 'a5_compact', label: 'Reçu A5 Compact', icone: StickyNote },
  { id: 'ticket_80', label: 'Ticket Caisse 80mm', icone: Receipt },
];

export default function FactureImprimable({
  vente,
  parametres,
  format,
  onChangerFormat,
  designA4,
  onChangerDesignA4,
}: FactureImprimableProps) {
  const paye = vente.estCredit ? Math.min(vente.total, vente.montantPaye ?? 0) : vente.total;
  const reste = Math.max(0, vente.total - paye);
  const estSolde = reste <= 0;
  const nbArticles = vente.lignes.reduce((s, l) => s + l.quantite, 0);
  const logoSrc = parametres.logoDataUrl || '/pwa-192x192.png';
  const messagePied =
    parametres.piedFacture?.trim() ||
    'Merci pour votre confiance ! Les articles vendus sont garantis selon nos conditions.';

  const designActif: DesignFactureA4 =
    designA4 ?? parametres.designFactureA4 ?? 'classique_bleu';

  const estMinimal = designActif === 'minimal_epure';
  const estPrestige = designActif === 'prestige_noir';
  const estEmeraude = designActif === 'moderne_emeraude';

  const classesEnteteA4 = estMinimal
    ? 'border-b-2 border-slate-800 bg-white text-slate-900'
    : estPrestige
      ? 'border-b-4 border-amber-500 bg-slate-900 text-white'
      : estEmeraude
        ? 'border-b-4 border-emerald-400 bg-emerald-900 text-white'
        : 'border-b-4 border-orange-500 bg-[#0A3072] text-white';

  const classesSousTexteEntete = estMinimal
    ? 'text-slate-500'
    : estPrestige
      ? 'text-slate-300'
      : estEmeraude
        ? 'text-emerald-100'
        : 'text-blue-200';

  const classesLabelTypeFacture = estMinimal
    ? 'text-slate-500'
    : estPrestige
      ? 'text-amber-400'
      : estEmeraude
        ? 'text-emerald-300'
        : 'text-orange-300';

  const classesEnteteTableauA4 = estMinimal
    ? 'border-y border-slate-300 bg-slate-100 text-slate-800'
    : estPrestige
      ? 'bg-slate-900 text-amber-300'
      : estEmeraude
        ? 'bg-emerald-800 text-white'
        : 'bg-[#0D357A] text-white';

  const classesCarteInfoA4 = estMinimal
    ? 'border border-slate-200 bg-white'
    : estPrestige
      ? 'border border-amber-200/80 bg-amber-50/30'
      : estEmeraude
        ? 'border-l-4 border border-slate-200 border-l-emerald-600 bg-emerald-50/30'
        : 'border border-slate-200 bg-slate-50/70';

  const classesTotalA4 = estMinimal
    ? 'text-slate-900'
    : estPrestige
      ? 'text-slate-900'
      : estEmeraude
        ? 'text-emerald-800'
        : 'text-[#0A3072]';

  return (
    <div className="space-y-3">
      {/* Sélecteur du type d'impression et du design A4 Pro (masqué à l'impression) */}
      <div className="no-print space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="px-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Type d&apos;impression :
          </span>
          <div className="flex flex-wrap gap-1.5">
            {OPTIONS_FORMAT.map((opt) => {
              const Icone = opt.icone;
              const actif = format === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangerFormat(opt.id)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                    actif
                      ? 'bg-[#0A3072] text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icone className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {format === 'a4_pro' && onChangerDesignA4 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2 dark:border-slate-700">
            <span className="inline-flex items-center gap-1.5 px-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Palette className="h-3.5 w-3.5 text-[#0A3072] dark:text-blue-400" />
              Design A4 Pro :
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DESIGNS_FACTURE_A4.map((d) => {
                const actif = designActif === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onChangerDesignA4(d.id)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                      actif
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-blue-500 dark:bg-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/40"
                      style={{ backgroundColor: d.pastille }}
                    />
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FORMAT 1 : FACTURE A4 PRO (4 designs au choix) */}
      {format === 'a4_pro' && (
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900">
          {/* En-tête officiel de la boutique */}
          <div className={`flex flex-wrap items-center justify-between gap-4 px-6 py-5 ${classesEnteteA4}`}>
            <div className="flex items-center gap-3.5">
              <img
                src={logoSrc}
                alt={`Logo ${parametres.nomBoutique}`}
                loading="eager"
                decoding="sync"
                className={`h-14 w-14 shrink-0 rounded-xl object-contain p-1 shadow-sm ${
                  estMinimal ? 'border border-slate-200 bg-slate-50' : 'bg-white'
                }`}
              />
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">{parametres.nomBoutique}</h2>
                <p className={`text-xs ${classesSousTexteEntete}`}>{parametres.sousTitre}</p>
                <p className={`mt-1 text-[11px] ${classesSousTexteEntete}`}>
                  {parametres.adresse} · Tél : {parametres.telephone}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div
                className={`text-[11px] font-bold uppercase tracking-widest ${classesLabelTypeFacture}`}
              >
                {vente.estCredit ? 'Facture à crédit' : 'Facture de vente'}
              </div>
              <div className="mt-0.5 font-mono text-lg font-extrabold tracking-tight">
                {vente.numeroFacture}
              </div>
              <div className={`mt-0.5 text-xs ${classesSousTexteEntete}`}>
                {formatDateHeure(vente.date)}
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6">
            {/* Informations Client & Règlement */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className={`rounded-xl p-3.5 ${classesCarteInfoA4}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Facturé à
                </div>
                <div className="mt-1 text-sm font-bold text-slate-900">{vente.clientNom}</div>
                {vente.clientTelephone && (
                  <div className="mt-0.5 font-mono text-xs text-slate-600">
                    Tél : {vente.clientTelephone}
                  </div>
                )}
              </div>

              <div className={`rounded-xl p-3.5 ${classesCarteInfoA4}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Règlement & Statut
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      !vente.estCredit || estSolde
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {!vente.estCredit ? 'PAYÉE' : estSolde ? 'CRÉDIT SOLDÉ' : 'CRÉDIT EN COURS'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-700">
                  Mode :{' '}
                  <span className="font-semibold text-slate-900">
                    {vente.estCredit ? 'Crédit client' : vente.modePaiement}
                  </span>
                </div>
                {vente.estCredit && vente.dateEcheanceCredit && (
                  <div className="mt-0.5 text-xs text-orange-700">
                    Échéance :{' '}
                    <span className="font-semibold">
                      {formatDateCourte(vente.dateEcheanceCredit)}
                    </span>
                  </div>
                )}
                <div className="mt-0.5 text-xs text-slate-600">
                  Établi par :{' '}
                  <span className="font-semibold">
                    {vente.vendeur || parametres.nomGerant}
                  </span>
                </div>
              </div>
            </div>

            {/* Tableau détaillé des articles */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className={classesEnteteTableauA4}>
                    <th className="px-3 py-2.5 text-left font-semibold">Réf.</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Désignation</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Qté</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Prix unit.</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vente.lignes.map((l) => (
                    <tr key={l.produitId} className="even:bg-slate-50/60">
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                        {l.reference}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">{l.nomProduit}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        {l.quantite}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600">
                        {formatPrix(l.prixUnitaire, parametres.devise)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatPrix(l.sousTotal, parametres.devise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Synthèse des totaux + historique des versements si crédit */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex-1">
                {vente.estCredit && vente.paiementsCredit && vente.paiementsCredit.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                      Versements enregistrés ({vente.paiementsCredit.length})
                    </div>
                    <div className="space-y-1 text-xs">
                      {vente.paiementsCredit.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2">
                          <span className="text-slate-600">
                            {formatDateHeure(p.date)} · {p.modePaiement}
                            {p.note ? ` (${p.note})` : ''}
                          </span>
                          <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                            +{formatPrix(p.montant, parametres.devise)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={`w-full space-y-2 rounded-xl p-4 sm:w-72 ${classesCarteInfoA4}`}>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Nombre d&apos;articles</span>
                  <span className="font-mono font-semibold tabular-nums">{nbArticles}</span>
                </div>
                {(vente.remise ?? 0) > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Sous-total</span>
                      <span className="font-mono font-semibold tabular-nums">
                        {formatPrix(vente.sousTotalBrut ?? vente.total + (vente.remise ?? 0), parametres.devise)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-rose-600">
                      <span>Remise accordée</span>
                      <span className="font-mono tabular-nums">
                        -{formatPrix(vente.remise ?? 0, parametres.devise)}
                      </span>
                    </div>
                  </>
                )}
                <div
                  className={`flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold ${classesTotalA4}`}
                >
                  <span>TOTAL</span>
                  <span className="font-mono tabular-nums">
                    {formatPrix(vente.total, parametres.devise)}
                  </span>
                </div>
                {vente.estCredit && (
                  <>
                    <div className="flex justify-between text-xs font-semibold text-emerald-700">
                      <span>Montant payé</span>
                      <span className="font-mono tabular-nums">
                        {formatPrix(paye, parametres.devise)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-slate-300 pt-1.5 text-sm font-bold text-orange-600">
                      <span>Reste à payer</span>
                      <span className="font-mono tabular-nums">
                        {formatPrix(reste, parametres.devise)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Pied de page avec zones de signature */}
            <div className="space-y-5 border-t border-slate-200 pt-4">
              <div className="grid grid-cols-2 gap-6 text-center text-[11px] text-slate-500">
                <div>
                  <div className="font-semibold text-slate-700">Signature du client</div>
                  <div className="mt-8 border-b border-dashed border-slate-300" />
                </div>
                <div>
                  <div className="font-semibold text-slate-700">
                    Cachet & Signature {parametres.nomBoutique}
                  </div>
                  <div className="mt-8 border-b border-dashed border-slate-300" />
                </div>
              </div>
              <p className="text-center text-[11px] italic text-slate-500">{messagePied}</p>
            </div>
          </div>
        </article>
      )}

      {/* FORMAT 2 : REÇU COMPACT A5 / DEMI-PAGE */}
      {format === 'a5_compact' && (
        <article className="mx-auto max-w-[540px] rounded-xl border border-slate-200 bg-white p-5 text-slate-900">
          <div className="flex items-start justify-between gap-3 border-b-2 border-[#0A3072] pb-3.5">
            <div className="flex items-center gap-3">
              <img
                src={logoSrc}
                alt={`Logo ${parametres.nomBoutique}`}
                loading="eager"
                decoding="sync"
                className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-contain p-0.5"
              />
              <div>
                <div className="text-base font-extrabold text-[#0A3072]">
                  {parametres.nomBoutique}
                </div>
                <div className="text-[11px] text-slate-500">{parametres.sousTitre}</div>
                <div className="text-[11px] text-slate-600">
                  {parametres.adresse} · {parametres.telephone}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono text-xs font-bold text-[#0A3072]">
                {vente.numeroFacture}
              </div>
              <div className="text-[11px] text-slate-500">{formatDateHeure(vente.date)}</div>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  !vente.estCredit || estSolde
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {!vente.estCredit ? vente.modePaiement : estSolde ? 'Crédit soldé' : 'Crédit'}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
            <div>
              Client : <span className="font-bold text-slate-900">{vente.clientNom}</span>
              {vente.clientTelephone ? ` (${vente.clientTelephone})` : ''}
              {vente.estCredit && vente.dateEcheanceCredit && (
                <span className="ml-2 font-semibold text-orange-700">
                  · Échéance : {formatDateCourte(vente.dateEcheanceCredit)}
                </span>
              )}
              {vente.vendeur && (
                <span className="ml-2 text-slate-500">· Par : {vente.vendeur}</span>
              )}
            </div>
            <div className="text-slate-600">{nbArticles} article(s)</div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 text-left">Article</th>
                  <th className="py-2 text-right">Qté</th>
                  <th className="py-2 text-right">P.U.</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vente.lignes.map((l) => (
                  <tr key={l.produitId}>
                    <td className="py-2 font-medium text-slate-900">{l.nomProduit}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{l.quantite}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-slate-600">
                      {formatPrix(l.prixUnitaire, parametres.devise)}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold tabular-nums">
                      {formatPrix(l.sousTotal, parametres.devise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-1 border-t border-slate-200 pt-3">
            {(vente.remise ?? 0) > 0 && (
              <>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Sous-total</span>
                  <span className="font-mono tabular-nums">
                    {formatPrix(vente.sousTotalBrut ?? vente.total + (vente.remise ?? 0), parametres.devise)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-rose-600">
                  <span>Remise</span>
                  <span className="font-mono tabular-nums">
                    -{formatPrix(vente.remise ?? 0, parametres.devise)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm font-extrabold text-[#0A3072]">
              <span>TOTAL À PAYER</span>
              <span className="font-mono tabular-nums">
                {formatPrix(vente.total, parametres.devise)}
              </span>
            </div>
            {vente.estCredit && (
              <>
                <div className="flex justify-between text-xs font-semibold text-emerald-700">
                  <span>Montant payé</span>
                  <span className="font-mono tabular-nums">
                    {formatPrix(paye, parametres.devise)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-orange-600">
                  <span>Reste à payer</span>
                  <span className="font-mono tabular-nums">
                    {formatPrix(reste, parametres.devise)}
                  </span>
                </div>
              </>
            )}
          </div>

          <p className="mt-4 border-t border-dashed border-slate-200 pt-2.5 text-center text-[11px] text-slate-500">
            {messagePied}
          </p>
        </article>
      )}

      {/* FORMAT 3 : TICKET CAISSE THERMIQUE 80mm */}
      {format === 'ticket_80' && (
        <article className="mx-auto max-w-[300px] rounded-lg border border-slate-200 bg-white p-4 font-mono text-[11px] leading-relaxed text-slate-900">
          <div className="text-center">
            <img
              src={logoSrc}
              alt={`Logo ${parametres.nomBoutique}`}
              loading="eager"
              decoding="sync"
              className="mx-auto mb-1.5 h-10 w-10 rounded-lg object-contain"
            />
            <div className="text-sm font-extrabold uppercase tracking-wide">
              {parametres.nomBoutique}
            </div>
            <div className="text-[10px] text-slate-600">{parametres.sousTitre}</div>
            <div className="text-[10px] text-slate-600">{parametres.adresse}</div>
            <div className="text-[10px] text-slate-600">Tél: {parametres.telephone}</div>
          </div>

          <div className="my-2.5 border-t border-dashed border-slate-400" />

          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span>N° Facture:</span>
              <span className="font-bold">{vente.numeroFacture}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDateHeure(vente.date)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Client:</span>
              <span className="truncate text-right font-bold">{vente.clientNom}</span>
            </div>
            {vente.clientTelephone && (
              <div className="flex justify-between">
                <span>Tél client:</span>
                <span>{vente.clientTelephone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Règlement:</span>
              <span>{vente.estCredit ? 'Crédit' : vente.modePaiement}</span>
            </div>
            {vente.estCredit && vente.dateEcheanceCredit && (
              <div className="flex justify-between font-bold">
                <span>Échéance:</span>
                <span>{formatDateCourte(vente.dateEcheanceCredit)}</span>
              </div>
            )}
            {vente.vendeur && (
              <div className="flex justify-between">
                <span>Vendeur:</span>
                <span>{vente.vendeur}</span>
              </div>
            )}
          </div>

          <div className="my-2.5 border-t border-dashed border-slate-400" />

          <div className="space-y-1.5">
            {vente.lignes.map((l) => (
              <div key={l.produitId}>
                <div className="font-bold">{l.nomProduit}</div>
                <div className="flex justify-between text-[10px] text-slate-700 tabular-nums">
                  <span>
                    {l.quantite} x {formatPrix(l.prixUnitaire, parametres.devise)}
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatPrix(l.sousTotal, parametres.devise)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="my-2.5 border-t border-dashed border-slate-400" />

          <div className="space-y-1 tabular-nums">
            {(vente.remise ?? 0) > 0 && (
              <>
                <div className="flex justify-between text-[11px]">
                  <span>SOUS-TOTAL</span>
                  <span>
                    {formatPrix(vente.sousTotalBrut ?? vente.total + (vente.remise ?? 0), parametres.devise)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span>REMISE</span>
                  <span>-{formatPrix(vente.remise ?? 0, parametres.devise)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm font-extrabold">
              <span>TOTAL</span>
              <span>{formatPrix(vente.total, parametres.devise)}</span>
            </div>
            {vente.estCredit && (
              <>
                <div className="flex justify-between text-[11px] font-semibold">
                  <span>PAYÉ</span>
                  <span>{formatPrix(paye, parametres.devise)}</span>
                </div>
                <div className="flex justify-between text-xs font-extrabold">
                  <span>RESTE À PAYER</span>
                  <span>{formatPrix(reste, parametres.devise)}</span>
                </div>
              </>
            )}
          </div>

          <div className="my-2.5 border-t border-dashed border-slate-400" />

          <div className="text-center text-[10px] text-slate-600">{messagePied}</div>
        </article>
      )}
    </div>
  );
}
