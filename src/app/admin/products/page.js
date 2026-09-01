'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import AdminNav from '../../../components/AdminNav/AdminNav';
import Badge from '../../../components/Badge/Badge';
import { useAdminGuard } from '../../../hooks/useAdminGuard';
import { getAdminProducts } from '../../../lib/adminApi';
import { formatNgn } from '../../../lib/currency';
import styles from '../admin.module.css';

export default function AdminProductsPage() {
  const router = useRouter();
  const { authReady, onAuthError } = useAdminGuard();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authReady) return;
    getAdminProducts()
      .then(setProducts)
      .catch((err) => {
        if (!onAuthError(err)) setError('Could not load products.');
      });
  }, [authReady, onAuthError]);

  if (!authReady) return null;

  return (
    <>
      <AdminNav />
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Products</h1>
          <Link href="/admin/products/new" className={styles.smallBtn}>
            ＋ New product
          </Link>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {!products && !error && <p className={styles.muted}>Loading…</p>}
        {products && products.length === 0 && (
          <p className={styles.muted}>
            No products yet. <Link href="/admin/products/new" className={styles.link}>Add the first one.</Link>
          </p>
        )}

        {products && products.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Category</th>
                <th>Availability</th>
                <th>Published</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className={styles.rowLink}
                  onClick={() => router.push(`/admin/products/${p.id}`)}
                >
                  <td className={styles.productCell}>
                    {p.primary_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className={styles.productThumb}
                        src={p.primary_image.url}
                        alt=""
                      />
                    ) : (
                      <span className={styles.productThumbEmpty} aria-hidden="true" />
                    )}
                    {p.name}
                  </td>
                  <td>{formatNgn(p.price_ngn)}</td>
                  <td className={styles.muted}>{p.category?.name || '—'}</td>
                  <td>
                    <Badge tone={p.availability === 'IN_STOCK' ? 'go' : 'stop'}>
                      {p.availability === 'IN_STOCK' ? 'In stock' : 'Out of stock'}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={p.is_published ? 'go' : 'muted'}>
                      {p.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
