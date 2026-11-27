import test from 'node:test';
import assert from 'node:assert/strict';
import { calculerSoldeDisponible, verifierDepenseAutorisee } from './depenses';
import { ApportCaisse, Depense, Vente } from '../types';

const ventesMock: Vente[] = [
  {
    id: 'v-1',
    numeroFacture: 'FAC-2026-001',
    date: '2026-11-20T10:00:00.000Z',
    clientNom: 'Moussa',
    modePaiement: 'Especes',
    lignes: [],
    total: 100000,
  },
  {
    id: 'v-2',
    numeroFacture: 'FAC-2026-002',
    date: '2026-11-21T12:00:00.000Z',
    clientNom: 'Aminata',
    modePaiement: 'Orange Money',
    lignes: [],
    total: 80000,
    estCredit: true,
    montantPaye: 30000, // Seuls 30 000 sont encaissés
  },
];

const depensesMock: Depense[] = [
  {
    id: 'dep-1',
    libelle: 'Loyer',
    categorie: 'Loyer',
    montant: 50000,
    date: '2026-11-22T09:00:00.000Z',
  },
];

const apportsMock: ApportCaisse[] = [
  {
    id: 'app-1',
    libelle: 'Fond de caisse initial',
    montant: 25000,
    date: '2026-11-19T08:00:00.000Z',
  },
];

test('calculerSoldeDisponible ne compte que les montants réellement encaissés et les apports', () => {
  const etat = calculerSoldeDisponible(ventesMock, depensesMock);
  assert.equal(etat.totalEncaisse, 130000);
  assert.equal(etat.totalDepenses, 50000);
  assert.equal(etat.soldeDisponible, 80000);

  const etatAvecApport = calculerSoldeDisponible(ventesMock, depensesMock, apportsMock);
  assert.equal(etatAvecApport.totalApports, 25000);
  assert.equal(etatAvecApport.soldeDisponible, 105000);
});

test('verifierDepenseAutorisee refuse toute dépense supérieure au solde disponible', () => {
  const ok = verifierDepenseAutorisee(80000, ventesMock, depensesMock);
  assert.equal(ok.autorise, true);

  const ko = verifierDepenseAutorisee(85000, ventesMock, depensesMock);
  assert.equal(ko.autorise, false);
  assert.ok(ko.erreur?.includes('Dépense refusée'));

  const okAvecApport = verifierDepenseAutorisee(20000, [], [], 'FCFA', apportsMock);
  assert.equal(okAvecApport.autorise, true);

  const koCaisseVide = verifierDepenseAutorisee(1000, [], []);
  assert.equal(koCaisseVide.autorise, false);
});
