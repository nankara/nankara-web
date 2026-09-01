'use client';

import { useCallback, useEffect, useState } from 'react';

import AdminNav from '../../../components/AdminNav/AdminNav';
import { useAdminGuard } from '../../../hooks/useAdminGuard';
import { getShippingZones, updateShippingZone } from '../../../lib/adminApi';
import styles from '../admin.module.css';

function ZoneRow({ zone, onSaved, onAuthError }) {
  const [rate, setRate] = useState(String(zone.rate));
  const [active, setActive] = useState(zone.is_active);
  const [state, setState] = useState('idle'); // idle | saving | saved | error

  const dirty = Number(rate) !== zone.rate || active !== zone.is_active;

  const save = async () => {
    setState('saving');
    try {
      const updated = await updateShippingZone(zone.id, {
        rate: Number(rate),
        is_active: active,
      });
      onSaved(updated);
      setState('saved');
    } catch (err) {
      if (!onAuthError(err)) setState('error');
    }
  };

  return (
    <tr>
      <td>{zone.name}</td>
      <td className={styles.muted}>{zone.region_type}</td>
      <td>
        <span className={styles.muted}>₦</span>
        <input
          type="number"
          min="0"
          className={styles.rateInput}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          aria-label={`${zone.name} active`}
        />
      </td>
      <td>
        <button
          type="button"
          className={styles.smallBtn}
          onClick={save}
          disabled={!dirty || state === 'saving'}
        >
          {state === 'saving' ? 'Saving…' : state === 'saved' && !dirty ? 'Saved' : 'Save'}
        </button>
        {state === 'error' && <span className={styles.error}> failed</span>}
      </td>
    </tr>
  );
}

export default function AdminShippingPage() {
  const { authReady, onAuthError } = useAdminGuard();
  const [zones, setZones] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setZones(await getShippingZones());
    } catch (err) {
      if (!onAuthError(err)) setError('Could not load shipping zones.');
    }
  }, [onAuthError]);

  useEffect(() => {
    if (authReady) load();
  }, [authReady, load]);

  const onSaved = (updated) => {
    setZones((prev) => prev.map((z) => (z.id === updated.id ? updated : z)));
  };

  if (!authReady) return null;

  return (
    <>
      <AdminNav />
      <main className={styles.main}>
        <h1 className={styles.title}>Shipping zones</h1>

        <p className={styles.warning}>
          Rates are placeholder figures. Replace them with real, approved rates before
          accepting live orders.
        </p>

        {error && <p className={styles.error}>{error}</p>}
        {!zones && !error && <p className={styles.muted}>Loading…</p>}

        {zones && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Zone</th>
                <th>Region</th>
                <th>Rate (NGN)</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <ZoneRow
                  key={zone.id}
                  zone={zone}
                  onSaved={onSaved}
                  onAuthError={onAuthError}
                />
              ))}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
