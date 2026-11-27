import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [
    { title: 'Choose a Password — One in a Zillion' },
    { name: 'description', content: 'Verify your arcade account and choose a new password for One in a Zillion.' },
    { property: 'og:title', content: 'Choose a Password — One in a Zillion' },
    { property: 'og:description', content: 'Securely restore access to your One in a Zillion player account.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: PasswordPage,
});

function PasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    const recoveryLink = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) setReady(true);
    });
    void supabase.auth.getUser().then(({ data }) => { if (data.user?.email_confirmed_at) setReady(true); });
    if (recoveryLink) setError('');
    return () => subscription.unsubscribe();
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not change your password.'); }
    finally { setBusy(false); }
  }
  return <main className="password-page"><form className="password-form" onSubmit={submit}>
    <h1>ONE IN A ZILLION</h1>
    <h2>{done ? 'PASSWORD SAVED' : 'CHOOSE A NEW PASSWORD'}</h2>
    {done ? <Link to="/">RETURN TO THE ARCADE →</Link> : ready ? <>
      <label>NEW PASSWORD<input type="password" autoComplete="new-password" minLength={6} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      <label>CONFIRM PASSWORD<input type="password" autoComplete="new-password" minLength={6} maxLength={72} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></label>
      <Button variant="arcade" size="arcade" type="submit" className="btn btn-gold" disabled={busy}>{busy ? 'SAVING…' : 'SAVE PASSWORD'}</Button>
    </> : <p>Open the verification link in your email, or request a new link from the account screen.</p>}
    {error && <p className="account-error" role="alert">{error}</p>}
    {!done && <Link to="/">BACK TO THE ARCADE</Link>}
  </form></main>;
}