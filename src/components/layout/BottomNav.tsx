// =============================================================================
// components/layout/BottomNav.tsx
// =============================================================================

import { NavLink } from "react-router-dom";
import { Home, BarChart2, TrendingUp } from "lucide-react";

export function BottomNav() {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "var(--bottom-nav-height)",
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-default)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 100,
      }}
    >
      <NavLink to="/" aria-label="Home">
        {" "}
        <Home size={24} />
      </NavLink>
      <NavLink to="/planning" aria-label="Planning">
        {" "}
        <BarChart2 size={24} />
      </NavLink>
      <NavLink to="/insight" aria-label="Insight">
        {" "}
        <TrendingUp size={24} />
      </NavLink>
      {/* FAB — ujung kanan, placeholder hingga InputBottomSheet dibuat */}
      <div style={{ width: 56 }} />
    </nav>
  );
}
