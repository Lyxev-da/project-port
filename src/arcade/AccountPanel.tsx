import { useState, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { loadCloudAccount, signOutCloud, type ArcadeAccount } from './cloud';
import { lookupName } from './game/board';

interface Props { account: ArcadeAccount | null; onAuthChanged: (account: ArcadeAccount | null) => void; }
export function AccountPanel({ account, onAuthChanged }: Props) {
  const [mode, setMode] = useState<'login' | 'create' | 'restore'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setNote('');
    try {
      if (mode === 'restore') {
        const { error: authError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/reset-password` } });
        if (authError) throw authError;
        setNote('Check your email to verify ownership and choose a new password.');
      } else if (mode === 'create') {
        if (!/^[a-z0-9_]{3,16}$/i.test(username)) throw new Error('Use 3–16 letters, numbers, or underscores for your player name.');
        const { data: available, error: nameError } = await supabase.rpc('arcade_name_available', { candidate: username });
        if (nameError) throw new Error('Could not check the player name. Please try again.');
        if (!available || await lookupName(username) === 'taken') throw new Error('That player name is already occupied. Please choose another.');
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: username.toLowerCase() }, emailRedirectTo: window.location.origin } });
        if (authError) throw authError;
        if (data.session) onAuthChanged(await loadCloudAccount());
        else setNote('Check your email to confirm your account, then sign in.');
        setPassword('');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        onAuthChanged(await loadCloudAccount());
        setPassword('');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }

  if (account) return <div className="account-bar"><div className={`account-session${account.role === 'admin' ? ' is-admin' : ''}`}>
    <div className="account-copy"><b>{account.name.toUpperCase()}</b><span>Cloud saves · global leaderboard</span></div>
    <Button variant="arcade" size="arcade" className="btn btn-sm account-signout" disabled={busy} onClick={async () => {
      setBusy(true); setError('');
      try { await signOutCloud(); onAuthChanged(null); } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign out.'); } finally { setBusy(false); }
    }}>SIGN OUT</Button>
    {error && <p className="account-error" role="alert">{error}</p>}
  </div></div>;

  return <div className="account-bar"><form className={`account-form cloud-account-form${mode === 'create' ? ' is-create' : ''}`} onSubmit={submit}>
    <div className="account-form-head"><b>{mode === 'create' ? 'CREATE ACCOUNT' : mode === 'restore' ? 'RESTORE ACCOUNT' : 'SIGN IN'}</b><span>Cloud saves · global leaderboard</span></div>
    {mode === 'create' && <label>PLAYER NAME<input value={username} onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9_]/g, ''))} autoComplete="username" maxLength={16} minLength={3} required placeholder="3–16 CHARACTERS" /></label>}
    <label>EMAIL<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="YOU@EXAMPLE.COM" /></label>
    {mode !== 'restore' && <label>PASSWORD<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} minLength={6} maxLength={72} required placeholder="MINIMUM 6" /></label>}
    <div className="account-actions">
      <Button variant="arcade" size="arcade" type="submit" className="btn btn-sm btn-gold" disabled={busy}>{busy ? 'CONNECTING' : mode === 'create' ? 'CREATE' : mode === 'restore' ? 'EMAIL LINK' : 'SIGN IN'}</Button>
      <Button variant="arcade" size="arcade" type="button" className="btn btn-sm" disabled={busy} onClick={() => { setMode(mode === 'create' ? 'login' : 'create'); setError(''); setNote(''); }}>{mode === 'create' ? 'SIGN IN' : 'CREATE'}</Button>
    </div>
    <Button variant="arcade" size="arcade" type="button" className="account-recovery" disabled={busy} onClick={() => { setMode(mode === 'restore' ? 'login' : 'restore'); setError(''); setNote(''); }}>{mode === 'restore' ? 'BACK TO SIGN IN' : 'FIRST VISIT OR FORGOT PASSWORD?'}</Button>
    {error && <p className="account-error" role="alert">{error}</p>}
    {note && <p className="account-note" role="status">{note}</p>}
  </form></div>;
}