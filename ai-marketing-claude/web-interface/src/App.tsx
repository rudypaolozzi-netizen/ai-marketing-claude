import { useState } from 'react'
import { Search, Globe, Shield, MousePointer, Layout, Loader2, AlertCircle, FileDown } from 'lucide-react'

interface AnalysisResults {
    url: string;
    status: string;
    analysis: {
        overall_score: number;
        scores: {
            seo: number;
            cta: number;
            trust: number;
            tracking: number;
        };
        seo: {
            title: string;
            title_length: number;
            title_ok: boolean;
            meta_description: string;
            meta_description_length: number;
            meta_description_ok: boolean;
            has_viewport: boolean;
            headings: Record<string, string[]>;
            heading_issues: string[];
            images_total: number;
            images_without_alt: number;
            images_with_lazy_loading: number;
            og_tags: Record<string, string>;
        };
        content: {
            word_count: number;
            headings_count: number;
            h1: string[];
            h2: string[];
        };
        conversion: {
            cta_count: number;
            ctas: { text: string; type: string }[];
            form_count: number;
            forms: any[];
            buttons: string[];
        };
        trust: {
            social_links: { platform: string; url: string }[];
            social_link_count: number;
        };
        tracking: {
            tools_detected: string[];
            tools_count: number;
            schema_types: string[];
            schema_count: number;
        };
        technical: {
            total_links: number;
            internal_links: number;
            external_links: number;
            scripts_count: number;
        };
        robots: {
            exists: boolean;
            has_sitemap_reference: boolean;
        };
        sitemap: {
            exists: boolean;
            url_count: number;
        };
    }
}

function App() {
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [pdfLoading, setPdfLoading] = useState(false)
    const [results, setResults] = useState<AnalysisResults | null>(null)
    const [error, setError] = useState<string | null>(null)

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://ai-marketing-api-t6xt.onrender.com'

    const handleAnalyze = async () => {
        if (!url) return
        setLoading(true)
        setError(null)
        setResults(null)

        try {
            const response = await fetch(`${BACKEND_URL}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            })

            if (!response.ok) throw new Error('Erreur serveur')
            const data = await response.json()
            if (data.status === 'error') {
                setError(data.message || 'Impossible d\'analyser cette URL.')
            } else {
                setResults(data)
            }
        } catch (err) {
            setError("Impossible de se connecter au serveur d'analyse. Vérifiez que le backend tourne (npm run server).")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadPdf = async () => {
        if (!results) return
        setPdfLoading(true)
        try {
            const response = await fetch(`${BACKEND_URL}/generate-pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(results)
            })
            if (!response.ok) throw new Error('Erreur PDF')
            const blob = await response.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = downloadUrl
            a.download = `rapport-marketing-${new Date().toISOString().slice(0, 10)}.pdf`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(downloadUrl)
        } catch (err) {
            console.error(err)
            setError("Erreur lors de la génération du PDF. Vérifiez que reportlab est installé.")
        } finally {
            setPdfLoading(false)
        }
    }

    const getScoreLabel = (s: number) => {
        if (s >= 8) return 'Optimal'
        if (s >= 5) return 'À améliorer'
        return 'Critique'
    }

    const getScoreClass = (s: number) => {
        if (s >= 8) return 'status-ok'
        if (s >= 5) return 'status-warn'
        return 'status-error'
    }

    const getOverallColor = (s: number) => {
        if (s >= 7) return '#34d399'
        if (s >= 5) return '#fbbf24'
        return '#f87171'
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header style={{ marginBottom: '3rem' }}>
                <h1 style={{
                    fontSize: '3rem', fontWeight: '800',
                    background: 'linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #ec4899 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0'
                }}>
                    AI Marketing Suite
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '1.2rem', marginTop: '0.5rem' }}>
                    Audit marketing professionnel & optimisation de votre site web
                </p>
            </header>

            {/* Search Bar */}
            <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={20} />
                        <input
                            type="text"
                            placeholder="Entrez l'URL du site à auditer (ex: https://apple.com)"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                            style={{ paddingLeft: '3rem', width: '100%', boxSizing: 'border-box', marginBottom: 0 }}
                        />
                    </div>
                    <button onClick={handleAnalyze} disabled={loading || !url} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                        {loading ? <><Loader2 className="animate-spin" size={20} /> Analyse en cours…</> : 'Lancer l\'audit'}
                    </button>
                </div>
                {error && (
                    <div style={{ color: '#f87171', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}
            </div>

            {/* Results */}
            {results && results.analysis && (
                <div style={{ marginTop: '3rem' }}>

                    {/* Overall Score */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                        <div style={{ fontSize: '0.9rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
                            Score Marketing Global
                        </div>
                        <div style={{
                            fontSize: '5rem', fontWeight: '900', lineHeight: 1,
                            color: getOverallColor(results.analysis.overall_score)
                        }}>
                            {(results.analysis.overall_score * 10).toFixed(0)}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '1.1rem' }}>/100</div>

                        {/* PDF Button */}
                        <button
                            onClick={handleDownloadPdf}
                            disabled={pdfLoading}
                            style={{
                                marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: 'linear-gradient(135deg, #a855f7, #ec4899)', border: 'none'
                            }}
                        >
                            {pdfLoading
                                ? <><Loader2 className="animate-spin" size={18} /> Génération…</>
                                : <><FileDown size={18} /> Télécharger le rapport PDF</>
                            }
                        </button>
                    </div>

                    {/* Score Cards */}
                    <div className="grid">
                        <ScoreCard title="SEO & Visibilité" score={results.analysis.scores.seo} icon={<Globe size={24} />}
                            scoreLabel={getScoreLabel} scoreClass={getScoreClass} />
                        <ScoreCard title="Conversion (CTA)" score={results.analysis.scores.cta} icon={<MousePointer size={24} />}
                            scoreLabel={getScoreLabel} scoreClass={getScoreClass} />
                        <ScoreCard title="Confiance & Autorité" score={results.analysis.scores.trust} icon={<Shield size={24} />}
                            scoreLabel={getScoreLabel} scoreClass={getScoreClass} />
                        <ScoreCard title="Tracking & Analytics" score={results.analysis.scores.tracking} icon={<Layout size={24} />}
                            scoreLabel={getScoreLabel} scoreClass={getScoreClass} />
                    </div>

                    {/* Detailed Results */}
                    <div className="grid" style={{ marginTop: '2rem', textAlign: 'left' }}>

                        {/* SEO Details */}
                        <div className="card">
                            <h3 style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem', margin: '0 0 1rem 0' }}>
                                🔍 Détails SEO
                            </h3>
                            <ul style={{ listStyle: 'none', padding: 0, color: '#cbd5e1', lineHeight: '2' }}>
                                <li><strong>Titre :</strong> {results.analysis.seo.title || <em style={{ color: '#f87171' }}>Manquant !</em>}
                                    {results.analysis.seo.title && <span style={{ color: results.analysis.seo.title_ok ? '#34d399' : '#fbbf24', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                                        ({results.analysis.seo.title_length} car.)
                                    </span>}
                                </li>
                                <li><strong>Meta Description :</strong> {results.analysis.seo.meta_description
                                    ? <span>{results.analysis.seo.meta_description.substring(0, 80)}…
                                        <span style={{ color: results.analysis.seo.meta_description_ok ? '#34d399' : '#fbbf24', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                                            ({results.analysis.seo.meta_description_length} car.)
                                        </span>
                                    </span>
                                    : <em style={{ color: '#f87171' }}>Manquante !</em>}
                                </li>
                                <li><strong>Balises H1 :</strong> {results.analysis.content.h1?.length || 0}
                                    {results.analysis.seo.heading_issues.length > 0 && <span style={{ color: '#fbbf24', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                                        ⚠ {results.analysis.seo.heading_issues.join(', ')}
                                    </span>}
                                </li>
                                <li><strong>Images :</strong> {results.analysis.seo.images_total} total
                                    {results.analysis.seo.images_without_alt > 0 &&
                                        <span style={{ color: '#f87171', marginLeft: '0.5rem' }}>({results.analysis.seo.images_without_alt} sans alt)</span>}
                                </li>
                                <li><strong>Viewport mobile :</strong> {results.analysis.seo.has_viewport ? '✅ Oui' : '❌ Non'}</li>
                            </ul>
                        </div>

                        {/* Conversion Details */}
                        <div className="card">
                            <h3 style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem', margin: '0 0 1rem 0' }}>
                                🎯 Conversion & CTAs
                            </h3>
                            <ul style={{ listStyle: 'none', padding: 0, color: '#cbd5e1', lineHeight: '2' }}>
                                <li><strong>Nombre de CTAs :</strong> {results.analysis.conversion.cta_count}</li>
                                <li><strong>Formulaires :</strong> {results.analysis.conversion.form_count}</li>
                                <li><strong>Boutons :</strong> {results.analysis.conversion.buttons?.length || 0}</li>
                            </ul>
                            {results.analysis.conversion.ctas.length > 0 && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <strong style={{ fontSize: '0.85rem', color: '#94a3b8' }}>CTAs détectés :</strong>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                                        {results.analysis.conversion.ctas.slice(0, 8).map((cta, i) => (
                                            <span key={i} className="status-badge status-ok" style={{ fontSize: '0.7rem' }}>{cta.text}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Technical Details */}
                        <div className="card">
                            <h3 style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem', margin: '0 0 1rem 0' }}>
                                ⚙️ Technique
                            </h3>
                            <ul style={{ listStyle: 'none', padding: 0, color: '#cbd5e1', lineHeight: '2' }}>
                                <li><strong>Liens internes :</strong> {results.analysis.technical.internal_links}</li>
                                <li><strong>Liens externes :</strong> {results.analysis.technical.external_links}</li>
                                <li><strong>Scripts :</strong> {results.analysis.technical.scripts_count}</li>
                                <li><strong>Robots.txt :</strong> {results.analysis.robots?.exists ? '✅ Présent' : '❌ Absent'}</li>
                                <li><strong>Sitemap :</strong> {results.analysis.sitemap?.exists
                                    ? `✅ Présent (${results.analysis.sitemap.url_count} URLs)`
                                    : '❌ Absent'}</li>
                            </ul>
                        </div>

                        {/* Tracking Tools */}
                        <div className="card">
                            <h3 style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem', margin: '0 0 1rem 0' }}>
                                📊 Outils de Tracking
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {results.analysis.tracking.tools_detected.map(tool => (
                                    <span key={tool} className="status-badge status-ok">{tool}</span>
                                ))}
                                {results.analysis.tracking.tools_detected.length === 0 &&
                                    <span style={{ color: '#f87171' }}>❌ Aucun outil de tracking détecté</span>}
                            </div>
                            {results.analysis.tracking.schema_count > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <strong style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Schema.org :</strong>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                                        {results.analysis.tracking.schema_types.map((t, i) => (
                                            <span key={i} className="status-badge status-warn">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Social & Trust */}
                        <div className="card">
                            <h3 style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem', margin: '0 0 1rem 0' }}>
                                🤝 Réseaux Sociaux & Confiance
                            </h3>
                            {results.analysis.trust.social_links.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {results.analysis.trust.social_links.map((link, i) => (
                                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                            className="status-badge status-ok" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                                            {link.platform}
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <span style={{ color: '#fbbf24' }}>⚠ Aucun lien vers des réseaux sociaux détecté</span>
                            )}
                        </div>

                        {/* Content Stats */}
                        <div className="card">
                            <h3 style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem', margin: '0 0 1rem 0' }}>
                                📝 Contenu
                            </h3>
                            <ul style={{ listStyle: 'none', padding: 0, color: '#cbd5e1', lineHeight: '2' }}>
                                <li><strong>Nombre de mots :</strong> {results.analysis.content.word_count}</li>
                                <li><strong>Sous-titres (h2) :</strong> {results.analysis.content.h2?.length || 0}</li>
                                {results.analysis.seo.og_tags && Object.keys(results.analysis.seo.og_tags).length > 0 && (
                                    <li><strong>Open Graph :</strong> ✅ {Object.keys(results.analysis.seo.og_tags).length} balises</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function ScoreCard({ title, score, icon, scoreLabel, scoreClass }: {
    title: string, score: number, icon: React.ReactNode,
    scoreLabel: (s: number) => string, scoreClass: (s: number) => string
}) {
    return (
        <div className="score-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#64748b' }}>{icon}</div>
                <div className={`status-badge ${scoreClass(score)}`}>{scoreLabel(score)}</div>
            </div>
            <h3 style={{ margin: '1rem 0 0.5rem 0', fontSize: '1.1rem' }}>{title}</h3>
            <div className="score-value">{score}/10</div>
            <div style={{ height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', width: `${score * 10}%`,
                    background: score >= 8 ? '#34d399' : score >= 5 ? '#fbbf24' : '#f87171',
                    transition: 'width 1s ease-out'
                }}></div>
            </div>
        </div>
    )
}

export default App
