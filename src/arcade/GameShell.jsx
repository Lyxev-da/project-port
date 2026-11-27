import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StartScreen } from './components/StartScreen';
import { Game } from './components/Game';
import { installTextures } from './game/textures';
import { flushCloudSaves, loadCloudAccount, queueCloudSave } from './cloud';

export default function GameShell() {
  const [mode, setMode] = useState(null);
  const [account, setAccount] = useState(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    installTextures();
    let alive = true;
    let revision = 0;
    let activeUserId = null;
    const restore = async () => {
      const current = ++revision;
      try {
        const player = await loadCloudAccount();
        if (alive && current === revision) { activeUserId = player?.id ?? null; setAccount(player); setNotice(''); }
      } catch (e) { if (alive) setNotice(e instanceof Error ? e.message : 'Could not restore your account.'); }
      finally { if (alive) setReady(true); }
    };
    void restore();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        const nextUserId = session?.user.id ?? null;
        if (event !== 'USER_UPDATED' && nextUserId === activeUserId) return;
        activeUserId = nextUserId;
        setMode(null);
        setReady(false);
        setTimeout(() => { if (alive) void restore(); }, 0);
      }
    });
    const save = (event) => queueCloudSave(event.detail.key, event.detail.save);
    const status = (event) => setNotice(event.detail);
    const retry = () => { void flushCloudSaves(); };
    window.addEventListener('arcade-save', save);
    window.addEventListener('cloud-save-status', status);
    window.addEventListener('online', retry);
    return () => {
      alive = false; subscription.unsubscribe();
      window.removeEventListener('arcade-save', save);
      window.removeEventListener('cloud-save-status', status);
      window.removeEventListener('online', retry);
      void flushCloudSaves();
    };
  }, []);
  if (!ready) return <main className="arcade-loading" aria-busy="true"><h1>ONE IN A ZILLION</h1><p>OPENING THE ARCADE…</p></main>;
  return <>
    {mode ? <Game key={`${account?.id ?? 'guest'}:${mode}`} mode={mode} account={account} onExit={() => { void flushCloudSaves(); setMode(null); }} /> : <StartScreen account={account} onAuthChanged={setAccount} onPick={setMode} />}
    {notice && <p className="cloud-save-indicator" role="status">{notice}</p>}
  </>;
}