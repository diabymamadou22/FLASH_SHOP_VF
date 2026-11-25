import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  ImagePlus,
  Palette,
  RotateCcw,
  Save,
  Users,
} from 'lucide-react';
import { DESIGNS_FACTURE_A4 } from '../components/FactureImprimable';
import { exporterDonneesExcel, exporterDonneesWord } from '../services/exportDonnees';
import { BaseDonnees, DesignFactureA4, ParametresBoutique } from '../types';

interface ParametresPageProps {
  donnees: BaseDonnees;
  onSauvegarderParametres: (parametres: ParametresBoutique) => void;
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

  const afficherSucces = (msg: string) => {
    setMessageErreur('');
    setMessageSucces(msg);
    setTimeout(() => setMessageSucces(''), 3500);
  };

  const lancerExportExcel = () => {
    try {
      setExportEnCours('excel');
      exporterDonneesExcel(donnees);
      afficherSucces('Exportation Excel (.xlsx) générée avec toutes les données.');
    } catch {
      setMessageErreur("Impossible de générer l'export Excel.");
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
      setMessageErreur("Impossible de générer le document Word.");
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
      setMessageErreur('Veuillez sélectionner un fichier image valide (PNG, JPG, WebP...).');
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
      setMessageErreur("Impossible de charger ce fichier image pour le logo.");
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

  return (
    <div className="space-y-4">
      {messageSucces && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {messageSucces}
        </div>
      )}

      {messageErreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700">
          {messageErreur}
        </div>
      )}

      {/* Accès vers la page dédiée Utilisateurs & rôles */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0A3072]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                Utilisateurs &amp; rôles
              </h2>
              <p className="text-xs text-slate-500">
                {donnees.utilisateurs.length} compte(s) secondaire(s) enregistré(s) · Gestion des
                accès Admin, Comptable et Caissier.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAllerUtilisateurs}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0A3072] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-900 sm:text-sm"
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>Gérer les utilisateurs</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </section>

      {/* Informations de la boutique */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
          <h2 className="text-sm font-bold text-slate-900 sm:text-base">
            Informations de la boutique
          </h2>

          {/* Logo personnalisé compact */}
          <div className="flex items-center gap-2.5">
            <img
              src={form.logoDataUrl || '/pwa-192x192.png'}
              alt="Logo de la boutique"
              className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-contain p-0.5"
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
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0A3072] px-2.5 text-xs font-semibold text-white hover:bg-blue-900"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Importer mon logo
            </button>
            {form.logoDataUrl && (
              <button
                type="button"
                onClick={reinitialiserLogo}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
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
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Nom de la boutique
            </label>
            <input
              id="boutique-nom"
              type="text"
              required
              value={form.nomBoutique}
              onChange={(e) => setForm({ ...form, nomBoutique: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="boutique-sous-titre"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Activité / Sous-titre
            </label>
            <input
              id="boutique-sous-titre"
              type="text"
              value={form.sousTitre}
              onChange={(e) => setForm({ ...form, sousTitre: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="boutique-tel"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Téléphone
            </label>
            <input
              id="boutique-tel"
              type="text"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="boutique-adresse"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Adresse
            </label>
            <input
              id="boutique-adresse"
              type="text"
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="boutique-gerant"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Nom du gérant
            </label>
            <input
              id="boutique-gerant"
              type="text"
              value={form.nomGerant}
              onChange={(e) => setForm({ ...form, nomGerant: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="boutique-devise"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Devise
            </label>
            <input
              id="boutique-devise"
              type="text"
              value={form.devise}
              onChange={(e) => setForm({ ...form, devise: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="boutique-pied-facture"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Message en pied de facture (optionnel)
            </label>
            <input
              id="boutique-pied-facture"
              type="text"
              value={form.piedFacture ?? ''}
              onChange={(e) => setForm({ ...form, piedFacture: e.target.value })}
              placeholder="Ex: Merci pour votre confiance ! Garantie boutique 3 mois."
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Palette className="h-3.5 w-3.5 text-[#0A3072]" />
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
                    className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                      actif
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
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
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <Save className="h-4 w-4" />
              Enregistrer
            </button>
          </div>
        </form>
      </section>

      {/* Exportation complète des données (Excel & Word) */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-[#0A3072]" />
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                Exportation des données
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
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
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0A3072] px-3.5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-60 sm:text-sm"
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
