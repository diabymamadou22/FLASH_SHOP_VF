import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  ImagePlus,
  Moon,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react';
import { DESIGNS_FACTURE_A4 } from '../components/FactureImprimable';
import { exporterDonneesExcel, exporterDonneesWord } from '../services/exportDonnees';
import {
  BaseDonnees,
  DesignFactureA4,
  ModeLimiteCredit,
  ParametresBoutique,
  ThemeApparence,
} from '../types';

interface ParametresPageProps {
  donnees: BaseDonnees;
  onSauvegarderParametres: (parametres: ParametresBoutique) => void;
  onRestaurerBase?: (base: BaseDonnees) => void;
  onAllerUtilisateurs: () => void;
}

export default function ParametresPage({
  donnees,
  onSauvegarderParametres,
  onAllerUtilisateurs,
}: ParametresPageProps) {
  const [form, setForm] = useState<ParametresBoutique>(donnees.parametres);
  const [messageSucces, setMessageSucces] = useState('');
  const [messageErreur, setMessageErreur] = useState('');
  const inputLogoRef = useRef<HTMLInputElement>(null);
  const [exportEnCours, setExportEnCours] = useState<'excel' | 'word' | null>(null);

  useEffect(() => {
    setForm(donnees.parametres);
  }, [donnees.parametres]);

  const afficherSucces = (msg: string, _avecToast = false) => {
    setMessageErreur('');
    setMessageSucces(msg);
    setTimeout(() => setMessageSucces(''), 4000);
  };

  const afficherErreur = (msg: string) => {
    setMessageSucces('');
    setMessageErreur(msg);
  };

  const estThemeSombre = (form.theme ?? 'clair') === 'sombre';

  const basculerTheme = (nouveauTheme?: ThemeApparence) => {
    const cible: ThemeApparence = nouveauTheme ?? (estThemeSombre ? 'clair' : 'sombre');
    const misAJour: ParametresBoutique = { ...form, theme: cible };
    setForm(misAJour);
    onSauvegarderParametres(misAJour);
    afficherSucces(
      cible === 'sombre'
        ? 'Thème sombre activé et enregistré dans les paramètres.'
        : 'Thème clair activé et enregistré dans les paramètres.'
    );
  };

  const lancerExportExcel = () => {
    try {
      setExportEnCours('excel');
      exporterDonneesExcel(donnees);
      afficherSucces('Exportation Excel (.xlsx) générée avec toutes les données.');
    } catch {
      afficherErreur("Impossible de générer l'export Excel.");
    } finally {
      setExportEnCours(null);
    }
  };

  const lancerExportWord = async () => {
    try {
      setExportEnCours('word');
      await exporterDonneesWord(donnees);
      afficherSucces('Rapport Word (.docx) généré avec toutes les données.');
    } catch {
      afficherErreur('Impossible de générer le document Word.');
    } finally {
      setExportEnCours(null);
    }
  };

  /**
   * Redimensionne l'image importée (max 256px) pour garantir une sauvegarde locale légère.
   */
  const convertirLogoEnDataUrl = (fichier: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const lecteur = new FileReader();
      lecteur.onload = () => {
        const img = new Image();
        img.onload = () => {
          const tailleMax = 256;
          const ratio = Math.min(tailleMax / img.width, tailleMax / img.height, 1);
          const largeur = Math.max(1, Math.round(img.width * ratio));
          const hauteur = Math.max(1, Math.round(img.height * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = largeur;
          canvas.height = hauteur;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas indisponible'));
            return;
          }
          ctx.drawImage(img, 0, 0, largeur, hauteur);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Image invalide'));
        img.src = String(lecteur.result);
      };
      lecteur.onerror = () => reject(new Error('Lecture impossible'));
      lecteur.readAsDataURL(fichier);
    });

  const gererImportLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    if (!fichier.type.startsWith('image/')) {
      afficherErreur('Veuillez sélectionner un fichier image valide (PNG, JPG, WebP...).');
      e.target.value = '';
      return;
    }
    try {
      const logoDataUrl = await convertirLogoEnDataUrl(fichier);
      const misAJour = { ...form, logoDataUrl };
      setForm(misAJour);
      onSauvegarderParametres(misAJour);
      afficherSucces('Logo de la boutique importé et enregistré.');
    } catch {
      afficherErreur('Impossible de charger ce fichier image pour le logo.');
    } finally {
      e.target.value = '';
    }
  };

  const reinitialiserLogo = () => {
    const misAJour = { ...form, logoDataUrl: undefined };
    setForm(misAJour);
    onSauvegarderParametres(misAJour);
    afficherSucces('Logo par défaut restauré.');
  };

  const soumettreBoutique = (e: FormEvent) => {
    e.preventDefault();
    onSauvegarderParametres(form);
    afficherSucces('Paramètres de la boutique enregistrés.');
  };

  const inputClass =
    'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500';

  return (
    <div className="space-y-4">
      {messageSucces && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {messageSucces}
        </div>
      )}

      {messageErreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 dark:border-red-800/70 dark:bg-red-950/40 dark:text-red-300">
          {messageErreur}
        </div>
      )}

      {/* Apparence & Thème sombre */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#0A3072] dark:bg-slate-800 dark:text-amber-400">
              {estThemeSombre ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
                Apparence &amp; thème sombre
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Réduisez la fatigue visuelle en soirée · Préférence sauvegardée dans les paramètres de
                la boutique.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => basculerTheme('clair')}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  !estThemeSombre
                    ? 'bg-white text-[#0A3072] shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                Clair
              </button>
              <button
                type="button"
                onClick={() => basculerTheme('sombre')}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  estThemeSombre
                    ? 'bg-[#0A3072] text-white shadow-sm dark:bg-blue-600'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                Sombre
              </button>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={estThemeSombre}
              aria-label="Activer ou désactiver le thème sombre"
              onClick={() => basculerTheme()}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                estThemeSombre ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  estThemeSombre ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Accès vers la page dédiée Utilisateurs & rôles */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0A3072] dark:bg-blue-950/60 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
                Utilisateurs &amp; rôles
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {donnees.utilisateurs.length} compte(s) secondaire(s) enregistré(s) · Gestion des
                accès Admin, Comptable et Caissier.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAllerUtilisateurs}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0A3072] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-900 sm:text-sm dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>Gérer les utilisateurs</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </section>

      {/* Informations de la boutique */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
            Informations de la boutique
          </h2>

          {/* Logo personnalisé compact */}
          <div className="flex items-center gap-2.5">
            <img
              src={form.logoDataUrl || '/pwa-192x192.png'}
              alt="Logo de la boutique"
              className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-contain p-0.5 dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              ref={inputLogoRef}
              type="file"
              accept="image/*"
              onChange={gererImportLogo}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputLogoRef.current?.click()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0A3072] px-3 text-xs font-semibold text-white hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Importer mon logo
            </button>
            {form.logoDataUrl && (
              <button
                type="button"
                onClick={reinitialiserLogo}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Rétablir le logo par défaut"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Défaut
              </button>
            )}
          </div>
        </div>

        <form onSubmit={soumettreBoutique} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label
              htmlFor="boutique-nom"
              className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Nom de la boutique
            </label>
            <input
              id="boutique-nom"
              type="text"
              required
              value={form.nomBoutique}
              onChange={(e) => setForm({ ...form, nomBoutique: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="boutique-sous-titre"
              className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Activité / Sous-titre
            </label>
            <input
              id="boutique-sous-titre"
              type="text"
              value={form.sousTitre}
              onChange={(e) => setForm({ ...form, sousTitre: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="boutique-tel"
              className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Téléphone
            </label>
            <input
              id="boutique-tel"
              type="text"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="boutique-adresse"
              className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Adresse
            </label>
            <input
              id="boutique-adresse"
              type="text"
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="boutique-gerant"
              className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Nom du gérant
            </label>
            <input
              id="boutique-gerant"
              type="text"
              value={form.nomGerant}
              onChange={(e) => setForm({ ...form, nomGerant: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="boutique-devise"
              className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Devise
            </label>
            <input
              id="boutique-devise"
              type="text"
              value={form.devise}
              onChange={(e) => setForm({ ...form, devise: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="boutique-pied-facture"
              className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Message en pied de facture (optionnel)
            </label>
            <input
              id="boutique-pied-facture"
              type="text"
              value={form.piedFacture ?? ''}
              onChange={(e) => setForm({ ...form, piedFacture: e.target.value })}
              placeholder="Ex: Merci pour votre confiance ! Garantie boutique 3 mois."
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Palette className="h-3.5 w-3.5 text-[#0A3072] dark:text-blue-400" />
              Design par défaut (Facture A4 Pro)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DESIGNS_FACTURE_A4.map((d) => {
                const actif = (form.designFactureA4 ?? 'classique_bleu') === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      setForm({ ...form, designFactureA4: d.id as DesignFactureA4 })
                    }
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors ${
                      actif
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-blue-500 dark:bg-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
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

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3.5 text-xs font-semibold text-white hover:bg-blue-800 sm:text-sm"
            >
              <Save className="h-4 w-4" />
              Enregistrer
            </button>
          </div>
        </form>
      </section>

      {/* Plafond et règles de limite de crédit */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
              Limite de crédit autorisée
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {(form.limiteCredit ?? 0) > 0
              ? `Plafond actif (${form.modeLimiteCredit === 'globale' ? 'Globale' : 'Par client'})`
              : 'Aucune limite'}
          </span>
        </div>

        <form onSubmit={soumettreBoutique} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor="boutique-limite-credit"
              className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Montant maximum ({form.devise})
            </label>
            <input
              id="boutique-limite-credit"
              type="number"
              min={0}
              step={500}
              value={form.limiteCredit ?? ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                setForm({
                  ...form,
                  limiteCredit: Number.isFinite(val) && val > 0 ? val : 0,
                });
              }}
              placeholder="0 = aucune limite"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Application du plafond
            </label>
            <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              {(
                [
                  { id: 'par_client', label: 'Par client' },
                  { id: 'globale', label: 'Globale boutique' },
                ] as { id: ModeLimiteCredit; label: string }[]
              ).map((opt) => {
                const actif = (form.modeLimiteCredit ?? 'par_client') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setForm({ ...form, modeLimiteCredit: opt.id })}
                    className={`h-8 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                      actif
                        ? 'bg-white text-[#0A3072] shadow-sm dark:bg-slate-700 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-3.5 text-xs font-semibold text-white hover:bg-orange-700 sm:text-sm"
            >
              <Save className="h-4 w-4" />
              Appliquer la limite
            </button>
          </div>
        </form>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {(form.modeLimiteCredit ?? 'par_client') === 'par_client'
            ? "Empêche un même client de dépasser ce montant total d'impayés lors d'une vente à crédit."
            : 'Empêche le total de tous les crédits en cours de la boutique de dépasser ce plafond.'}
        </p>
      </section>

      {/* Exportation complète des données (Excel & Word) */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-[#0A3072] dark:text-blue-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
                Exportation des données
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Synthèse financière, produits &amp; stocks, ventes, crédits clients, dépenses,
              mouvements et catégories.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={exportEnCours !== null}
              onClick={lancerExportExcel}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:text-sm"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              {exportEnCours === 'excel' ? 'Export Excel...' : 'Exporter en Excel (.xlsx)'}
            </button>

            <button
              type="button"
              disabled={exportEnCours !== null}
              onClick={lancerExportWord}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0A3072] px-3.5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-60 sm:text-sm dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              <FileText className="h-4 w-4 shrink-0" />
              {exportEnCours === 'word' ? 'Export Word...' : 'Exporter en Word (.docx)'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
