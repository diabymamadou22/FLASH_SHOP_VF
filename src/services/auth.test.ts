import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authentifierUtilisateur,
  peutAccederPage,
  validerUtilisateurForm,
} from './auth';
import { Utilisateur } from '../types';

const utilisateursMock: Utilisateur[] = [
  {
    id: 'usr-1',
    nom: 'ibrahim.compta',
    nomUtilisateur: 'ibrahim.compta',
    motDePasse: 'secret123',
    role: 'comptable',
    dateCreation: '2026-01-01T00:00:00.000Z',
  },
];

test('peutAccederPage accorde utilisateurs et parametres aux admins uniquement', () => {
  assert.equal(peutAccederPage('super_admin', 'utilisateurs'), true);
  assert.equal(peutAccederPage('super_admin', 'parametres'), true);
  assert.equal(peutAccederPage('admin', 'utilisateurs'), true);
  assert.equal(peutAccederPage('admin', 'parametres'), true);

  assert.equal(peutAccederPage('comptable', 'utilisateurs'), false);
  assert.equal(peutAccederPage('comptable', 'parametres'), false);
  assert.equal(peutAccederPage('caissier', 'utilisateurs'), false);
  assert.equal(peutAccederPage('caissier', 'parametres'), false);
});

test('validerUtilisateurForm refuse les champs vides, admin reserve, doublons et code maitre', () => {
  assert.equal(validerUtilisateurForm('', 'abc', utilisateursMock).valide, false);
  assert.equal(validerUtilisateurForm('  @Admin ', 'abc', utilisateursMock).valide, false);
  assert.equal(validerUtilisateurForm('IBRAHIM.COMPTA', 'abc', utilisateursMock).valide, false);
  assert.equal(validerUtilisateurForm('fatou', '00223', utilisateursMock).valide, false);
});

test('validerUtilisateurForm autorise la modification sans faux doublon et normalise @', () => {
  const resEdition = validerUtilisateurForm(
    ' @ibrahim.compta ',
    'nouveau123',
    utilisateursMock,
    'usr-1'
  );
  assert.equal(resEdition.valide, true);
  assert.equal(resEdition.nomUtilisateurPropre, 'ibrahim.compta');
  assert.equal(resEdition.motDePassePropre, 'nouveau123');
});

test('authentifierUtilisateur connecte le super admin et les utilisateurs secondaires', () => {
  const adminSession = authentifierUtilisateur('admin', '00223', utilisateursMock);
  assert.equal(adminSession?.role, 'super_admin');

  const comptaSession = authentifierUtilisateur('@ibrahim.compta', 'secret123', utilisateursMock);
  assert.equal(comptaSession?.role, 'comptable');
  assert.equal(comptaSession?.id, 'usr-1');
});

test('authentifierUtilisateur respecte strictement les majuscules et minuscules', () => {
  assert.equal(authentifierUtilisateur('Admin', '00223', utilisateursMock), null);
  assert.equal(authentifierUtilisateur('ADMIN', '00223', utilisateursMock), null);
  assert.equal(authentifierUtilisateur('Ibrahim.compta', 'secret123', utilisateursMock), null);
  assert.equal(authentifierUtilisateur('IBRAHIM.COMPTA', 'secret123', utilisateursMock), null);
  assert.equal(authentifierUtilisateur('ibrahim.compta', 'Secret123', utilisateursMock), null);
});

test('authentifierUtilisateur utilise le mot de passe administrateur personnalisé lorsqu il est défini', () => {
  assert.equal(authentifierUtilisateur('admin', '00223', utilisateursMock, 'Mali2026!'), null);
  const custom = authentifierUtilisateur('admin', 'Mali2026!', utilisateursMock, 'Mali2026!');
  assert.equal(custom?.role, 'super_admin');
  assert.equal(validerUtilisateurForm('fatou', 'Mali2026!', utilisateursMock, undefined, 'Mali2026!').valide, false);
});
