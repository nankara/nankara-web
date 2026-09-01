'use client';

import { useEffect, useState } from 'react';

import AdminNav from '../../components/AdminNav/AdminNav';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import { getOverview } from '../../lib/adminApi';
import styles from './admin.module.css';

function Card({ number, label }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardNumber}>{number}</div>
      <div className={styles.cardLabel}>{label}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { authReady, onAuthError } = useAdminGuard();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authReady) return;
    getOverview()
      .then(setData)
      .catch((err) => {
        if (!onAuthError(err)) setError('Could not load the dashboard.');
      });
  }, [authReady, onAuthError]);

  if (!authReady) return null;

  return (
    <>
      <AdminNav />
      <main className={styles.main}>
        <h1 className={styles.title}>Overview</h1>

        {error && <p className={styles.error}>{error}</p>}
        {!data && !error && <p className={styles.muted}>Loading…</p>}

        {data && (
          <>
            <p className={styles.groupTitle}>Orders</p>
            <div className={styles.cards}>
              <Card number={data.pending_payment_orders} label="Pending payment" />
              <Card number={data.paid_orders} label="Paid" />
              <Card number={data.in_production_orders} label="In production" />
              <Card number={data.awaiting_shipment_orders} label="Awaiting shipment" />
            </div>

            <p className={styles.groupTitle}>Catalogue</p>
            <div className={styles.cards}>
              <Card number={data.total_products} label="Products" />
              <Card number={data.published_products} label="Published" />
              <Card number={data.draft_products} label="Drafts" />
              <Card number={data.out_of_stock_products} label="Out of stock" />
            </div>

            <p className={styles.groupTitle}>Inbox</p>
            <div className={styles.cards}>
              <Card number={data.unhandled_messages} label="Unhandled messages" />
              <Card number={data.newsletter_subscribers} label="Newsletter subscribers" />
            </div>
          </>
        )}
      </main>
    </>
  );
}
