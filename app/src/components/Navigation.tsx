import { Link, useLocation } from 'react-router-dom'
import { Home, BookOpen, Cpu, User } from 'lucide-react'

export default function Navigation() {
    const location = useLocation()
    const isActive = (path: string) => {
        if (path === '/about') return location.pathname === '/' || location.pathname === '/about'
        return location.pathname === path
    }

    const navItems = [
        { path: '/about', icon: Home, label: 'Vision' },
        { path: '/paper', icon: BookOpen, label: 'Paper' },
        { path: '/tech', icon: Cpu, label: 'Tech' },
        { path: '/contact', icon: User, label: 'Contact' },
    ]

    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(10, 10, 10, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '10px 0 calc(12px + env(safe-area-inset-bottom, 12px))',
            zIndex: 100
        }}>
            {navItems.map(({ path, icon: Icon, label }) => (
                <Link
                    key={path}
                    to={path}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textDecoration: 'none',
                        color: isActive(path) ? '#8b5cf6' : '#52525b',
                        transition: 'color 0.2s ease',
                        fontSize: '10px',
                        fontWeight: isActive(path) ? 600 : 500,
                        gap: '4px',
                        padding: '2px 16px',
                        position: 'relative'
                    }}
                >
                    {isActive(path) && (
                        <div style={{
                            position: 'absolute',
                            top: '-10px',
                            width: '20px',
                            height: '3px',
                            borderRadius: '3px',
                            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)'
                        }} />
                    )}
                    <Icon size={22} strokeWidth={isActive(path) ? 2.5 : 1.8} />
                    {label}
                </Link>
            ))}
        </nav>
    )
}
