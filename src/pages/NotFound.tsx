import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] animate-fade-up flex-col items-center justify-center text-center">
      <p className="font-display text-[120px] italic leading-none text-accent/80">404</p>
      <h1 className="mt-4 text-xl font-semibold text-fog-50">This page isn’t in the brief.</h1>
      <p className="mt-2 text-sm text-fog-400">The link may be broken or the page may have moved.</p>
      <Link to="/" className="mt-6 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-ink-950 transition hover:bg-accent-strong">
        Back to dashboard
      </Link>
    </div>
  );
}
