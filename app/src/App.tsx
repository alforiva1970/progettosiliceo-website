import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Splash from './components/Splash'
import About from './components/About'
import Paper from './components/Paper'
import Tech from './components/Tech'
import Contact from './components/Contact'
import Navigation from './components/Navigation'

function AnimatedRoutes() {
    const location = useLocation()

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Splash />} />
                <Route path="/about" element={<About />} />
                <Route path="/paper" element={<Paper />} />
                <Route path="/tech" element={<Tech />} />
                <Route path="/contact" element={<Contact />} />
            </Routes>
        </AnimatePresence>
    )
}

function App() {
    const [splashFinished, setSplashFinished] = useState(false)

    if (!splashFinished) {
        return <Splash onFinish={() => setSplashFinished(true)} />
    }

    return (
        <Router>
            <div className="app-container" style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
                <AnimatedRoutes />
            </div>
            <Navigation />
        </Router>
    )
}

export default App
