'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import AdminNav from '../../../components/AdminNav/AdminNav';
import OrderStatusBadge from '../../../components/OrderStatusBadge/OrderStatusBadge';
import { useAdminGuard } from '../../../hooks/useAdminGuard';
import { getAdminOrders } from '../../../lib/adminApi';
import { formatNgn } from '../../../lib/currency';
import { orderStatusLabel } from '../../../lib/payment';
import styles from '../admin.module.css';

const STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'IN_PRODUCTION',
  'READY',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const { authReady, onAuthError } = useAdminGuard();
  const [orders, setOrders] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authReady) return;
    setError('');
    getAdminOrders({ status: status || undefined })
      .then(setOrders)
      .catch((err) => {
        if (!onAuthError(err)) setError('Could not load orders.');
      });
  }, [authReady, status, onAuthError]);

  if (!authReady) return null;

  return (
    <>
      <AdminNav />
      <main className={styles.main}>
        <h1 className={styles.title}>Orders</h1>

        <div className={styles.filters}>
          <label htmlFor="order-status-filter" className={styles.muted}>
            Status
          </label>
          <select
            id="order-status-filter"
            className={styles.select}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {orderStatusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {!orders && !error && <p className={styles.muted}>Loading…</p>}
        {orders && orders.length === 0 && (
          <p className={styles.muted}>No orders yet.</p>
        )}

        {orders && orders.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Destination</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className={styles.rowLink}
                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                >
                  <td>{order.reference}</td>
                  <td>{order.customer_name}</td>
                  <td>{formatNgn(order.total)}</td>
                  <td>
                    <OrderStatusBadge status={order.payment_status} kind="payment" />
                  </td>
                  <td>
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className={styles.muted}>
                    {order.delivery_city}, {order.delivery_country}
                  </td>
                  <td className={styles.muted}>{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
