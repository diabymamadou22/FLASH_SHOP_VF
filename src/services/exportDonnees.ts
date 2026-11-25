import * as XLSX from 'xlsx';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { LIBELLES_ROLE } from './auth';
import { BaseDonnees } from '../types';
import {
  formatDateCourte,
  formatDateHeure,
  formatPrix,
  getStatutStock,
} from '../utils/format';

function nomFichierExport(nomBoutique: string, extension: 'xlsx' | 'docx'): string {
  const propre = (nomBoutique || 'FLASH-SHOP')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const dateJour = new Date().toISOString().slice(0, 10);
  return `${propre || 'FLASH-SHOP'}_donnees_${dateJour}.${extension}`;
}

function libelleStatutStock(stock: number, seuil: number): string {
  const statut = getStatutStock(stock, seuil);
  if (statut === 'rupture') return 'Rupture';
  if (statut === 'stock_faible') return 'Stock faible';
  return 'En stock';
}

function calculerSynthese(donnees: BaseDonnees) {
  const { produits, categories, ventes, depenses, mouvementsStock, utilisateurs } = donnees;

  const caFacture = ventes.reduce((acc, v) => acc + v.total, 0);
  const caEncaisse = ventes.reduce(
    (acc, v) => acc + (v.estCredit ? Math.min(v.total, v.montantPaye ?? 0) : v.total),
    0
  );
  const creditsARecouvrer = ventes.reduce(
    (acc, v) => acc + (v.estCredit ? Math.max(0, v.total - (v.montantPaye ?? 0)) : 0),
    0
  );
  const coutMarchandises = ventes.reduce(
    (acc, v) => acc + v.lignes.reduce((s, l) => s + l.prixAchatUnitaire * l.quantite, 0),
    0
  );
  const margeBrute = caEncaisse - coutMarchandises;
  const totalDepenses = depenses.reduce((acc, d) => acc + d.montant, 0);
  const beneficeNet = margeBrute - totalDepenses;

  const valeurStockAchat = produits.reduce((acc, p) => acc + p.prixAchat * p.stock, 0);
  const valeurStockVente = produits.reduce((acc, p) => acc + p.prixVente * p.stock, 0);
  const totalUnitesStock = produits.reduce((acc, p) => acc + p.stock, 0);
  const produitsRupture = produits.filter((p) => p.stock <= 0).length;
  const produitsStockFaible = produits.filter((p) => p.stock > 0 && p.stock <= p.seuil).length;

  const ventesCredit = ventes.filter(
    (v) => v.estCredit || (v.montantPaye !== undefined && v.montantPaye < v.total)
  );
  const creditsEnCours = ventesCredit.filter((v) => (v.montantPaye ?? 0) < v.total).length;

  return {
    nbCategories: categories.length,
    nbProduits: produits.length,
    totalUnitesStock,
    produitsRupture,
    produitsStockFaible,
    valeurStockAchat,
    valeurStockVente,
    nbVentes: ventes.length,
    nbVentesCredit: ventesCredit.length,
    creditsEnCours,
    caFacture,
    caEncaisse,
    creditsARecouvrer,
    coutMarchandises,
    margeBrute,
    totalDepenses,
    beneficeNet,
    nbMouvements: mouvementsStock.length,
    nbUtilisateurs: utilisateurs.length,
  };
}

function creerFeuilleAvecLargeurs(
  lignes: Record<string, string | number>[],
  largeurs: number[]
): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(lignes);
  ws['!cols'] = largeurs.map((wch) => ({ wch }));
  return ws;
}

/**
 * Exporte toutes les données importantes de l'application dans un classeur Excel (.xlsx) multi-onglets.
 */
export function exporterDonneesExcel(donnees: BaseDonnees): void {
  const { parametres, categories, produits, ventes, depenses, mouvementsStock, utilisateurs } =
    donnees;
  const devise = parametres.devise || 'FCFA';
  const synthese = calculerSynthese(donnees);
  const dateExport = formatDateHeure(new Date().toISOString());

  const mapCategories = new Map(categories.map((c) => [c.id, c.nom]));

  const wb = XLSX.utils.book_new();

  // 1. Synthèse générale
  const lignesSynthese = [
    { Indicateur: 'Boutique', Valeur: parametres.nomBoutique },
    { Indicateur: 'Activité', Valeur: parametres.sousTitre },
    { Indicateur: 'Téléphone', Valeur: parametres.telephone },
    { Indicateur: 'Adresse', Valeur: parametres.adresse },
    { Indicateur: 'Gérant', Valeur: parametres.nomGerant },
    { Indicateur: 'Devise', Valeur: devise },
    { Indicateur: 'Date d’exportation', Valeur: dateExport },
    { Indicateur: '---', Valeur: '---' },
    { Indicateur: 'Nombre de catégories', Valeur: synthese.nbCategories },
    { Indicateur: 'Nombre de produits', Valeur: synthese.nbProduits },
    { Indicateur: 'Total unités en stock', Valeur: synthese.totalUnitesStock },
    { Indicateur: 'Produits en stock faible', Valeur: synthese.produitsStockFaible },
    { Indicateur: 'Produits en rupture', Valeur: synthese.produitsRupture },
    { Indicateur: `Valeur stock (achat, ${devise})`, Valeur: synthese.valeurStockAchat },
    { Indicateur: `Valeur stock (vente, ${devise})`, Valeur: synthese.valeurStockVente },
    { Indicateur: 'Nombre total de ventes', Valeur: synthese.nbVentes },
    { Indicateur: `Chiffre d'affaires facturé (${devise})`, Valeur: synthese.caFacture },
    { Indicateur: `Chiffre d'affaires encaissé (${devise})`, Valeur: synthese.caEncaisse },
    { Indicateur: `Crédits clients à recouvrer (${devise})`, Valeur: synthese.creditsARecouvrer },
    { Indicateur: 'Crédits encore en cours', Valeur: synthese.creditsEnCours },
    { Indicateur: `Coût d'achat marchandises (${devise})`, Valeur: synthese.coutMarchandises },
    { Indicateur: `Marge brute (${devise})`, Valeur: synthese.margeBrute },
    { Indicateur: `Total des dépenses (${devise})`, Valeur: synthese.totalDepenses },
    { Indicateur: `Bénéfice net estimé (${devise})`, Valeur: synthese.beneficeNet },
  ];
  XLSX.utils.book_append_sheet(
    wb,
    creerFeuilleAvecLargeurs(lignesSynthese, [38, 32]),
    'Synthèse'
  );

  // 2. Produits & Stocks
  const lignesProduits =
    produits.length > 0
      ? produits.map((p) => ({
          Référence: p.reference,
          'Code-barres': p.codeBarre || '—',
          Produit: p.nom,
          Catégorie: mapCategories.get(p.categorieId) || 'Sans catégorie',
          [`Prix achat (${devise})`]: p.prixAchat,
          [`Prix vente (${devise})`]: p.prixVente,
          [`Marge unitaire (${devise})`]: p.prixVente - p.prixAchat,
          'Stock actuel': p.stock,
          "Seuil d'alerte": p.seuil,
          Statut: libelleStatutStock(p.stock, p.seuil),
          [`Valeur achat (${devise})`]: p.prixAchat * p.stock,
          [`Valeur vente (${devise})`]: p.prixVente * p.stock,
          "Date d'ajout": formatDateCourte(p.dateAjout),
        }))
      : [{ Information: 'Aucun produit enregistré' }];
  XLSX.utils.book_append_sheet(
    wb,
    creerFeuilleAvecLargeurs(lignesProduits, [14, 16, 28, 18, 16, 16, 16, 12, 14, 14, 18, 18, 14]),
    'Produits & Stocks'
  );

  // 3. Ventes (historique complet)
  const lignesVentes =
    ventes.length > 0
      ? ventes.map((v) => {
          const paye = v.estCredit ? Math.min(v.total, v.montantPaye ?? 0) : v.total;
          const reste = Math.max(0, v.total - paye);
          const statut = reste === 0 ? 'Payée' : paye > 0 ? 'Partiel' : 'Impayée';
          const articles = v.lignes
            .map((l) => `${l.nomProduit} x${l.quantite}`)
            .join(' | ');
          return {
            'N° Facture': v.numeroFacture,
            Date: formatDateHeure(v.date),
            Client: v.clientNom || 'Client comptoir',
            Téléphone: v.clientTelephone || '—',
            Type: v.estCredit ? 'Crédit' : 'Comptant',
            'Mode paiement': v.modePaiement,
            Articles: articles,
            [`Total (${devise})`]: v.total,
            [`Montant payé (${devise})`]: paye,
            [`Reste à payer (${devise})`]: reste,
            Statut: statut,
          };
        })
      : [{ Information: 'Aucune vente enregistrée' }];
  XLSX.utils.book_append_sheet(
    wb,
    creerFeuilleAvecLargeurs(lignesVentes, [18, 18, 22, 16, 11, 15, 40, 15, 16, 16, 12]),
    'Ventes'
  );

  // 4. Crédits clients
  const ventesCredit = ventes.filter(
    (v) => v.estCredit || (v.montantPaye !== undefined && v.montantPaye < v.total)
  );
  const lignesCredits =
    ventesCredit.length > 0
      ? ventesCredit.map((v) => {
          const paye = Math.min(v.total, v.montantPaye ?? 0);
          const reste = Math.max(0, v.total - paye);
          return {
            'N° Facture': v.numeroFacture,
            Date: formatDateHeure(v.date),
            Client: v.clientNom || 'Client',
            Téléphone: v.clientTelephone || '—',
            [`Total (${devise})`]: v.total,
            [`Déjà payé (${devise})`]: paye,
            [`Reste à payer (${devise})`]: reste,
            Statut: reste <= 0 ? 'Soldé' : 'En cours',
            Versements: v.paiementsCredit?.length ?? 0,
          };
        })
      : [{ Information: 'Aucune vente à crédit enregistrée' }];
  XLSX.utils.book_append_sheet(
    wb,
    creerFeuilleAvecLargeurs(lignesCredits, [18, 18, 22, 16, 16, 16, 16, 12, 12]),
    'Crédits clients'
  );

  // 5. Dépenses
  const lignesDepenses =
    depenses.length > 0
      ? depenses.map((d) => ({
          Date: formatDateCourte(d.date),
          Libellé: d.libelle,
          Catégorie: d.categorie,
          [`Montant (${devise})`]: d.montant,
        }))
      : [{ Information: 'Aucune dépense enregistrée' }];
  XLSX.utils.book_append_sheet(
    wb,
    creerFeuilleAvecLargeurs(lignesDepenses, [16, 36, 18, 18]),
    'Dépenses'
  );

  // 6. Mouvements de stock
  const lignesMouvements =
    mouvementsStock.length > 0
      ? mouvementsStock.map((m) => ({
          Date: formatDateHeure(m.date),
          Produit: m.nomProduit,
          Type: m.type === 'entree' ? 'Entrée' : 'Sortie',
          Quantité: m.quantite,
          Motif: m.motif,
        }))
      : [{ Information: 'Aucun mouvement de stock enregistré' }];
  XLSX.utils.book_append_sheet(
    wb,
    creerFeuilleAvecLargeurs(lignesMouvements, [18, 28, 12, 12, 34]),
    'Mouvements stock'
  );

  // 7. Catégories
  const lignesCategories =
    categories.length > 0
      ? categories.map((c) => {
          const items = produits.filter((p) => p.categorieId === c.id);
          return {
            Catégorie: c.nom,
            Description: c.description || '—',
            'Nb produits': items.length,
            'Unités en stock': items.reduce((s, p) => s + p.stock, 0),
            [`Valeur stock achat (${devise})`]: items.reduce(
              (s, p) => s + p.prixAchat * p.stock,
              0
            ),
          };
        })
      : [{ Information: 'Aucune catégorie enregistrée' }];
  XLSX.utils.book_append_sheet(
    wb,
    creerFeuilleAvecLargeurs(lignesCategories, [22, 34, 14, 16, 22]),
    'Catégories'
  );

  // 8. Utilisateurs (sans mots de passe)
  const lignesUtilisateurs =
    utilisateurs.length > 0
      ? utilisateurs.map((u) => ({
          'Nom complet': u.nom,
          "Nom d'utilisateur": u.nomUtilisateur ? `@${u.nomUtilisateur}` : '—',
          Rôle: LIBELLES_ROLE[u.role],
          'Date création': formatDateCourte(u.dateCreation),
        }))
      : [{ Information: 'Aucun utilisateur secondaire enregistré' }];
  XLSX.utils.book_append_sheet(
    wb,
    creerFeuilleAvecLargeurs(lignesUtilisateurs, [24, 22, 18, 16]),
    'Utilisateurs'
  );

  XLSX.writeFile(wb, nomFichierExport(parametres.nomBoutique, 'xlsx'));
}

// --- Helpers de mise en page Word (.docx) ---

const COULEUR_PRIMAIRE = '0A3072';
const COULEUR_BORDURE = 'CBD5E1';
const COULEUR_ZEBRA = 'F8FAFC';

function titreSectionWord(texte: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    border: {
      bottom: {
        color: COULEUR_PRIMAIRE,
        space: 4,
        style: BorderStyle.SINGLE,
        size: 8,
      },
    },
    children: [
      new TextRun({
        text: texte,
        bold: true,
        size: 26,
        color: COULEUR_PRIMAIRE,
      }),
    ],
  });
}

function celluleWord(
  texte: string,
  options?: {
    gras?: boolean;
    couleur?: string;
    fond?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  }
): TableCell {
  return new TableCell({
    shading: options?.fond
      ? { type: ShadingType.CLEAR, color: 'auto', fill: options.fond }
      : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: COULEUR_BORDURE },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COULEUR_BORDURE },
      left: { style: BorderStyle.SINGLE, size: 4, color: COULEUR_BORDURE },
      right: { style: BorderStyle.SINGLE, size: 4, color: COULEUR_BORDURE },
    },
    children: [
      new Paragraph({
        alignment: options?.align ?? AlignmentType.LEFT,
        children: [
          new TextRun({
            text: texte,
            bold: options?.gras ?? false,
            size: 18,
            color: options?.couleur ?? '1E293B',
          }),
        ],
      }),
    ],
  });
}

function creerTableauWord(
  entetes: string[],
  lignes: string[][],
  colonnesDroite: number[] = []
): Table {
  const ligneEntete = new TableRow({
    tableHeader: true,
    children: entetes.map((h, idx) =>
      celluleWord(h, {
        gras: true,
        couleur: 'FFFFFF',
        fond: COULEUR_PRIMAIRE,
        align: colonnesDroite.includes(idx) ? AlignmentType.RIGHT : AlignmentType.LEFT,
      })
    ),
  });

  const lignesCorps = lignes.map(
    (ligne, rowIdx) =>
      new TableRow({
        children: ligne.map((val, colIdx) =>
          celluleWord(val, {
            fond: rowIdx % 2 === 1 ? COULEUR_ZEBRA : undefined,
            align: colonnesDroite.includes(colIdx) ? AlignmentType.RIGHT : AlignmentType.LEFT,
          })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [ligneEntete, ...lignesCorps],
  });
}

function noteVideWord(message: string): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 120 },
    children: [
      new TextRun({
        text: message,
        italics: true,
        size: 19,
        color: '64748B',
      }),
    ],
  });
}

/**
 * Exporte un rapport Word (.docx) structuré contenant toutes les données importantes de la boutique.
 */
export async function exporterDonneesWord(donnees: BaseDonnees): Promise<void> {
  const { parametres, categories, produits, ventes, depenses, mouvementsStock, utilisateurs } =
    donnees;
  const devise = parametres.devise || 'FCFA';
  const synthese = calculerSynthese(donnees);
  const dateExport = formatDateHeure(new Date().toISOString());
  const mapCategories = new Map(categories.map((c) => [c.id, c.nom]));

  const ventesCredit = ventes.filter(
    (v) => v.estCredit || (v.montantPaye !== undefined && v.montantPaye < v.total)
  );

  const enfants: (Paragraph | Table)[] = [
    // En-tête du document
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: parametres.nomBoutique || 'FLASH-SHOP',
          bold: true,
          size: 36,
          color: COULEUR_PRIMAIRE,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: `Rapport complet des données — ${parametres.sousTitre || 'Gestion commerciale'}`,
          bold: true,
          size: 22,
          color: '334155',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [
        new TextRun({
          text: `${parametres.adresse} · Tél : ${parametres.telephone} · Gérant : ${parametres.nomGerant} · Exporté le ${dateExport}`,
          size: 18,
          color: '64748B',
        }),
      ],
    }),

    // 1. Synthèse financière et stocks
    titreSectionWord('1. Synthèse financière et état général'),
    creerTableauWord(
      ['Indicateur clé', 'Valeur'],
      [
        ["Chiffre d'affaires facturé", formatPrix(synthese.caFacture, devise)],
        ["Chiffre d'affaires encaissé", formatPrix(synthese.caEncaisse, devise)],
        ['Crédits clients à recouvrer', formatPrix(synthese.creditsARecouvrer, devise)],
        ['Total des dépenses', formatPrix(synthese.totalDepenses, devise)],
        ['Marge brute sur ventes', formatPrix(synthese.margeBrute, devise)],
        ['Bénéfice net estimé', formatPrix(synthese.beneficeNet, devise)],
        ['Valeur du stock (prix d’achat)', formatPrix(synthese.valeurStockAchat, devise)],
        ['Valeur du stock (prix de vente)', formatPrix(synthese.valeurStockVente, devise)],
        [
          'Inventaire',
          `${synthese.nbProduits} produits (${synthese.totalUnitesStock} unités) · ${synthese.produitsStockFaible} faible(s), ${synthese.produitsRupture} en rupture`,
        ],
        [
          'Activité enregistrée',
          `${synthese.nbVentes} ventes · ${synthese.creditsEnCours} crédit(s) en cours · ${depenses.length} dépenses`,
        ],
      ],
      [1]
    ),

    // 2. Produits & Stocks
    titreSectionWord(`2. Produits et stocks (${produits.length})`),
    produits.length > 0
      ? creerTableauWord(
          ['Réf.', 'Produit', 'Catégorie', 'Achat', 'Vente', 'Stock', 'Statut'],
          produits.map((p) => [
            p.reference,
            p.nom,
            mapCategories.get(p.categorieId) || '—',
            formatPrix(p.prixAchat, devise),
            formatPrix(p.prixVente, devise),
            String(p.stock),
            libelleStatutStock(p.stock, p.seuil),
          ]),
          [3, 4, 5]
        )
      : noteVideWord('Aucun produit enregistré.'),

    // 3. Historique des ventes
    titreSectionWord(`3. Historique des ventes (${ventes.length})`),
    ventes.length > 0
      ? creerTableauWord(
          ['N° Facture', 'Date', 'Client', 'Type / Mode', 'Total', 'Payé', 'Reste'],
          ventes.map((v) => {
            const paye = v.estCredit ? Math.min(v.total, v.montantPaye ?? 0) : v.total;
            const reste = Math.max(0, v.total - paye);
            const client = v.clientTelephone
              ? `${v.clientNom} (${v.clientTelephone})`
              : v.clientNom;
            return [
              v.numeroFacture,
              formatDateCourte(v.date),
              client,
              `${v.estCredit ? 'Crédit' : 'Comptant'} · ${v.modePaiement}`,
              formatPrix(v.total, devise),
              formatPrix(paye, devise),
              formatPrix(reste, devise),
            ];
          }),
          [4, 5, 6]
        )
      : noteVideWord('Aucune vente enregistrée.'),

    // 4. Crédits clients
    titreSectionWord(`4. Suivi des crédits clients (${ventesCredit.length})`),
    ventesCredit.length > 0
      ? creerTableauWord(
          ['Facture', 'Client', 'Téléphone', 'Total', 'Payé', 'Reste', 'Statut'],
          ventesCredit.map((v) => {
            const paye = Math.min(v.total, v.montantPaye ?? 0);
            const reste = Math.max(0, v.total - paye);
            return [
              v.numeroFacture,
              v.clientNom,
              v.clientTelephone || '—',
              formatPrix(v.total, devise),
              formatPrix(paye, devise),
              formatPrix(reste, devise),
              reste <= 0 ? 'Soldé' : 'En cours',
            ];
          }),
          [3, 4, 5]
        )
      : noteVideWord('Aucune vente à crédit enregistrée.'),

    // 5. Dépenses
    titreSectionWord(`5. Dépenses enregistrées (${depenses.length})`),
    depenses.length > 0
      ? creerTableauWord(
          ['Date', 'Libellé', 'Catégorie', 'Montant'],
          depenses.map((d) => [
            formatDateCourte(d.date),
            d.libelle,
            d.categorie,
            formatPrix(d.montant, devise),
          ]),
          [3]
        )
      : noteVideWord('Aucune dépense enregistrée.'),

    // 6. Mouvements de stock
    titreSectionWord(`6. Mouvements de stock (${mouvementsStock.length})`),
    mouvementsStock.length > 0
      ? creerTableauWord(
          ['Date', 'Produit', 'Type', 'Qté', 'Motif'],
          mouvementsStock.map((m) => [
            formatDateCourte(m.date),
            m.nomProduit,
            m.type === 'entree' ? 'Entrée' : 'Sortie',
            String(m.quantite),
            m.motif,
          ]),
          [3]
        )
      : noteVideWord('Aucun mouvement de stock enregistré.'),

    // 7. Catégories et Utilisateurs
    titreSectionWord(`7. Catégories (${categories.length}) et Utilisateurs (${utilisateurs.length})`),
    categories.length > 0
      ? creerTableauWord(
          ['Catégorie', 'Description', 'Nb produits', 'Stock (unités)'],
          categories.map((c) => {
            const items = produits.filter((p) => p.categorieId === c.id);
            return [
              c.nom,
              c.description || '—',
              String(items.length),
              String(items.reduce((s, p) => s + p.stock, 0)),
            ];
          }),
          [2, 3]
        )
      : noteVideWord('Aucune catégorie enregistrée.'),
  ];

  if (utilisateurs.length > 0) {
    enfants.push(
      new Paragraph({ spacing: { before: 160, after: 80 } }),
      creerTableauWord(
        ['Nom complet', "Nom d'utilisateur", 'Rôle', 'Date création'],
        utilisateurs.map((u) => [
          u.nom,
          u.nomUtilisateur ? `@${u.nomUtilisateur}` : '—',
          LIBELLES_ROLE[u.role],
          formatDateCourte(u.dateCreation),
        ])
      )
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: enfants,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichierExport(parametres.nomBoutique, 'docx');
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}
