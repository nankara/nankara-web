'use client';

import { useState } from 'react';

import Price from '../Price/Price';
import CreateAccountPrompt from '../CreateAccountPrompt/CreateAccountPrompt';
import { initializePaystack } from '../../lib/api';
import styles from './OrderPlacedSummary.module.css';

// Shown after POST /api/v1/orders succeeds. The order exists as PENDING_PAYMENT;
// "Pay with Paystack" hands off to Paystack's hosted checkout. The bag is kept
// until payment is confirmed (that happens on /order/[reference]/success).
export default function OrderPlacedSummary({ order }) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const pay = async () => {
    setPaying(true);
    setError('');
    try {
      const { authorization_url: url } = await initializePaystack(order.reference);
      if (!url) throw new Error('no authorization url');
      window.location.href = url;
    } catch (err) {
      setError(
        err?.status === 503
          ? 'Payments aren’t available right now. Please try again shortly.'
          : 'We couldn’t start payment. Please try again.'
      );
      setPaying(false);
    }
  };

  return (
    <div className={styles.wrap} id="order-placed">
      <p className="section-label">Order received</p>
      <h1 className={styles.heading}>Your bag is reserved.</h1>
      <p className={styles.reference}>
        Reference <strong>{order.reference}</strong>
      </p>
      <p className={styles.body}>
        We&apos;ve saved your order and delivery details. Complete secure payment with
        Paystack to confirm it — your bag stays reserved until then, and we&apos;ll
        email <strong>{order.customer.email}</strong> a receipt.
      </p>

      <ul className={styles.items}>
        {order.items.map((item, i) => (
          <li key={i} className={styles.item}>
            <span>
              {item.product_name}
              <span className={styles.qty}> × {item.quantity}</span>
            </span>
            <Price amountNgn={item.subtotal} variant="inline" />
          </li>
        ))}
      </ul>

      <div className={styles.line}>
        <span>Subtotal</span>
        <Price amountNgn={order.subtotal} variant="inline" />
      </div>
      <div className={styles.line}>
        <span>Shipping — {order.delivery.city}, {order.delivery.country}</span>
        <Price amountNgn={order.shipping_amount} variant="inline" />
      </div>
      <div className={`${styles.line} ${styles.total}`}>
        <span>Total</span>
        <Price amountNgn={order.total} variant="inline" />
      </div>

      <button
        type="button"
        className="btn btn-dark"
        id="order-pay"
        onClick={pay}
        disabled={paying}
      >
        {paying ? 'Opening Paystack…' : 'Pay with Paystack'}
      </button>
      {error && (
        <p className={styles.payError} role="alert">
          {error}
        </p>
      )}

      <div className={styles.measure}>
        <p className={styles.measureTitle}>Made for your fit</p>
        <p className={styles.measureBody}>
          After payment is confirmed, our team will contact you to collect the
          measurements required to tailor your piece.
        </p>
      </div>

      <CreateAccountPrompt
        email={order.customer.email}
        firstName={order.customer.first_name}
        lastName={order.customer.last_name}
      />
    </div>
  );
}
