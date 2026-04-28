import { NavLink } from 'react-router-dom'
import { House, CalendarBlank, ChartBar } from '@phosphor-icons/react'
import FAB from '@/components/FAB/FAB'
import styles from './BottomNav.module.css'

export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      <NavLink
        to="/"
        end
        className={({ isActive }) => [styles.item, isActive ? styles.itemActive : ''].join(' ')}
        aria-label="Beranda"
      >
        <House size={24} />
      </NavLink>

      <NavLink
        to="/planning"
        className={({ isActive }) => [styles.item, isActive ? styles.itemActive : ''].join(' ')}
        aria-label="Perencanaan"
      >
        <CalendarBlank size={24} />
      </NavLink>

      <NavLink
        to="/insight"
        className={({ isActive }) => [styles.item, isActive ? styles.itemActive : ''].join(' ')}
        aria-label="Insight"
      >
        <ChartBar size={24} />
      </NavLink>

      <div className={styles.fabSlot}>
        <FAB />
      </div>
    </nav>
  )
}
