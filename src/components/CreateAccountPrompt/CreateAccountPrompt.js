'use client';

import { useState } from 'react';

import AccountBenefits from '../AccountBenefits/AccountBenefits';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import styles from './CreateAccountPrompt.module.css';

// Shown to guests after an order. Registering links this order — and any prior
// guest orders on the same email — to the new account. Name fields are seeded
// from the order and stay editable so the buyer can correct a checkout typo.
export default function CreateAccountPrompt({ email, firstName, lastName }) {
  const { user, register } = useCustomerAuth();
  const [firstNameValue, setFirstName] = useState(firstName || '');
  const [lastNameValue, setLastName] = useState(lastName || '');
  const [password, setPassword] = useState('');
  const [state, setState] = useState('idle'); // idle | busy | done | error
  const [error, setError] = useState('');

  if (user) return null; // already signed in

  const submit = async (e) => {
    e.preventDefault();
    const fn = firstNameValue.trim();
    const ln = lastNameValue.trim();
    if (!fn || !ln) {
      setError('Enter your first and last name.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    setState('busy');
    setError('');
    try {
      await register({
        email,
        password,
        first_name: fn,
        last_name: ln,
      });
      setState('done');
    } catch (err) {
      setState('idle');
      setError(
        err?.status === 409
          ? 'That email already has an account — sign in instead.'
          : 'Could not create your account. Please try again.'
      );
    }
  };

  if (state === 'done') {
    return (
      <div className={styles.wrap}>
        <p className={styles.done}>
          Account created — this order is now in <strong>your account</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.title}>Create an account to track this order</p>
      <AccountBenefits compact />
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.row}>
          <div className={styles.col}>
            <label className={styles.label} htmlFor="cap-first">First name</label>
            <input
              id="cap-first"
              className={styles.input}
              value={firstNameValue}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div className={styles.col}>
            <label className={styles.label} htmlFor="cap-last">Last name</label>
            <input
              id="cap-last"
              className={styles.input}
              value={lastNameValue}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>
        </div>
        <label className={styles.label} htmlFor="cap-email">Email</label>
        <input id="cap-email" className={styles.input} value={email} readOnly />
        <label className={styles.label} htmlFor="cap-pw">Choose a password</label>
        <input
          id="cap-pw"
          type="password"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className="btn btn-dark" disabled={state === 'busy'}>
          {state === 'busy' ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
