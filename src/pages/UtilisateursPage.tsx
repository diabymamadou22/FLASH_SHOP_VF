import { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { LIBELLES_ROLE, validerUtilisateurForm } from '../services/auth';
import { RoleAssignable, Utilisateur } from '../types';
import { genererId } from '../utils/format';

interface UtilisateursPageProps {
  utilisateurs: Utilisateur[];
  utilisateurConnecteId: string;
  codeMaitreAdmin?: string;
  onAjouterUtilisateur: (utilisateur: Utilisateur) => void;
  onModifierUtilisateur: (utilisateur: Utilisateur) => void;
  onSupprimerUtilisateur: (id: string) => void;
  onRetourParametres: () => void;
}

export default function UtilisateursPage({
  utilisateurs,
  utilisateurConnecteId,
  codeMaitreAdmin,
  onAjouterUtilisateur,
  onModifierUtilisateur,
  onSupprimerUtilisateur,
  onRetourParametres,
}: UtilisateursPageProps) {
  const toast = useToast();
  const [nomUtilisateurUser, setNomUtilisateurUser] = useState('');
  const [motDePasseUser, setMotDePasseUser] = useState('');
  const [afficherMdpForm, setAfficherMdpForm] = useState(false);
  const [mdpVisibles, setMdpVisibles] = useState<Record<string, boolean>>({});
  const [roleUser, setRoleUser] = useState<RoleAssignable>('comptable');
  const [userEnEdition, setUserEnEdition] = useState<Utilisateur | null>(null);
  const [erreurUser, setErreurUser] = useState('');
  const [messageSucces, setMessageSucces] = useState('');

  const afficherSucces = (msg: string) => {
    setErreurUser('');
    setMessageSucces(msg);
    setTimeout(() => setMessageSucces(''), 3500);
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

    const validation = validerUtilisateurForm(
      nomUtilisateurUser,
      motDePasseUser,
      utilisateurs,
      userEnEdition?.id,
      codeMaitreAdmin
    );

    if (!validation.valide || !validation.nomUtilisateurPropre || !validation.motDePassePropre) {
      const msg = validation.erreur ?? 'Données invalides.';
      setErreurUser(msg);
      toast.erreur('Enregistrement impossible', msg);
      return;
    }

    const { nomUtilisateurPropre, motDePassePropre } = validation;

    if (userEnEdition) {
      onModifierUtilisateur({
        ...userEnEdition,
        nom: nomUtilisateurPropre,
        nomUtilisateur: nomUtilisateurPropre,
        motDePasse: motDePassePropre,
        role: roleUser,
      });
      afficherSucces(`Compte "@${nomUtilisateurPropre}" mis à jour.`);
    } else {
      onAjouterUtilisateur({
        id: genererId('usr'),
        nom: nomUtilisateurPropre,
        nomUtilisateur: nomUtilisateurPropre,
        motDePasse: motDePassePropre,
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
      const msg = 'Vous ne pouvez pas supprimer votre propre compte actif.';
      setErreurUser(msg);
      toast.erreur('Action refusée', msg);
      return;
    }
    setErreurUser('');
    onSupprimerUtilisateur(u.id);
    if (userEnEdition?.id === u.id) {
      reinitialiserFormUser();
    }
    afficherSucces(`Compte "@${u.nomUtilisateur || u.nom}" supprimé.`);
  };

  return (
    <div className="space-y-4">
      <div>
        <button
          type="button"
          onClick={onRetourParametres}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          <span>Retour aux paramètres</span>
        </button>
      </div>

      {messageSucces && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {messageSucces}
        </div>
      )}

      {/* Formulaire de création / modification des utilisateurs */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[#0A3072] dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
              Gestion des utilisateurs et rôles
            </h2>
          </div>
          {userEnEdition && (
            <button
              type="button"
              onClick={reinitialiserFormUser}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" />
              Annuler l&apos;édition
            </button>
          )}
        </div>

        <form onSubmit={soumettreUtilisateur} className="space-y-3">
          {userEnEdition && (
            <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-1.5 dark:bg-blue-950/40">
              <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                Modification de : @{userEnEdition.nomUtilisateur || userEnEdition.nom}
              </span>
              <button
                type="button"
                onClick={reinitialiserFormUser}
                className="rounded-md p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50"
                aria-label="Annuler la modification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {erreurUser && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-800/70 dark:bg-red-950/40 dark:text-red-300">
              {erreurUser}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="user-nom"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Nom d&apos;utilisateur *
              </label>
              <input
                id="user-nom"
                type="text"
                required
                value={nomUtilisateurUser}
                onChange={(e) => setNomUtilisateurUser(e.target.value)}
                placeholder="Ex: ibrahim.compta"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="user-role"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Rôle *
              </label>
              <select
                id="user-role"
                value={roleUser}
                onChange={(e) => setRoleUser(e.target.value as RoleAssignable)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="admin">Administrateur</option>
                <option value="comptable">Comptable</option>
                <option value="caissier">Caissier</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="user-mdp"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Mot de passe *
              </label>
              <div className="relative">
                <input
                  id="user-mdp"
                  type={afficherMdpForm ? 'text' : 'password'}
                  required
                  value={motDePasseUser}
                  onChange={(e) => setMotDePasseUser(e.target.value)}
                  placeholder="Mot de passe unique"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-2.5 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setAfficherMdpForm((v) => !v)}
                  className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
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
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white hover:bg-blue-800"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{userEnEdition ? 'Mettre à jour' : 'Créer'}</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            <strong>Admin :</strong> accès complet · <strong>Comptable :</strong> bord, historique,
            dépenses, rapports · <strong>Caissier :</strong> caisse, lecture produits.
          </p>
        </form>
      </section>

      {/* Liste des utilisateurs */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#0A3072] dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
              Liste des utilisateurs ({utilisateurs.length})
            </h2>
          </div>
        </div>

        {utilisateurs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Aucun utilisateur secondaire créé pour le moment. Utilisez le formulaire ci-dessus pour
            ajouter un comptable, un caissier ou un administrateur.
          </div>
        ) : (
          <>
            {/* Vue mobile */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
              {utilisateurs.map((u) => {
                const visible = !!mdpVisibles[u.id];
                return (
                  <div key={u.id} className="flex items-center justify-between gap-2 p-3.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                          @{u.nomUtilisateur || u.nom}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span className="font-medium text-blue-700 dark:text-blue-400">
                          {LIBELLES_ROLE[u.role]}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                          {visible ? u.motDePasse : '••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleMdpVisible(u.id)}
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          aria-label={
                            visible
                              ? `Masquer le mot de passe de ${u.nom}`
                              : `Afficher le mot de passe de ${u.nom}`
                          }
                        >
                          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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

            {/* Vue desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#0D357A] text-xs font-semibold text-white dark:bg-slate-800 dark:text-slate-100">
                    <th className="px-4 py-2.5">Utilisateur</th>
                    <th className="px-4 py-2.5">Rôle</th>
                    <th className="px-4 py-2.5">Mot de passe</th>
                    <th className="px-4 py-2.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {utilisateurs.map((u) => {
                    const visible = !!mdpVisibles[u.id];
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="px-4 py-2.5">
                          <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 sm:text-sm">
                            @{u.nomUtilisateur || u.nom}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            {LIBELLES_ROLE[u.role]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span>{visible ? u.motDePasse : '••••••'}</span>
                            <button
                              type="button"
                              onClick={() => toggleMdpVisible(u.id)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
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
                        <td className="px-4 py-2.5">
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
      </section>
    </div>
  );
}
