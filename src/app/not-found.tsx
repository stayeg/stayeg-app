import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-7xl font-black text-brand-teal/20 mb-4">404</div>
      <h2 className="text-xl font-bold text-foreground mb-2">Page Not Found</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-deep to-brand-teal text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Go to Homepage
      </Link>
    </div>
  );
}
