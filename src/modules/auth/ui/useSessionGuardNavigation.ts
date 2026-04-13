'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { useAuth } from '@core/auth/AuthProvider';

type SessionNavigationRequest = {
  destination: string;
  authenticatedMessage: string;
  unauthenticatedToast?: string;
  loginMessage?: string;
  checkingMessage?: string;
  loginRedirectMessage?: string;
  requireEmailConfirmed?: boolean;
  emailConfirmationMessage?: string;
};

const DEFAULT_EMAIL_CONFIRMATION_MESSAGE = 'Verifica tu identidad para poder inscribirte a este evento.';

function buildLoginHref(destination: string, message?: string) {
  const params = new URLSearchParams();
  if (message) {
    params.set('message', message);
  }
  params.set('next', destination);
  return `/login?${params.toString()}`;
}

function pushOnNextFrame(router: ReturnType<typeof useRouter>, href: string) {
  if (typeof window === 'undefined') {
    router.push(href);
    return;
  }

  window.requestAnimationFrame(() => {
    router.push(href);
  });
}

export function useSessionGuardNavigation() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [pendingRequest, setPendingRequest] = useState<SessionNavigationRequest | null>(null);
  const [overlayMessage, setOverlayMessage] = useState<string | null>(null);

  function canNavigateAuthenticated(request: SessionNavigationRequest) {
    if (!request.requireEmailConfirmed || user?.email_confirmed_at) return true;
    toast.error(request.emailConfirmationMessage || DEFAULT_EMAIL_CONFIRMATION_MESSAGE);
    return false;
  }

  function navigateWithSessionCheck(request: SessionNavigationRequest) {
    if (pendingRequest || overlayMessage) return;

    if (loading) {
      setPendingRequest(request);
      setOverlayMessage(request.checkingMessage || 'Verificando tu sesión...');
      return;
    }

    if (user) {
      if (!canNavigateAuthenticated(request)) return;
      setOverlayMessage(request.authenticatedMessage);
      pushOnNextFrame(router, request.destination);
      return;
    }

    if (request.unauthenticatedToast) {
      toast(request.unauthenticatedToast);
    }
    setOverlayMessage(request.loginRedirectMessage || 'Redirigiendo al login...');
    pushOnNextFrame(router, buildLoginHref(request.destination, request.loginMessage));
  }

  useEffect(() => {
    if (loading || !pendingRequest) return;

    const request = pendingRequest;
    setPendingRequest(null);

    if (user) {
      if (!canNavigateAuthenticated(request)) {
        setOverlayMessage(null);
        return;
      }
      setOverlayMessage(request.authenticatedMessage);
      pushOnNextFrame(router, request.destination);
      return;
    }

    if (request.unauthenticatedToast) {
      toast(request.unauthenticatedToast);
    }
    setOverlayMessage(request.loginRedirectMessage || 'Redirigiendo al login...');
    pushOnNextFrame(router, buildLoginHref(request.destination, request.loginMessage));
  }, [loading, pendingRequest, router, user]);

  return {
    isPendingNavigation: Boolean(overlayMessage),
    pendingNavigationMessage: overlayMessage,
    navigateWithSessionCheck,
  };
}
