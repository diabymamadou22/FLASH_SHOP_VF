import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Minus,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import FactureImprimable, { FormatImpression } from '../components/FactureImprimable';
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
import { formatPrix, genererId } from '../utils/format';

interface VentesCaissePageProps {
  produits: Produit[];
  parametres: ParametresBoutique;
  nombreVentesExistantes: number;
  onValiderVente: (vente: Vente) => void;
}

export default function VentesCaissePage({
  produits,
  parametres,
  nombreVentesExistantes,
  onValiderVente,
}: VentesCaissePageProps) {
  const [recherche, setRecherche] = useState('');
  const [panier, setPanier] = useState<LigneVente[]>([]);
  const [panierOuvert, setPanierOuvert] = useState(false);
  const [clientNom, setClientNom] = useState('');
  const [clientTelephone, setClientTelephone] = useState('');
  const [estCredit, setEstCredit] = useState(false);
  const [acompteInput, setAcompteInput] = useState('0');
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

  const totalPanier = useMemo(
    () => panier.reduce((acc, ligne) => acc + ligne.sousTotal, 0),
    [panier]
  );

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
      setErreur(`Le produit "${produit.nom}" est en rupture de stock.`);
      return;
    }

    setPanier((precedent) => {
      const existant = precedent.find((l) => l.produitId === produit.id);
      if (existant) {
        if (existant.quantite >= produit.stock) {
          setErreur(`Stock maximum atteint pour "${produit.nom}" (${produit.stock} disponibles).`);
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

    setPanier((precedent) =>
      precedent
        .map((ligne) => {
          if (ligne.produitId !== produitId) return ligne;
          const nouvelleQte = ligne.quantite + delta;
          if (nouvelleQte <= 0) return null;
          if (nouvelleQte > stockMax) {
            setErreur(`Quantité demandée supérieure au stock disponible (${stockMax}).`);
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

  const encaisserVente = () => {
    if (panier.length === 0) {
      setErreur('Ajoutez au moins un produit au panier avant de valider.');
      return;
    }

    const nomPropre = clientNom.trim();
    const telephonePropre = clientTelephone.trim();
    if (estCredit && !nomPropre) {
      setErreur('Veuillez saisir le nom du client pour enregistrer une vente à crédit.');
      return;
    }

    if (estCredit && telephonePropre.replace(/\D/g, '').length < 6) {
      setErreur(
        'Veuillez saisir le numéro de téléphone du client pour pouvoir le rappeler ou le contacter sur WhatsApp.'
      );
      return;
    }

    if (estCredit && acompteNumerique >= totalPanier) {
      setErreur(
        "L'acompte doit être inférieur au total pour une vente à crédit (sinon choisissez Paiement complet)."
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
      clientTelephone: clientTelephone.trim() || undefined,
      modePaiement,
      lignes: panier,
      total: totalPanier,
      estCredit,
      montantPaye: estCredit ? acompteNumerique : totalPanier,
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
    setEstCredit(false);
    setAcompteInput('0');
    setErreur('');
    setPanierOuvert(false);
    setApercuOuvert(true);
  };

  const nbArticlesPanier = panier.reduce((s, l) => s + l.quantite, 0);

  return (
    <div className="space-y-4">
      {/* Barre supérieure : recherche pleine largeur + bouton Panier + Dernier reçu */}
      <section className="no-print sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-10 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:top-[calc(4rem+env(safe-area-inset-top,0px))] sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Chercher un article (nom, référence, code-barres)..."
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {derniereVente && (
              <button
                type="button"
                onClick={() => setApercuOuvert(true)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <Receipt className="h-4 w-4" />
                Reçu {derniereVente.numeroFacture}
              </button>
            )}

            <button
              type="button"
              onClick={() => setPanierOuvert(true)}
              className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors sm:flex-none ${
                nbArticlesPanier > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-[#0A3072] hover:bg-blue-900'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Panier ({nbArticlesPanier})</span>
              {nbArticlesPanier > 0 && (
                <span className="rounded-md bg-white/20 px-2 py-0.5 font-mono text-xs tabular-nums">
                  {formatPrix(totalPanier, parametres.devise)}
                </span>
              )}
            </button>
          </div>
        </div>

        {erreur && !panierOuvert && (
          <div className="mt-2.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {erreur}
          </div>
        )}
      </section>

      {/* Grille des produits en pleine largeur */}
      <section className="no-print">
        {produitsDisponibles.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
            Aucun produit ne correspond à votre recherche.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {produitsDisponibles.map((p) => {
              const qtePanier = quantiteDansPanier.get(p.id) ?? 0;
              return (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono font-semibold">{p.reference}</span>
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          p.stock === 0 ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        Stock: {p.stock}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-bold text-slate-900">{p.nom}</h3>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className="font-mono text-sm font-bold text-blue-700 tabular-nums">
                      {formatPrix(p.prixVente, parametres.devise)}
                    </span>
                    <button
                      type="button"
                      disabled={p.stock <= 0}
                      onClick={() => ajouterAuPanier(p)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
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
          className="no-print fixed inset-0 z-50 flex justify-end bg-slate-900/50"
          onClick={() => setPanierOuvert(false)}
        >
          <aside
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#0A3072]" />
                <h2 className="text-base font-bold text-slate-900">
                  Panier en cours ({nbArticlesPanier})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPanierOuvert(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fermer le panier"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {erreur && (
                <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {erreur}
                </div>
              )}

              {panier.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  Sélectionnez des produits pour démarrer une vente.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {panier.map((ligne) => (
                    <div
                      key={ligne.produitId}
                      className="flex items-center justify-between gap-2 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {ligne.nomProduit}
                        </div>
                        <div className="font-mono text-xs text-slate-500 tabular-nums">
                          {formatPrix(ligne.prixUnitaire, parametres.devise)} × {ligne.quantite}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => modifierQuantite(ligne.produitId, -1)}
                          className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                          aria-label="Diminuer la quantité"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center font-mono text-xs font-bold tabular-nums">
                          {ligne.quantite}
                        </span>
                        <button
                          type="button"
                          onClick={() => modifierQuantite(ligne.produitId, 1)}
                          className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                          aria-label="Augmenter la quantité"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => retirerDuPanier(ligne.produitId)}
                          className="ml-1 flex min-h-[38px] min-w-[38px] items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                          aria-label="Retirer du panier"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Type de règlement
                  </label>
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEstCredit(false);
                        setErreur('');
                      }}
                      className={`min-h-[38px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                        !estCredit
                          ? 'bg-white text-emerald-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
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
                      className={`min-h-[38px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                        estCredit
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Vente à crédit
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {estCredit ? 'Nom du client *' : 'Nom du client (optionnel)'}
                  </label>
                  <input
                    type="text"
                    value={clientNom}
                    onChange={(e) => setClientNom(e.target.value)}
                    placeholder={
                      estCredit
                        ? 'Nom obligatoire pour un crédit'
                        : 'Laisser vide = Client comptoir'
                    }
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {estCredit && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Téléphone du client *
                      </label>
                      <input
                        type="tel"
                        required={estCredit}
                        value={clientTelephone}
                        onChange={(e) => setClientTelephone(e.target.value)}
                        placeholder="Ex: +223 76 12 34 56 (appel / WhatsApp)"
                        className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Acompte payé aujourd&apos;hui ({parametres.devise})
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, totalPanier - 1)}
                        value={acompteInput}
                        onChange={(e) => setAcompteInput(e.target.value)}
                        placeholder="0 si aucun versement immédiat"
                        className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm font-semibold focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {estCredit ? 'Mode de paiement (si acompte)' : 'Mode de paiement'}
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
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Total facture</span>
                  <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                    {formatPrix(totalPanier, parametres.devise)}
                  </span>
                </div>
                {estCredit && panier.length > 0 && (
                  <>
                    <div className="flex items-center justify-between text-xs text-emerald-700">
                      <span>Acompte versé</span>
                      <span className="font-mono font-semibold tabular-nums">
                        {formatPrix(acompteNumerique, parametres.devise)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-sm font-bold text-orange-600">
                      <span>Reste à payer (Crédit)</span>
                      <span className="font-mono tabular-nums">
                        {formatPrix(resteCredit, parametres.devise)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={encaisserVente}
                disabled={panier.length === 0}
                className={`min-h-[48px] w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 ${
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
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Vente enregistrée · {derniereVente.numeroFacture}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApercuOuvert(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
              <div className="no-print mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                {infoImpression}
              </div>
            )}

            <div className="no-print mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => gererPdf(derniereVente)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Télécharger PDF
              </button>
              <button
                type="button"
                onClick={() => gererImpression(derniereVente)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A3072] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </button>
              <button
                type="button"
                onClick={() => setApercuOuvert(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
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
