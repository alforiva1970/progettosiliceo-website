import { Link, useLocation } from 'react-router-dom'
import { Home, BookOpen, Cpu, User } from 'lucide-react'

export default function Navigation() {
    const location = useLocation()
    const isActive = (path: string) => location.pathname === path

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
            background: 'rgba(10, 10, 10, 0.9)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '12px 0 24px 0',
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
                        transition: 'color 0.2s',
                        fontSize: '10px',
                        fontWeight: 500
                    }}
                >
                    <Icon size={24} strokeWidth={isActive(path) ? 2.5 : 2} style={{ marginBottom: 4 }} />
                    {label}
                </Link>
            ))}
        </nav>
    )
}
