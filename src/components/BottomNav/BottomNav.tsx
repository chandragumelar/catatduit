import { NavLink } from 'react-router-dom'
import { House, CalendarBlank, ChartBar } from '@phosphor-icons/react'
import styles from './BottomNav.module.css'

export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      <NavLink to="/" end className={({ isActive }) => isActive ? styles.itemActive : styles.item}>
        <House size={24} />
        <span>Beranda</span>
      </NavLink>
      <NavLink to="/planning" className={({ isActive }) => isActive ? styles.itemActive : styles.item}>
        <CalendarBlank size={24} />
        <span>Rencana</span>
      </NavLink>
      <NavLink to="/insight" className={({ isActive }) => isActive ? styles.itemActive : styles.item}>
        <ChartBar size={24} />
        <span>Insight</span>
      </NavLink>
      <div className={styles.fabPlaceholder} />
    </nav>
  )
}
