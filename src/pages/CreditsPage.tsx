import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  MessageCircle,
  Phone,
  Printer,
  Search,
  Trash2,
  Wallet,
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
  PaiementCredit,
  ParametresBoutique,
  RoleUtilisateur,
  Vente,
} from '../types';
import { formatDateHeure, formatPrix, genererId } from '../utils/format';

interface CreditsPageProps {
  ventes: Vente[];
  parametres: ParametresBoutique;
  role: RoleUtilisateur;
  onEnregistrerPaiementCredit: (venteId: string, paiement: PaiementCredit) => void;
  onSupprimerVente: (id: string) => void;
}

type FiltreStatutCredit = 'tous' | 'en_cours' | 'solde';

export default function CreditsPage({
  ventes,
  parametres,
  role,
  onEnregistrerPaiementCredit,
  onSupprimerVente,
}: CreditsPageProps) {
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatutCredit>('en_cours');
  const [venteAEncaisser, setVenteAEncaisser] = useState<Vente | null>(null);
  const [venteDetail, setVenteDetail] = useState<Vente | null>(null);
  const [formatImpression, setFormatImpression] = useState<FormatImpression>('a4_pro');
  const [designA4, setDesignA4] = useState<DesignFactureA4>(
    parametres.designFactureA4 ?? 'classique_bleu'
  );
  const [cibleSuppression, setCibleSuppression] = useState<Vente | null>(null);

  // Formulaire de règlement de crédit
  const [montantVersement, setMontantVersement] = useState('');
  const [modePaiement, setModePaiement] = useState<ModePaiement>('Especes');
  const [noteVersement, setNoteVersement] = useState('');
  const [erreurModal, setErreurModal] = useState('');
  const [messageSucces, setMessageSucces] = useState('');
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

  const peutSupprimer = role === 'super_admin' || role === 'admin';

  const getLienAppel = (telephone: string) => {
    const propre = telephone.trim().replace(/^00/, '+').replace(/[^\d+]/g, '');
    return `tel:${propre}`;
  };

  const getLienWhatsApp = (telephone: string | undefined, vente: Vente, reste: number) => {
    let chiffres = (telephone ?? '').trim().replace(/^00/, '').replace(/\D/g, '');
    // Ajoute automatiquement l'indicatif Mali (+223) si un numéro local à 8 chiffres est saisi
    if (chiffres.length === 8) {
      chiffres = `223${chiffres}`;
    }
    const message =
      reste > 0
        ? `Bonjour ${vente.clientNom}, sauf erreur de notre part, il vous reste un montant de ${formatPrix(reste, parametres.devise)} à payer pour la facture ${vente.numeroFacture} chez ${parametres.nomBoutique}. Merci !`
        : `Bonjour ${vente.clientNom}, merci pour le règlement complet de votre facture ${vente.numeroFacture} chez ${parametres.nomBoutique}.`;
    return chiffres
      ? `https://wa.me/${chiffres}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const ventesCredit = useMemo(() => ventes.filter((v) => v.estCredit), [ventes]);

  const stats = useMemo(() => {
    let totalDu = 0;
    let totalEncaisse = 0;
    let nbEnCours = 0;
    let nbSoldes = 0;

    for (const v of ventesCredit) {
      const paye = Math.min(v.total, v.montantPaye ?? 0);
      const reste = Math.max(0, v.total - paye);
      totalEncaisse += paye;
      totalDu += reste;
      if (reste > 0) {
        nbEnCours += 1;
      } else {
        nbSoldes += 1;
      }
    }

    return { totalDu, totalEncaisse, nbEnCours, nbSoldes };
  }, [ventesCredit]);

  const creditsFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return ventesCredit.filter((v) => {
      const paye = Math.min(v.total, v.montantPaye ?? 0);
      const reste = Math.max(0, v.total - paye);

      if (filtreStatut === 'en_cours' && reste <= 0) return false;
      if (filtreStatut === 'solde' && reste > 0) return false;

      if (!terme) return true;
      return (
        v.clientNom.toLowerCase().includes(terme) ||
        (v.clientTelephone ?? '').toLowerCase().includes(terme) ||
        v.numeroFacture.toLowerCase().includes(terme)
      );
    });
  }, [ventesCredit, recherche, filtreStatut]);

  const ouvrirEncaissement = (v: Vente) => {
    const paye = Math.min(v.total, v.montantPaye ?? 0);
    const reste = Math.max(0, v.total - paye);
    setVenteAEncaisser(v);
    setMontantVersement(String(reste));
    setModePaiement('Especes');
    setNoteVersement('');
    setErreurModal('');
  };

  const validerVersement = (e: FormEvent) => {
    e.preventDefault();
    if (!venteAEncaisser) return;

    const paye = Math.min(venteAEncaisser.total, venteAEncaisser.montantPaye ?? 0);
    const reste = Math.max(0, venteAEncaisser.total - paye);
    const montant = Number(montantVersement);

    if (!Number.isFinite(montant) || montant <= 0) {
      setErreurModal('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }

    if (montant > reste) {
      setErreurModal(
        `Le montant ne peut pas dépasser le reste à payer (${formatPrix(reste, parametres.devise)}).`
      );
      return;
    }

    const paiement: PaiementCredit = {
      id: genererId('pay'),
      date: new Date().toISOString(),
      montant,
      modePaiement,
      note: noteVersement.trim() || undefined,
    };

    onEnregistrerPaiementCredit(venteAEncaisser.id, paiement);
    setMessageSucces(
      `Versement de ${formatPrix(montant, parametres.devise)} enregistré pour ${venteAEncaisser.clientNom}.`
    );
    setTimeout(() => setMessageSucces(''), 4000);
    setVenteAEncaisser(null);
  };

  // Garde la vue détail synchronisée si un versement vient d'être enregistré
  const venteDetailCourante = venteDetail
    ? ventesCredit.find((v) => v.id === venteDetail.id) ?? venteDetail
    : null;

  return (
    <div className="space-y-3">
      {messageSucces && (
        <div className="no-print flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {messageSucces}
        </div>
      )}

      {/* Cartes récapitulatives compactes */}
      <div className="no-print grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-medium text-slate-500">Crédits à recouvrer</span>
            <CreditCard className="h-3.5 w-3.5 shrink-0 text-orange-600" />
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-orange-600 tabular-nums">
            {formatPrix(stats.totalDu, parametres.devise)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
            {stats.nbEnCours} dossier(s) en cours
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-medium text-slate-500">Déjà encaissé</span>
            <Wallet className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
            {formatPrix(stats.totalEncaisse, parametres.devise)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
            Acomptes & remboursements
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
          <div className="text-[11px] font-medium text-slate-500">Clients non soldés</div>
          <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
            {stats.nbEnCours}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">En attente de paiement</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
          <div className="text-[11px] font-medium text-slate-500">Crédits soldés</div>
          <div className="mt-1 font-mono text-lg font-bold text-blue-700 tabular-nums">
            {stats.nbSoldes}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">Entièrement remboursés</div>
        </div>
      </div>

      {/* Recherche et filtres compacts */}
      <div className="no-print flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un client, téléphone ou N° facture..."
            className="h-9 w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-xs sm:text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
          {(
            [
              { id: 'en_cours', label: `En cours (${stats.nbEnCours})` },
              { id: 'solde', label: `Soldés (${stats.nbSoldes})` },
              { id: 'tous', label: `Tous (${ventesCredit.length})` },
            ] as { id: FiltreStatutCredit; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFiltreStatut(tab.id)}
              className={`h-8 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                filtreStatut === tab.id
                  ? 'bg-white text-[#0A3072] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des crédits */}
      <div className="no-print overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Vue cartes mobile (< md) */}
        <div className="divide-y divide-slate-100 md:hidden">
          {creditsFiltres.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              Aucune vente à crédit ne correspond à ce filtre.
            </p>
          ) : (
            creditsFiltres.map((v) => {
              const paye = Math.min(v.total, v.montantPaye ?? 0);
              const reste = Math.max(0, v.total - paye);
              const estSolde = reste <= 0;

              return (
                <div key={v.id} className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700">
                          {v.numeroFacture}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            estSolde
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {estSolde ? 'Soldé' : 'En cours'}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-slate-900">{v.clientNom}</div>
                      {v.clientTelephone && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Phone className="h-3 w-3" />
                          <span>{v.clientTelephone}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500">{formatDateHeure(v.date)}</div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[11px] text-slate-500">Reste à payer</div>
                      <div
                        className={`font-mono text-sm font-bold tabular-nums ${
                          estSolde ? 'text-emerald-700' : 'text-orange-600'
                        }`}
                      >
                        {formatPrix(reste, parametres.devise)}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                        Payé : {formatPrix(paye, parametres.devise)} /{' '}
                        {formatPrix(v.total, parametres.devise)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    {v.clientTelephone && (
                      <a
                        href={getLienAppel(v.clientTelephone)}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Phone className="h-3.5 w-3.5 text-blue-700" />
                        Appeler
                      </a>
                    )}
                    <a
                      href={getLienWhatsApp(v.clientTelephone, v, reste)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#16A34A] px-2.5 text-xs font-semibold text-white hover:bg-[#15803D]"
                      title={`Envoyer un rappel WhatsApp à ${v.clientNom}`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  </div>

                  <div className="flex gap-1.5">
                    {!estSolde && (
                      <button
                        type="button"
                        onClick={() => ouvrirEncaissement(v)}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        Encaisser
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setVenteDetail(v)}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Détail
                    </button>
                    {peutSupprimer && (
                      <button
                        type="button"
                        onClick={() => setCibleSuppression(v)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700"
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

        {/* Vue tableau desktop (>= md) */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#0D357A] text-[11px] font-semibold text-white">
                <th className="whitespace-nowrap px-3 py-2.5">N° Facture</th>
                <th className="px-2.5 py-2.5">Client</th>
                <th className="whitespace-nowrap px-2.5 py-2.5">Date</th>
                <th className="whitespace-nowrap px-2.5 py-2.5 text-right">Total</th>
                <th className="whitespace-nowrap px-2.5 py-2.5 text-right">Déjà payé</th>
                <th className="whitespace-nowrap px-2.5 py-2.5 text-right">Reste à payer</th>
                <th className="whitespace-nowrap px-2.5 py-2.5 text-center">Statut</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {creditsFiltres.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    Aucune vente à crédit ne correspond à ce filtre.
                  </td>
                </tr>
              ) : (
                creditsFiltres.map((v) => {
                  const paye = Math.min(v.total, v.montantPaye ?? 0);
                  const reste = Math.max(0, v.total - paye);
                  const estSolde = reste <= 0;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-semibold text-blue-700">
                        {v.numeroFacture}
                      </td>
                      <td className="px-2.5 py-2.5">
                        <div className="text-xs font-semibold text-slate-900">{v.clientNom}</div>
                        {v.clientTelephone && (
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-slate-600">
                              {v.clientTelephone}
                            </span>
                            <a
                              href={getLienAppel(v.clientTelephone)}
                              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-slate-50"
                              title={`Appeler ${v.clientNom}`}
                            >
                              <Phone className="h-2.5 w-2.5" />
                              Appeler
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 text-[11px] text-slate-600">
                        {formatDateHeure(v.date)}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatPrix(v.total, parametres.devise)}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                        {formatPrix(paye, parametres.devise)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-2.5 py-2.5 text-right font-mono text-xs font-bold tabular-nums ${
                          estSolde ? 'text-slate-400' : 'text-orange-600'
                        }`}
                      >
                        {formatPrix(reste, parametres.devise)}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            estSolde
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {estSolde ? 'Soldé' : 'En cours'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <a
                            href={getLienWhatsApp(v.clientTelephone, v, reste)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-7 items-center gap-1 rounded-md bg-[#16A34A] px-2 text-[11px] font-semibold text-white hover:bg-[#15803D]"
                            title={`Envoyer un rappel WhatsApp à ${v.clientNom}`}
                          >
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp
                          </a>
                          {!estSolde && (
                            <button
                              type="button"
                              onClick={() => ouvrirEncaissement(v)}
                              className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2 text-[11px] font-semibold text-white hover:bg-emerald-700"
                            >
                              <Wallet className="h-3 w-3" />
                              Encaisser
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setVenteDetail(v)}
                            className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2 text-[11px] font-semibold text-white hover:bg-blue-700"
                          >
                            <Eye className="h-3 w-3" />
                            Détail
                          </button>
                          {peutSupprimer && (
                            <button
                              type="button"
                              onClick={() => setCibleSuppression(v)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700"
                              title="Supprimer cette facture"
                              aria-label={`Supprimer ${v.numeroFacture}`}
                            >
                              <Trash2 className="h-3 w-3" />
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

      {/* Modale d'encaissement d'un versement sur crédit */}
      {venteAEncaisser && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Encaisser un versement
                </h3>
                <p className="text-xs text-slate-500">
                  {venteAEncaisser.numeroFacture} · {venteAEncaisser.clientNom}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVenteAEncaisser(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const paye = Math.min(venteAEncaisser.total, venteAEncaisser.montantPaye ?? 0);
              const reste = Math.max(0, venteAEncaisser.total - paye);
              return (
                <form onSubmit={validerVersement} className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
                    <div>
                      <div className="text-slate-500">Total</div>
                      <div className="font-mono font-bold text-slate-900 tabular-nums">
                        {formatPrix(venteAEncaisser.total, parametres.devise)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Déjà payé</div>
                      <div className="font-mono font-bold text-emerald-700 tabular-nums">
                        {formatPrix(paye, parametres.devise)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Reste</div>
                      <div className="font-mono font-bold text-orange-600 tabular-nums">
                        {formatPrix(reste, parametres.devise)}
                      </div>
                    </div>
                  </div>

                  {erreurModal && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                      {erreurModal}
                    </div>
                  )}

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">
                        Montant versé ({parametres.devise}) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setMontantVersement(String(reste))}
                        className="text-xs font-semibold text-blue-700 hover:underline"
                      >
                        Tout solder ({formatPrix(reste, parametres.devise)})
                      </button>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={reste}
                      required
                      value={montantVersement}
                      onChange={(e) => setMontantVersement(e.target.value)}
                      className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm font-semibold focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Mode de paiement
                    </label>
                    <select
                      value={modePaiement}
                      onChange={(e) => setModePaiement(e.target.value as ModePaiement)}
                      className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                    >
                      <option value="Especes">Espèces</option>
                      <option value="Orange Money">Orange Money</option>
                      <option value="Moov Money">Moov Money</option>
                      <option value="Carte">Carte bancaire</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Note (optionnel)
                    </label>
                    <input
                      type="text"
                      value={noteVersement}
                      onChange={(e) => setNoteVersement(e.target.value)}
                      placeholder="Ex: Deuxième tranche"
                      className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setVenteAEncaisser(null)}
                      className="min-h-[44px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Valider le paiement
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modale de détail et impression d'un crédit */}
      {venteDetailCourante && (
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
              <h3 className="text-lg font-bold text-slate-900">
                Détail crédit · {venteDetailCourante.numeroFacture}
              </h3>
              <button
                type="button"
                onClick={() => setVenteDetail(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const paye = Math.min(
                venteDetailCourante.total,
                venteDetailCourante.montantPaye ?? 0
              );
              const reste = Math.max(0, venteDetailCourante.total - paye);

              return (
                <>
                  <FactureImprimable
                    vente={venteDetailCourante}
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
                    {venteDetailCourante.clientTelephone && (
                      <a
                        href={getLienAppel(venteDetailCourante.clientTelephone)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-slate-50"
                      >
                        <Phone className="h-4 w-4" />
                        Appeler
                      </a>
                    )}
                    <a
                      href={getLienWhatsApp(
                        venteDetailCourante.clientTelephone,
                        venteDetailCourante,
                        reste
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#15803D]"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                    {reste > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setVenteDetail(null);
                          ouvrirEncaissement(venteDetailCourante);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <Wallet className="h-4 w-4" />
                        Encaisser un versement
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => gererPdf(venteDetailCourante)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => gererImpression(venteDetailCourante)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A3072] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimer
                    </button>
                    <button
                      type="button"
                      onClick={() => setVenteDetail(null)}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Fermer
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <ModalSuppressionCA
        ouvert={cibleSuppression !== null}
        role={role}
        titre={`Supprimer le crédit ${cibleSuppression?.numeroFacture ?? ''} ?`}
        description="Cette facture à crédit sera retirée de la liste des crédits et de l'historique."
        onFermer={() => setCibleSuppression(null)}
        onConfirmer={() => {
          if (cibleSuppression) {
            onSupprimerVente(cibleSuppression.id);
          }
        }}
      />
    </div>
  );
}
