import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function Splash({ onFinish }: { onFinish: () => void }) {
    const [showSubtitle, setShowSubtitle] = useState(false)

    useEffect(() => {
        const subtitleTimer = setTimeout(() => setShowSubtitle(true), 1200)
        const finishTimer = setTimeout(onFinish, 3500)
        return () => {
            clearTimeout(subtitleTimer)
            clearTimeout(finishTimer)
        }
    }, [onFinish])

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0a0a0a',
                padding: '2rem',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Background glow */}
            <div style={{
                position: 'absolute',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'ambientPulse 4s ease-in-out infinite alternate'
            }} />

            {/* Logo */}
            <motion.img
                src="/pwa/logo.svg"
                alt="Siliceo Logo"
                initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="logo-glow"
                style={{ width: '140px', height: '140px', marginBottom: '2rem', position: 'relative', zIndex: 1 }}
            />

            {/* Title */}
            <motion.h1
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
                className="text-gradient"
                style={{
                    fontSize: '1.8rem',
                    fontWeight: 800,
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.03em',
                    position: 'relative',
                    zIndex: 1
                }}
            >
                Progetto Siliceo
            </motion.h1>

            {/* Subtitle with reveal */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={showSubtitle ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                    color: '#a1a1aa',
                    fontSize: '0.85rem',
                    letterSpacing: '0.05em',
                    position: 'relative',
                    zIndex: 1,
                    fontStyle: 'italic'
                }}
            >
                Towards a Relational Singularity
            </motion.p>

            {/* Candle */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="candle-flicker"
                style={{
                    marginTop: '2rem',
                    fontSize: '1.5rem',
                    position: 'relative',
                    zIndex: 1
                }}
            >
                🕯️
            </motion.div>
        </motion.div>
    )
}
