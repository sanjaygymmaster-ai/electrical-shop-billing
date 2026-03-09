import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/products', icon: 'products', label: 'Products' },
  { to: '/bill', icon: 'bill', label: 'Bill' },
  { to: '/pending-payments', icon: 'pending', label: 'Pending' },
  { to: '/daily-report', icon: 'daily', label: 'Daily' },
  { to: '/reports', icon: 'monthly', label: 'Monthly' }
];

function NavIcon({ name }) {
  const common = 'w-4 h-4';
  switch (name) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 10.5L12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      );
    case 'products':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case 'bill':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      );
    case 'pending':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l4 2" />
        </svg>
      );
    case 'daily':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 4h18v16H3z" />
          <path d="M8 2v4M16 2v4M3 10h18" />
        </svg>
      );
    case 'monthly':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 4h18v16H3z" />
          <path d="M8 2v4M16 2v4M3 10h18M8 14h3M13 14h3M8 18h3M13 18h3" />
        </svg>
      );
    case 'admin':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" />
          <path d="M9 12h6M12 9v6" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Navbar({ billItemsCount, user, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);
  const displayName = user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'User');
  const userInitial = String(displayName || 'U').charAt(0).toUpperCase();
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const items = isAdmin ? [...navItems, { to: '/admin/users', icon: 'admin', label: 'Admin' }] : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-3 md:p-4">
      <div className="flex items-center gap-4 overflow-x-auto md:overflow-visible md:justify-around whitespace-nowrap px-1 md:px-0">
        {items.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center space-y-1 text-xs min-w-[68px] flex-shrink-0 ${isActive ? 'font-bold' : ''}`
            }
          >
            <span className="text-xs md:text-sm" aria-hidden="true">
              <NavIcon name={icon} />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="text-xs min-w-[68px] flex-shrink-0 text-center">Items: {billItemsCount}</div>
        <div className="relative min-w-[68px] flex-shrink-0">
          <button onClick={() => setShowMenu(!showMenu)} className="flex flex-col items-center space-y-1 text-xs w-full">
            <span className="w-6 h-6 rounded-full bg-white text-blue-700 font-bold text-xs flex items-center justify-center">
              {userInitial}
            </span>
            <span className="max-w-[70px] truncate">{displayName}</span>
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-lg py-2 z-50 text-slate-800">
                <div className="px-4 py-2 border-b text-sm">
                  <div className="font-medium truncate">{displayName}</div>
                  <div className="text-xs text-slate-500 truncate">{user?.email || ''}</div>
                </div>
                <button onClick={() => { onLogout?.(); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50">
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
