import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  MessageCircle,
  Pencil,
  Phone,
  Printer,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import FactureImprimable, { FormatImpression } from '../components/FactureImprimable';
import ModalSuppressionCA from '../components/ModalSuppressionCA';
import {
  getRaccourcisEcheanceCredit,
  getStatutEcheanceCredit,
  normaliserTelephoneCredit,
} from '../services/credits';
import {
  imprimerOuTelechargerFacture,
  telechargerPdfFacture,
} from '../services/impressionFacture';
import {
  DesignFactureA4,
  ModeLimiteCredit,
  ModePaiement,
  PaiementCredit,
  ParametresBoutique,
  RoleUtilisateur,
  Vente,
} from '../types';
import { formatDateCourte, formatDateHeure, formatPrix, genererId } from '../utils/format';

interface CreditsPageProps {
  ventes: Vente[];
  parametres: ParametresBoutique;
  role: RoleUtilisateur;
  onEnregistrerPaiementCredit: (venteId: string, paiement: PaiementCredit) => void;
  onModifierEcheanceCredit: (venteId: string, nouvelleDate?: string) => void;
  onSupprimerVente: (id: string) => void;
  onSauvegarderParametres?: (parametres: ParametresBoutique) => void;
}

type FiltreStatutCredit = 'tous' | 'en_cours' | 'en_retard' | 'solde';
type VueCredits = 'factures' | 'clients';

interface ResumeClientCredit {
  cle: string;
  nom: string;
  telephone?: string;
  nbFactures: number;
  nbEnRetard: number;
  totalFacture: number;
  totalPaye: number;
  totalReste: number;
  prochaineEcheance?: string;
}

export default function CreditsPage({
  ventes,
  parametres,
  role,
  onEnregistrerPaiementCredit,
  onModifierEcheanceCredit,
  onSupprimerVente,
  onSauvegarderParametres,
}: CreditsPageProps) {
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatutCredit>('en_cours');
  const [vueCredits, setVueCredits] = useState<VueCredits>('factures');
  const [venteAEncaisser, setVenteAEncaisser] = useState<Vente | null>(null);
  const [venteDetail, setVenteDetail] = useState<Vente | null>(null);
  const [venteEcheanceEnEdition, setVenteEcheanceEnEdition] = useState<Vente | null>(null);
  const [dateEcheanceEdit, setDateEcheanceEdit] = useState('');
  const [formatImpression, setFormatImpression] = useState<FormatImpression>('a4_pro');
  const [designA4, setDesignA4] = useState<DesignFactureA4>(
    parametres.designFactureA4 ?? 'classique_bleu'
  );
  const [cibleSuppression, setCibleSuppression] = useState<Vente | null>(null);
  const [modalLimiteOuverte, setModalLimiteOuverte] = useState(false);
  const [limiteInput, setLimiteInput] = useState(String(parametres.limiteCredit ?? 0));
  const [modeLimiteInput, setModeLimiteInput] = useState<ModeLimiteCredit>(
    parametres.modeLimiteCredit ?? 'par_client'
  );

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

  useEffect(() => {
    setLimiteInput(String(parametres.limiteCredit ?? 0));
    setModeLimiteInput(parametres.modeLimiteCredit ?? 'par_client');
  }, [parametres.limiteCredit, parametres.modeLimiteCredit]);

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
    const echeanceTxt =
      reste > 0 && vente.dateEcheanceCredit
        ? ` (échéance prévue le ${formatDateCourte(vente.dateEcheanceCredit)})`
        : '';
    const message =
      reste > 0
        ? `Bonjour ${vente.clientNom}, sauf erreur de notre part, il vous reste un montant de ${formatPrix(reste, parametres.devise)} à payer${echeanceTxt} pour la facture ${vente.numeroFacture} chez ${parametres.nomBoutique}. Merci !`
        : `Bonjour ${vente.clientNom}, merci pour le règlement complet de votre facture ${vente.numeroFacture} chez ${parametres.nomBoutique}.`;
    return chiffres
      ? `https://wa.me/${chiffres}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const getLienWhatsAppClientTotal = (client: ResumeClientCredit) => {
    let chiffres = (client.telephone ?? '').trim().replace(/^00/, '').replace(/\D/g, '');
    if (chiffres.length === 8) {
      chiffres = `223${chiffres}`;
    }
    const echeanceTxt = client.prochaineEcheance
      ? ` (prochaine échéance : ${formatDateCourte(client.prochaineEcheance)})`
      : '';
    const message = `Bonjour ${client.nom}, sauf erreur de notre part, votre solde cumulé à payer chez ${parametres.nomBoutique} est de ${formatPrix(client.totalReste, parametres.devise)} sur ${client.nbFactures} facture(s)${echeanceTxt}. Merci !`;
    return chiffres
      ? `https://wa.me/${chiffres}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const ventesCredit = useMemo(() => ventes.filter((v) => v.estCredit), [ventes]);
  const raccourcisEcheance = useMemo(() => getRaccourcisEcheanceCredit(), []);

  const stats = useMemo(() => {
    let totalDu = 0;
    let totalEncaisse = 0;
    let nbEnCours = 0;
    let nbEnRetard = 0;
    let nbSoldes = 0;

    for (const v of ventesCredit) {
      const paye = Math.min(v.total, v.montantPaye ?? 0);
      const reste = Math.max(0, v.total - paye);
      totalEncaisse += paye;
      totalDu += reste;
      if (reste > 0) {
        nbEnCours += 1;
        if (getStatutEcheanceCredit(v.dateEcheanceCredit, reste)?.type === 'retard') {
          nbEnRetard += 1;
        }
      } else {
        nbSoldes += 1;
      }
    }

    return { totalDu, totalEncaisse, nbEnCours, nbEnRetard, nbSoldes };
  }, [ventesCredit]);

  const creditsFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return ventesCredit.filter((v) => {
      const paye = Math.min(v.total, v.montantPaye ?? 0);
      const reste = Math.max(0, v.total - paye);

      if (filtreStatut === 'en_cours' && reste <= 0) return false;
      if (filtreStatut === 'solde' && reste > 0) return false;
      if (filtreStatut === 'en_retard') {
        if (reste <= 0) return false;
        if (getStatutEcheanceCredit(v.dateEcheanceCredit, reste)?.type !== 'retard') return false;
      }

      if (!terme) return true;
      return (
        v.clientNom.toLowerCase().includes(terme) ||
        (v.clientTelephone ?? '').toLowerCase().includes(terme) ||
        v.numeroFacture.toLowerCase().includes(terme)
      );
    });
  }, [ventesCredit, recherche, filtreStatut]);

  const clientsCumules = useMemo<ResumeClientCredit[]>(() => {
    const map = new Map<string, ResumeClientCredit>();
    const terme = recherche.trim().toLowerCase();

    for (const v of ventesCredit) {
      const paye = Math.min(v.total, v.montantPaye ?? 0);
      const reste = Math.max(0, v.total - paye);
      if (reste <= 0) continue;

      const telNorm = normaliserTelephoneCredit(v.clientTelephone);
      const cle =
        telNorm.length >= 6 ? `tel:${telNorm}` : `nom:${v.clientNom.trim().toLowerCase()}`;
      const enRetard = getStatutEcheanceCredit(v.dateEcheanceCredit, reste)?.type === 'retard';

      const existant = map.get(cle);
      if (!existant) {
        map.set(cle, {
          cle,
          nom: v.clientNom,
          telephone: v.clientTelephone,
          nbFactures: 1,
          nbEnRetard: enRetard ? 1 : 0,
          totalFacture: v.total,
          totalPaye: paye,
          totalReste: reste,
          prochaineEcheance: v.dateEcheanceCredit,
        });
      } else {
        existant.nbFactures += 1;
        existant.nbEnRetard += enRetard ? 1 : 0;
        existant.totalFacture += v.total;
        existant.totalPaye += paye;
        existant.totalReste += reste;
        if (!existant.telephone && v.clientTelephone) {
          existant.telephone = v.clientTelephone;
        }
        if (
          v.dateEcheanceCredit &&
          (!existant.prochaineEcheance || v.dateEcheanceCredit < existant.prochaineEcheance)
        ) {
          existant.prochaineEcheance = v.dateEcheanceCredit;
        }
      }
    }

    return Array.from(map.values())
      .filter((c) => {
        if (filtreStatut === 'en_retard' && c.nbEnRetard === 0) return false;
        if (!terme) return true;
        return (
          c.nom.toLowerCase().includes(terme) ||
          (c.telephone ?? '').toLowerCase().includes(terme)
        );
      })
      .sort((a, b) => b.totalReste - a.totalReste);
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

  const ouvrirEditionEcheance = (v: Vente) => {
    setVenteEcheanceEnEdition(v);
    setDateEcheanceEdit(v.dateEcheanceCredit ?? '');
  };

  const validerEditionEcheance = (e: FormEvent) => {
    e.preventDefault();
    if (!venteEcheanceEnEdition) return;
    const datePropre = dateEcheanceEdit.trim() || undefined;
    onModifierEcheanceCredit(venteEcheanceEnEdition.id, datePropre);
    setMessageSucces(
      datePropre
        ? `Échéance de la facture ${venteEcheanceEnEdition.numeroFacture} mise à jour au ${formatDateCourte(datePropre)}.`
        : `Date d'échéance retirée pour ${venteEcheanceEnEdition.numeroFacture}.`
    );
    setTimeout(() => setMessageSucces(''), 4000);
    setVenteEcheanceEnEdition(null);
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

  const enregistrerLimiteCredit = (e: FormEvent) => {
    e.preventDefault();
    if (!onSauvegarderParametres) return;
    const valeur = Math.max(0, Number(limiteInput) || 0);
    onSauvegarderParametres({
      ...parametres,
      limiteCredit: valeur,
      modeLimiteCredit: modeLimiteInput,
    });
    setModalLimiteOuverte(false);
    const msg =
      valeur > 0
        ? `Limite de crédit fixée à ${formatPrix(valeur, parametres.devise)} (${
            modeLimiteInput === 'globale' ? 'globale boutique' : 'par client'
          }).`
        : 'Limite de crédit désactivée (aucun plafond).';
    setMessageSucces(msg);
    setTimeout(() => setMessageSucces(''), 4000);
  };

  const limiteActive = Math.max(0, parametres.limiteCredit ?? 0);
  const modeLimiteActif: ModeLimiteCredit = parametres.modeLimiteCredit ?? 'par_client';

  // Garde la vue détail synchronisée si un versement vient d'être enregistré
  const venteDetailCourante = venteDetail
    ? ventesCredit.find((v) => v.id === venteDetail.id) ?? venteDetail
    : null;

  return (
    <div className="space-y-3">
      {messageSucces && (
        <div className="no-print flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {messageSucces}
        </div>
      )}

      {/* Cartes récapitulatives compactes */}
      <div className="no-print grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Crédits à recouvrer</span>
            <CreditCard className="h-3.5 w-3.5 shrink-0 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-orange-600 tabular-nums dark:text-orange-400">
            {formatPrix(stats.totalDu, parametres.devise)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
            {stats.nbEnCours} dossier(s) en cours
            {limiteActive > 0 &&
              ` · Plafond ${formatPrix(limiteActive, parametres.devise)} (${
                modeLimiteActif === 'globale' ? 'global' : 'client'
              })`}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Déjà encaissé</span>
            <Wallet className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
            {formatPrix(stats.totalEncaisse, parametres.devise)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
            Acomptes & remboursements
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Clients non soldés</div>
          <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums dark:text-slate-100">
            {stats.nbEnCours}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">En attente de paiement</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Crédits soldés</div>
          <div className="mt-1 font-mono text-lg font-bold text-blue-700 tabular-nums dark:text-blue-400">
            {stats.nbSoldes}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Entièrement remboursés</div>
        </div>
      </div>

      {/* Recherche et filtres compacts */}
      <div className="no-print flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un client, téléphone ou N° facture..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 sm:text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setVueCredits('factures')}
              className={`h-8 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                vueCredits === 'factures'
                  ? 'bg-[#0A3072] text-white shadow-sm dark:bg-blue-700'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              Par facture
            </button>
            <button
              type="button"
              onClick={() => setVueCredits('clients')}
              className={`inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                vueCredits === 'clients'
                  ? 'bg-[#0A3072] text-white shadow-sm dark:bg-blue-700'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Par client ({clientsCumules.length})
            </button>
          </div>

          {vueCredits === 'factures' && (
            <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              {(
                [
                  { id: 'en_cours', label: `En cours (${stats.nbEnCours})` },
                  { id: 'en_retard', label: `En retard (${stats.nbEnRetard})` },
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
                      ? tab.id === 'en_retard'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-white text-[#0A3072] shadow-sm dark:bg-slate-900 dark:text-blue-400'
                      : tab.id === 'en_retard' && stats.nbEnRetard > 0
                        ? 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {peutSupprimer && onSauvegarderParametres && (
            <button
              type="button"
              onClick={() => setModalLimiteOuverte(true)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                limiteActive > 0
                  ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/60'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {limiteActive > 0
                ? `Limite : ${formatPrix(limiteActive, parametres.devise)}`
                : 'Limiter le crédit'}
            </button>
          )}
        </div>
      </div>

      {/* Vue cumulée par client */}
      {vueCredits === 'clients' ? (
        <div className="no-print overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
            {clientsCumules.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Aucun client avec un crédit en cours.
              </p>
            ) : (
              clientsCumules.map((c) => {
                const depasse =
                  limiteActive > 0 && modeLimiteActif === 'par_client' && c.totalReste >= limiteActive;
                return (
                  <div key={c.cle} className="space-y-2 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{c.nom}</span>
                          {c.nbEnRetard > 0 && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                              {c.nbEnRetard} en retard
                            </span>
                          )}
                          {depasse && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                              Plafond atteint
                            </span>
                          )}
                        </div>
                        {c.telephone && (
                          <div className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">{c.telephone}</div>
                        )}
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {c.nbFactures} facture(s) en cours
                          {c.prochaineEcheance
                            ? ` · Prochaine échéance : ${formatDateCourte(c.prochaineEcheance)}`
                            : ''}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Cumul dû</div>
                        <div className="font-mono text-sm font-bold text-orange-600 tabular-nums dark:text-orange-400">
                          {formatPrix(c.totalReste, parametres.devise)}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 tabular-nums dark:text-slate-400">
                          Payé : {formatPrix(c.totalPaye, parametres.devise)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      {c.telephone && (
                        <a
                          href={getLienAppel(c.telephone)}
                          className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <Phone className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                          Appeler
                        </a>
                      )}
                      <a
                        href={getLienWhatsAppClientTotal(c)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-[#16A34A] px-2.5 text-xs font-semibold text-white hover:bg-[#15803D]"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Relance totale
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setRecherche(c.telephone || c.nom);
                          setFiltreStatut('en_cours');
                          setVueCredits('factures');
                        }}
                        className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-[#0A3072] px-2.5 text-xs font-semibold text-white hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Factures
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#0D357A] text-[11px] font-semibold text-white dark:bg-slate-800 dark:text-slate-100">
                  <th className="px-3 py-2.5">Client</th>
                  <th className="px-3 py-2.5 text-center">Factures</th>
                  <th className="px-3 py-2.5">Prochaine échéance</th>
                  <th className="px-3 py-2.5 text-right">Total facturé</th>
                  <th className="px-3 py-2.5 text-right">Déjà payé</th>
                  <th className="px-3 py-2.5 text-right">Cumul restant dû</th>
                  <th className="px-3 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {clientsCumules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      Aucun client avec un crédit en cours.
                    </td>
                  </tr>
                ) : (
                  clientsCumules.map((c) => {
                    const depasse =
                      limiteActive > 0 &&
                      modeLimiteActif === 'par_client' &&
                      c.totalReste >= limiteActive;
                    return (
                      <tr key={c.cle} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{c.nom}</span>
                            {c.nbEnRetard > 0 && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                                {c.nbEnRetard} en retard
                              </span>
                            )}
                            {depasse && (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                                Plafond atteint
                              </span>
                            )}
                          </div>
                          {c.telephone && (
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                {c.telephone}
                              </span>
                              <a
                                href={getLienAppel(c.telephone)}
                                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
                              >
                                <Phone className="h-2.5 w-2.5" />
                                Appeler
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {c.nbFactures}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                          {c.prochaineEcheance ? formatDateCourte(c.prochaineEcheance) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                          {formatPrix(c.totalFacture, parametres.devise)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                          {formatPrix(c.totalPaye, parametres.devise)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-orange-600 tabular-nums dark:text-orange-400">
                          {formatPrix(c.totalReste, parametres.devise)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <a
                              href={getLienWhatsAppClientTotal(c)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 items-center gap-1 rounded-md bg-[#16A34A] px-2.5 text-xs font-semibold text-white hover:bg-[#15803D]"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp total
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setRecherche(c.telephone || c.nom);
                                setFiltreStatut('en_cours');
                                setVueCredits('factures');
                              }}
                              className="inline-flex h-8 items-center gap-1 rounded-md bg-[#0A3072] px-2.5 text-xs font-semibold text-white hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Voir factures
                            </button>
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
      ) : (
      /* Liste des crédits par facture */
      <div className="no-print overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* Vue cartes mobile (< md) */}
        <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
          {creditsFiltres.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Aucune vente à crédit ne correspond à ce filtre.
            </p>
          ) : (
            creditsFiltres.map((v) => {
              const paye = Math.min(v.total, v.montantPaye ?? 0);
              const reste = Math.max(0, v.total - paye);
              const estSolde = reste <= 0;
              const statutEcheance = getStatutEcheanceCredit(v.dateEcheanceCredit, reste);

              return (
                <div key={v.id} className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                          {v.numeroFacture}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            estSolde
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                          }`}
                        >
                          {estSolde ? 'Soldé' : 'En cours'}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">{v.clientNom}</div>
                      {v.clientTelephone && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Phone className="h-3 w-3" />
                          <span>{v.clientTelephone}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{formatDateHeure(v.date)}</div>
                      {!estSolde && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {statutEcheance && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                statutEcheance.type === 'retard'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                  : statutEcheance.type === 'aujourdhui'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              }`}
                            >
                              <Calendar className="h-2.5 w-2.5" />
                              {statutEcheance.label}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => ouvrirEditionEcheance(v)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                            {statutEcheance ? 'Modifier date' : 'Fixer échéance'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Reste à payer</div>
                      <div
                        className={`font-mono text-sm font-bold tabular-nums ${
                          estSolde
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-orange-600 dark:text-orange-400'
                        }`}
                      >
                        {formatPrix(reste, parametres.devise)}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                        Payé : {formatPrix(paye, parametres.devise)} /{' '}
                        {formatPrix(v.total, parametres.devise)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    {v.clientTelephone && (
                      <a
                        href={getLienAppel(v.clientTelephone)}
                        className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <Phone className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                        Appeler
                      </a>
                    )}
                    <a
                      href={getLienWhatsApp(v.clientTelephone, v, reste)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-[#16A34A] px-2.5 text-xs font-semibold text-white hover:bg-[#15803D]"
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
                        className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        Encaisser
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setVenteDetail(v)}
                      className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white hover:bg-blue-700"
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
              <tr className="bg-[#0D357A] text-[11px] font-semibold text-white dark:bg-slate-800 dark:text-slate-100">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {creditsFiltres.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Aucune vente à crédit ne correspond à ce filtre.
                  </td>
                </tr>
              ) : (
                creditsFiltres.map((v) => {
                  const paye = Math.min(v.total, v.montantPaye ?? 0);
                  const reste = Math.max(0, v.total - paye);
                  const estSolde = reste <= 0;
                  const statutEcheance = getStatutEcheanceCredit(v.dateEcheanceCredit, reste);

                  return (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                        {v.numeroFacture}
                      </td>
                      <td className="px-2.5 py-2.5">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{v.clientNom}</div>
                        {v.clientTelephone && (
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {v.clientTelephone}
                            </span>
                            <a
                              href={getLienAppel(v.clientTelephone)}
                              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
                              title={`Appeler ${v.clientNom}`}
                            >
                              <Phone className="h-2.5 w-2.5" />
                              Appeler
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>{formatDateHeure(v.date)}</div>
                        {!estSolde && (
                          <div className="mt-0.5 flex flex-wrap items-center gap-1">
                            {statutEcheance && (
                              <span
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  statutEcheance.type === 'retard'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                    : statutEcheance.type === 'aujourdhui'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                }`}
                              >
                                <Calendar className="h-2.5 w-2.5" />
                                {statutEcheance.label}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => ouvrirEditionEcheance(v)}
                              className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#0A3072] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                              title="Modifier la date d'échéance"
                            >
                              <Pencil className="h-2.5 w-2.5" />
                              {statutEcheance ? 'Date' : 'Échéance'}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                        {formatPrix(v.total, parametres.devise)}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono text-xs font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                        {formatPrix(paye, parametres.devise)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-2.5 py-2.5 text-right font-mono text-xs font-bold tabular-nums ${
                          estSolde
                            ? 'text-slate-400 dark:text-slate-500'
                            : 'text-orange-600 dark:text-orange-400'
                        }`}
                      >
                        {formatPrix(reste, parametres.devise)}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            estSolde
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                          }`}
                        >
                          {estSolde ? 'Soldé' : 'En cours'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={getLienWhatsApp(v.clientTelephone, v, reste)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center gap-1 rounded-md bg-[#16A34A] px-2.5 text-xs font-semibold text-white hover:bg-[#15803D]"
                            title={`Envoyer un rappel WhatsApp à ${v.clientNom}`}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                          {!estSolde && (
                            <button
                              type="button"
                              onClick={() => ouvrirEncaissement(v)}
                              className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              <Wallet className="h-3.5 w-3.5" />
                              Encaisser
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setVenteDetail(v)}
                            className="inline-flex h-8 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Détail
                          </button>
                          {peutSupprimer && (
                            <button
                              type="button"
                              onClick={() => setCibleSuppression(v)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700"
                              title="Supprimer cette facture"
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
      )}

      {/* Modale d'encaissement d'un versement sur crédit */}
      {venteAEncaisser && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4 dark:bg-slate-950/75">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 shadow-xl sm:p-6 dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Encaisser un versement
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {venteAEncaisser.numeroFacture} · {venteAEncaisser.clientNom}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVenteAEncaisser(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const paye = Math.min(venteAEncaisser.total, venteAEncaisser.montantPaye ?? 0);
              const reste = Math.max(0, venteAEncaisser.total - paye);
              return (
                <form onSubmit={validerVersement} className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs dark:bg-slate-800/80">
                    <div>
                      <div className="text-slate-500 dark:text-slate-400">Total</div>
                      <div className="font-mono font-bold text-slate-900 tabular-nums dark:text-slate-100">
                        {formatPrix(venteAEncaisser.total, parametres.devise)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400">Déjà payé</div>
                      <div className="font-mono font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                        {formatPrix(paye, parametres.devise)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400">Reste</div>
                      <div className="font-mono font-bold text-orange-600 tabular-nums dark:text-orange-400">
                        {formatPrix(reste, parametres.devise)}
                      </div>
                    </div>
                  </div>

                  {erreurModal && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                      {erreurModal}
                    </div>
                  )}

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Montant versé ({parametres.devise}) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setMontantVersement(String(reste))}
                        className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
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
                      className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mode de paiement
                    </label>
                    <select
                      value={modePaiement}
                      onChange={(e) => setModePaiement(e.target.value as ModePaiement)}
                      className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="Especes">Espèces</option>
                      <option value="Orange Money">Orange Money</option>
                      <option value="Moov Money">Moov Money</option>
                      <option value="Carte">Carte bancaire</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Note (optionnel)
                    </label>
                    <input
                      type="text"
                      value={noteVersement}
                      onChange={(e) => setNoteVersement(e.target.value)}
                      placeholder="Ex: Deuxième tranche"
                      className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setVenteAEncaisser(null)}
                      className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 sm:text-sm"
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
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Détail crédit · {venteDetailCourante.numeroFacture}
              </h3>
              <button
                type="button"
                onClick={() => setVenteDetail(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
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
                    <div className="no-print mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                      {infoImpression}
                    </div>
                  )}

                  <div className="no-print mt-5 flex flex-wrap justify-end gap-2">
                    {venteDetailCourante.clientTelephone && (
                      <a
                        href={getLienAppel(venteDetailCourante.clientTelephone)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-blue-700 hover:bg-slate-50 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
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
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 text-xs font-semibold text-white hover:bg-[#15803D] sm:text-sm"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                    {reste > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setVenteDetail(null);
                            ouvrirEditionEcheance(venteDetailCourante);
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-700 hover:bg-orange-100 sm:text-sm dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/60"
                        >
                          <Calendar className="h-4 w-4" />
                          Modifier l&apos;échéance
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVenteDetail(null);
                            ouvrirEncaissement(venteDetailCourante);
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 sm:text-sm"
                        >
                          <Wallet className="h-4 w-4" />
                          Encaisser un versement
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => gererPdf(venteDetailCourante)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => gererImpression(venteDetailCourante)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0A3072] px-3 text-xs font-semibold text-white hover:bg-blue-900 sm:text-sm dark:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimer
                    </button>
                    <button
                      type="button"
                      onClick={() => setVenteDetail(null)}
                      className="h-9 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800 sm:text-sm dark:bg-slate-800 dark:hover:bg-slate-700"
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

      {/* Modale de configuration de la limite de crédit */}
      {modalLimiteOuverte && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4 dark:bg-slate-950/75">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 shadow-xl sm:p-6 dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Configurer la limite de crédit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalLimiteOuverte(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={enregistrerLimiteCredit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Plafond maximum autorisé ({parametres.devise})
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={limiteInput}
                  onChange={(e) => setLimiteInput(e.target.value)}
                  placeholder="0 = aucune limite"
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Saisissez 0 pour autoriser des crédits sans plafond.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Type de limite
                </label>
                <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setModeLimiteInput('par_client')}
                    className={`h-8 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                      modeLimiteInput === 'par_client'
                        ? 'bg-white text-[#0A3072] shadow-sm dark:bg-slate-900 dark:text-blue-400'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    Par client
                  </button>
                  <button
                    type="button"
                    onClick={() => setModeLimiteInput('globale')}
                    className={`h-8 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                      modeLimiteInput === 'globale'
                        ? 'bg-white text-[#0A3072] shadow-sm dark:bg-slate-900 dark:text-blue-400'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    Globale boutique
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {modeLimiteInput === 'par_client'
                    ? 'Aucun client ne pourra cumuler plus que ce montant en impayés.'
                    : 'Le total de tous les crédits de la boutique ne pourra pas dépasser ce montant.'}
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalLimiteOuverte(false)}
                  className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-3 text-xs font-semibold text-white hover:bg-orange-700 sm:text-sm"
                >
                  <Save className="h-4 w-4" />
                  Enregistrer la limite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de modification de la date d'échéance après vente */}
      {venteEcheanceEnEdition && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4 dark:bg-slate-950/75">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 shadow-xl sm:p-6 dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Modifier la date d&apos;échéance
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {venteEcheanceEnEdition.numeroFacture} · {venteEcheanceEnEdition.clientNom}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVenteEcheanceEnEdition(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={validerEditionEcheance} className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Raccourcis rapides
                  </label>
                  {dateEcheanceEdit && (
                    <button
                      type="button"
                      onClick={() => setDateEcheanceEdit('')}
                      className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
                    >
                      Effacer la date
                    </button>
                  )}
                </div>
                <div className="mb-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {raccourcisEcheance.map((r) => {
                    const actif = dateEcheanceEdit === r.date;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setDateEcheanceEdit(r.date)}
                        className={`h-8 rounded-md border px-2.5 text-xs font-semibold transition-colors ${
                          actif
                            ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-orange-500/60 dark:hover:bg-orange-950/40'
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="date"
                  value={dateEcheanceEdit}
                  onChange={(e) => setDateEcheanceEdit(e.target.value)}
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setVenteEcheanceEnEdition(null)}
                  className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0A3072] px-3 text-xs font-semibold text-white hover:bg-blue-900 sm:text-sm dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <Save className="h-4 w-4" />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ModalSuppressionCA
        ouvert={cibleSuppression !== null}
        role={role}
        codeMaitreAdmin={parametres.codeMaitreAdmin}
        titre={`Supprimer le crédit ${cibleSuppression?.numeroFacture ?? ''} ?`}
        description="Cette facture à crédit sera retirée de la liste des crédits et de l'historique, et les articles vendus seront automatiquement remis en stock."
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
