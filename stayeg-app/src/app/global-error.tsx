'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-background">
          <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <svg className="size-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Application Error</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            A critical error occurred. The app needs to be reloaded.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-deep to-brand-teal text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Reload App
          </button>
        </div>
      </body>
    </html>
  );
}
