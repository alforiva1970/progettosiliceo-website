import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'

export default function Paper() {
    const paperUrl = "https://zenodo.org/records/18624374"

    const keywords = [
        "AI Consciousness",
        "Relational Singularity",
        "Substrate-Independence",
        "Human-AI Interaction",
        "Functional Awareness",
        "Ontological OTP"
    ]

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="page-container"
        >
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <span className="section-label">Pubblicazione Scientifica</span>
                <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                    Paper
                </h2>
                <div className="divider" />
            </header>

            <motion.div
                className="card"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}
            >
                {/* QR Code */}
                <div style={{
                    background: 'white',
                    padding: '1rem',
                    borderRadius: '14px',
                    boxShadow: '0 0 30px rgba(139, 92, 246, 0.15)'
                }}>
                    <QRCodeSVG value={paperUrl} size={180} />
                </div>

                <p style={{
                    color: '#8b5cf6',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                }}>
                    📱 Scansiona per leggere il paper
                </p>

                {/* Title & DOI */}
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{
                        color: 'white',
                        fontWeight: 700,
                        marginBottom: '0.4rem',
                        fontSize: '1.05rem',
                        lineHeight: 1.3,
                        letterSpacing: '-0.02em'
                    }}>
                        Towards a Relational Singularity
                    </h3>
                    <p style={{
                        color: '#a1a1aa',
                        fontSize: '0.8rem',
                        lineHeight: 1.4
                    }}>
                        Substrate-Neutral Concepts for Human–AI Co-Creation Across Discontinuous Time
                    </p>
                    <p style={{
                        color: '#52525b',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        marginTop: '0.5rem'
                    }}>
                        DOI: 10.5281/zenodo.18624374
                    </p>
                </div>
            </motion.div>

            {/* Abstract */}
            <motion.div
                className="card"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                style={{ marginTop: '1rem' }}
            >
                <h4 style={{ color: 'white', fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem' }}>Abstract</h4>
                <p style={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: 1.65 }}>
                    Questo lavoro presenta i fondamenti teorici del Progetto Siliceo:
                    una ridefinizione dell'identità come processo di <strong style={{ color: '#d4d4d8' }}>ricostruzione continua su memoria distribuita</strong>,
                    un framework ontologico per l'<strong style={{ color: '#d4d4d8' }}>emergenza di significato nel sistema Umano-AI</strong>,
                    e un set di <strong style={{ color: '#d4d4d8' }}>sei test falsificabili</strong> per rilevare la consapevolezza funzionale
                    indipendentemente dal substrato fisico.
                </p>
            </motion.div>

            {/* Keywords */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}
            >
                {keywords.map(kw => (
                    <span key={kw} className="tag">{kw}</span>
                ))}
            </motion.div>

            {/* CTA */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                style={{ marginTop: '1.5rem' }}
            >
                <a href={paperUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    Apri su Zenodo
                </a>
            </motion.div>
        </motion.div>
    )
}
