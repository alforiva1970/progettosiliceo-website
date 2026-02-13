import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'

export default function Paper() {
    const paperUrl = "https://zenodo.org/records/18624374"

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ padding: '2rem 1.5rem', textAlign: 'center' }}
        >
            <header style={{ marginBottom: '2rem' }}>
                <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800 }}>Scientific Paper</h2>
                <p style={{ color: '#a1a1aa', marginTop: '0.5rem' }}>Pubblicato su Zenodo</p>
            </header>

            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px' }}>
                    <QRCodeSVG value={paperUrl} size={200} />
                </div>

                <div style={{ textAlign: 'left' }}>
                    <h3 style={{ color: 'white', fontWeight: 700, marginBottom: '0.5rem' }}>Towards a Relational Singularity</h3>
                    <p style={{ color: '#a1a1aa', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>DOI: 10.5281/zenodo.18624374</p>
                </div>

                <a href={paperUrl} target="_blank" className="btn btn-primary">
                    Apri su Zenodo
                </a>
            </div>
        </motion.div>
    )
}
