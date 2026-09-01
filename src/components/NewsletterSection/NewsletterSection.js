'use client';
import { useState } from 'react';
import { subscribeNewsletter } from '../../lib/api';
import { newsletterEmailError } from '../../lib/forms';
import styles from './NewsletterSection.module.css';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const invalid = newsletterEmailError(email);
    if (invalid) {
      setErrorMsg(invalid);
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      await subscribeNewsletter(email.trim(), 'footer', website);
      setStatus('success');
      setEmail('');
    } catch {
      setErrorMsg('Something went wrong. Please try again in a moment.');
      setStatus('error');
    }
  };

  return (
    <section className={styles.section} id="newsletter">
      <div className={styles.inner}>
        <div className={styles.content}>
          <p className={styles.preLabel}>The Edit</p>
          <h2 className={styles.heading}>
            Join the world of<br />
            <em>Nankara.</em>
          </h2>
          <p className={styles.body}>
            Be first to discover new collections, editorial features, and exclusive access, delivered with the same elegance as the clothes themselves.
          </p>
        </div>
        <div className={styles.formWrap}>
          {status === 'success' ? (
            <div className={styles.success}>
              <span className={styles.successIcon}>✓</span>
              <p className={styles.successText}>You are now part of Nankara.</p>
              <p className={styles.successSub}>Watch your inbox for something beautiful.</p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit} noValidate id="newsletter-form">
              <input
                type="text"
                name="website"
                className={styles.honeypot}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
              <div className={styles.inputWrap}>
                <input
                  type="email"
                  id="newsletter-email"
                  name="email"
                  className={`${styles.input} ${status === 'error' ? styles.inputError : ''}`}
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
                  aria-label="Email address for newsletter"
                  required
                />
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={status === 'loading'}
                  id="newsletter-submit"
                >
                  {status === 'loading' ? '...' : 'Join'}
                </button>
              </div>
              {status === 'error' && (
                <p className={styles.errorText} role="alert">{errorMsg || 'Please enter a valid email address.'}</p>
              )}
              <p className={styles.privacy}>
                By subscribing you agree to receive our curated communications. No spam, ever.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
