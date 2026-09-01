'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import AdminNav from '../../../../components/AdminNav/AdminNav';
import Badge from '../../../../components/Badge/Badge';
import { useAdminGuard } from '../../../../hooks/useAdminGuard';
import { getInboxMessage, setInboxHandled } from '../../../../lib/adminApi';
import styles from '../../admin.module.css';

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminInboxMessagePage({ params }) {
  const { id } = params;
  const { authReady, onAuthError } = useAdminGuard();
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    getInboxMessage(id)
      .then(setMessage)
      .catch((err) => {
        if (!onAuthError(err)) {
          setError(err?.status === 404 ? 'notfound' : 'Could not load this message.');
        }
      });
  }, [authReady, id, onAuthError]);

  if (!authReady) return null;

  const toggleHandled = async () => {
    setBusy(true);
    try {
      const updated = await setInboxHandled(id, !message.is_handled);
      setMessage(updated);
    } catch (err) {
      if (!onAuthError(err)) setError('Could not update this message.');
    } finally {
      setBusy(false);
    }
  };

  const isConsult = message?.kind === 'consultation';

  return (
    <>
      <AdminNav />
      <main className={styles.main}>
        <Link href="/admin/inbox" className={styles.backLink}>← Inbox</Link>

        {error === 'notfound' && <p className={styles.muted}>Message not found.</p>}
        {error && error !== 'notfound' && <p className={styles.error}>{error}</p>}
        {!message && !error && <p className={styles.muted}>Loading…</p>}

        {message && (
          <>
            <div className={styles.badgeRow}>
              <Badge tone={isConsult ? 'wait' : 'work'}>{message.kind}</Badge>
              <Badge tone={message.is_handled ? 'done' : 'wait'}>
                {message.is_handled ? 'Handled' : 'Open'}
              </Badge>
            </div>

            <h1 className={styles.title}>{message.name}</h1>

            <dl className={styles.detailGrid}>
              <dt>Email</dt>
              <dd><a href={`mailto:${message.email}`}>{message.email}</a></dd>
              {isConsult && (
                <>
                  <dt>WhatsApp</dt>
                  <dd>{message.phone || '—'}</dd>
                  <dt>Country</dt>
                  <dd>{message.country || '—'}</dd>
                </>
              )}
              {!isConsult && (
                <>
                  <dt>Subject</dt>
                  <dd>{message.subject || '—'}</dd>
                </>
              )}
              <dt>Received</dt>
              <dd>{formatDateTime(message.created_at)}</dd>
              {message.handled_at && (
                <>
                  <dt>Handled</dt>
                  <dd>{formatDateTime(message.handled_at)}</dd>
                </>
              )}
            </dl>

            <div className={styles.section}>
              <p className={styles.sectionTitle}>{isConsult ? 'Goal' : 'Message'}</p>
              <p style={{ whiteSpace: 'pre-wrap' }}>{message.message}</p>
            </div>

            <div className={styles.pageActions}>
              <a href={`mailto:${message.email}`} className={styles.smallBtn}>
                Reply by email
              </a>
              <button
                type="button"
                className={styles.smallBtn}
                onClick={toggleHandled}
                disabled={busy}
              >
                {message.is_handled ? 'Reopen' : 'Mark handled'}
              </button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
