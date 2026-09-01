'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import AdminNav from '../../../components/AdminNav/AdminNav';
import Badge from '../../../components/Badge/Badge';
import { useAdminGuard } from '../../../hooks/useAdminGuard';
import {
  getInboxMessages,
  getNewsletterSubscribers,
} from '../../../lib/adminApi';
import styles from '../admin.module.css';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const KIND_TONE = { contact: 'work', consultation: 'wait' };

function MessagesView({ onOpen }) {
  const [messages, setMessages] = useState(null);
  const [filter, setFilter] = useState('open'); // open | all | contact | consultation
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    const params =
      filter === 'open'
        ? { handled: false }
        : filter === 'all'
          ? {}
          : { kind: filter };
    getInboxMessages(params)
      .then(setMessages)
      .catch(() => setError('Could not load messages.'));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className={styles.filters}>
        <label htmlFor="inbox-filter" className={styles.muted}>Show</label>
        <select
          id="inbox-filter"
          className={styles.select}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="open">Unhandled</option>
          <option value="all">All</option>
          <option value="contact">Contact only</option>
          <option value="consultation">Consultation only</option>
        </select>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {!messages && !error && <p className={styles.muted}>Loading…</p>}
      {messages && messages.length === 0 && (
        <p className={styles.muted}>Nothing here.</p>
      )}

      {messages && messages.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Email</th>
              <th>Subject</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr
                key={m.id}
                className={styles.rowLink}
                onClick={() => onOpen(m.id)}
              >
                <td>
                  <Badge tone={KIND_TONE[m.kind] || 'muted'}>{m.kind}</Badge>
                </td>
                <td>{m.name}</td>
                <td className={styles.muted}>{m.email}</td>
                <td className={styles.muted}>{m.subject}</td>
                <td className={styles.muted}>{formatDate(m.created_at)}</td>
                <td>
                  <Badge tone={m.is_handled ? 'done' : 'wait'}>
                    {m.is_handled ? 'Handled' : 'Open'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function SubscribersView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getNewsletterSubscribers()
      .then(setData)
      .catch(() => setError('Could not load subscribers.'));
  }, []);

  const downloadCsv = () => {
    if (!data) return;
    const rows = [
      ['email', 'source', 'subscribed_at'],
      ...data.subscribers.map((s) => [s.email, s.source, s.created_at]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nankara-newsletter.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) return <p className={styles.error}>{error}</p>;
  if (!data) return <p className={styles.muted}>Loading…</p>;

  return (
    <>
      <div className={styles.filters}>
        <span className={styles.muted}>{data.count} subscriber{data.count === 1 ? '' : 's'}</span>
        {data.count > 0 && (
          <button type="button" className={styles.smallBtn} onClick={downloadCsv}>
            Download CSV
          </button>
        )}
      </div>
      {data.count === 0 ? (
        <p className={styles.muted}>No subscribers yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Source</th>
              <th>Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {data.subscribers.map((s) => (
              <tr key={s.id}>
                <td>{s.email}</td>
                <td className={styles.muted}>{s.source}</td>
                <td className={styles.muted}>{formatDate(s.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default function AdminInboxPage() {
  const router = useRouter();
  const { authReady } = useAdminGuard();
  const [tab, setTab] = useState('messages'); // messages | subscribers

  if (!authReady) return null;

  return (
    <>
      <AdminNav />
      <main className={styles.main}>
        <h1 className={styles.title}>Inbox</h1>

        <div className={styles.tabs}>
          <button
            type="button"
            className={tab === 'messages' ? styles.tabActive : styles.tab}
            onClick={() => setTab('messages')}
          >
            Messages
          </button>
          <button
            type="button"
            className={tab === 'subscribers' ? styles.tabActive : styles.tab}
            onClick={() => setTab('subscribers')}
          >
            Subscribers
          </button>
        </div>

        {tab === 'messages' ? (
          <MessagesView onOpen={(id) => router.push(`/admin/inbox/${id}`)} />
        ) : (
          <SubscribersView />
        )}
      </main>
    </>
  );
}
