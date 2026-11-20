export default function AuthLoading() {
  return <main className="auth-page" aria-busy="true" aria-label="Loading sign-in form">
    <div className="auth-card auth-loading-card"><span className="skeleton skeleton-auth-brand" /><span className="skeleton skeleton-auth-title" /><span className="skeleton skeleton-auth-input" /><span className="skeleton skeleton-auth-input" /><span className="skeleton skeleton-auth-button" /><span className="sr-only">Loading secure sign-in form…</span></div>
  </main>;
}
