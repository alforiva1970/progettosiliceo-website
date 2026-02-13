import { motion } from 'framer-motion'

export default function Tech() {
    const stack = [
        { name: "Siliceo Core", desc: "Multi-agent RAG system", tech: ["React", "Ollama"] },
        { name: "Memory Server", desc: "Distributed vector memory", tech: ["Node.js", "ChromaDB"] },
        { name: "Siliceo OS", desc: "Desktop integration bridge", tech: ["Tauri", "Rust"] },
        { name: "OpenClaw", desc: "Autonomous agentic arm", tech: ["Python", "Vision"] }
    ]

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ padding: '2rem 1.5rem' }}
        >
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800 }}>Tech Stack</h2>
                <p style={{ color: '#a1a1aa' }}>Open Source Architecture</p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {stack.map((item, i) => (
                    <motion.div
                        key={i}
                        className="card"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <h3 style={{ color: 'white', fontWeight: 700 }}>{item.name}</h3>
                        </div>
                        <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '1rem' }}>{item.desc}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {item.tech.map(t => (
                                <span key={t} style={{
                                    background: 'rgba(139, 92, 246, 0.1)',
                                    color: '#a78bfa',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontFamily: 'var(--font-mono)'
                                }}>
                                    {t}
                                </span>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <a href="https://github.com/PROGETTO-SILICEO" target="_blank" className="btn btn-secondary">
                    View on GitHub
                </a>
            </div>
        </motion.div>
    )
}
