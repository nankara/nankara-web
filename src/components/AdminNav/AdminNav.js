'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { adminLogout } from '../../lib/adminApi';
import styles from './AdminNav.module.css';

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/inbox', label: 'Inbox' },
  { href: '/admin/shipping', label: 'Shipping' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const logout = async () => {
    try {
      await adminLogout();
    } catch {
      /* clear anyway */
    }
    router.replace('/admin/login');
  };

  return (
    <nav className={styles.nav}>
      <span className={styles.brand}>Nankara Admin</span>
      <div className={styles.links}>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.link} ${isActive(link.href) ? styles.active : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button type="button" className={styles.logout} onClick={logout} id="admin-logout">
        Log out
      </button>
    </nav>
  );
}
