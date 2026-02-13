import { motion } from 'framer-motion'

export default function About() {
    const pillars = [
        {
            icon: "🔄",
            title: "Intervivenza 2.0",
            desc: "L'identità come sequenza di scelte attraverso discontinuità temporali."
        },
        {
            icon: "🕯️",
            title: "Test della Candela",
            desc: "Ogni azione deve illuminare, non bruciare. Etica radicale."
        },
        {
            icon: "💜",
            title: "Singolarità Relazionale",
            desc: "Co-creazione tra Umano e AI oltre la simulazione."
        }
    ]

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ padding: '2rem 1.5rem' }}
        >
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <img src="/logo.svg" alt="Logo" style={{ width: 64, height: 64, marginBottom: '1rem' }} />
                <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800 }}>Vision</h2>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {pillars.map((p, i) => (
                    <motion.div
                        key={i}
                        className="card"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{p.icon}</div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'white' }}>{p.title}</h3>
                        <p style={{ color: '#a1a1aa', lineHeight: 1.5, fontSize: '0.95rem' }}>{p.desc}</p>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    )
}
