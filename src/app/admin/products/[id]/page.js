'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import AdminNav from '../../../../components/AdminNav/AdminNav';
import Badge from '../../../../components/Badge/Badge';
import ProductForm from '../../../../components/ProductForm/ProductForm';
import { useAdminGuard } from '../../../../hooks/useAdminGuard';
import {
  getAdminProduct,
  replaceProductImages,
  updateProduct,
} from '../../../../lib/adminApi';
import styles from '../../admin.module.css';

export default function EditProductPage({ params }) {
  const { id } = params;
  const { authReady, onAuthError } = useAdminGuard();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saved | partial | error
  const [quickBusy, setQuickBusy] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    getAdminProduct(id)
      .then(setProduct)
      .catch((err) => {
        if (!onAuthError(err)) {
          setError(err?.status === 404 ? 'notfound' : 'Could not load this product.');
        }
      });
  }, [authReady, id, onAuthError]);

  if (!authReady) return null;

  const handleSubmit = async (payload, images, imagesChanged) => {
    setSubmitting(true);
    setSaveState('idle');
    try {
      let updated =
        Object.keys(payload).length > 0
          ? await updateProduct(id, payload)
          : product;
      if (imagesChanged) {
        try {
          updated = await replaceProductImages(
            id,
            images.map((i) => ({
              url: i.url,
              public_id: i.public_id,
              alt_text: i.alt_text || '',
              is_primary: Boolean(i.is_primary),
            }))
          );
          setSaveState('saved');
        } catch (imgErr) {
          if (onAuthError(imgErr)) return;
          setSaveState('partial');
        }
      } else {
        setSaveState('saved');
      }
      setProduct(updated);
    } catch (err) {
      if (!onAuthError(err)) setSaveState('error');
    } finally {
      setSubmitting(false);
    }
  };

  const quickPatch = async (body) => {
    setQuickBusy(true);
    try {
      setProduct(await updateProduct(id, body));
    } catch (err) {
      if (!onAuthError(err)) setError('Could not update the product.');
    } finally {
      setQuickBusy(false);
    }
  };

  if (error === 'notfound') {
    return (
      <>
        <AdminNav />
        <main className={styles.main}>
          <Link href="/admin/products" className={styles.backLink}>
            ← All products
          </Link>
          <p className={styles.muted}>Product not found.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminNav />
      <main className={styles.main}>
        <Link href="/admin/products" className={styles.backLink}>
          ← All products
        </Link>

        {error && error !== 'notfound' && <p className={styles.error}>{error}</p>}
        {!product && !error && <p className={styles.muted}>Loading…</p>}

        {product && (
          <>
            <div className={styles.header}>
              <h1 className={styles.title}>{product.name}</h1>
              <div className={styles.badgeRow}>
                <Badge tone={product.availability === 'IN_STOCK' ? 'go' : 'stop'}>
                  {product.availability === 'IN_STOCK' ? 'In stock' : 'Out of stock'}
                </Badge>
                <Badge tone={product.is_published ? 'go' : 'muted'}>
                  {product.is_published ? 'Published' : 'Draft'}
                </Badge>
              </div>
            </div>

            <div className={styles.pageActions}>
              <button
                type="button"
                className={styles.smallBtn}
                disabled={quickBusy}
                onClick={() => quickPatch({ is_published: !product.is_published })}
              >
                {product.is_published ? 'Unpublish' : 'Publish'}
              </button>
              <button
                type="button"
                className={styles.smallBtn}
                disabled={quickBusy}
                onClick={() =>
                  quickPatch({
                    availability:
                      product.availability === 'IN_STOCK'
                        ? 'OUT_OF_STOCK'
                        : 'IN_STOCK',
                  })
                }
              >
                {product.availability === 'IN_STOCK'
                  ? 'Mark out of stock'
                  : 'Mark in stock'}
              </button>
              {product.is_published && (
                <a
                  href={`/shop/${product.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.link}
                >
                  View on storefront ↗
                </a>
              )}
            </div>

            {saveState === 'saved' && (
              <p className={styles.savedNote}>Saved.</p>
            )}
            {saveState === 'partial' && (
              <p className={styles.error}>
                Details saved, but the images didn’t update. Try saving again.
              </p>
            )}
            {saveState === 'error' && (
              <p className={styles.error}>Could not save. Please try again.</p>
            )}

            <ProductForm
              key={product.updated_at}
              initial={product}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          </>
        )}
      </main>
    </>
  );
}
