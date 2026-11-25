import { jsPDF } from 'jspdf';
import { Depense, ParametresBoutique, Produit, Vente } from '../types';
import { formatDateCourte, formatDateHeure, formatPrix } from '../utils/format';
import {
  LogoPdfResolu,
  ajouterLogoDansPdf,
  obtenirLogoPdfSync,
  prechargerLogoPdf,
} from './logoPdf';

export type TypePeriodeRapport = 'jour' | 'mois' | 'annee' | 'tout';

export interface DonneesRapportPeriode {
  titrePeriode: string;
  sousTitrePeriode: string;
  ventes: Vente[];
  depenses: Depense[];
  produits: Produit[];
  chiffreAffairesFacture: number;
  chiffreAffairesEncaisse: number;
  creditsARecouvrer: number;
  coutMarchandises: number;
  margeBrute: number;
  totalDepenses: number;
  beneficeNet: number;
  valeurStockVente: number;
  parCategorie: {
    id: string;
    nom: string;
    nbProduits: number;
    unites: number;
    valeur: number;
  }[];
  parametres: ParametresBoutique;
}

function creerPdfRapport(rapport: DonneesRapportPeriode, logo: LogoPdfResolu | null): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { parametres } = rapport;
  const devise = parametres.devise || 'FCFA';

  // Bandeau en-tête bleu nuit + accent orange
  doc.setFillColor(10, 48, 114);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 32, 210, 1.8, 'F');

  let xTitre = 14;
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 6, 20, 20, 2.5, 2.5, 'F');
    if (ajouterLogoDansPdf(doc, logo, 15, 7, 18)) {
      xTitre = 38;
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(parametres.nomBoutique || 'FLASH-SHOP', xTitre, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(191, 219, 254);
  doc.text(parametres.sousTitre || '', xTitre, 20);
  doc.text(`${parametres.adresse} · Tél : ${parametres.telephone}`, xTitre, 25.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(253, 186, 116);
  doc.text('RAPPORT FINANCIER', 196, 12, { align: 'right' });
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(rapport.titrePeriode, 196, 19, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(219, 234, 254);
  doc.text(`Édité le ${formatDateHeure(new Date().toISOString())}`, 196, 25.5, { align: 'right' });

  let y = 41;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(10, 48, 114);
  doc.text(`1. Synthèse financière (${rapport.sousTitrePeriode})`, 14, y);
  y += 3.5;

  const lignesSynthese: [string, string][] = [
    ['Nombre de ventes sur la période', String(rapport.ventes.length)],
    ["Chiffre d'affaires total facturé", formatPrix(rapport.chiffreAffairesFacture, devise)],
    ["Chiffre d'affaires encaissé", formatPrix(rapport.chiffreAffairesEncaisse, devise)],
    ['Crédits clients à recouvrer', formatPrix(rapport.creditsARecouvrer, devise)],
    ["Coût d'achat des articles vendus", formatPrix(rapport.coutMarchandises, devise)],
    ['Marge commerciale brute', formatPrix(rapport.margeBrute, devise)],
    [`Dépenses enregistrées (${rapport.depenses.length})`, formatPrix(rapport.totalDepenses, devise)],
    ['Bénéfice net estimé (Marge - Dépenses)', formatPrix(rapport.beneficeNet, devise)],
    ['Valeur potentielle du stock (prix de vente)', formatPrix(rapport.valeurStockVente, devise)],
  ];

  doc.setFillColor(13, 53, 122);
  doc.rect(14, y, 182, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Indicateur', 17, y + 5);
  doc.text('Montant / Valeur', 193, y + 5, { align: 'right' });
  y += 7.5;

  lignesSynthese.forEach(([label, valeur], idx) => {
    const estBenefice = idx === 7;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 7, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 7, 196, y + 7);
    doc.setFont('helvetica', estBenefice ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(label, 17, y + 4.8);
    doc.setFont('helvetica', 'bold');
    if (estBenefice) {
      doc.setTextColor(rapport.beneficeNet >= 0 ? 5 : 220, rapport.beneficeNet >= 0 ? 150 : 38, rapport.beneficeNet >= 0 ? 105 : 38);
    }
    doc.text(valeur, 193, y + 4.8, { align: 'right' });
    y += 7;
  });

  // 2. Détail des ventes de la période
  y += 9;
  if (y > 250) {
    doc.addPage();
    y = 18;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(10, 48, 114);
  doc.text(`2. Ventes de la période (${rapport.ventes.length})`, 14, y);
  y += 3.5;

  if (rapport.ventes.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Aucune vente enregistrée sur cette période.', 14, y + 4);
    y += 10;
  } else {
    doc.setFillColor(13, 53, 122);
    doc.rect(14, y, 182, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Facture', 17, y + 5);
    doc.text('Date', 48, y + 5);
    doc.text('Client', 78, y + 5);
    doc.text('Règlement', 122, y + 5);
    doc.text('Total', 165, y + 5, { align: 'right' });
    doc.text('Encaissé', 193, y + 5, { align: 'right' });
    y += 7.5;

    rapport.ventes.forEach((v, idx) => {
      if (y > 272) {
        doc.addPage();
        y = 18;
      }
      const encaisse = v.estCredit ? Math.min(v.total, v.montantPaye ?? 0) : v.total;
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 6.8, 'F');
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 6.8, 196, y + 6.8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      doc.text(v.numeroFacture, 17, y + 4.7);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(formatDateCourte(v.date), 48, y + 4.7);
      doc.text((v.clientNom || 'Client comptoir').slice(0, 24), 78, y + 4.7);
      doc.text(v.estCredit ? 'Crédit' : v.modePaiement, 122, y + 4.7);

      doc.setTextColor(15, 23, 42);
      doc.text(formatPrix(v.total, devise), 165, y + 4.7, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatPrix(encaisse, devise), 193, y + 4.7, { align: 'right' });
      y += 6.8;
    });
  }

  // 3. Détail des dépenses de la période
  y += 9;
  if (y > 250) {
    doc.addPage();
    y = 18;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(10, 48, 114);
  doc.text(`3. Dépenses de la période (${rapport.depenses.length})`, 14, y);
  y += 3.5;

  if (rapport.depenses.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Aucune dépense enregistrée sur cette période.', 14, y + 4);
    y += 10;
  } else {
    doc.setFillColor(13, 53, 122);
    doc.rect(14, y, 182, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Date', 17, y + 5);
    doc.text('Libellé', 46, y + 5);
    doc.text('Catégorie', 132, y + 5);
    doc.text('Montant', 193, y + 5, { align: 'right' });
    y += 7.5;

    rapport.depenses.forEach((d, idx) => {
      if (y > 272) {
        doc.addPage();
        y = 18;
      }
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 6.8, 'F');
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 6.8, 196, y + 6.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(formatDateCourte(d.date), 17, y + 4.7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(d.libelle.slice(0, 44), 46, y + 4.7);
      doc.setFont('helvetica', 'normal');
      doc.text(d.categorie, 132, y + 4.7);
      doc.setFont('helvetica', 'bold');
      doc.text(formatPrix(d.montant, devise), 193, y + 4.7, { align: 'right' });
      y += 6.8;
    });
  }

  // 4. Valeur du stock actuel par catégorie
  y += 9;
  if (y > 245) {
    doc.addPage();
    y = 18;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(10, 48, 114);
  doc.text('4. État actuel du stock par catégorie', 14, y);
  y += 3.5;

  doc.setFillColor(13, 53, 122);
  doc.rect(14, y, 182, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Catégorie', 17, y + 5);
  doc.text('Références', 110, y + 5, { align: 'right' });
  doc.text('Unités', 145, y + 5, { align: 'right' });
  doc.text('Valeur (achat)', 193, y + 5, { align: 'right' });
  y += 7.5;

  rapport.parCategorie.forEach((cat, idx) => {
    if (y > 272) {
      doc.addPage();
      y = 18;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 6.8, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 6.8, 196, y + 6.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(cat.nom, 17, y + 4.7);
    doc.setFont('helvetica', 'normal');
    doc.text(String(cat.nbProduits), 110, y + 4.7, { align: 'right' });
    doc.text(String(cat.unites), 145, y + 4.7, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatPrix(cat.valeur, devise), 193, y + 4.7, { align: 'right' });
    y += 6.8;
  });

  // Pied de signature
  y += 12;
  if (y > 272) {
    doc.addPage();
    y = 22;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Établi par : ${parametres.nomGerant} · ${parametres.nomBoutique}`, 14, y);
  doc.text('Visa / Cachet', 180, y, { align: 'right' });

  return doc;
}

function ouvrirOuTelechargerPdfRapport(
  doc: jsPDF,
  slugPeriode: string
): 'pdf_tab' | 'pdf_download' {
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
    doc.save(`Rapport_${slugPeriode}.pdf`);
    return 'pdf_download';
  }
}

export function telechargerPdfRapport(rapport: DonneesRapportPeriode, slugPeriode: string): void {
  const logoSync = obtenirLogoPdfSync(rapport.parametres.logoDataUrl);
  if (logoSync) {
    const doc = creerPdfRapport(rapport, logoSync);
    doc.save(`Rapport_${slugPeriode}.pdf`);
    return;
  }

  void prechargerLogoPdf(rapport.parametres.logoDataUrl).then((logoCharge) => {
    const doc = creerPdfRapport(rapport, logoCharge);
    doc.save(`Rapport_${slugPeriode}.pdf`);
  });
}

export function imprimerOuTelechargerRapport(
  rapport: DonneesRapportPeriode,
  slugPeriode: string
): 'print' | 'pdf_tab' | 'pdf_download' {
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
    // Fallback géré ci-dessous
  } finally {
    window.removeEventListener('beforeprint', marquerImpression);
  }

  if (avantImpressionDeclenche) {
    return 'print';
  }

  const logoSync = obtenirLogoPdfSync(rapport.parametres.logoDataUrl);
  if (logoSync) {
    const doc = creerPdfRapport(rapport, logoSync);
    return ouvrirOuTelechargerPdfRapport(doc, slugPeriode);
  }

  void prechargerLogoPdf(rapport.parametres.logoDataUrl).then((logoCharge) => {
    const doc = creerPdfRapport(rapport, logoCharge);
    ouvrirOuTelechargerPdfRapport(doc, slugPeriode);
  });
  return 'pdf_tab';
}
