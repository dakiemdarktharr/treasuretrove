'use client';
import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Check, Copy, KeyRound } from 'lucide-react';
import { Brand, Circuit } from './brand';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  function switchMode(next: typeof mode) {
    setMode(next);
    setError('');
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(data.get('email')).trim(),
          password: data.get('password'),
          remember: data.get('remember') === 'on',
          ...(mode === 'recover' ? { recovery: data.get('recovery') } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.recoveryKey) setRecoveryKey(result.recoveryKey);
      else window.location.assign('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="story-centre">
          <div className="technical-label">
            <span className="status-dot" /> A place for every component
          </div>
          <h1>
            Good things
            <br />
            are built
            <br />
            <span>from small parts.</span>
          </h1>
          <p>
            Your components. In order.
            <br />
            Ready for the next idea.
          </p>
          <Circuit className="auth-circuit" />
        </div>
        <div className="story-footer">
          <span>Find. Organize. Build.</span>
          <span className="schematic-mark">+ &nbsp; ── &nbsp; +</span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-corner">Your personal workbench</div>
        <div className="auth-card">
          {recoveryKey ? (
            <>
              <div className="auth-icon">
                <KeyRound size={25} />
              </div>
              <h2>Keep your recovery key.</h2>
              <p className="auth-description">
                Save it somewhere safe. You’ll need it if you forget your password.
              </p>
              <div className="recovery-key">
                <code>{recoveryKey}</code>
                <button
                  className="icon-button"
                  aria-label="Copy recovery key"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(recoveryKey);
                      setCopied(true);
                    } catch {
                      setError('Select and copy the key above.');
                    }
                  }}
                >
                  {copied ? <Check size={17} /> : <Copy size={17} />}
                </button>
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={saved}
                  onChange={(e) => setSaved(e.target.checked)}
                />{' '}
                I saved my recovery key
              </label>
              <button
                className="primary full"
                disabled={!saved}
                onClick={() => window.location.assign('/')}
              >
                Open my workbench <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <div className="auth-icon">
                <span className="mini-schematic">⊕</span>
              </div>
              <h2>
                {mode === 'login'
                  ? 'Back to the workbench.'
                  : mode === 'register'
                    ? 'Make room for your ideas.'
                    : 'Recover your workbench.'}
              </h2>
              <p className="auth-description">
                {mode === 'login'
                  ? 'Sign in to your component collection.'
                  : mode === 'register'
                    ? 'One account. All your components.'
                    : 'Use the recovery key you saved at signup.'}
              </p>
              <form onSubmit={submit} className="auth-form">
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    maxLength={254}
                  />
                </label>
                {mode === 'recover' && (
                  <label>
                    Recovery key
                    <input name="recovery" autoComplete="off" required maxLength={100} />
                  </label>
                )}
                <label>
                  {mode === 'recover' ? 'New password' : 'Password'}
                  <span className="password-field">
                    <input
                      name="password"
                      type={show ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder={mode === 'login' ? 'Your password' : 'At least 12 characters'}
                      minLength={12}
                      maxLength={128}
                      required
                    />
                    <button
                      type="button"
                      aria-label={show ? 'Hide password' : 'Show password'}
                      className="icon-button"
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </label>
                <div className="remember-row">
                  <label className="check-label">
                    <input type="checkbox" name="remember" /> Remember me
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => switchMode('recover')}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <button className="primary full" disabled={busy}>
                  {busy
                    ? 'One moment…'
                    : mode === 'login'
                      ? 'Sign in'
                      : mode === 'register'
                        ? 'Create account'
                        : 'Reset password'}
                  <ArrowRight size={17} />
                </button>
              </form>
              <div className="auth-switch">
                {mode === 'login' ? 'New to TreasureTrove?' : 'Already have an account?'}{' '}
                <button
                  className="text-button"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                >
                  {mode === 'login' ? 'Create account' : 'Sign in'}
                </button>
              </div>
            </>
          )}
        </div>
        <div className="auth-bottom">
          <span className="tiny-chip">◇</span> Your inventory stays yours.
        </div>
      </section>
    </main>
  );
}
