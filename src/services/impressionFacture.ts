import { jsPDF } from 'jspdf';
import { FormatImpression } from '../components/FactureImprimable';
import { DesignFactureA4, ParametresBoutique, Vente } from '../types';
import { formatDateHeure, formatPrix } from '../utils/format';
import {
  LogoPdfResolu,
  ajouterLogoDansPdf,
  obtenirLogoPdfSync,
  prechargerLogoPdf,
} from './logoPdf';

function getPaletteA4(design: DesignFactureA4) {
  switch (design) {
    case 'moderne_emeraude':
      return {
        minimal: false,
        enteteFond: [6, 95, 70] as const,
        enteteBord: [52, 211, 153] as const,
        enteteTitre: [255, 255, 255] as const,
        enteteSous: [209, 250, 229] as const,
        enteteLabel: [110, 231, 183] as const,
        tableFond: [6, 95, 70] as const,
        tableTexte: [255, 255, 255] as const,
        carteFond: [240, 253, 244] as const,
        carteBord: [167, 243, 208] as const,
        totalTexte: [6, 95, 70] as const,
      };
    case 'prestige_noir':
      return {
        minimal: false,
        enteteFond: [15, 23, 42] as const,
        enteteBord: [245, 158, 11] as const,
        enteteTitre: [255, 255, 255] as const,
        enteteSous: [203, 213, 225] as const,
        enteteLabel: [251, 191, 36] as const,
        tableFond: [15, 23, 42] as const,
        tableTexte: [252, 211, 77] as const,
        carteFond: [255, 251, 235] as const,
        carteBord: [253, 230, 138] as const,
        totalTexte: [15, 23, 42] as const,
      };
    case 'minimal_epure':
      return {
        minimal: true,
        enteteFond: [255, 255, 255] as const,
        enteteBord: [30, 41, 59] as const,
        enteteTitre: [15, 23, 42] as const,
        enteteSous: [100, 116, 139] as const,
        enteteLabel: [71, 85, 105] as const,
        tableFond: [241, 245, 249] as const,
        tableTexte: [30, 41, 59] as const,
        carteFond: [255, 255, 255] as const,
        carteBord: [203, 213, 225] as const,
        totalTexte: [15, 23, 42] as const,
      };
    case 'classique_bleu':
    default:
      return {
        minimal: false,
        enteteFond: [10, 48, 114] as const,
        enteteBord: [249, 115, 22] as const,
        enteteTitre: [255, 255, 255] as const,
        enteteSous: [219, 234, 254] as const,
        enteteLabel: [253, 186, 116] as const,
        tableFond: [13, 53, 122] as const,
        tableTexte: [255, 255, 255] as const,
        carteFond: [248, 250, 252] as const,
        carteBord: [226, 232, 240] as const,
        totalTexte: [10, 48, 114] as const,
      };
  }
}

function genererPdfA4(
  vente: Vente,
  parametres: ParametresBoutique,
  design: DesignFactureA4,
  logo: LogoPdfResolu | null
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const devise = parametres.devise || 'FCFA';
  const paye = vente.estCredit ? Math.min(vente.total, vente.montantPaye ?? 0) : vente.total;
  const reste = Math.max(0, vente.total - paye);
  const estSolde = reste <= 0;
  const nbArticles = vente.lignes.reduce((s, l) => s + l.quantite, 0);
  const messagePied =
    parametres.piedFacture?.trim() ||
    'Merci pour votre confiance ! Les articles vendus sont garantis selon nos conditions.';
  const palette = getPaletteA4(design);

  // Bandeau en-tête selon le design choisi
  doc.setFillColor(palette.enteteFond[0], palette.enteteFond[1], palette.enteteFond[2]);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setFillColor(palette.enteteBord[0], palette.enteteBord[1], palette.enteteBord[2]);
  doc.rect(0, 34, 210, palette.minimal ? 0.8 : 1.8, 'F');

  let xTitre = 14;
  if (logo) {
    doc.setFillColor(
      palette.minimal ? 248 : 255,
      palette.minimal ? 250 : 255,
      palette.minimal ? 252 : 255
    );
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 7, 20, 20, 2.5, 2.5, palette.minimal ? 'FD' : 'F');
    if (ajouterLogoDansPdf(doc, logo, 15, 8, 18)) {
      xTitre = 38;
    }
  }

  doc.setTextColor(palette.enteteTitre[0], palette.enteteTitre[1], palette.enteteTitre[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(parametres.nomBoutique || 'FLASH-SHOP', xTitre, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(palette.enteteSous[0], palette.enteteSous[1], palette.enteteSous[2]);
  doc.text(parametres.sousTitre || '', xTitre, 21);
  doc.text(`${parametres.adresse} · Tél : ${parametres.telephone}`, xTitre, 27);

  // Référence facture à droite
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(palette.enteteLabel[0], palette.enteteLabel[1], palette.enteteLabel[2]);
  doc.text(vente.estCredit ? 'FACTURE À CRÉDIT' : 'FACTURE DE VENTE', 196, 13, {
    align: 'right',
  });
  doc.setFontSize(13);
  doc.setTextColor(palette.enteteTitre[0], palette.enteteTitre[1], palette.enteteTitre[2]);
  doc.text(vente.numeroFacture, 196, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(palette.enteteSous[0], palette.enteteSous[1], palette.enteteSous[2]);
  doc.text(formatDateHeure(vente.date), 196, 26, { align: 'right' });

  // Encadrés Client & Règlement
  let y = 44;
  doc.setFillColor(palette.carteFond[0], palette.carteFond[1], palette.carteFond[2]);
  doc.setDrawColor(palette.carteBord[0], palette.carteBord[1], palette.carteBord[2]);
  doc.roundedRect(14, y, 88, 22, 2, 2, 'FD');
  doc.roundedRect(108, y, 88, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('FACTURÉ À', 18, y + 6);
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(vente.clientNom || 'Client comptoir', 18, y + 12.5);
  if (vente.clientTelephone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Tél : ${vente.clientTelephone}`, 18, y + 18);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('RÈGLEMENT & STATUT', 112, y + 6);
  doc.setFontSize(9);
  doc.setTextColor(
    !vente.estCredit || estSolde ? 5 : 194,
    !vente.estCredit || estSolde ? 150 : 65,
    !vente.estCredit || estSolde ? 105 : 12
  );
  const statutTxt = !vente.estCredit ? 'PAYÉE' : estSolde ? 'CRÉDIT SOLDÉ' : 'CRÉDIT EN COURS';
  doc.text(statutTxt, 192, y + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Mode : ${vente.estCredit ? 'Crédit client' : vente.modePaiement}`, 112, y + 12.5);
  doc.text(`Établi par : ${parametres.nomGerant}`, 112, y + 18);

  // Tableau des articles
  y += 30;
  doc.setFillColor(palette.tableFond[0], palette.tableFond[1], palette.tableFond[2]);
  doc.rect(14, y, 182, 8.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(palette.tableTexte[0], palette.tableTexte[1], palette.tableTexte[2]);
  doc.text('Réf.', 17, y + 5.7);
  doc.text('Désignation', 42, y + 5.7);
  doc.text('Qté', 128, y + 5.7, { align: 'right' });
  doc.text('Prix unit.', 160, y + 5.7, { align: 'right' });
  doc.text('Montant', 193, y + 5.7, { align: 'right' });
  y += 8.5;

  vente.lignes.forEach((l, idx) => {
    const lignesNom = doc.splitTextToSize(l.nomProduit, 74) as string[];
    const hauteurLigne = Math.max(7.5, lignesNom.length * 4.5 + 3);
    if (y + hauteurLigne > 250) {
      doc.addPage();
      y = 18;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, hauteurLigne, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + hauteurLigne, 196, y + hauteurLigne);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(l.reference || '—', 17, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(lignesNom, 42, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.text(String(l.quantite), 128, y + 5, { align: 'right' });
    doc.text(formatPrix(l.prixUnitaire, devise), 160, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatPrix(l.sousTotal, devise), 193, y + 5, { align: 'right' });

    y += hauteurLigne;
  });

  // Bloc totaux + versements crédit
  y += 8;
  if (y > 240) {
    doc.addPage();
    y = 18;
  }

  if (vente.estCredit && vente.paiementsCredit && vente.paiementsCredit.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`VERSEMENTS ENREGISTRÉS (${vente.paiementsCredit.length})`, 14, y + 4);
    let yPay = y + 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    vente.paiementsCredit.slice(0, 6).forEach((p) => {
      doc.setTextColor(71, 85, 105);
      doc.text(`${formatDateHeure(p.date)} · ${p.modePaiement}`, 14, yPay);
      doc.setTextColor(5, 150, 105);
      doc.text(`+${formatPrix(p.montant, devise)}`, 114, yPay, { align: 'right' });
      yPay += 4.8;
    });
  }

  const hauteurBoxTotaux = vente.estCredit ? 30 : 18;
  doc.setFillColor(palette.carteFond[0], palette.carteFond[1], palette.carteFond[2]);
  doc.setDrawColor(palette.carteBord[0], palette.carteBord[1], palette.carteBord[2]);
  doc.roundedRect(122, y, 74, hauteurBoxTotaux, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Nombre d'articles", 126, y + 6);
  doc.text(String(nbArticles), 192, y + 6, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(palette.totalTexte[0], palette.totalTexte[1], palette.totalTexte[2]);
  doc.text('TOTAL', 126, y + 13.5);
  doc.text(formatPrix(vente.total, devise), 192, y + 13.5, { align: 'right' });

  if (vente.estCredit) {
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    doc.text('Montant payé', 126, y + 20.5);
    doc.text(formatPrix(paye, devise), 192, y + 20.5, { align: 'right' });

    doc.setFontSize(9.5);
    doc.setTextColor(234, 88, 12);
    doc.text('Reste à payer', 126, y + 26.5);
    doc.text(formatPrix(reste, devise), 192, y + 26.5, { align: 'right' });
  }

  // Signatures & Pied de page
  const ySig = Math.max(y + hauteurBoxTotaux + 18, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Signature du client', 55, ySig, { align: 'center' });
  doc.line(24, ySig + 14, 86, ySig + 14);

  doc.text(`Cachet & Signature ${parametres.nomBoutique}`, 155, ySig, { align: 'center' });
  doc.line(124, ySig + 14, 186, ySig + 14);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(messagePied, 105, ySig + 24, { align: 'center', maxWidth: 180 });

  return doc;
}

function genererPdfA5(
  vente: Vente,
  parametres: ParametresBoutique,
  logo: LogoPdfResolu | null
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const devise = parametres.devise || 'FCFA';
  const paye = vente.estCredit ? Math.min(vente.total, vente.montantPaye ?? 0) : vente.total;
  const reste = Math.max(0, vente.total - paye);
  const messagePied =
    parametres.piedFacture?.trim() ||
    'Merci pour votre confiance ! Les articles vendus sont garantis selon nos conditions.';

  let xBoutique = 10;
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(10, 10, 12.5, 12.5, 1.5, 1.5, 'FD');
    if (ajouterLogoDansPdf(doc, logo, 10.75, 10.75, 11)) {
      xBoutique = 25.5;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(10, 48, 114);
  doc.text(parametres.nomBoutique || 'FLASH-SHOP', xBoutique, 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(parametres.sousTitre || '', xBoutique, 18.8);
  doc.text(`${parametres.adresse} · ${parametres.telephone}`, xBoutique, 22.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(10, 48, 114);
  doc.text(vente.numeroFacture, 138, 14.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(formatDateHeure(vente.date), 138, 19, { align: 'right' });
  doc.text(vente.estCredit ? 'Crédit client' : vente.modePaiement, 138, 23, { align: 'right' });

  doc.setDrawColor(10, 48, 114);
  doc.setLineWidth(0.6);
  doc.line(10, 27, 138, 27);

  let y = 33;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, y, 128, 9, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const infoClient = vente.clientTelephone
    ? `Client : ${vente.clientNom} (${vente.clientTelephone})`
    : `Client : ${vente.clientNom}`;
  doc.text(infoClient, 13, y + 6);

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Article', 10, y);
  doc.text('Qté', 86, y, { align: 'right' });
  doc.text('P.U.', 111, y, { align: 'right' });
  doc.text('Total', 138, y, { align: 'right' });
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(10, y + 2, 138, y + 2);
  y += 6.5;

  vente.lignes.forEach((l) => {
    const lignesNom = doc.splitTextToSize(l.nomProduit, 66) as string[];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(lignesNom, 10, y);
    doc.text(String(l.quantite), 86, y, { align: 'right' });
    doc.text(formatPrix(l.prixUnitaire, devise), 111, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatPrix(l.sousTotal, devise), 138, y, { align: 'right' });
    y += Math.max(6, lignesNom.length * 4.2 + 2);
  });

  doc.line(10, y + 1, 138, y + 1);
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(10, 48, 114);
  doc.text('TOTAL À PAYER', 10, y);
  doc.text(formatPrix(vente.total, devise), 138, y, { align: 'right' });

  if (vente.estCredit) {
    y += 6;
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    doc.text('Montant payé', 10, y);
    doc.text(formatPrix(paye, devise), 138, y, { align: 'right' });
    y += 5;
    doc.setTextColor(234, 88, 12);
    doc.text('Reste à payer', 10, y);
    doc.text(formatPrix(reste, devise), 138, y, { align: 'right' });
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(messagePied, 74, Math.min(198, y + 14), { align: 'center', maxWidth: 124 });

  return doc;
}

function genererPdfTicket80(
  vente: Vente,
  parametres: ParametresBoutique,
  logo: LogoPdfResolu | null
): jsPDF {
  const devise = parametres.devise || 'FCFA';
  const paye = vente.estCredit ? Math.min(vente.total, vente.montantPaye ?? 0) : vente.total;
  const reste = Math.max(0, vente.total - paye);
  const messagePied =
    parametres.piedFacture?.trim() ||
    'Merci pour votre confiance ! Les articles vendus sont garantis selon nos conditions.';

  const hauteurEstimee = Math.max(130, 94 + vente.lignes.length * 11 + (vente.estCredit ? 18 : 0));
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, hauteurEstimee] });

  let y = 8;
  if (logo && ajouterLogoDansPdf(doc, logo, 34, y, 12)) {
    y += 15;
  }

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text((parametres.nomBoutique || 'FLASH-SHOP').toUpperCase(), 40, y, { align: 'center' });
  y += 4.2;

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  if (parametres.sousTitre) {
    doc.text(parametres.sousTitre, 40, y, { align: 'center' });
    y += 3.6;
  }
  doc.text(parametres.adresse || '', 40, y, { align: 'center' });
  y += 3.6;
  doc.text(`Tél: ${parametres.telephone}`, 40, y, { align: 'center' });
  y += 4;

  doc.text('------------------------------------------', 40, y, { align: 'center' });
  y += 4;

  doc.text(`N° Facture: ${vente.numeroFacture}`, 5, y);
  y += 3.8;
  doc.text(`Date: ${formatDateHeure(vente.date)}`, 5, y);
  y += 3.8;
  doc.text(`Client: ${vente.clientNom}`, 5, y, { maxWidth: 70 });
  y += 3.8;
  if (vente.clientTelephone) {
    doc.text(`Tél client: ${vente.clientTelephone}`, 5, y);
    y += 3.8;
  }
  doc.text(`Règlement: ${vente.estCredit ? 'Crédit' : vente.modePaiement}`, 5, y);
  y += 4;

  doc.text('------------------------------------------', 40, y, { align: 'center' });
  y += 4;

  vente.lignes.forEach((l) => {
    doc.setFont('courier', 'bold');
    const noms = doc.splitTextToSize(l.nomProduit, 70) as string[];
    doc.text(noms, 5, y);
    y += noms.length * 3.5;

    doc.setFont('courier', 'normal');
    doc.text(`${l.quantite} x ${formatPrix(l.prixUnitaire, devise)}`, 5, y);
    doc.setFont('courier', 'bold');
    doc.text(formatPrix(l.sousTotal, devise), 75, y, { align: 'right' });
    y += 4.5;
  });

  doc.setFont('courier', 'normal');
  doc.text('------------------------------------------', 40, y, { align: 'center' });
  y += 4.5;

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL', 5, y);
  doc.text(formatPrix(vente.total, devise), 75, y, { align: 'right' });

  if (vente.estCredit) {
    y += 4.5;
    doc.setFontSize(8);
    doc.text('PAYÉ', 5, y);
    doc.text(formatPrix(paye, devise), 75, y, { align: 'right' });
    y += 4.2;
    doc.text('RESTE À PAYER', 5, y);
    doc.text(formatPrix(reste, devise), 75, y, { align: 'right' });
  }

  y += 5;
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.text('------------------------------------------', 40, y, { align: 'center' });
  y += 4;
  doc.text(messagePied, 40, y, { align: 'center', maxWidth: 70 });

  return doc;
}

function creerDocumentPdf(
  vente: Vente,
  parametres: ParametresBoutique,
  format: FormatImpression,
  logo: LogoPdfResolu | null,
  designA4?: DesignFactureA4
): jsPDF {
  const designEffectif = designA4 ?? parametres.designFactureA4 ?? 'classique_bleu';
  return format === 'a4_pro'
    ? genererPdfA4(vente, parametres, designEffectif, logo)
    : format === 'a5_compact'
      ? genererPdfA5(vente, parametres, logo)
      : genererPdfTicket80(vente, parametres, logo);
}

function ouvrirOuTelechargerPdf(doc: jsPDF, nomFichier: string): 'pdf_tab' | 'pdf_download' {
  doc.autoPrint();
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.target = '_blank';
    lien.rel = 'noopener noreferrer';
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return 'pdf_tab';
  } catch {
    doc.save(nomFichier);
    return 'pdf_download';
  }
}

/**
 * Génère et télécharge directement la facture au format PDF selon le modèle choisi.
 */
export function telechargerPdfFacture(
  vente: Vente,
  parametres: ParametresBoutique,
  format: FormatImpression,
  designA4?: DesignFactureA4
): void {
  const logoSync = obtenirLogoPdfSync(parametres.logoDataUrl);
  if (logoSync) {
    const doc = creerDocumentPdf(vente, parametres, format, logoSync, designA4);
    doc.save(`${vente.numeroFacture}_${format}.pdf`);
    return;
  }

  void prechargerLogoPdf(parametres.logoDataUrl).then((logoCharge) => {
    const doc = creerDocumentPdf(vente, parametres, format, logoCharge, designA4);
    doc.save(`${vente.numeroFacture}_${format}.pdf`);
  });
}

/**
 * Lance l'impression directe du navigateur ; si l'environnement (aperçu iframe) bloque window.print(),
 * ouvre directement la facture PDF avec déclenchement d'impression dans un nouvel onglet.
 */
export function imprimerOuTelechargerFacture(
  vente: Vente,
  parametres: ParametresBoutique,
  format: FormatImpression,
  designA4?: DesignFactureA4
): 'print' | 'pdf_tab' | 'pdf_download' {
  // Hors iframe (onglet navigateur normal ou application PWA installée) : impression directe
  if (window.self === window.top) {
    window.print();
    return 'print';
  }

  let avantImpressionDeclenche = false;
  const marquerImpression = () => {
    avantImpressionDeclenche = true;
  };

  window.addEventListener('beforeprint', marquerImpression);
  try {
    window.print();
  } catch {
    // Bascule ci-dessous si l'iframe bloque window.print()
  } finally {
    window.removeEventListener('beforeprint', marquerImpression);
  }

  if (avantImpressionDeclenche) {
    return 'print';
  }

  const nomFichier = `${vente.numeroFacture}_${format}.pdf`;
  const logoSync = obtenirLogoPdfSync(parametres.logoDataUrl);
  if (logoSync) {
    const doc = creerDocumentPdf(vente, parametres, format, logoSync, designA4);
    return ouvrirOuTelechargerPdf(doc, nomFichier);
  }

  void prechargerLogoPdf(parametres.logoDataUrl).then((logoCharge) => {
    const doc = creerDocumentPdf(vente, parametres, format, logoCharge, designA4);
    ouvrirOuTelechargerPdf(doc, nomFichier);
  });
  return 'pdf_tab';
}
