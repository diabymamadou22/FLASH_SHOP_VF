import { useEffect, useState } from 'react';
import { Download, Eye, MessageCircle, Printer, Trash2, X } from 'lucide-react';
import FactureImprimable, { FormatImpression } from '../components/FactureImprimable';
import ModalSuppressionCA from '../components/ModalSuppressionCA';
import {
  imprimerOuTelechargerFacture,
  telechargerPdfFacture,
} from '../services/impressionFacture';
import { DesignFactureA4, ParametresBoutique, RoleUtilisateur, Vente } from '../types';
import { formatDateHeure, formatPrix } from '../utils/format';

interface HistoriqueVentesPageProps {
  ventes: Vente[];
  parametres: ParametresBoutique;
  role: RoleUtilisateur;
  onSupprimerVente: (id: string) => void;
  onSupprimerChiffreAffaires: () => void;
}

export default function HistoriqueVentesPage({
  ventes,
  parametres,
  role,
  onSupprimerVente,
  onSupprimerChiffreAffaires,
}: HistoriqueVentesPageProps) {
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
  const totalFacture = ventes.reduce((acc, v) => acc + v.total, 0);
  const totalEncaisse = ventes.reduce(
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
      '',
      '*Articles :*',
      lignesArticles,
      '',
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
    <div className="space-y-5">
      <div className="no-print overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5 sm:py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Historique des factures ({ventes.length})
            </h2>
            <p className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
              CA encaissé : {formatPrix(totalEncaisse, parametres.devise)}
              {totalFacture > totalEncaisse &&
                ` · Total facturé : ${formatPrix(totalFacture, parametres.devise)}`}
            </p>
          </div>

          {peutSupprimerCA && ventes.length > 0 && (
            <button
              type="button"
              onClick={() => setCibleSuppression('tout')}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer le chiffre d&apos;affaires
            </button>
          )}
        </div>

        {/* Vue cartes mobile (< md) */}
        <div className="divide-y divide-slate-100 md:hidden">
          {ventes.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              Aucune vente enregistrée pour le moment.
            </p>
          ) : (
            ventes.map((v) => {
              const paye = v.estCredit ? Math.min(v.total, v.montantPaye ?? 0) : v.total;
              const reste = Math.max(0, v.total - paye);
              return (
                <div key={v.id} className="space-y-2.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700">
                          {v.numeroFacture}
                        </span>
                        {v.estCredit && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              reste > 0
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {reste > 0 ? 'Crédit' : 'Crédit soldé'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{v.clientNom}</div>
                      <div className="text-xs text-slate-500">
                        {formatDateHeure(v.date)} ·{' '}
                        {v.estCredit ? `Payé: ${formatPrix(paye, parametres.devise)}` : v.modePaiement}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {formatPrix(v.total, parametres.devise)}
                      </div>
                      {v.estCredit && reste > 0 ? (
                        <div className="font-mono text-[11px] font-semibold text-orange-600 tabular-nums">
                          Reste : {formatPrix(reste, parametres.devise)}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 tabular-nums">
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
                    className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#16A34A] px-3 text-xs font-semibold text-white hover:bg-[#15803D]"
                    title={`Envoyer le reçu ${v.numeroFacture} par WhatsApp`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => setVenteSelectionnee(v)}
                    className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Voir / Imprimer
                  </button>
                  {peutSupprimerCA && (
                    <button
                      type="button"
                      onClick={() => setCibleSuppression(v)}
                      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
                      aria-label={`Supprimer ${v.numeroFacture}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
              <tr className="bg-[#0D357A] text-xs font-semibold text-white">
                <th className="px-4 py-3">N° Facture</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Paiement</th>
                <th className="px-4 py-3 text-right">Articles</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ventes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    Aucune vente enregistrée pour le moment.
                  </td>
                </tr>
              ) : (
                ventes.map((v) => {
                  const paye = v.estCredit ? Math.min(v.total, v.montantPaye ?? 0) : v.total;
                  const reste = Math.max(0, v.total - paye);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                        <div>{v.numeroFacture}</div>
                        {v.estCredit && (
                          <span
                            className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              reste > 0
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {reste > 0 ? 'Crédit' : 'Crédit soldé'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {formatDateHeure(v.date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{v.clientNom}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {v.estCredit
                          ? reste > 0
                            ? `Crédit (reste ${formatPrix(reste, parametres.devise)})`
                            : 'Crédit soldé'
                          : v.modePaiement}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {v.lignes.reduce((s, l) => s + l.quantite, 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatPrix(v.total, parametres.devise)}
                      </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={getLienWhatsAppRecu(v)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#16A34A] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#15803D]"
                          title={`Envoyer le reçu ${v.numeroFacture} par WhatsApp`}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                        <button
                          type="button"
                          onClick={() => setVenteSelectionnee(v)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Détail
                        </button>
                        {peutSupprimerCA && (
                          <button
                            type="button"
                            onClick={() => setCibleSuppression(v)}
                            className="rounded-lg bg-red-600 p-1.5 text-white hover:bg-red-700"
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
      </div>

      {/* Modale de consultation / impression de facture */}
      {venteSelectionnee && (
        <div className="print-container fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            className={`print-sheet max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6 ${
              formatImpression === 'a4_pro'
                ? 'max-w-3xl'
                : formatImpression === 'a5_compact'
                  ? 'max-w-xl'
                  : 'max-w-md'
            }`}
          >
            <div className="no-print mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Facture {venteSelectionnee.numeroFacture}
              </h3>
              <button
                type="button"
                onClick={() => setVenteSelectionnee(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
              <div className="no-print mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                {infoImpression}
              </div>
            )}

            <div className="no-print mt-5 flex flex-wrap justify-end gap-2">
              <a
                href={getLienWhatsAppRecu(venteSelectionnee)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15803D]"
              >
                <MessageCircle className="h-4 w-4" />
                Envoyer par WhatsApp
              </a>
              <button
                type="button"
                onClick={() => gererPdf(venteSelectionnee)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Télécharger PDF
              </button>
              <button
                type="button"
                onClick={() => gererImpression(venteSelectionnee)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A3072] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </button>
              <button
                type="button"
                onClick={() => setVenteSelectionnee(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
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
        titre={
          cibleSuppression === 'tout'
            ? "Supprimer tout le chiffre d'affaires ?"
            : `Supprimer la facture ${cibleSuppression?.numeroFacture ?? ''} ?`
        }
        description={
          cibleSuppression === 'tout'
            ? "Toutes les ventes enregistrées seront supprimées et le chiffre d'affaires sera remis à 0."
            : 'Cette facture sera retirée de l’historique et du chiffre d’affaires.'
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
