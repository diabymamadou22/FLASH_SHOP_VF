import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Download,
  Minus,
  Percent,
  Plus,
  Printer,
  Receipt,
  Search,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import FactureImprimable, { FormatImpression } from '../components/FactureImprimable';
import { useToast } from '../context/ToastContext';
import {
  evaluerLimiteCredit,
  getRaccourcisEcheanceCredit,
  obtenirDateLocaleYMD,
} from '../services/credits';
import {
  imprimerOuTelechargerFacture,
  telechargerPdfFacture,
} from '../services/impressionFacture';
import {
  DesignFactureA4,
  LigneVente,
  ModePaiement,
  ParametresBoutique,
  Produit,
  Vente,
} from '../types';
import { formatDateCourte, formatPrix, genererId } from '../utils/format';

interface VentesCaissePageProps {
  produits: Produit[];
  ventes: Vente[];
  parametres: ParametresBoutique;
  nombreVentesExistantes: number;
  vendeurNom?: string;
  onValiderVente: (vente: Vente) => void;
}

interface ClientConnu {
  nom: string;
  telephone?: string;
}

export default function VentesCaissePage({
  produits,
  ventes,
  parametres,
  nombreVentesExistantes,
  vendeurNom,
  onValiderVente,
}: VentesCaissePageProps) {
  const toast = useToast();
  const [recherche, setRecherche] = useState('');
  const [panier, setPanier] = useState<LigneVente[]>([]);
  const [panierOuvert, setPanierOuvert] = useState(false);
  const [clientNom, setClientNom] = useState('');
  const [clientTelephone, setClientTelephone] = useState('');
  const [suggestionsOuvertes, setSuggestionsOuvertes] = useState(false);
  const [modeRemise, setModeRemise] = useState<'montant' | 'pourcent'>('montant');
  const [remiseInput, setRemiseInput] = useState('0');
  const [estCredit, setEstCredit] = useState(false);
  const [acompteInput, setAcompteInput] = useState('0');
  const [dateEcheanceCredit, setDateEcheanceCredit] = useState('');
  const [modePaiement, setModePaiement] = useState<ModePaiement>('Especes');
  const [derniereVente, setDerniereVente] = useState<Vente | null>(null);
  const [formatImpression, setFormatImpression] = useState<FormatImpression>('ticket_80');
  const [designA4, setDesignA4] = useState<DesignFactureA4>(
    parametres.designFactureA4 ?? 'classique_bleu'
  );
  const [apercuOuvert, setApercuOuvert] = useState(false);
  const [erreur, setErreur] = useState('');
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

  const produitsDisponibles = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return produits.filter(
      (p) =>
        !terme ||
        p.nom.toLowerCase().includes(terme) ||
        p.reference.toLowerCase().includes(terme) ||
        p.codeBarre.toLowerCase().includes(terme)
    );
  }, [produits, recherche]);

  const clientsConnus = useMemo<ClientConnu[]>(() => {
    const vus = new Map<string, ClientConnu>();
    for (const v of ventes) {
      const nom = v.clientNom.trim();
      const tel = v.clientTelephone?.trim();
      if (!nom || (nom.toLowerCase() === 'client comptoir' && !tel)) continue;
      const chiffres = (tel ?? '').replace(/^00/, '').replace(/\D/g, '');
      const cle = chiffres.length >= 6 ? `tel:${chiffres}` : `nom:${nom.toLowerCase()}`;
      const existant = vus.get(cle);
      if (!existant) {
        vus.set(cle, { nom, telephone: tel });
      } else if (!existant.telephone && tel) {
        vus.set(cle, { nom: existant.nom, telephone: tel });
      }
    }
    return Array.from(vus.values());
  }, [ventes]);

  const suggestionsClients = useMemo(() => {
    const terme = clientNom.trim().toLowerCase();
    const liste = terme
      ? clientsConnus.filter(
          (c) =>
            c.nom.toLowerCase().includes(terme) ||
            (c.telephone ?? '').toLowerCase().includes(terme)
        )
      : clientsConnus;
    return liste.slice(0, 6);
  }, [clientsConnus, clientNom]);

  const totalPanierBrut = useMemo(
    () => panier.reduce((acc, ligne) => acc + ligne.sousTotal, 0),
    [panier]
  );

  const remiseSaisie = Math.max(0, Number(remiseInput) || 0);
  const montantRemise = useMemo(() => {
    if (totalPanierBrut <= 0 || remiseSaisie <= 0) return 0;
    if (modeRemise === 'pourcent') {
      const pct = Math.min(100, remiseSaisie);
      return Math.min(totalPanierBrut, Math.round((totalPanierBrut * pct) / 100));
    }
    return Math.min(totalPanierBrut, Math.round(remiseSaisie));
  }, [totalPanierBrut, modeRemise, remiseSaisie]);

  const totalPanier = Math.max(0, totalPanierBrut - montantRemise);

  const quantiteDansPanier = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of panier) {
      map.set(l.produitId, l.quantite);
    }
    return map;
  }, [panier]);

  const ajouterAuPanier = (produit: Produit) => {
    setErreur('');
    if (produit.stock <= 0) {
      const msg = `Le produit "${produit.nom}" est en rupture de stock.`;
      setErreur(msg);
      toast.erreur('Rupture de stock', msg);
      return;
    }

    const existantActuel = panier.find((l) => l.produitId === produit.id);
    if (existantActuel && existantActuel.quantite >= produit.stock) {
      const msg = `Stock maximum atteint pour "${produit.nom}" (${produit.stock} disponibles).`;
      setErreur(msg);
      toast.attention('Stock maximum atteint', msg);
      return;
    }

    setPanier((precedent) => {
      const existant = precedent.find((l) => l.produitId === produit.id);
      if (existant) {
        if (existant.quantite >= produit.stock) {
          return precedent;
        }
        return precedent.map((l) =>
          l.produitId === produit.id
            ? {
                ...l,
                quantite: l.quantite + 1,
                sousTotal: (l.quantite + 1) * l.prixUnitaire,
              }
            : l
        );
      }

      return [
        ...precedent,
        {
          produitId: produit.id,
          reference: produit.reference,
          nomProduit: produit.nom,
          quantite: 1,
          prixAchatUnitaire: produit.prixAchat,
          prixUnitaire: produit.prixVente,
          sousTotal: produit.prixVente,
        },
      ];
    });
  };

  const modifierQuantite = (produitId: string, delta: number) => {
    setErreur('');
    const produit = produits.find((p) => p.id === produitId);
    const stockMax = produit?.stock ?? 0;
    const ligneActuelle = panier.find((l) => l.produitId === produitId);

    if (ligneActuelle && ligneActuelle.quantite + delta > stockMax) {
      const msg = `Quantité demandée supérieure au stock disponible (${stockMax}).`;
      setErreur(msg);
      toast.attention('Stock insuffisant', msg);
      return;
    }

    setPanier((precedent) =>
      precedent
        .map((ligne) => {
          if (ligne.produitId !== produitId) return ligne;
          const nouvelleQte = ligne.quantite + delta;
          if (nouvelleQte <= 0) return null;
          if (nouvelleQte > stockMax) {
            return ligne;
          }
          return {
            ...ligne,
            quantite: nouvelleQte,
            sousTotal: nouvelleQte * ligne.prixUnitaire,
          };
        })
        .filter((l): l is LigneVente => l !== null)
    );
  };

  const retirerDuPanier = (produitId: string) => {
    setPanier((precedent) => precedent.filter((l) => l.produitId !== produitId));
  };

  const acompteNumerique = Math.max(0, Number(acompteInput) || 0);
  const resteCredit = Math.max(0, totalPanier - acompteNumerique);

  const raccourcisEcheance = useMemo(() => getRaccourcisEcheanceCredit(), []);
  const dateMinEcheance = useMemo(() => obtenirDateLocaleYMD(), []);

  const etatLimiteCredit = useMemo(
    () =>
      evaluerLimiteCredit({
        ventes,
        parametres,
        clientNom,
        clientTelephone,
        nouveauCredit: resteCredit,
      }),
    [ventes, parametres, clientNom, clientTelephone, resteCredit]
  );

  const acompteMinimumPourLimite =
    etatLimiteCredit.active && etatLimiteCredit.disponible < totalPanier
      ? Math.max(0, totalPanier - etatLimiteCredit.disponible)
      : 0;

  const selectionnerClientConnu = (client: ClientConnu) => {
    setClientNom(client.nom);
    if (client.telephone) {
      setClientTelephone(client.telephone);
    }
    setSuggestionsOuvertes(false);
    setErreur('');
  };

  const encaisserVente = () => {
    const signaleErreur = (msg: string) => {
      setErreur(msg);
    };

    if (panier.length === 0) {
      signaleErreur('Ajoutez au moins un produit au panier avant de valider.');
      return;
    }

    if (estCredit && totalPanier <= 0) {
      signaleErreur('Une vente à crédit doit avoir un montant net supérieur à 0.');
      return;
    }

    const nomPropre = clientNom.trim();
    const telephonePropre = clientTelephone.trim();
    if (estCredit && !nomPropre) {
      signaleErreur('Veuillez saisir le nom du client pour enregistrer une vente à crédit.');
      return;
    }

    if (estCredit && telephonePropre.replace(/\D/g, '').length < 6) {
      signaleErreur(
        'Veuillez saisir le numéro de téléphone du client pour pouvoir le rappeler ou le contacter sur WhatsApp.'
      );
      return;
    }

    if (estCredit && acompteNumerique >= totalPanier) {
      signaleErreur(
        "L'acompte doit être inférieur au total pour une vente à crédit (sinon choisissez Paiement complet)."
      );
      return;
    }

    if (estCredit && etatLimiteCredit.active && etatLimiteCredit.depassee) {
      const libelleMode =
        etatLimiteCredit.mode === 'globale' ? 'de la boutique' : 'de ce client';
      signaleErreur(
        `Limite de crédit dépassée ! Plafond ${libelleMode} : ${formatPrix(
          etatLimiteCredit.limite,
          parametres.devise
        )} · Crédit encore disponible : ${formatPrix(
          etatLimiteCredit.disponible,
          parametres.devise
        )}.`
      );
      return;
    }

    const maintenant = new Date().toISOString();
    const numero = String(nombreVentesExistantes + 1).padStart(3, '0');
    const nouvelleVente: Vente = {
      id: genererId('v'),
      numeroFacture: `FAC-2026-${numero}`,
      date: maintenant,
      clientNom: nomPropre || 'Client comptoir',
      clientTelephone: telephonePropre || undefined,
      modePaiement,
      lignes: panier,
      sousTotalBrut: montantRemise > 0 ? totalPanierBrut : undefined,
      remise: montantRemise > 0 ? montantRemise : undefined,
      total: totalPanier,
      vendeur: vendeurNom?.trim() || undefined,
      estCredit,
      montantPaye: estCredit ? acompteNumerique : totalPanier,
      dateEcheanceCredit: estCredit && dateEcheanceCredit ? dateEcheanceCredit : undefined,
      paiementsCredit: estCredit
        ? acompteNumerique > 0
          ? [
              {
                id: genererId('pay'),
                date: maintenant,
                montant: acompteNumerique,
                modePaiement,
                note: 'Acompte initial',
              },
            ]
          : []
        : undefined,
    };

    onValiderVente(nouvelleVente);
    setDerniereVente(nouvelleVente);
    setPanier([]);
    setClientNom('');
    setClientTelephone('');
    setSuggestionsOuvertes(false);
    setModeRemise('montant');
    setRemiseInput('0');
    setEstCredit(false);
    setAcompteInput('0');
    setDateEcheanceCredit('');
    setErreur('');
    setPanierOuvert(false);
    setApercuOuvert(true);
  };

  const nbArticlesPanier = panier.reduce((s, l) => s + l.quantite, 0);

  return (
    <div className="space-y-4">
      {/* Barre supérieure : recherche pleine largeur + bouton Panier + Dernier reçu */}
      <section className="no-print rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:sticky sm:top-[calc(4rem+env(safe-area-inset-top,0px))] sm:z-10 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Chercher un article (nom, référence, code-barres)..."
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {derniereVente && (
              <button
                type="button"
                onClick={() => setApercuOuvert(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
              >
                <Receipt className="h-4 w-4" />
                Reçu {derniereVente.numeroFacture}
              </button>
            )}

            <button
              type="button"
              onClick={() => setPanierOuvert(true)}
              className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-white shadow-sm transition-colors sm:flex-none sm:text-sm ${
                nbArticlesPanier > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-[#0A3072] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Panier ({nbArticlesPanier})</span>
              {nbArticlesPanier > 0 && (
                <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
                  {formatPrix(totalPanier, parametres.devise)}
                </span>
              )}
            </button>
          </div>
        </div>

        {erreur && !panierOuvert && (
          <div className="mt-2.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {erreur}
          </div>
        )}
      </section>

      {/* Grille des produits en pleine largeur */}
      <section className="no-print">
        {produitsDisponibles.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Aucun produit ne correspond à votre recherche.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {produitsDisponibles.map((p) => {
              const qtePanier = quantiteDansPanier.get(p.id) ?? 0;
              return (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold">{p.reference}</span>
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          p.stock === 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        Stock: {p.stock}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">{p.nom}</h3>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <span className="font-mono text-sm font-bold text-blue-700 tabular-nums dark:text-blue-400">
                      {formatPrix(p.prixVente, parametres.devise)}
                    </span>
                    <button
                      type="button"
                      disabled={p.stock <= 0}
                      onClick={() => ajouterAuPanier(p)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter
                      {qtePanier > 0 && (
                        <span className="rounded-full bg-white/25 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums">
                          {qtePanier}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tiroir / Modale du Panier ouvert par le bouton */}
      {panierOuvert && (
        <div
          className="no-print fixed inset-0 z-50 flex justify-end bg-slate-900/50 dark:bg-slate-950/75"
          onClick={() => setPanierOuvert(false)}
        >
          <aside
            className="flex h-dvh max-h-full w-full max-w-md flex-col bg-white shadow-2xl dark:border-l dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-safe flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#0A3072] dark:text-blue-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Panier en cours ({nbArticlesPanier})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPanierOuvert(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Fermer le panier"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
              {erreur && (
                <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {erreur}
                </div>
              )}

              {panier.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  Sélectionnez des produits pour démarrer une vente.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {panier.map((ligne) => (
                    <div
                      key={ligne.produitId}
                      className="flex items-center justify-between gap-2 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {ligne.nomProduit}
                        </div>
                        <div className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                          {formatPrix(ligne.prixUnitaire, parametres.devise)} × {ligne.quantite}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => modifierQuantite(ligne.produitId, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          aria-label="Diminuer la quantité"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center font-mono text-xs font-bold text-slate-900 tabular-nums dark:text-slate-100">
                          {ligne.quantite}
                        </span>
                        <button
                          type="button"
                          onClick={() => modifierQuantite(ligne.produitId, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          aria-label="Augmenter la quantité"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => retirerDuPanier(ligne.produitId)}
                          className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          aria-label="Retirer du panier"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Type de règlement
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setEstCredit(false);
                        setErreur('');
                      }}
                      className={`h-8 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                        !estCredit
                          ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-400'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      Paiement complet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEstCredit(true);
                        setErreur('');
                      }}
                      className={`h-8 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                        estCredit
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      Vente à crédit
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {estCredit ? 'Nom du client *' : 'Nom du client (optionnel)'}
                  </label>
                  <input
                    type="text"
                    value={clientNom}
                    onFocus={() => setSuggestionsOuvertes(true)}
                    onBlur={() => setTimeout(() => setSuggestionsOuvertes(false), 150)}
                    onChange={(e) => {
                      setClientNom(e.target.value);
                      setSuggestionsOuvertes(true);
                    }}
                    placeholder={
                      estCredit
                        ? 'Nom obligatoire pour un crédit'
                        : 'Laisser vide = Client comptoir'
                    }
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />

                  {suggestionsOuvertes && suggestionsClients.length > 0 && (
                    <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-800">
                      <div className="mb-1 flex items-center gap-1 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <UserCheck className="h-3 w-3 text-[#0A3072] dark:text-blue-400" />
                        Clients enregistrés (sélection rapide)
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {suggestionsClients.map((c, idx) => (
                          <button
                            key={`${c.nom}-${c.telephone ?? idx}`}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectionnerClientConnu(c);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-[#0A3072] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-600 dark:hover:bg-blue-950/50 dark:hover:text-blue-300"
                          >
                            <span className="font-semibold">{c.nom}</span>
                            {c.telephone && (
                              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                ({c.telephone})
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {estCredit ? 'Téléphone du client *' : 'Téléphone du client (optionnel)'}
                  </label>
                  <input
                    type="tel"
                    required={estCredit}
                    value={clientTelephone}
                    onChange={(e) => setClientTelephone(e.target.value)}
                    placeholder="Ex: +223 76 12 34 56 (appel / WhatsApp)"
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Remise / Réduction sur la facture */}
                {panier.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <Percent className="h-3.5 w-3.5 text-[#0A3072] dark:text-blue-400" />
                        Remise / Réduction
                      </label>
                      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() => {
                            setModeRemise('montant');
                            setRemiseInput('0');
                          }}
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            modeRemise === 'montant'
                              ? 'bg-[#0A3072] text-white dark:bg-blue-700'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                          }`}
                        >
                          {parametres.devise}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModeRemise('pourcent');
                            setRemiseInput('0');
                          }}
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            modeRemise === 'pourcent'
                              ? 'bg-[#0A3072] text-white dark:bg-blue-700'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                          }`}
                        >
                          %
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={modeRemise === 'pourcent' ? 100 : totalPanierBrut}
                        value={remiseInput}
                        onChange={(e) => setRemiseInput(e.target.value)}
                        aria-label="Montant ou pourcentage de remise"
                        className="min-h-[40px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      {montantRemise > 0 && (
                        <span className="shrink-0 font-mono text-xs font-bold text-amber-700 tabular-nums dark:text-amber-400">
                          -{formatPrix(montantRemise, parametres.devise)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {estCredit && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Acompte payé aujourd&apos;hui ({parametres.devise})
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, totalPanier - 1)}
                        value={acompteInput}
                        onChange={(e) => setAcompteInput(e.target.value)}
                        placeholder="0 si aucun versement immédiat"
                        className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>

                    {/* Date de paiement prévue avec raccourcis rapides */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <label
                          htmlFor="credit-echeance"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                          <Calendar className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                          Date de paiement prévue (raccourcis)
                        </label>
                        {dateEcheanceCredit && (
                          <button
                            type="button"
                            onClick={() => setDateEcheanceCredit('')}
                            className="text-[11px] font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                          >
                            Effacer
                          </button>
                        )}
                      </div>

                      <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {raccourcisEcheance.map((r) => {
                          const actif = dateEcheanceCredit === r.date;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setDateEcheanceCredit(r.date)}
                              className={`h-8 rounded-md border px-2.5 text-[11px] font-semibold transition-colors ${
                                actif
                                  ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-orange-500/60 dark:hover:bg-orange-950/40'
                              }`}
                            >
                              {r.label}
                            </button>
                          );
                        })}
                      </div>

                      <input
                        id="credit-echeance"
                        type="date"
                        min={dateMinEcheance}
                        value={dateEcheanceCredit}
                        onChange={(e) => setDateEcheanceCredit(e.target.value)}
                        className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      {dateEcheanceCredit && (
                        <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          Échéance sélectionnée :{' '}
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {formatDateCourte(dateEcheanceCredit)}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Contrôle en direct de la limite de crédit */}
                    {etatLimiteCredit.active && (
                      <div
                        className={`rounded-xl border p-3 text-xs ${
                          etatLimiteCredit.depassee
                            ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40'
                            : 'border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 font-bold ${
                              etatLimiteCredit.depassee
                                ? 'text-red-700 dark:text-red-300'
                                : 'text-[#0A3072] dark:text-blue-300'
                            }`}
                          >
                            {etatLimiteCredit.depassee ? (
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                            )}
                            Limite de crédit (
                            {etatLimiteCredit.mode === 'globale' ? 'globale' : 'par client'})
                          </span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums dark:text-slate-100">
                            {formatPrix(etatLimiteCredit.limite, parametres.devise)}
                          </span>
                        </div>

                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
                          <div
                            className={`h-full transition-all ${
                              etatLimiteCredit.depassee
                                ? 'bg-red-600'
                                : etatLimiteCredit.creditApresVente / etatLimiteCredit.limite >= 0.8
                                  ? 'bg-orange-500'
                                  : 'bg-emerald-600'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (etatLimiteCredit.creditApresVente / etatLimiteCredit.limite) * 100
                                )
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] tabular-nums">
                          <div className="text-slate-600 dark:text-slate-300">
                            Déjà en cours :{' '}
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {formatPrix(etatLimiteCredit.creditExistant, parametres.devise)}
                            </span>
                          </div>
                          <div className="text-right text-slate-600 dark:text-slate-300">
                            Disponible :{' '}
                            <span
                              className={`font-mono font-bold ${
                                etatLimiteCredit.disponible <= 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                              }`}
                            >
                              {formatPrix(etatLimiteCredit.disponible, parametres.devise)}
                            </span>
                          </div>
                        </div>

                        {etatLimiteCredit.depassee && (
                          <div className="mt-2 space-y-1.5 border-t border-red-200 pt-2 text-[11px] font-semibold text-red-700 dark:border-red-900/50 dark:text-red-300">
                            <p>
                              Crédit refusé : le total dû atteindrait{' '}
                              <span className="font-mono">
                                {formatPrix(etatLimiteCredit.creditApresVente, parametres.devise)}
                              </span>
                              .
                            </p>
                            {etatLimiteCredit.disponible > 0 &&
                              acompteMinimumPourLimite < totalPanier && (
                                <button
                                  type="button"
                                  onClick={() => setAcompteInput(String(acompteMinimumPourLimite))}
                                  className="inline-flex items-center rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
                                >
                                  Ajuster l&apos;acompte à{' '}
                                  {formatPrix(acompteMinimumPourLimite, parametres.devise)}
                                </button>
                              )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {estCredit ? 'Mode de paiement (si acompte)' : 'Mode de paiement'}
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
              </div>
            </div>

            <div className="shrink-0 space-y-3 border-t border-slate-200 bg-slate-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="space-y-1">
                {montantRemise > 0 && (
                  <>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Sous-total brut</span>
                      <span className="font-mono font-semibold tabular-nums">
                        {formatPrix(totalPanierBrut, parametres.devise)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
                      <span>Remise accordée</span>
                      <span className="font-mono font-semibold tabular-nums">
                        -{formatPrix(montantRemise, parametres.devise)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total facture</span>
                  <span className="font-mono text-xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
                    {formatPrix(totalPanier, parametres.devise)}
                  </span>
                </div>
                {estCredit && panier.length > 0 && (
                  <>
                    <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
                      <span>Acompte versé</span>
                      <span className="font-mono font-semibold tabular-nums">
                        {formatPrix(acompteNumerique, parametres.devise)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-sm font-bold text-orange-600 dark:border-slate-800 dark:text-orange-400">
                      <span>Reste à payer (Crédit)</span>
                      <span className="font-mono tabular-nums">
                        {formatPrix(resteCredit, parametres.devise)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {estCredit && etatLimiteCredit.active && etatLimiteCredit.depassee && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  Limite de crédit dépassée ({formatPrix(etatLimiteCredit.disponible, parametres.devise)} disponibles).
                </div>
              )}

              <button
                type="button"
                onClick={encaisserVente}
                disabled={
                  panier.length === 0 ||
                  (estCredit && etatLimiteCredit.active && etatLimiteCredit.depassee)
                }
                className={`h-10 w-full rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 ${
                  estCredit ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {estCredit ? 'Enregistrer la vente à crédit' : 'Valider et encaisser la vente'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Modale aperçu / impression de la facture après validation */}
      {derniereVente && apercuOuvert && (
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
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Vente enregistrée · {derniereVente.numeroFacture}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApercuOuvert(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <FactureImprimable
              vente={derniereVente}
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
              <button
                type="button"
                onClick={() => gererPdf(derniereVente)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:text-sm"
              >
                <Download className="h-4 w-4" />
                Télécharger PDF
              </button>
              <button
                type="button"
                onClick={() => gererImpression(derniereVente)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0A3072] px-3.5 text-xs font-semibold text-white hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 sm:text-sm"
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </button>
              <button
                type="button"
                onClick={() => setApercuOuvert(false)}
                className="h-9 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 sm:text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
