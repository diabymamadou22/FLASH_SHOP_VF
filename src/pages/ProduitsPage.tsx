import { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { Categorie, Produit, StatutStock } from '../types';
import { formatNombre, formatPrix, genererId, getStatutStock } from '../utils/format';

interface ProduitsPageProps {
  produits: Produit[];
  categories: Categorie[];
  devise: string;
  lectureSeule?: boolean;
  onAjouterProduit: (produit: Produit) => void;
  onModifierProduit: (produit: Produit) => void;
  onSupprimerProduit: (id: string) => void;
}

interface FormulaireProduit {
  reference: string;
  codeBarre: string;
  nom: string;
  description: string;
  categorieId: string;
  prixAchat: string;
  prixVente: string;
  stock: string;
  seuil: string;
}

export default function ProduitsPage({
  produits,
  categories,
  devise,
  lectureSeule = false,
  onAjouterProduit,
  onModifierProduit,
  onSupprimerProduit,
}: ProduitsPageProps) {
  const [recherche, setRecherche] = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState('toutes');
  const [filtreStatut, setFiltreStatut] = useState<'tous' | StatutStock>('tous');
  const [pageActuelle, setPageActuelle] = useState(1);
  const [parPage, setParPage] = useState(6);

  // États des modales (Ajout / Édition / Détail / Confirmation suppression)
  const [modalFormOuverte, setModalFormOuverte] = useState(false);
  const [produitEnEdition, setProduitEnEdition] = useState<Produit | null>(null);
  const [produitDetail, setProduitDetail] = useState<Produit | null>(null);
  const [produitASupprimer, setProduitASupprimer] = useState<Produit | null>(null);
  const [erreurForm, setErreurForm] = useState('');
  const [confirmeVenteAPerte, setConfirmeVenteAPerte] = useState(false);

  const [form, setForm] = useState<FormulaireProduit>({
    reference: '',
    codeBarre: '',
    nom: '',
    description: '',
    categorieId: categories[0]?.id ?? '',
    prixAchat: '',
    prixVente: '',
    stock: '0',
    seuil: '10',
  });

  // Calcul des 4 indicateurs en haut de page
  const stats = useMemo(() => {
    let enStock = 0;
    let stockFaible = 0;
    let rupture = 0;

    for (const p of produits) {
      const statut = getStatutStock(p.stock, p.seuil);
      if (statut === 'en_stock') enStock++;
      else if (statut === 'stock_faible') stockFaible++;
      else rupture++;
    }

    return {
      total: produits.length,
      enStock,
      stockFaible,
      rupture,
    };
  }, [produits]);

  // Correspondance id catégorie -> nom catégorie
  const nomCategorieParId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) {
      map[c.id] = c.nom;
    }
    return map;
  }, [categories]);

  // Filtrage dynamique par recherche, catégorie et statut
  const produitsFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return produits.filter((p) => {
      const correspondRecherche =
        !terme ||
        p.nom.toLowerCase().includes(terme) ||
        p.reference.toLowerCase().includes(terme) ||
        p.codeBarre.toLowerCase().includes(terme);

      const correspondCategorie =
        filtreCategorie === 'toutes' || p.categorieId === filtreCategorie;

      const statut = getStatutStock(p.stock, p.seuil);
      const correspondStatut = filtreStatut === 'tous' || statut === filtreStatut;

      return correspondRecherche && correspondCategorie && correspondStatut;
    });
  }, [produits, recherche, filtreCategorie, filtreStatut]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(produitsFiltres.length / parPage));
  const pageSecurisee = Math.min(pageActuelle, totalPages);
  const debut = (pageSecurisee - 1) * parPage;
  const produitsPage = produitsFiltres.slice(debut, debut + parPage);

  const ouvrirAjout = () => {
    setProduitEnEdition(null);
    setErreurForm('');
    setConfirmeVenteAPerte(false);
    setForm({
      reference: `PRD-${String(produits.length + 1).padStart(3, '0')}`,
      codeBarre: '',
      nom: '',
      description: '',
      categorieId: categories[0]?.id ?? '',
      prixAchat: '',
      prixVente: '',
      stock: '0',
      seuil: '10',
    });
    setModalFormOuverte(true);
  };

  const ouvrirEdition = (produit: Produit) => {
    setProduitEnEdition(produit);
    setErreurForm('');
    setConfirmeVenteAPerte(produit.prixVente < produit.prixAchat);
    setForm({
      reference: produit.reference,
      codeBarre: produit.codeBarre,
      nom: produit.nom,
      description: produit.description,
      categorieId: produit.categorieId,
      prixAchat: String(produit.prixAchat),
      prixVente: String(produit.prixVente),
      stock: String(produit.stock),
      seuil: String(produit.seuil),
    });
    setModalFormOuverte(true);
  };

  const soumettreFormulaire = (e: FormEvent) => {
    e.preventDefault();
    const prixAchat = Number(form.prixAchat);
    const prixVente = Number(form.prixVente);
    const stock = Number(form.stock);
    const seuil = Number(form.seuil);
    const referencePropre = form.reference.trim().toUpperCase();
    const codeBarrePropre = form.codeBarre.trim();

    const signaleErreur = (msg: string) => {
      setErreurForm(msg);
    };

    if (!referencePropre || !form.nom.trim()) {
      signaleErreur('La référence et le nom du produit sont obligatoires.');
      return;
    }
    if (!form.categorieId) {
      signaleErreur('Veuillez choisir une catégorie.');
      return;
    }
    if (Number.isNaN(prixAchat) || prixAchat < 0 || Number.isNaN(prixVente) || prixVente <= 0) {
      signaleErreur('Veuillez saisir des prix valides.');
      return;
    }
    if (Number.isNaN(stock) || stock < 0 || Number.isNaN(seuil) || seuil < 0) {
      signaleErreur('Le stock et le seuil doivent être positifs ou nuls.');
      return;
    }

    const doublonRef = produits.some(
      (p) =>
        p.id !== produitEnEdition?.id &&
        p.reference.trim().toLowerCase() === referencePropre.toLowerCase()
    );
    if (doublonRef) {
      signaleErreur(`La référence "${referencePropre}" est déjà utilisée par un autre produit.`);
      return;
    }

    if (codeBarrePropre) {
      const doublonCodeBarre = produits.some(
        (p) =>
          p.id !== produitEnEdition?.id &&
          p.codeBarre.trim() !== '' &&
          p.codeBarre.trim().toLowerCase() === codeBarrePropre.toLowerCase()
      );
      if (doublonCodeBarre) {
        signaleErreur(`Le code-barres "${codeBarrePropre}" appartient déjà à un autre produit.`);
        return;
      }
    }

    if (prixVente < prixAchat && !confirmeVenteAPerte) {
      signaleErreur(
        'Le prix de vente est inférieur au prix d’achat (vente à perte). Cochez la confirmation ci-dessous pour valider.'
      );
      return;
    }

    if (produitEnEdition) {
      onModifierProduit({
        ...produitEnEdition,
        reference: referencePropre,
        codeBarre: codeBarrePropre,
        nom: form.nom.trim(),
        description: form.description.trim(),
        categorieId: form.categorieId,
        prixAchat,
        prixVente,
        stock,
        seuil,
      });
    } else {
      onAjouterProduit({
        id: genererId('prod'),
        reference: referencePropre,
        codeBarre: codeBarrePropre,
        nom: form.nom.trim(),
        description: form.description.trim(),
        categorieId: form.categorieId,
        prixAchat,
        prixVente,
        stock,
        seuil,
        dateAjout: new Date().toISOString(),
      });
    }

    setModalFormOuverte(false);
  };

  const afficherStatut = (stock: number, seuil: number) => {
    const statut = getStatutStock(stock, seuil);
    if (statut === 'en_stock') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          En stock
        </span>
      );
    }
    if (statut === 'stock_faible') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Stock faible
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400">
        <XCircle className="h-4 w-4 shrink-0" />
        Rupture
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Ligne des 4 cartes KPI + Bouton Ajouter */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white sm:h-11 sm:w-11">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-slate-600 dark:text-slate-400">Total produits</div>
            <div className="text-xl font-bold text-slate-900 tabular-nums sm:text-2xl dark:text-slate-100">
              {stats.total}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white sm:h-11 sm:w-11">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-slate-600 dark:text-slate-400">En stock</div>
            <div className="text-xl font-bold text-emerald-700 tabular-nums sm:text-2xl dark:text-emerald-400">
              {stats.enStock}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white sm:h-11 sm:w-11">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-slate-600 dark:text-slate-400">Stock faible</div>
            <div className="text-xl font-bold text-amber-600 tabular-nums sm:text-2xl dark:text-amber-400">
              {stats.stockFaible}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white sm:h-11 sm:w-11">
            <XCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-slate-600 dark:text-slate-400">Rupture</div>
            <div className="text-xl font-bold text-red-600 tabular-nums sm:text-2xl dark:text-red-400">
              {stats.rupture}
            </div>
          </div>
        </div>

        {!lectureSeule && (
          <button
            type="button"
            onClick={ouvrirAjout}
            className="col-span-2 flex h-full min-h-[72px] items-center justify-center gap-2 rounded-xl bg-blue-700 p-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap sm:min-h-[78px] sm:p-4 xl:col-span-1"
          >
            <Plus className="h-5 w-5 shrink-0" />
            Ajouter un produit
          </button>
        )}
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 md:flex-row md:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setPageActuelle(1);
            }}
            placeholder="Rechercher (nom, référence, code-barres)..."
            className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-row sm:gap-3">
          <select
            value={filtreCategorie}
            onChange={(e) => {
              setFiltreCategorie(e.target.value);
              setPageActuelle(1);
            }}
            aria-label="Filtrer par catégorie"
            className="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="toutes">Toutes catégories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nom}
              </option>
            ))}
          </select>

          <select
            value={filtreStatut}
            onChange={(e) => {
              setFiltreStatut(e.target.value as 'tous' | StatutStock);
              setPageActuelle(1);
            }}
            aria-label="Filtrer par statut"
            className="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="tous">Tous statuts</option>
            <option value="en_stock">En stock</option>
            <option value="stock_faible">Stock faible</option>
            <option value="rupture">Rupture de stock</option>
          </select>
        </div>
      </div>

      {/* Vue mobile en cartes (< md) */}
      <div className="space-y-3 md:hidden">
        {produitsPage.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Aucun produit trouvé.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Modifiez vos filtres ou ajoutez un nouveau produit en boutique.
            </p>
          </div>
        ) : (
          produitsPage.map((produit) => {
            const statut = getStatutStock(produit.stock, produit.seuil);
            return (
              <div
                key={produit.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {produit.reference} · {nomCategorieParId[produit.categorieId] ?? 'Non classé'}
                    </div>
                    <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">{produit.nom}</h3>
                  </div>
                  <div className="shrink-0">{afficherStatut(produit.stock, produit.seuil)}</div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-800/80">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Achat</div>
                    <div className="font-mono font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                      {formatNombre(produit.prixAchat)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Vente</div>
                    <div className="font-mono font-bold text-blue-700 tabular-nums dark:text-blue-400">
                      {formatNombre(produit.prixVente)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Stock / Seuil</div>
                    <div
                      className={`font-mono font-bold tabular-nums ${
                        statut === 'rupture'
                          ? 'text-red-600 dark:text-red-400'
                          : statut === 'stock_faible'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {produit.stock} / {produit.seuil}
                    </div>
                  </div>
                </div>

                <div className={`mt-3 grid gap-2 ${lectureSeule ? 'grid-cols-1' : 'grid-cols-3'}`}>
                  <button
                    type="button"
                    onClick={() => setProduitDetail(produit)}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Voir
                  </button>
                  {!lectureSeule && (
                    <>
                      <button
                        type="button"
                        onClick={() => ouvrirEdition(produit)}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => setProduitASupprimer(produit)}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Suppr.
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tableau des produits sur tablette / PC (>= md) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#0D357A] text-xs font-semibold text-white dark:bg-slate-800 dark:text-slate-100">
                <th className="px-4 py-3.5 whitespace-nowrap">Référence</th>
                <th className="px-4 py-3.5">Nom du produit</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Catégorie</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Prix d&apos;achat</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Prix de vente</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Stock</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Seuil</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Statut</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {produitsPage.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Aucun produit trouvé.</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Modifiez vos filtres ou ajoutez un nouveau produit en boutique.
                    </p>
                  </td>
                </tr>
              ) : (
                produitsPage.map((produit) => {
                  const statut = getStatutStock(produit.stock, produit.seuil);
                  return (
                    <tr key={produit.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap dark:text-slate-300">
                        {produit.reference}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{produit.nom}</div>
                        {produit.description && (
                          <div className="max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
                            {produit.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap dark:text-slate-300">
                        {nomCategorieParId[produit.categorieId] ?? 'Non classé'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap dark:text-slate-300">
                        {formatNombre(produit.prixAchat)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap dark:text-slate-100">
                        {formatNombre(produit.prixVente)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                          statut === 'rupture'
                            ? 'text-red-600 dark:text-red-400'
                            : statut === 'stock_faible'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {produit.stock}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap dark:text-slate-400">
                        {produit.seuil}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {afficherStatut(produit.stock, produit.seuil)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setProduitDetail(produit)}
                            title="Voir les détails"
                            aria-label={`Voir ${produit.nom}`}
                            className="rounded-lg bg-blue-600 p-1.5 text-white transition-colors hover:bg-blue-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {!lectureSeule && (
                            <>
                              <button
                                type="button"
                                onClick={() => ouvrirEdition(produit)}
                                title="Modifier"
                                aria-label={`Modifier ${produit.nom}`}
                                className="rounded-lg bg-indigo-600 p-1.5 text-white transition-colors hover:bg-indigo-700"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setProduitASupprimer(produit)}
                                title="Supprimer"
                                aria-label={`Supprimer ${produit.nom}`}
                                className="rounded-lg bg-red-600 p-1.5 text-white transition-colors hover:bg-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
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

        {/* Pied de tableau : pagination */}
        <div className="flex flex-col items-center justify-between gap-3 px-4 py-3 text-xs text-slate-600 md:border-t md:border-slate-200 sm:flex-row dark:text-slate-400 dark:md:border-slate-800">
          <div className="tabular-nums">
            Affichage de {produitsFiltres.length === 0 ? 0 : debut + 1} à{' '}
            {Math.min(debut + parPage, produitsFiltres.length)} sur {produitsFiltres.length}{' '}
            produit(s)
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={parPage}
              onChange={(e) => {
                setParPage(Number(e.target.value));
                setPageActuelle(1);
              }}
              aria-label="Nombre de lignes par page"
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value={6}>6 par page</option>
              <option value={10}>10 par page</option>
              <option value={20}>20 par page</option>
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

      {/* Modale Ajout / Modification de produit */}
      {modalFormOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-3 sm:p-4 dark:bg-slate-950/75">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 shadow-xl sm:p-6 dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {produitEnEdition ? 'Modifier le produit' : 'Ajouter un produit'}
              </h2>
              <button
                type="button"
                onClick={() => setModalFormOuverte(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={soumettreFormulaire} className="space-y-4">
              {erreurForm && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {erreurForm}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Référence *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="Ex: TEL-001"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Code-barres
                  </label>
                  <input
                    type="text"
                    value={form.codeBarre}
                    onChange={(e) => setForm({ ...form, codeBarre: e.target.value })}
                    placeholder="Ex: 880609500101"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nom du produit *
                </label>
                <input
                  type="text"
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Ex: Samsung Galaxy A55 (256Go / 8Go)"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Catégorie *</label>
                <select
                  value={form.categorieId}
                  onChange={(e) => setForm({ ...form, categorieId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Prix achat ({devise})
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.prixAchat}
                    onChange={(e) => {
                      setForm({ ...form, prixAchat: e.target.value });
                      setConfirmeVenteAPerte(false);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Prix vente ({devise})
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.prixVente}
                    onChange={(e) => {
                      setForm({ ...form, prixVente: e.target.value });
                      setConfirmeVenteAPerte(false);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Stock</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Seuil</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.seuil}
                    onChange={(e) => setForm({ ...form, seuil: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {form.prixAchat !== '' &&
                form.prixVente !== '' &&
                Number(form.prixVente) > 0 &&
                Number(form.prixVente) < Number(form.prixAchat) && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-200">
                    <div className="flex items-start gap-2 font-semibold">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        Attention : le prix de vente (
                        {formatPrix(Number(form.prixVente), devise)}) est inférieur au prix
                        d&apos;achat ({formatPrix(Number(form.prixAchat), devise)}). Perte unitaire :{' '}
                        {formatPrix(Number(form.prixAchat) - Number(form.prixVente), devise)}.
                      </span>
                    </div>
                    <label className="mt-2 flex cursor-pointer items-center gap-2 font-medium text-amber-950 dark:text-amber-100">
                      <input
                        type="checkbox"
                        checked={confirmeVenteAPerte}
                        onChange={(e) => setConfirmeVenteAPerte(e.target.checked)}
                        className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      />
                      Je confirme vouloir vendre cet article en dessous du prix d&apos;achat
                    </label>
                  </div>
                )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description courte
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Caractéristiques techniques du matériel..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalFormOuverte(false)}
                  className="h-9 rounded-lg border border-slate-200 px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white hover:bg-blue-800 sm:text-sm"
                >
                  {produitEnEdition ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Détail produit */}
      {produitDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4 dark:bg-slate-950/75">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <div className="font-mono text-xs text-slate-500 dark:text-slate-400">{produitDetail.reference}</div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{produitDetail.nom}</h2>
              </div>
              <button
                type="button"
                onClick={() => setProduitDetail(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Catégorie</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">
                  {nomCategorieParId[produitDetail.categorieId] ?? 'Non classé'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Code-barres</dt>
                <dd className="font-mono text-slate-800 dark:text-slate-200">{produitDetail.codeBarre || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Prix d&apos;achat</dt>
                <dd className="font-mono text-slate-800 tabular-nums dark:text-slate-200">
                  {formatPrix(produitDetail.prixAchat, devise)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Prix de vente</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                  {formatPrix(produitDetail.prixVente, devise)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Marge unitaire</dt>
                <dd className="font-mono font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                  {formatPrix(produitDetail.prixVente - produitDetail.prixAchat, devise)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Stock actuel / Seuil</dt>
                <dd className="font-mono text-slate-900 tabular-nums dark:text-slate-100">
                  {produitDetail.stock} / {produitDetail.seuil}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Statut</dt>
                <dd>{afficherStatut(produitDetail.stock, produitDetail.seuil)}</dd>
              </div>
              {produitDetail.description && (
                <div className="border-t border-slate-100 pt-2.5 dark:border-slate-800">
                  <dt className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Description</dt>
                  <dd className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {produitDetail.description}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setProduitDetail(null)}
                className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 sm:text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Confirmation suppression */}
      {produitASupprimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4 dark:bg-slate-950/75">
          <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Supprimer ce produit ?</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Voulez-vous vraiment supprimer{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{produitASupprimer.nom}</span> (
              {produitASupprimer.reference}) ?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProduitASupprimer(null)}
                className="h-9 rounded-lg border border-slate-200 px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onSupprimerProduit(produitASupprimer.id);
                  setProduitASupprimer(null);
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
