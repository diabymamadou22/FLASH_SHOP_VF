import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  ImagePlus,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { DESIGNS_FACTURE_A4 } from '../components/FactureImprimable';
import { LIBELLES_ROLE, verifierMotDePasseSuperAdmin } from '../services/auth';
import { exporterDonneesExcel, exporterDonneesWord } from '../services/exportDonnees';
import {
  BaseDonnees,
  DesignFactureA4,
  ParametresBoutique,
  RoleAssignable,
  Utilisateur,
} from '../types';
import { genererId } from '../utils/format';

interface ParametresPageProps {
  donnees: BaseDonnees;
  utilisateurConnecteId: string;
  onSauvegarderParametres: (parametres: ParametresBoutique) => void;
  onAjouterUtilisateur: (utilisateur: Utilisateur) => void;
  onModifierUtilisateur: (utilisateur: Utilisateur) => void;
  onSupprimerUtilisateur: (id: string) => void;
}

export default function ParametresPage({
  donnees,
  utilisateurConnecteId,
  onSauvegarderParametres,
  onAjouterUtilisateur,
  onModifierUtilisateur,
  onSupprimerUtilisateur,
}: ParametresPageProps) {
  const [form, setForm] = useState<ParametresBoutique>(donnees.parametres);
  const [messageSucces, setMessageSucces] = useState('');
  const [messageErreur, setMessageErreur] = useState('');
  const inputLogoRef = useRef<HTMLInputElement>(null);

  // États pour la gestion des utilisateurs et rôles
  const [nomUtilisateurUser, setNomUtilisateurUser] = useState('');
  const [motDePasseUser, setMotDePasseUser] = useState('');
  const [afficherMdpForm, setAfficherMdpForm] = useState(false);
  const [mdpVisibles, setMdpVisibles] = useState<Record<string, boolean>>({});
  const [roleUser, setRoleUser] = useState<RoleAssignable>('comptable');
  const [userEnEdition, setUserEnEdition] = useState<Utilisateur | null>(null);
  const [erreurUser, setErreurUser] = useState('');
  const [afficherListeUsers, setAfficherListeUsers] = useState(false);
  const [exportEnCours, setExportEnCours] = useState<'excel' | 'word' | null>(null);

  useEffect(() => {
    setForm(donnees.parametres);
  }, [donnees.parametres]);

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

  const afficherSucces = (msg: string) => {
    setMessageErreur('');
    setMessageSucces(msg);
    setTimeout(() => setMessageSucces(''), 3500);
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

  const reinitialiserFormUser = () => {
    setUserEnEdition(null);
    setNomUtilisateurUser('');
    setMotDePasseUser('');
    setAfficherMdpForm(false);
    setRoleUser('comptable');
    setErreurUser('');
  };

  const toggleMdpVisible = (id: string) => {
    setMdpVisibles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const chargerEditionUser = (u: Utilisateur) => {
    setUserEnEdition(u);
    setNomUtilisateurUser(u.nomUtilisateur ?? u.nom);
    setMotDePasseUser(u.motDePasse);
    setRoleUser(u.role);
    setErreurUser('');
  };

  const soumettreUtilisateur = (e: FormEvent) => {
    e.preventDefault();
    const nomUtilisateurPropre = nomUtilisateurUser.trim().replace(/^@/, '');
    const mdpPropre = motDePasseUser.trim();

    if (!nomUtilisateurPropre || !mdpPropre) {
      setErreurUser("Le nom d'utilisateur et le mot de passe sont obligatoires.");
      return;
    }

    if (nomUtilisateurPropre.toLowerCase() === 'admin') {
      setErreurUser("Ce nom d'utilisateur est réservé.");
      return;
    }

    const doublonPseudo = donnees.utilisateurs.some(
      (u) =>
        (u.nomUtilisateur ?? u.nom).trim().replace(/^@/, '').toLowerCase() ===
          nomUtilisateurPropre.toLowerCase() && u.id !== userEnEdition?.id
    );
    if (doublonPseudo) {
      setErreurUser("Ce nom d'utilisateur est déjà attribué à un autre utilisateur.");
      return;
    }

    if (verifierMotDePasseSuperAdmin(mdpPropre)) {
      setErreurUser("Ce mot de passe n'est pas disponible.");
      return;
    }

    if (userEnEdition) {
      onModifierUtilisateur({
        ...userEnEdition,
        nom: nomUtilisateurPropre,
        nomUtilisateur: nomUtilisateurPropre,
        motDePasse: mdpPropre,
        role: roleUser,
      });
      afficherSucces(`Compte "@${nomUtilisateurPropre}" mis à jour.`);
    } else {
      onAjouterUtilisateur({
        id: genererId('usr'),
        nom: nomUtilisateurPropre,
        nomUtilisateur: nomUtilisateurPropre,
        motDePasse: mdpPropre,
        role: roleUser,
        dateCreation: new Date().toISOString(),
      });
      afficherSucces(
        `Utilisateur "@${nomUtilisateurPropre}" créé avec le rôle ${LIBELLES_ROLE[roleUser]}.`
      );
    }

    reinitialiserFormUser();
  };

  const tenterSuppressionUser = (u: Utilisateur) => {
    if (u.id === utilisateurConnecteId) {
      setErreurUser('Vous ne pouvez pas supprimer votre propre compte actif.');
      return;
    }
    setErreurUser('');
    onSupprimerUtilisateur(u.id);
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

      {/* Gestion des utilisateurs et rôles */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[#0A3072]" />
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
              Gestion des utilisateurs et rôles
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setAfficherListeUsers((prev) => !prev)}
            aria-expanded={afficherListeUsers}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
              afficherListeUsers
                ? 'bg-[#0A3072] text-white hover:bg-blue-900'
                : 'border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Liste des utilisateurs ({donnees.utilisateurs.length})</span>
            {afficherListeUsers ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="space-y-3">
          {/* Formulaire création / modification utilisateur */}
          <form onSubmit={soumettreUtilisateur} className="space-y-2.5">
            {userEnEdition && (
              <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-1.5">
                <span className="text-xs font-semibold text-blue-800">
                  Modification de : @{userEnEdition.nomUtilisateur || userEnEdition.nom}
                </span>
                <button
                  type="button"
                  onClick={reinitialiserFormUser}
                  className="rounded-md p-1 text-blue-600 hover:bg-blue-100"
                  aria-label="Annuler la modification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {erreurUser && (
              <div className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
                {erreurUser}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Nom d&apos;utilisateur *
                </label>
                <input
                  type="text"
                  required
                  value={nomUtilisateurUser}
                  onChange={(e) => setNomUtilisateurUser(e.target.value)}
                  placeholder="Ex: ibrahim.compta"
                  className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Rôle *</label>
                <select
                  value={roleUser}
                  onChange={(e) => setRoleUser(e.target.value as RoleAssignable)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value="admin">Administrateur</option>
                  <option value="comptable">Comptable</option>
                  <option value="caissier">Caissier</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={afficherMdpForm ? 'text' : 'password'}
                    required
                    value={motDePasseUser}
                    onChange={(e) => setMotDePasseUser(e.target.value)}
                    placeholder="Mot de passe unique"
                    className="h-9 w-full rounded-lg border border-slate-200 pl-2.5 pr-8 text-sm focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAfficherMdpForm((v) => !v)}
                    className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={afficherMdpForm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    title={afficherMdpForm ? 'Masquer' : 'Afficher'}
                  >
                    {afficherMdpForm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <button
                  type="submit"
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {userEnEdition ? 'Mettre à jour' : 'Créer'}
                  </span>
                </button>
              </div>
            </div>

            <p className="text-[11px] leading-snug text-slate-500">
              <strong>Admin :</strong> accès complet · <strong>Comptable :</strong> bord, historique,
              dépenses, rapports · <strong>Caissier :</strong> caisse, lecture produits.
            </p>
          </form>

          {/* Liste des utilisateurs affichée dans la même interface au clic sur le bouton */}
          {afficherListeUsers && (
            <div className="border-t border-slate-100 pt-3">
              {donnees.utilisateurs.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                  Aucun utilisateur secondaire créé pour le moment. Utilisez le formulaire ci-dessus
                  pour ajouter un comptable, un caissier ou un administrateur.
                </div>
              ) : (
                <>
                  {/* Vue mobile */}
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 md:hidden">
                    {donnees.utilisateurs.map((u) => {
                      const visible = !!mdpVisibles[u.id];
                      return (
                        <div key={u.id} className="flex items-center justify-between gap-2 p-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-sm font-semibold text-slate-900">
                                @{u.nomUtilisateur || u.nom}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs">
                              <span className="font-medium text-blue-700">
                                {LIBELLES_ROLE[u.role]}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono text-slate-600">
                                {visible ? u.motDePasse : '••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleMdpVisible(u.id)}
                                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label={
                                  visible
                                    ? `Masquer le mot de passe de ${u.nom}`
                                    : `Afficher le mot de passe de ${u.nom}`
                                }
                              >
                                {visible ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => chargerEditionUser(u)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                              aria-label={`Modifier ${u.nom}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => tenterSuppressionUser(u)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700"
                              aria-label={`Supprimer ${u.nom}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Vue desktop sans défilement horizontal */}
                  <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
                    <table className="w-full border-collapse text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#0D357A] text-xs font-semibold text-white">
                          <th className="px-3 py-2">Utilisateur</th>
                          <th className="px-3 py-2">Rôle</th>
                          <th className="px-3 py-2">Mot de passe</th>
                          <th className="px-3 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {donnees.utilisateurs.map((u) => {
                          const visible = !!mdpVisibles[u.id];
                          return (
                            <tr key={u.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2">
                                <div className="font-mono text-xs font-semibold text-slate-900 sm:text-sm">
                                  @{u.nomUtilisateur || u.nom}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                  {LIBELLES_ROLE[u.role]}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-xs text-slate-700">
                                <div className="flex items-center gap-1.5">
                                  <span>{visible ? u.motDePasse : '••••••'}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleMdpVisible(u.id)}
                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                    aria-label={
                                      visible
                                        ? `Masquer le mot de passe de ${u.nom}`
                                        : `Afficher le mot de passe de ${u.nom}`
                                    }
                                    title={visible ? 'Masquer' : 'Afficher'}
                                  >
                                    {visible ? (
                                      <EyeOff className="h-3.5 w-3.5" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => chargerEditionUser(u)}
                                    className="rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-700"
                                    title="Modifier"
                                    aria-label={`Modifier ${u.nom}`}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => tenterSuppressionUser(u)}
                                    className="rounded-lg bg-red-600 p-1.5 text-white hover:bg-red-700"
                                    title="Supprimer"
                                    aria-label={`Supprimer ${u.nom}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Informations de la boutique */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
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
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Nom de la boutique
            </label>
            <input
              type="text"
              required
              value={form.nomBoutique}
              onChange={(e) => setForm({ ...form, nomBoutique: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Activité / Sous-titre
            </label>
            <input
              type="text"
              value={form.sousTitre}
              onChange={(e) => setForm({ ...form, sousTitre: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Téléphone</label>
            <input
              type="text"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Adresse</label>
            <input
              type="text"
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Nom du gérant</label>
            <input
              type="text"
              value={form.nomGerant}
              onChange={(e) => setForm({ ...form, nomGerant: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Devise</label>
            <input
              type="text"
              value={form.devise}
              onChange={(e) => setForm({ ...form, devise: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Message en pied de facture (optionnel)
            </label>
            <input
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
      <section className="rounded-xl border border-slate-200 bg-white p-4">
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
