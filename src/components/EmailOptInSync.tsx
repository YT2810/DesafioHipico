'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Applies the registration-time email consent choice.
 * The sign-in page stores `dh_email_optout` in localStorage when the user
 * unchecks "recibir correos"; on first authenticated render we persist that
 * to the User document and clear the flag. Also stamps emailOptInAt for
 * opted-in new users (first login only).
 */
export default function EmailOptInSync() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;
    const optOut = localStorage.getItem('dh_email_optout');
    if (!optOut) return;
    localStorage.removeItem('dh_email_optout');
    fetch('/api/user/email-prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unsubscribed: true }),
    }).catch(() => {});
  }, [status]);

  return null;
}
