'use client';

import { useEffect, useMemo, useState } from 'react';

import { listCountries } from '../../lib/countries';
import { NIGERIA_STATES } from '../../lib/nigeriaStates';
import {
  contactErrors,
  deliveryErrors,
  hasErrors,
} from '../../lib/checkout';
import styles from './CheckoutForm.module.css';

const EMPTY_CONTACT = { firstName: '', lastName: '', email: '', phone: '' };
const EMPTY_DELIVERY = {
  countryCode: '',
  address1: '',
  address2: '',
  city: '',
  stateRegion: '',
  postalCode: '',
  notes: '',
};

function Field({ id, label, error, children, hint }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function CheckoutForm({
  onSubmit,
  onDestinationChange,
  submitting = false,
  submitDisabledReason = null,
  initialContact = null,
  initialDelivery = null,
  savedAddresses = [],
}) {
  const countries = useMemo(() => listCountries(), []);
  const [contact, setContact] = useState(initialContact ?? EMPTY_CONTACT);
  const [delivery, setDelivery] = useState({
    ...EMPTY_DELIVERY,
    ...(initialDelivery ?? {}),
  });
  const [errors, setErrors] = useState({ contact: {}, delivery: {} });

  const isNigeria = delivery.countryCode === 'NG';

  useEffect(() => {
    const countryName =
      countries.find((c) => c.code === delivery.countryCode)?.name || '';
    onDestinationChange({
      countryCode: delivery.countryCode,
      countryName,
      stateRegion: delivery.stateRegion,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery.countryCode, delivery.stateRegion]);

  const setC = (key) => (e) => {
    setContact((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, contact: { ...prev.contact, [key]: '' } }));
  };
  const setD = (key) => (e) => {
    const value = e.target.value;
    setDelivery((prev) => {
      // Reset the state/region when the country changes — the control type changes.
      if (key === 'countryCode') return { ...prev, countryCode: value, stateRegion: '' };
      return { ...prev, [key]: value };
    });
    setErrors((prev) => ({ ...prev, delivery: { ...prev.delivery, [key]: '' } }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cErr = contactErrors(contact);
    const dErr = deliveryErrors(delivery);
    if (hasErrors(cErr, dErr)) {
      setErrors({ contact: cErr, delivery: dErr });
      return;
    }
    const countryName =
      countries.find((c) => c.code === delivery.countryCode)?.name || '';
    onSubmit({ contact, delivery: { ...delivery, countryName } });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate id="checkout-form">
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Contact</legend>
        <div className={styles.row}>
          <Field id="checkout-first-name" label="First name" error={errors.contact.firstName}>
            <input
              id="checkout-first-name"
              className={styles.input}
              value={contact.firstName}
              onChange={setC('firstName')}
              autoComplete="given-name"
            />
          </Field>
          <Field id="checkout-last-name" label="Last name" error={errors.contact.lastName}>
            <input
              id="checkout-last-name"
              className={styles.input}
              value={contact.lastName}
              onChange={setC('lastName')}
              autoComplete="family-name"
            />
          </Field>
        </div>
        <div className={styles.row}>
          <Field id="checkout-email" label="Email" error={errors.contact.email}>
            <input
              id="checkout-email"
              type="email"
              className={styles.input}
              value={contact.email}
              onChange={setC('email')}
              autoComplete="email"
            />
          </Field>
          <Field
            id="checkout-phone"
            label="Phone / WhatsApp"
            error={errors.contact.phone}
            hint="We'll use this to arrange your measurements after payment."
          >
            <input
              id="checkout-phone"
              type="tel"
              className={styles.input}
              value={contact.phone}
              onChange={setC('phone')}
              autoComplete="tel"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Delivery</legend>
        {savedAddresses.length >= 1 && (
          <Field id="checkout-saved-address" label="Use a saved address">
            <select
              id="checkout-saved-address"
              className={styles.select}
              defaultValue=""
              onChange={(e) => {
                const a = savedAddresses.find((x) => String(x.id) === e.target.value);
                if (!a) return;
                setDelivery((prev) => ({
                  ...prev,
                  countryCode: a.country_code,
                  address1: a.address_1,
                  address2: a.address_2,
                  city: a.city,
                  stateRegion: a.state_region,
                  postalCode: a.postal_code,
                }));
              }}
            >
              <option value="">Choose…</option>
              {savedAddresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} — {a.address_1}, {a.city}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field id="checkout-country" label="Country" error={errors.delivery.countryCode}>
          <select
            id="checkout-country"
            className={styles.select}
            value={delivery.countryCode}
            onChange={setD('countryCode')}
            autoComplete="country"
          >
            <option value="">Select a country…</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field id="checkout-address-1" label="Address line 1" error={errors.delivery.address1}>
          <input
            id="checkout-address-1"
            className={styles.input}
            value={delivery.address1}
            onChange={setD('address1')}
            autoComplete="address-line1"
          />
        </Field>
        <Field id="checkout-address-2" label="Address line 2 (optional)" error={null}>
          <input
            id="checkout-address-2"
            className={styles.input}
            value={delivery.address2}
            onChange={setD('address2')}
            autoComplete="address-line2"
          />
        </Field>

        <div className={styles.row}>
          <Field id="checkout-city" label="City" error={errors.delivery.city}>
            <input
              id="checkout-city"
              className={styles.input}
              value={delivery.city}
              onChange={setD('city')}
              autoComplete="address-level2"
            />
          </Field>
          <Field
            id="checkout-state"
            label="State / Region"
            error={errors.delivery.stateRegion}
          >
            {isNigeria ? (
              <select
                id="checkout-state"
                className={styles.select}
                value={delivery.stateRegion}
                onChange={setD('stateRegion')}
                autoComplete="address-level1"
              >
                <option value="">Select a state…</option>
                {NIGERIA_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="checkout-state"
                className={styles.input}
                value={delivery.stateRegion}
                onChange={setD('stateRegion')}
                autoComplete="address-level1"
              />
            )}
          </Field>
        </div>

        <div className={styles.row}>
          <Field id="checkout-postal" label="Postal / ZIP code (optional)" error={null}>
            <input
              id="checkout-postal"
              className={styles.input}
              value={delivery.postalCode}
              onChange={setD('postalCode')}
              autoComplete="postal-code"
            />
          </Field>
          <div />
        </div>

        <Field id="checkout-notes" label="Delivery notes (optional)" error={null}>
          <textarea
            id="checkout-notes"
            className={`${styles.input} ${styles.textarea}`}
            rows={3}
            value={delivery.notes}
            onChange={setD('notes')}
          />
        </Field>
      </fieldset>

      <div className={styles.submitRow}>
        <button
          type="submit"
          className="btn btn-dark"
          id="checkout-submit"
          disabled={submitting || Boolean(submitDisabledReason)}
        >
          {submitting ? 'Placing order…' : 'Place order'}
        </button>
        {submitDisabledReason && (
          <p className={styles.hint}>{submitDisabledReason}</p>
        )}
      </div>
    </form>
  );
}
