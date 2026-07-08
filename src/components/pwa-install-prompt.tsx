'use client';

import { useEffect, useState } from 'react';
import { Download, Share, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';

/**
 * Prompts the user to install the app to their home screen for a native,
 * standalone experience.
 *
 * - Chrome/Edge/Android: uses the captured `beforeinstallprompt` event to fire
 *   the native install dialog on tap.
 * - iOS Safari (no `beforeinstallprompt` support): shows manual "Share → Add to
 *   Home Screen" instructions.
 * - Hidden entirely once the app is running standalone (already installed) or
 *   after the user dismisses it.
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Already installed / launched from the home screen — never prompt.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari exposes standalone on navigator
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // Respect a previous dismissal for 30 days.
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < 30 * 24 * 60 * 60 * 1000) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua) && !/crios|fxios|edgios/.test(ua);

    if (iOS) {
      setIsIos(true);
      setVisible(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop Chrome's mini-infobar; we show our own UI
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Clean up if the app gets installed while the banner is showing.
    const onInstalled = () => setVisible(false);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install app"
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        'pointer-events-none flex justify-center'
      )}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card shadow-lg p-4 flex items-start gap-3 animate-fade-in-up">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <Download className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Install Finance Tracker</p>
          {isIos ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap <Share className="inline h-3.5 w-3.5 -mt-0.5" /> then{' '}
              <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                <Plus className="h-3 w-3" />
                Add to Home Screen
              </span>{' '}
              for the full app experience.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add it to your home screen for a faster, full-screen experience.
            </p>
          )}

          {!isIos && (
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" onClick={install}>
                Install
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Not now
              </Button>
            </div>
          )}
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default PwaInstallPrompt;
