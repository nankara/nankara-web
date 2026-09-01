'use client';
import { useState } from 'react';
import Image from 'next/image';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import ScrollReveal from '../../components/ScrollReveal/ScrollReveal';
import CustomDropdown from '../../components/CustomDropdown/CustomDropdown';
import { submitContactMessage } from '../../lib/api';
import { buildContactPayload, contactErrors, hasErrors } from '../../lib/forms';
import styles from './contact.module.css';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'General Inquiry', message: '', website: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const subjects = ['General Inquiry', 'Styling Consultation', 'Business Partnership', 'Press & Media', 'Other'];

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = contactErrors(form);
    if (hasErrors(errs)) { setErrors(errs); return; }
    setStatus('loading');
    try {
      await submitContactMessage(buildContactPayload(form));
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      <Navbar />
      <main id="contact-main">

        {/* Page header */}
        <section className={styles.pageHeader}>
          <div className={styles.heroImage}>
            <Image
              src="/images/nankara-16.jpg"
              alt="Contact Nankara"
              fill
              sizes="100vw"
              style={{ objectFit: 'cover', objectPosition: 'center 15%', filter: 'var(--photo-tone)' }}
              priority
            />
            <div className={styles.heroOverlay} />
          </div>
          <div className={styles.headerInner}>
            <p className={styles.headerLabel}>Private Client Services</p>
            <h1 className={styles.headerHeading}>
              Begin the<br />
              <em>conversation.</em>
            </h1>
          </div>
        </section>

        {/* Main content */}
        <section className={styles.mainSection}>
          <ScrollReveal className={styles.inner}>

            {/* Info column */}
            <div className={styles.infoCol}>
              <div className={styles.infoBlock}>
                <p className="section-label" style={{ color: 'var(--color-orange)' }}>Email</p>
                <a href="mailto:hello@nankara.com" className={styles.infoLink} id="contact-email-link">
                  hello@nankara.com
                </a>
              </div>
              <div className={styles.infoBlock}>
                <p className="section-label" style={{ color: 'var(--color-orange)' }}>Business Inquiries</p>
                <a href="mailto:partnerships@nankara.com" className={styles.infoLink} id="contact-biz-link">
                  partnerships@nankara.com
                </a>
              </div>
              <div className={styles.infoBlock}>
                <p className="section-label" style={{ color: 'var(--color-orange)' }}>Follow Us</p>
                <div className={styles.socialLinks}>
                  <a href="https://www.instagram.com/nankara" target="_blank" rel="noopener noreferrer" className={styles.socialLink} id="contact-instagram">Instagram</a>
                  <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink} id="contact-pinterest">Pinterest</a>
                  <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink} id="contact-tiktok">TikTok</a>
                </div>
              </div>
              <div className={styles.infoBlock}>
                <p className="section-label" style={{ color: 'var(--color-orange)' }}>Response Time</p>
                <p className={styles.infoText}>As a private client, you will receive a response from our concierge team within 24 hours. For urgent styling needs, email us directly.</p>
              </div>
            </div>

            {/* Form column */}
            <div className={styles.formCol}>
              {status === 'success' ? (
                <div className={styles.successState}>
                  <div className={styles.successIcon}>✓</div>
                  <h2 className={styles.successHeading}>Message received.</h2>
                  <p className={styles.successBody}>
                    Thank you for reaching out. We have received your message and will respond within 48 hours.
                  </p>
                </div>
              ) : (
                <form className={styles.form} onSubmit={handleSubmit} noValidate id="contact-form">
                  <input
                    type="text"
                    name="website"
                    className={styles.honeypot}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={form.website}
                    onChange={handleChange}
                  />
                  {status === 'error' && (
                    <p className={styles.formError} role="alert">
                      Something went wrong sending your message. Please try again, or email
                      us directly at <a href="mailto:hello@nankara.com">hello@nankara.com</a>.
                    </p>
                  )}
                  <div className={styles.row}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="contact-name">Full Name</label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                        placeholder="Your full name"
                        value={form.name}
                        onChange={handleChange}
                        autoComplete="name"
                      />
                      {errors.name && <p className={styles.errorMsg} role="alert">{errors.name}</p>}
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="contact-email">Email Address</label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                        placeholder="your@email.com"
                        value={form.email}
                        onChange={handleChange}
                        autoComplete="email"
                      />
                      {errors.email && <p className={styles.errorMsg} role="alert">{errors.email}</p>}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} id="contact-subject-label">Subject</label>
                    <CustomDropdown
                      options={subjects}
                      value={form.subject}
                      onChange={(val) => setForm(prev => ({ ...prev, subject: val }))}
                      label="Select a subject..."
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="contact-message">Message</label>
                    <textarea
                      id="contact-message"
                      name="message"
                      className={`${styles.input} ${styles.textarea} ${errors.message ? styles.inputError : ''}`}
                      placeholder="Tell us how we can help you..."
                      rows={6}
                      value={form.message}
                      onChange={handleChange}
                    />
                    {errors.message && <p className={styles.errorMsg} role="alert">{errors.message}</p>}
                  </div>

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={status === 'loading'}
                    id="contact-submit"
                  >
                    {status === 'loading' ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </ScrollReveal>
        </section>

      </main>
      <Footer />
    </>
  );
}
