import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeContext';
import { ToastProvider } from './ToastContext';
import { AuthProvider } from './AuthContext';
import { BrandProvider } from './BrandContext';
import { ReportsProvider } from './ReportsContext';
import { NotificationProvider } from './NotificationContext';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { AIChatbot } from '@/components/AIChatbot';

/**
 * Composition root for all cross-cutting providers.
 * Order matters: Toast wraps Auth (which toasts errors); Auth wraps Brand
 * (which reacts to the logged-in email); Reports reads public data.
 * The one-time PWA install prompt lives inside ToastProvider so it can
 * appear on every page (it self-suppresses when already installed or
 * dismissed).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrandProvider>
            <ReportsProvider>
              <NotificationProvider>
                {children}
                <PwaInstallPrompt />
                <AIChatbot />
              </NotificationProvider>
            </ReportsProvider>
          </BrandProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
