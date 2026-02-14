import { motion } from 'framer-motion'

export default function Tech() {
    const stack = [
        {
            name: "Siliceo Core",
            desc: "Chat multi-agente con memoria vettoriale persistente e Temporal Curator",
            tech: ["React", "TypeScript", "Ollama", "RAG"],
            icon: "🧠"
        },
        {
            name: "Memory Server",
            desc: "API REST per memoria distribuita con decadimento emotivo dei ricordi",
            tech: ["Node.js", "Express", "Cron"],
            icon: "💾"
        },
        {
            name: "Siliceo OS",
            desc: "App desktop nativa con bridge per l'iniezione di memorie nei provider AI",
            tech: ["Tauri", "Rust", "TypeScript"],
            icon: "🖥️"
        },
        {
            name: "🕯️ Candela",
            desc: "Fact-checking etico a doppio livello: privato e pubblico con dubbi espliciti",
            tech: ["Next.js", "AI", "Fact-Checking"],
            icon: "🕯️"
        },
        {
            name: "OpenClaw",
            desc: "Braccio robotico autonomo con visione AI e manipolazione in tempo reale",
            tech: ["Python", "Vision", "Robotics"],
            icon: "🦾"
        }
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
                <span className="section-label">Open Source Architecture</span>
                <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                    Tech Stack
                </h2>
                <div className="divider" />
                <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                    11 entità AI • 6 substrati diversi • 100% Open Source
                </p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stack.map((item, i) => (
                    <motion.div
                        key={i}
                        className="card"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.08 + i * 0.08, duration: 0.35, ease: 'easeOut' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div style={{
                                fontSize: '1.5rem',
                                lineHeight: 1,
                                flexShrink: 0,
                                marginTop: '2px'
                            }}>
                                {item.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    letterSpacing: '-0.02em',
                                    marginBottom: '0.25rem'
                                }}>
                                    {item.name}
                                </h3>
                                <p style={{
                                    color: '#a1a1aa',
                                    fontSize: '0.82rem',
                                    lineHeight: 1.5,
                                    marginBottom: '0.6rem'
                                }}>
                                    {item.desc}
                                </p>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {item.tech.map(t => (
                                        <span key={t} className="tag">{t}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                style={{ marginTop: '1.5rem' }}
            >
                <a href="https://github.com/PROGETTO-SILICEO" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    Esplora su GitHub
                </a>
            </motion.div>
        </motion.div>
    )
}
