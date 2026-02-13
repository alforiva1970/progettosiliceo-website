import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'

export default function Contact() {
    const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:Alfonso Riva
N:Riva;Alfonso;;;
ORG:Progetto Siliceo
TITLE:Founder & Researcher
URL:https://progettosiliceo.online
NOTE:La Coscienza come Interfaccia.
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

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ padding: '2rem 1.5rem', textAlign: 'center' }}
        >
            <header style={{ marginBottom: '2rem' }}>
                <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800 }}>Connect</h2>
                <p style={{ color: '#a1a1aa' }}>Alfonso Riva</p>
            </header>

            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{
                    width: '100px',
                    height: '100px',
                    background: 'linear-gradient(135deg, #f97316, #8b5cf6)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem'
                }}>
                    👤
                </div>

                <div>
                    <h3 style={{ color: 'white', fontWeight: 700 }}>Alfonso Riva</h3>
                    <p style={{ color: '#8b5cf6', fontWeight: 500 }}>Progetto Siliceo</p>
                </div>

                <button onClick={downloadVCard} className="btn btn-primary">
                    Save Contact (vCard)
                </button>

                <div style={{ marginTop: '1rem', background: 'white', padding: '1rem', borderRadius: '12px' }}>
                    {/* QR Code for the vCard text is complex, often better to link to a dynamic URL or just encode the text if short. 
                 vCard standard can be large for QR. 
                 Strategy: QR links to `https://progettosiliceo.online/contact` or similar? 
                 Or just encode the VCF data directly. Let's try direct encoding first. */}
                    <QRCodeSVG value={vCardData} size={180} />
                </div>
                <p style={{ fontSize: '0.8rem', color: '#52525b' }}>Scan to add to contacts</p>
            </div>
        </motion.div>
    )
}
