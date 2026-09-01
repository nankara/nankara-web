'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import Navbar from '../../../../components/Navbar/Navbar';
import Footer from '../../../../components/Footer/Footer';
import Price from '../../../../components/Price/Price';
import CreateAccountPrompt from '../../../../components/CreateAccountPrompt/CreateAccountPrompt';
import { useCart } from '../../../../hooks/useCart';
import { getOrderConfirmation, verifyPayment } from '../../../../lib/api';
import { isPaid } from '../../../../lib/payment';
import styles from './success.module.css';

const MAX_POLLS = 5;
const POLL_MS = 2000;

export default function OrderSuccessPage({ params }) {
  const { reference } = params;
  const { clearCart } = useCart();

  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading'); // loading | paid | pending | notfound
  const cleared = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let polls = 0;

    async function load(initial) {
      try {
        if (initial) {
          // Best-effort — the webhook may have already done this.
          await verifyPayment(reference).catch(() => {});
        }
        const data = await getOrderConfirmation(reference);
        if (cancelled) return;
        setOrder(data);
        if (isPaid(data)) {
          setState('paid');
          if (!cleared.current) {
            cleared.current = true;
            clearCart();
          }
          return;
        }
        if (polls < MAX_POLLS) {
          polls += 1;
          setTimeout(() => load(false), POLL_MS);
        } else {
          setState('pending');
        }
      } catch (err) {
        if (cancelled) return;
        if (err?.status === 404) setState('notfound');
        else if (polls < MAX_POLLS) {
          polls += 1;
          setTimeout(() => load(false), POLL_MS);
        } else {
          setState('pending');
        }
      }
    }

    load(true);
    return () => {
      cancelled = true;
    };
  }, [reference, clearCart]);

  return (
    <>
      <Navbar />
      <main id="order-success-main" className={styles.main}>
        <div className={styles.inner}>
          {state === 'loading' && (
            <p className={styles.status}>Confirming your payment…</p>
          )}

          {state === 'notfound' && (
            <div className={styles.block}>
              <h1 className={styles.heading}>We couldn&apos;t find that order</h1>
              <p className={styles.body}>
                Check the link in your address bar, or contact us with your reference.
              </p>
              <Link href="/shop" className="btn btn-dark">
                Back to the collection
              </Link>
            </div>
          )}

          {state === 'pending' && (
            <div className={styles.block}>
              <p className="section-label">Payment processing</p>
              <h1 className={styles.heading}>Your payment is being confirmed.</h1>
              <p className={styles.body}>
                This usually takes a moment. We&apos;ll email you as soon as it&apos;s
                done — your reference is <strong>{reference}</strong>. You can safely
                close this page.
              </p>
              <Link href="/shop" className={styles.textLink}>
                Continue browsing
              </Link>
            </div>
          )}

          {state === 'paid' && order && (
            <div className={styles.block} id="order-confirmed">
              <p className="section-label">Payment confirmed</p>
              <h1 className={styles.heading}>
                Your Nankara piece is being prepared for your story.
              </h1>
              <p className={styles.body}>
                Your payment has been confirmed. Our team will contact you using the
                details you provided to collect the measurements required to tailor
                your piece.
              </p>

              <dl className={styles.meta}>
                <div>
                  <dt>Order reference</dt>
                  <dd>{order.reference}</dd>
                </div>
                <div>
                  <dt>Confirmation sent to</dt>
                  <dd>{order.customer.email}</dd>
                </div>
                <div>
                  <dt>Delivery to</dt>
                  <dd>
                    {order.delivery.city}, {order.delivery.state_region},{' '}
                    {order.delivery.country}
                  </dd>
                </div>
              </dl>

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
                <span>Shipping</span>
                <Price amountNgn={order.shipping_amount} variant="inline" />
              </div>
              <div className={`${styles.line} ${styles.total}`}>
                <span>Amount paid</span>
                <Price amountNgn={order.total} variant="inline" />
              </div>

              <div className={styles.actions}>
                <Link href="/shop" className="btn btn-dark">
                  Continue shopping
                </Link>
                <Link href="/contact" className={styles.textLink}>
                  Contact us
                </Link>
              </div>

              <CreateAccountPrompt
                email={order.customer.email}
                firstName={order.customer.first_name}
                lastName={order.customer.last_name}
              />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
