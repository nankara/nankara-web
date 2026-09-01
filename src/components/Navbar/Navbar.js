'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

import { useCart } from '../../hooks/useCart';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import { useDisclosure } from '../../hooks/useDisclosure';
import { useScrollLock } from '../../hooks/useScrollLock';
import styles from './Navbar.module.css';

const PRIMARY_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/queens-circle', label: 'Queens Circle', id: 'nav-queens-circle' },
  { href: '/nankara-silhouette', label: 'Nankara Silhouette', id: 'nav-silhouette' },
];

const CONSULT_LINKS = [
  { href: '/identity-consultation', label: 'Book a Consultation', id: 'nav-book-consultation' },
  { href: '/contact', label: 'General Contact', id: 'nav-general-contact' },
];

const ACCOUNT_LINKS = [
  { href: '/account/orders', label: 'My orders' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/measurements', label: 'Measurements' },
];

function BagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className={styles.chevron} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { totalQuantity, isReady, openDrawer } = useCart();
  const { user, logout } = useCustomerAuth();

  const consult = useDisclosure();
  const account = useDisclosure();

  const hamburgerRef = useRef(null);
  const panelRef = useRef(null);

  const count = isReady ? totalQuantity : 0;
  const showBadge = isReady && totalQuantity > 0;
  const cartLabel = `Open bag, ${count} item${count === 1 ? '' : 's'}`;

  const isHome = pathname === '/';
  const isConsultSection = pathname === '/contact' || pathname === '/identity-consultation';
  const anyOpen = menuOpen || consult.open || account.open;
  const isSolid = scrolled || !isHome || anyOpen;

  useScrollLock(menuOpen);

  const signOut = async () => {
    await logout();
    router.push('/');
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close the mobile menu on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Mobile menu: Escape closes, focus moves into the panel, returns to the toggle.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const trigger = hamburgerRef.current;
    panelRef.current?.querySelector('a, button')?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = panelRef.current.querySelectorAll('a[href], button:not([disabled])');
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [menuOpen]);

  const navClass = [
    styles.navbar,
    isSolid ? styles.solid : styles.transparent,
    menuOpen ? styles.menuActive : '',
  ].join(' ');

  const cartButton = (id) => (
    <button
      type="button"
      className={styles.iconBtn}
      onClick={() => { setMenuOpen(false); openDrawer(); }}
      aria-label={cartLabel}
      id={id}
    >
      <BagIcon />
      {showBadge && <span className={styles.badge}>{totalQuantity}</span>}
    </button>
  );

  return (
    <header className={navClass} id="navbar">
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} aria-label="Nankara — home">
          <Image
            src={isSolid ? '/logo/nankara-wordmark-black.svg' : '/logo/nankara-wordmark-white.png'}
            alt="Nankara"
            width={140}
            height={33}
            className={styles.logoMark}
            priority
          />
        </Link>

        <nav className={styles.desktopNav} aria-label="Main navigation">
          {PRIMARY_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              id={l.id}
              className={`${styles.navLink} ${pathname === l.href ? styles.active : ''}`}
            >
              {l.label}
            </Link>
          ))}

          <div className={styles.navDropdown} ref={consult.ref}>
            <button
              type="button"
              className={`${styles.navLink} ${styles.navDropdownTrigger} ${isConsultSection ? styles.active : ''}`}
              aria-haspopup="true"
              aria-expanded={consult.open}
              aria-controls="nav-consult-menu"
              onClick={consult.toggle}
              id="nav-identity-consultation"
            >
              Identity Consultation<Chevron />
            </button>
            {consult.open && (
              <div className={styles.navDropdownMenu} id="nav-consult-menu">
                {CONSULT_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} id={l.id} className={styles.navDropdownLink}>
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/shop" className={styles.navLinkShop} id="nav-shop">Shop</Link>

          {user ? (
            <div className={styles.navDropdown} ref={account.ref}>
              <button
                type="button"
                className={`${styles.navLink} ${styles.navDropdownTrigger}`}
                aria-haspopup="true"
                aria-expanded={account.open}
                aria-controls="nav-account-menu"
                onClick={account.toggle}
                id="nav-account"
              >
                Account<Chevron />
              </button>
              {account.open && (
                <div className={styles.navDropdownMenu} id="nav-account-menu">
                  {ACCOUNT_LINKS.map((l) => (
                    <Link key={l.href} href={l.href} className={styles.navDropdownLink}>
                      {l.label}
                    </Link>
                  ))}
                  <button type="button" className={styles.navDropdownLink} onClick={signOut}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className={styles.navLink} id="nav-signin">Sign in</Link>
          )}

          {cartButton('nav-cart-trigger')}
        </nav>

        <div className={styles.mobileActions}>
          {cartButton('mobile-nav-cart-trigger')}
          <button
            ref={hamburgerRef}
            className={styles.hamburger}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            id="hamburger-btn"
          >
            <span className={styles.bar} />
            <span className={styles.bar} />
            <span className={styles.bar} />
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        ref={panelRef}
        className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}
        aria-hidden={!menuOpen}
      >
        <nav className={styles.mobileNav} aria-label="Mobile navigation">
          {PRIMARY_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={styles.mobileNavLink} id={l.id ? `mobile-${l.id}` : undefined}>
              {l.label}
            </Link>
          ))}

          <p className={styles.mobileNavGroupLabel}>Identity Consultation</p>
          {CONSULT_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`${styles.mobileNavLink} ${styles.mobileNavSubLink}`}>
              {l.label}
            </Link>
          ))}

          <p className={styles.mobileNavGroupLabel}>Account</p>
          {user ? (
            <>
              <Link href="/account" className={`${styles.mobileNavLink} ${styles.mobileNavSubLink}`}>My account</Link>
              {ACCOUNT_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={`${styles.mobileNavLink} ${styles.mobileNavSubLink}`}>
                  {l.label}
                </Link>
              ))}
              <button
                type="button"
                className={`${styles.mobileNavLink} ${styles.mobileNavSubLink} ${styles.mobileNavButton}`}
                onClick={() => { setMenuOpen(false); signOut(); }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className={`${styles.mobileNavLink} ${styles.mobileNavSubLink}`} id="mobile-nav-signin">
              Sign in
            </Link>
          )}

          <Link href="/shop" className={styles.mobileShopCta} id="mobile-nav-shop">
            Shop the Collection
          </Link>
        </nav>
      </div>
    </header>
  );
}
