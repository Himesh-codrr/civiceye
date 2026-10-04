import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, Menu, Plus, ShieldCheck, Sun, Moon } from 'lucide-react';
import { Logo } from './Logo';
import { Drawer } from './Drawer';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';
import { useTheme } from '@/hooks/useTheme';
import { isAdminEmail } from '@/data/admins';
import { cn } from '@/utils/cn';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/map', label: 'Map' },
  { to: '/live', label: 'Live AI' },
  { to: '/food-hygiene', label: 'Mess / Hygiene' },
  { to: '/community', label: 'Community' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function NavbarAmrita() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { brand } = useBrand();
  const { theme, toggleTheme } = useTheme();
  const profileRef = useRef<HTMLDivElement>(null);
  const isAdmin = isAdminEmail(user?.email, brand);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [profileOpen]);

  const handleSignOut = async () => {
    await signOut();
    setProfileOpen(false);
    navigate('/');
  };

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <header className="fixed inset-x-0 top-3 z-50 pointer-events-none sm:top-6">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-2 px-2 pointer-events-none sm:gap-3 sm:px-6">
          
          {/* LEFT: Floating Logo */}
          <div className="navbar-logo-pill pointer-events-auto flex min-w-0 items-center justify-center rounded-full bg-white/90 py-2 pl-2 pr-3 shadow-md backdrop-blur-xl border border-neutral-200/50 dark:border-white/10 dark:bg-[#111113]/80 sm:py-3 sm:px-6">
            <Logo to="/" className="min-w-0" />
          </div>

          {/* RIGHT: Floating Pill Navbar */}
          <nav
            aria-label="Main navigation"
            className="navbar-nav-pill pointer-events-auto flex shrink-0 items-center gap-0.5 rounded-full bg-white/90 p-1 shadow-md backdrop-blur-xl border border-neutral-200/50 dark:border-white/10 dark:bg-[#111113]/80 sm:gap-1.5 sm:p-1.5"
          >
            <ul className="hidden items-center px-2 lg:flex">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'px-3 py-1.5 text-xs font-medium transition-colors rounded-full',
                        isActive
                          ? 'text-neutral-900 bg-neutral-100 dark:bg-neutral-800 dark:text-white'
                          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white',
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-1 border-l border-neutral-200/50 dark:border-neutral-800/50 pl-2 ml-1">
              <button
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
              
              {isAdmin && (
                <NavLink
                  to="/admin"
                  title="Admin panel"
                  className={({ isActive }) =>
                    cn(
                      'hidden h-8 w-8 items-center justify-center rounded-full transition-colors sm:flex',
                      isActive
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                        : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white',
                    )
                  }
                >
                  <ShieldCheck className="h-4 w-4" />
                </NavLink>
              )}
              
              <div className="hidden px-1 min-[440px]:block"><NotificationBell /></div>

              {user ? (
                <div className="relative ml-1" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen((o) => !o)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-900 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
                  >
                    {initials}
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-neutral-200/50 bg-white/80 p-2 shadow-sm backdrop-blur-md dark:border-neutral-800/50 dark:bg-black/80">
                      <div className="px-3 py-2">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                          {profile?.full_name || 'Account'}
                        </p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
                      </div>
                      <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                      <button
                        onClick={() => void handleSignOut()}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="hidden lg:flex px-4 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                  Sign in
                </Link>
              )}

              <Link
                to="/report"
                className="ml-2 hidden lg:flex items-center gap-1.5 rounded-full bg-[#111] dark:bg-white px-4 py-1.5 text-xs font-medium text-white dark:text-black transition-transform hover:scale-105 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Report issue
              </Link>

              <button
                onClick={() => setMenuOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>
          </nav>
        </div>
      </header>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" side="right">
        <div className="flex h-full flex-col">
          <ul className="flex-1 space-y-1 p-4">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white',
                    )
                  }
                >
                  {link.label}
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="space-y-3 p-4 border-t border-neutral-100 dark:border-neutral-800">
            {!user ? (
              <Link to="/login" className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-black dark:text-white">
                Sign in
              </Link>
            ) : (
              <button onClick={() => void handleSignOut()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-black dark:text-white">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            )}
            <Link to="/report" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#111] dark:bg-white px-4 py-3 text-sm font-medium text-white dark:text-black">
              <Plus className="h-4 w-4" />
              Report an issue
            </Link>
          </div>
        </div>
      </Drawer>
    </>
  );
}
