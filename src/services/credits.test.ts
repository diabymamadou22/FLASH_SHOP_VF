import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculerCreditEnCoursClient,
  calculerCreditEnCoursTotal,
  evaluerLimiteCredit,
  getRaccourcisEcheanceCredit,
  getStatutEcheanceCredit,
} from './credits';
import { ParametresBoutique, Vente } from '../types';

const parametresBase: ParametresBoutique = {
  nomBoutique: 'FLASH-SHOP',
  sousTitre: 'Matériels Électroniques',
  telephone: '+223 76 12 34 56',
  adresse: 'Bamako - Mali',
  nomGerant: 'Admin',
  roleGerant: 'Administrateur',
  devise: 'FCFA',
  limiteCredit: 100000,
  modeLimiteCredit: 'par_client',
};

const ventesMock: Vente[] = [
  {
    id: 'v-1',
    numeroFacture: 'FAC-2026-001',
    date: '2026-11-20T10:00:00.000Z',
    clientNom: 'Moussa Traoré',
    clientTelephone: '+223 76 11 22 33',
    modePaiement: 'Especes',
    lignes: [],
    total: 80000,
    estCredit: true,
    montantPaye: 20000,
    dateEcheanceCredit: '2026-11-28',
  },
  {
    id: 'v-2',
    numeroFacture: 'FAC-2026-002',
    date: '2026-11-22T12:00:00.000Z',
    clientNom: 'Aminata Diallo',
    clientTelephone: '70 44 55 66',
    modePaiement: 'Orange Money',
    lignes: [],
    total: 50000,
    estCredit: true,
    montantPaye: 15000,
    dateEcheanceCredit: '2026-11-25',
  },
];

test('getRaccourcisEcheanceCredit génère les dates +7j, +15j, +30j et fin du mois', () => {
  const base = new Date(2026, 10, 10); // 10 novembre 2026
  const raccourcis = getRaccourcisEcheanceCredit(base);
  assert.equal(raccourcis[0].date, '2026-11-17');
  assert.equal(raccourcis[1].date, '2026-11-25');
  assert.equal(raccourcis[2].date, '2026-12-10');
  assert.equal(raccourcis[3].date, '2026-11-30');
});

test('getStatutEcheanceCredit détecte retard, aujourd hui et à venir', () => {
  const base = new Date(2026, 10, 27); // 27 novembre 2026
  assert.equal(getStatutEcheanceCredit('2026-11-25', 10000, base)?.type, 'retard');
  assert.equal(getStatutEcheanceCredit('2026-11-27', 10000, base)?.type, 'aujourdhui');
  assert.equal(getStatutEcheanceCredit('2026-12-05', 10000, base)?.type, 'a_venir');
  assert.equal(getStatutEcheanceCredit('2026-11-25', 0, base), null);
});

test('calculerCreditEnCoursClient et Total agrègent correctement les soldes restants', () => {
  assert.equal(calculerCreditEnCoursTotal(ventesMock), 95000);
  // Même client avec format local 8 chiffres vs +223
  assert.equal(calculerCreditEnCoursClient(ventesMock, 'Moussa', '76112233'), 60000);
  assert.equal(calculerCreditEnCoursClient(ventesMock, 'Nouveau Client', '79000000'), 0);
});

test('evaluerLimiteCredit bloque le dépassement par client et en mode global', () => {
  // Moussa doit déjà 60 000 FCFA sur un plafond de 100 000 FCFA -> disponible = 40 000
  const okClient = evaluerLimiteCredit({
    ventes: ventesMock,
    parametres: parametresBase,
    clientNom: 'Moussa Traoré',
    clientTelephone: '76 11 22 33',
    nouveauCredit: 40000,
  });
  assert.equal(okClient.active, true);
  assert.equal(okClient.depassee, false);
  assert.equal(okClient.disponible, 40000);

  const koClient = evaluerLimiteCredit({
    ventes: ventesMock,
    parametres: parametresBase,
    clientNom: 'Moussa Traoré',
    clientTelephone: '76 11 22 33',
    nouveauCredit: 45000,
  });
  assert.equal(koClient.depassee, true);

  // Mode global : total existant = 95 000 sur plafond 100 000 -> disponible = 5 000
  const koGlobal = evaluerLimiteCredit({
    ventes: ventesMock,
    parametres: { ...parametresBase, modeLimiteCredit: 'globale' },
    clientNom: 'Fatou',
    clientTelephone: '78000000',
    nouveauCredit: 10000,
  });
  assert.equal(koGlobal.depassee, true);
  assert.equal(koGlobal.disponible, 5000);
});
