'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import { verifyEmail } from '../../lib/accountApi';
import styles from '../../styles/auth.module.css';

function VerifyContent() {
  const token = useSearchParams().get('token') || '';
  const { refresh } = useCustomerAuth();
  const [state, setState] = useState('working'); // working | done | error
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) return setState('error');
    verifyEmail(token)
      .then(() => refresh())
      .then(() => setState('done'))
      .catch(() => setState('error'));
  }, [token, refresh]);

  return (
    <div className={`${styles.inner} ${styles.single}`}>
      <div className={styles.formCol}>
        <p className="section-label">Account</p>
        {state === 'working' && <h1 className={styles.heading}>Confirming your email…</h1>}
        {state === 'done' && (
          <>
            <h1 className={styles.heading}>Email confirmed</h1>
            <p className={styles.sub}>
              Thanks — your email address is verified. You’re all set.
            </p>
            <div className={styles.altLinks}>
              <Link href="/account">Go to your account</Link>
              <span />
            </div>
          </>
        )}
        {state === 'error' && (
          <>
            <h1 className={styles.heading}>That link didn’t work</h1>
            <p className={styles.banner}>
              The link is invalid or has expired. Sign in and request a new one
              from your account.
            </p>
            <div className={styles.altLinks}>
              <Link href="/login">Sign in</Link>
              <span />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <Suspense fallback={<div className={styles.inner} />}>
          <VerifyContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
