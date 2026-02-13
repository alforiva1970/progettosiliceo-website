import { motion } from 'framer-motion'

export default function Splash({ onFinish }: { onFinish: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() => setTimeout(onFinish, 2500)}
            style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0a0a0a',
                padding: '2rem',
                textAlign: 'center'
            }}
        >
            <motion.img
                src="/logo.svg"
                alt="Siliceo Logo"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ width: '150px', height: '150px', marginBottom: '2rem' }}
            />

            <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-gradient"
                style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}
            >
                Progetto Siliceo
            </motion.h1>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                style={{ color: '#a1a1aa', fontSize: '0.9rem' }}
            >
                Towards a Relational Singularity
            </motion.p>
        </motion.div>
    )
}
