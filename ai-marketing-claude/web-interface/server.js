const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Analyze endpoint — runs analyze_page.py
app.post('/analyze', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL requise' });

    const scriptPath = path.join(__dirname, '..', 'scripts', 'analyze_page.py');

    exec(`python "${scriptPath}" "${url}"`, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur d'exécution: ${error.message}`);
            return res.status(500).json({ error: 'Impossible de lancer l\'analyse', details: error.message });
        }

        try {
            const results = JSON.parse(stdout);
            res.json(results);
        } catch (parseError) {
            console.error(`Erreur de parsing: ${parseError.message}`);
            console.error(`stdout: ${stdout.substring(0, 500)}`);
            res.status(500).json({ error: 'Sortie invalide du script d\'analyse' });
        }
    });
});

// PDF generation endpoint — runs generate_pdf_report.py
app.post('/generate-pdf', (req, res) => {
    const data = req.body;
    if (!data) return res.status(400).json({ error: 'Données requises' });

    // Build a report-compatible JSON from the analysis results
    const analysis = data.analysis || {};
    const scores = analysis.scores || {};

    const reportData = {
        url: data.url || 'Site inconnu',
        date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        overall_score: (analysis.overall_score || 0) * 10,
        executive_summary: `Ce rapport présente une analyse marketing complète du site ${data.url || 'analysé'}. ` +
            `Score SEO: ${scores.seo || 0}/10, Conversion: ${scores.cta || 0}/10, ` +
            `Confiance: ${scores.trust || 0}/10, Tracking: ${scores.tracking || 0}/10. ` +
            `Score global: ${((analysis.overall_score || 0) * 10).toFixed(0)}/100.`,
        categories: {
            'SEO & Visibilité': { score: (scores.seo || 0) * 10, weight: '30%' },
            'Conversion & CTAs': { score: (scores.cta || 0) * 10, weight: '25%' },
            'Confiance & Autorité': { score: (scores.trust || 0) * 10, weight: '20%' },
            'Tracking & Analytics': { score: (scores.tracking || 0) * 10, weight: '25%' },
        },
        findings: [],
        brand_name: data.url || 'Site analysé',
    };

    // Build findings from the analysis
    const seo = analysis.seo || {};
    if (!seo.title) reportData.findings.push({ severity: 'Critical', finding: 'Titre de la page manquant — essentiel pour le SEO et l\'affichage dans les moteurs de recherche' });
    if (!seo.meta_description) reportData.findings.push({ severity: 'Critical', finding: 'Meta description absente — empêche un bon affichage dans les résultats Google' });
    if (seo.images_without_alt > 0) reportData.findings.push({ severity: 'High', finding: `${seo.images_without_alt} image(s) sans attribut alt — nuit au SEO et à l'accessibilité` });
    if ((analysis.conversion || {}).cta_count === 0) reportData.findings.push({ severity: 'High', finding: 'Aucun CTA détecté — le site ne guide pas les visiteurs vers une action' });
    if ((analysis.tracking || {}).tools_count === 0) reportData.findings.push({ severity: 'Medium', finding: 'Aucun outil de tracking détecté (Google Analytics, etc.)' });
    if (!(analysis.robots || {}).exists) reportData.findings.push({ severity: 'Medium', finding: 'Fichier robots.txt absent' });
    if (!(analysis.sitemap || {}).exists) reportData.findings.push({ severity: 'Medium', finding: 'Sitemap.xml absent — les moteurs de recherche ne peuvent pas explorer le site efficacement' });
    if (seo.heading_issues && seo.heading_issues.length > 0) reportData.findings.push({ severity: 'Medium', finding: `Problèmes de hiérarchie des titres : ${seo.heading_issues.join(', ')}` });

    if (reportData.findings.length === 0) {
        reportData.findings.push({ severity: 'Low', finding: 'Aucun problème majeur détecté. Le site semble bien optimisé.' });
    }

    // Quick wins in French
    reportData.quick_wins = [
        seo.title && !seo.title_ok ? `Optimiser le titre (actuellement ${seo.title_length} car., idéal: 30-60)` : null,
        seo.meta_description && !seo.meta_description_ok ? `Revoir la meta description (actuellement ${seo.meta_description_length} car., idéal: 120-160)` : null,
        seo.images_without_alt > 0 ? `Ajouter des attributs alt aux ${seo.images_without_alt} images manquantes` : null,
        'Vérifier la présence d\'un appel à l\'action clair au-dessus de la ligne de flottaison',
    ].filter(Boolean);

    reportData.medium_term = [
        'Créer un blog avec du contenu optimisé pour les mots-clés cibles',
        'Mettre en place une stratégie de liens internes vers les pages produits',
        'Ajouter des témoignages clients et des badges de confiance',
        'Implémenter un formulaire de capture d\'emails avec un lead magnet',
    ];

    reportData.strategic = [
        'Développer une stratégie de content marketing sur 6 mois',
        'Mettre en place des campagnes de retargeting (Google Ads, Meta)',
        'Optimiser le parcours de conversion (A/B testing)',
        'Construire une présence sur les réseaux sociaux adaptée à la cible',
    ];

    // Write JSON to temp file
    const tmpDir = os.tmpdir();
    const jsonPath = path.join(tmpDir, `marketing-report-${Date.now()}.json`);
    const pdfPath = path.join(tmpDir, `rapport-marketing-${Date.now()}.pdf`);
    const scriptPath = path.join(__dirname, '..', 'scripts', 'generate_pdf_report.py');

    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2), { encoding: 'utf-8' });

    exec(`python "${scriptPath}" "${jsonPath}" "${pdfPath}"`, { timeout: 30000 }, (error, stdout, stderr) => {
        // Clean up JSON temp file
        try { fs.unlinkSync(jsonPath); } catch (e) { /* ignore */ }

        if (error) {
            console.error(`Erreur PDF: ${error.message}`);
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({ error: 'Erreur lors de la génération du PDF', details: error.message });
        }

        // Send the PDF file
        res.download(pdfPath, `rapport-marketing.pdf`, (err) => {
            // Clean up PDF temp file after download
            try { fs.unlinkSync(pdfPath); } catch (e) { /* ignore */ }
            if (err) console.error('Erreur d\'envoi du PDF:', err);
        });
    });
});

app.listen(port, () => {
    console.log(`✅ Serveur d'analyse en écoute sur http://localhost:${port}`);
});
