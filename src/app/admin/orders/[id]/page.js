'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import AdminNav from '../../../../components/AdminNav/AdminNav';
import OrderStatusBadge from '../../../../components/OrderStatusBadge/OrderStatusBadge';
import { useAdminGuard } from '../../../../hooks/useAdminGuard';
import { getAdminOrder, updateAdminOrderStatus } from '../../../../lib/adminApi';
import { formatNgn } from '../../../../lib/currency';
import { nextFulfilmentStatuses, orderStatusLabel } from '../../../../lib/payment';
import styles from '../../admin.module.css';

function Row({ label, children }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

export default function AdminOrderDetailPage({ params }) {
  const { id } = params;
  const { authReady, onAuthError } = useAdminGuard();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [choice, setChoice] = useState('');
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error

  useEffect(() => {
    if (!authReady) return;
    getAdminOrder(id)
      .then(setOrder)
      .catch((err) => {
        if (!onAuthError(err)) {
          setError(err?.status === 404 ? 'notfound' : 'Could not load this order.');
        }
      });
  }, [authReady, id, onAuthError]);

  if (!authReady) return null;

  const save = async () => {
    if (!choice) return;
    setSaveState('saving');
    try {
      const updated = await updateAdminOrderStatus(id, choice);
      setOrder(updated);
      setChoice('');
      setSaveState('saved');
    } catch (err) {
      if (!onAuthError(err)) setSaveState('error');
    }
  };

  if (error === 'notfound') {
    return (
      <>
        <AdminNav />
        <main className={styles.main}>
          <Link href="/admin/orders" className={styles.backLink}>
            ← All orders
          </Link>
          <p className={styles.muted}>Order not found.</p>
        </main>
      </>
    );
  }

  const options = order ? nextFulfilmentStatuses(order.status) : [];

  return (
    <>
      <AdminNav />
      <main className={styles.main}>
        <Link href="/admin/orders" className={styles.backLink}>
          ← All orders
        </Link>

        {error && error !== 'notfound' && <p className={styles.error}>{error}</p>}
        {!order && !error && <p className={styles.muted}>Loading…</p>}

        {order && (
          <>
            <div className={styles.header}>
              <h1 className={styles.title}>{order.reference}</h1>
              <OrderStatusBadge status={order.status} />
            </div>

            <div className={styles.section}>
              <p className={styles.sectionTitle}>Customer</p>
              <dl className={styles.detailGrid}>
                <Row label="Name">
                  {order.customer.first_name} {order.customer.last_name}
                </Row>
                <Row label="Email">{order.customer.email}</Row>
                <Row label="Phone / WhatsApp">{order.customer.phone}</Row>
              </dl>
            </div>

            <div className={styles.section}>
              <p className={styles.sectionTitle}>Delivery</p>
              <dl className={styles.detailGrid}>
                <Row label="Address">
                  {order.delivery.address_1}
                  {order.delivery.address_2 ? `, ${order.delivery.address_2}` : ''}
                </Row>
                <Row label="City">{order.delivery.city}</Row>
                <Row label="State / Region">{order.delivery.state_region}</Row>
                <Row label="Postal code">{order.delivery.postal_code || '—'}</Row>
                <Row label="Country">{order.delivery.country}</Row>
                <Row label="Shipping zone">{order.shipping.zone_name}</Row>
                <Row label="Shipping charged">{formatNgn(order.shipping.amount)}</Row>
                <Row label="Notes">{order.delivery.notes || '—'}</Row>
              </dl>
            </div>

            <div className={styles.section}>
              <p className={styles.sectionTitle}>Items</p>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.product_name}</td>
                      <td>{item.quantity}</td>
                      <td>{formatNgn(item.unit_price)}</td>
                      <td>{formatNgn(item.subtotal)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className={styles.muted}>
                      Subtotal
                    </td>
                    <td>{formatNgn(order.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3}>
                      <strong>Total</strong>
                    </td>
                    <td>
                      <strong>{formatNgn(order.total)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={styles.section}>
              <p className={styles.sectionTitle}>Payment</p>
              {order.payment ? (
                <dl className={styles.detailGrid}>
                  <Row label="Provider">{order.payment.provider}</Row>
                  <Row label="Reference">{order.payment.provider_reference}</Row>
                  <Row label="Amount">
                    {formatNgn(Math.round(order.payment.amount / 100))}
                  </Row>
                  <Row label="Status">
                    <OrderStatusBadge status={order.payment.status} kind="payment" />
                  </Row>
                  <Row label="Verified at">
                    {order.payment.verified_at
                      ? new Date(order.payment.verified_at).toLocaleString('en-GB')
                      : '—'}
                  </Row>
                </dl>
              ) : (
                <p className={styles.muted}>No payment recorded yet.</p>
              )}
            </div>

            <div className={styles.section}>
              <p className={styles.sectionTitle}>Fulfilment</p>
              {options.length === 0 ? (
                <p className={styles.muted}>
                  No further status changes from {orderStatusLabel(order.status)}.
                </p>
              ) : (
                <div className={styles.fulfilRow}>
                  <select
                    className={styles.select}
                    value={choice}
                    onChange={(e) => {
                      setChoice(e.target.value);
                      setSaveState('idle');
                    }}
                  >
                    <option value="">Move to…</option>
                    {options.map((s) => (
                      <option key={s} value={s}>
                        {orderStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={save}
                    disabled={!choice || saveState === 'saving'}
                  >
                    {saveState === 'saving' ? 'Saving…' : 'Save'}
                  </button>
                  {saveState === 'saved' && (
                    <span className={styles.muted}>Saved</span>
                  )}
                  {saveState === 'error' && (
                    <span className={styles.error}>Could not update</span>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
