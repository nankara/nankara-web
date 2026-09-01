'use client';

import { useState } from 'react';
import Link from 'next/link';

import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import { forgotPassword } from '../../lib/accountApi';
import styles from '../../styles/auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await forgotPassword(email.trim());
    } catch {
      /* the endpoint is 202 regardless; ignore */
    }
    setSent(true);
    setBusy(false);
  };

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className={`${styles.inner} ${styles.single}`}>
          <div className={styles.formCol}>
            <p className="section-label">Account</p>
            {sent ? (
              <>
                <h1 className={styles.heading}>Check your inbox</h1>
                <p className={styles.sub}>
                  If an account exists for <strong>{email.trim()}</strong>, we’ve
                  sent a link to reset your password. It expires in an hour.
                </p>
                <p className={styles.sub}>
                  Didn’t get it? Check your spam folder, or{' '}
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => setSent(false)}
                  >
                    try another address
                  </button>
                  .
                </p>
              </>
            ) : (
              <>
                <h1 className={styles.heading}>Forgot password</h1>
                <p className={styles.sub}>
                  Enter your email and we’ll send you a reset link.
                </p>
                <form className={styles.form} onSubmit={submit} noValidate>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="email">Email</label>
                    <input id="email" type="email" className={styles.input}
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email" required />
                  </div>
                  <div className={styles.submitRow}>
                    <button type="submit" className="btn btn-dark" disabled={busy}>
                      {busy ? 'Sending…' : 'Send reset link'}
                    </button>
                  </div>
                </form>
              </>
            )}
            <div className={styles.altLinks}>
              <Link href="/login">Back to sign in</Link>
              <span />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
