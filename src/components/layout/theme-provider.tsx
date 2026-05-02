'use client';

// StayEg uses light mode only.
// ThemeProvider kept as a passthrough wrapper for child components.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
