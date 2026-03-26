import { jsPDF } from 'jspdf';

export const exportToPDF = (t, s, lang = 'fr') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(24);
    doc.setTextColor(255, 126, 103); // --primary color
    doc.text("ClassScribe", pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(new Date().toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US'), pageWidth / 2, 28, { align: 'center' });

    doc.setDrawColor(255, 126, 103);
    doc.setLineWidth(0.5);
    doc.line(20, 32, pageWidth - 20, 32);

    let y = 42;
    doc.setTextColor(45, 52, 54); // --text-dark

    if (s) {
        doc.setFontSize(14);
        doc.setTextColor(95, 201, 248); // --secondary
        doc.text(lang === 'fr' ? "Résumé IA" : "AI Summary", 20, y);
        y += 8;
        doc.setFontSize(11);
        doc.setTextColor(45, 52, 54);
        const lines = doc.splitTextToSize(s, 170);
        lines.forEach(l => {
            if (y > 280) { doc.addPage(); y = 20; }
            doc.text(l, 20, y);
            y += 6;
        });
        y += 10;
    }

    doc.setFontSize(14);
    doc.setTextColor(255, 126, 103);
    doc.text("Transcription", 20, y);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(45, 52, 54);

    // Strip HTML tags for PDF
    const plainText = t.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const tLines = doc.splitTextToSize(plainText, 170);
    tLines.forEach(l => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(l, 20, y);
        y += 6;
    });

    doc.save(`classscribe_${Date.now()}.pdf`);
};

export const exportJournalToPDF = (pages, lang = 'fr') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cover page
    doc.setFontSize(28);
    doc.setTextColor(255, 126, 103);
    doc.text(lang === 'fr' ? "Journal de Bord" : "Logbook", pageWidth / 2, 80, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(150, 150, 150);
    doc.text(new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US'), pageWidth / 2, 95, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(95, 201, 248);
    doc.text(`${pages.length} ${lang === 'fr' ? 'pages' : 'pages'}`, pageWidth / 2, 108, { align: 'center' });

    // Pages
    pages.forEach((page, i) => {
        doc.addPage();
        let y = 20;

        // Page header
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i + 1} / ${pages.length}`, pageWidth - 20, y, { align: 'right' });

        y += 10;
        doc.setFontSize(18);
        doc.setTextColor(255, 126, 103);
        doc.text(page.title || `Page ${i + 1}`, 20, y);

        y += 8;
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(page.date || '', 20, y);

        y += 12;
        doc.setDrawColor(255, 219, 88);
        doc.setLineWidth(0.5);
        doc.line(20, y, pageWidth - 20, y);
        y += 8;

        doc.setFontSize(11);
        doc.setTextColor(45, 52, 54);
        const plainText = (page.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const lines = doc.splitTextToSize(plainText, 170);
        lines.forEach(l => {
            if (y > 280) { doc.addPage(); y = 20; }
            doc.text(l, 20, y);
            y += 6;
        });
    });

    doc.save(`journal_${Date.now()}.pdf`);
};
