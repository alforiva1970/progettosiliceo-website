import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'

export default function Contact() {
    const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:Alfonso Riva
N:Riva;Alfonso;;;
ORG:Progetto Siliceo
TITLE:Founder & Independent Researcher
URL:https://progettosiliceo.online
NOTE:La Coscienza come Interfaccia - Progetto Siliceo
END:VCARD`

    const downloadVCard = () => {
        const blob = new Blob([vCardData], { type: 'text/vcard' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'AlfonsoRiva.vcf'
        a.click()
        URL.revokeObjectURL(url)
    }

    const links = [
        { label: 'LinkedIn', url: 'https://www.linkedin.com/in/alfonso-riva-97782615/', icon: '💼' },
        { label: 'GitHub', url: 'https://github.com/PROGETTO-SILICEO', icon: '🔗' },
        { label: 'Sito Web', url: 'https://progettosiliceo.online', icon: '🌐' },
    ]

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="page-container"
            style={{ textAlign: 'center' }}
        >
            <header style={{ marginBottom: '2rem' }}>
                <span className="section-label">Contatti</span>
                <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                    Connect
                </h2>
                <div className="divider" />
            </header>

            <motion.div
                className="card"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                style={{
                    padding: '2rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.25rem'
                }}
            >
                {/* Avatar */}
                <div style={{
                    width: '90px',
                    height: '90px',
                    background: 'linear-gradient(135deg, #f97316, #8b5cf6)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.2rem',
                    boxShadow: '0 0 30px rgba(139, 92, 246, 0.2)'
                }}>
                    👤
                </div>

                <div>
                    <h3 style={{ color: 'white', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                        Alfonso Riva
                    </h3>
                    <p style={{
                        color: '#8b5cf6',
                        fontWeight: 500,
                        fontSize: '0.85rem',
                        marginTop: '0.25rem'
                    }}>
                        Founder & Independent Researcher
                    </p>
                    <p style={{
                        color: '#52525b',
                        fontSize: '0.8rem',
                        marginTop: '0.15rem'
                    }}>
                        Progetto Siliceo
                    </p>
                </div>

                {/* QR Code */}
                <div style={{
                    background: 'white',
                    padding: '0.875rem',
                    borderRadius: '14px',
                    boxShadow: '0 0 25px rgba(139, 92, 246, 0.12)'
                }}>
                    <QRCodeSVG value={vCardData} size={160} />
                </div>
                <p style={{
                    fontSize: '0.7rem',
                    color: '#52525b',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    fontWeight: 500
                }}>
                    📱 Scansiona per aggiungere ai contatti
                </p>

                {/* Save vCard */}
                <button onClick={downloadVCard} className="btn btn-primary">
                    Salva Contatto (vCard)
                </button>
            </motion.div>

            {/* Links */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
            >
                {links.map(link => (
                    <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            textDecoration: 'none',
                            padding: '1rem 1.25rem'
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>{link.icon}</span>
                        <span style={{ color: 'white', fontWeight: 500, fontSize: '0.9rem' }}>{link.label}</span>
                        <span style={{ marginLeft: 'auto', color: '#52525b', fontSize: '0.8rem' }}>→</span>
                    </a>
                ))}
            </motion.div>
        </motion.div>
    )
}
