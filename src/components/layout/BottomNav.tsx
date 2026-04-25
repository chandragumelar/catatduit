// =============================================================================
// components/layout/BottomNav.tsx
// =============================================================================

import { NavLink } from 'react-router-dom'
import { Home, BarChart2, TrendingUp } from 'lucide-react'
import { FAB } from './FAB'
import styles from './BottomNav.module.css'

export function BottomNav() {
  return (
    <nav className={styles.nav}>
      <NavLink
        to="/"
        end
        className={({ isActive }) => [styles.navItem, isActive ? styles.navItemActive : ''].join(' ')}
        aria-label="Beranda"
      >
        <Home size={24} strokeWidth={1.5} />
      </NavLink>

      <NavLink
        to="/planning"
        className={({ isActive }) => [styles.navItem, isActive ? styles.navItemActive : ''].join(' ')}
        aria-label="Planning"
      >
        <BarChart2 size={24} strokeWidth={1.5} />
      </NavLink>

      <NavLink
        to="/insight"
        className={({ isActive }) => [styles.navItem, isActive ? styles.navItemActive : ''].join(' ')}
        aria-label="Insight"
      >
        <TrendingUp size={24} strokeWidth={1.5} />
      </NavLink>

      {/* FAB — dead zone 80px di sekeliling, posisi ujung kanan */}
      <div className={styles.fabSlot}>
        <FAB />
      </div>
    </nav>
  )
}
