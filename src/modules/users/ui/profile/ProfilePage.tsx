'use client';

import Image from 'next/image';
import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@core/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import soccerBall from '@core/assets/soccer-ball.svg';

import ProfileUpdateForm from '@modules/users/ui/ProfileUpdateForm';
import TeamSection from '@modules/teams/ui/TeamSection';
import UserImage from '@shared/ui/UserImage';

import {
  fetchProfile,
  fetchLevels,
  fetchPlayersPosition,
  updateProfile,
} from '@modules/users/api/profile.client';
import type { UserProfileData } from '@modules/users/model/types';

import type { OptionSelectNumber } from './types';
import {
  findCurrentOptionByLabel,
  findCurrentOptionByValue,
  findCurrentOptionsByLabels,
} from './selectors';

type ProfileSection = 'profile' | 'teams';
const PROFILE_LOAD_TIMEOUT_MS = 15000;

async function withFallbackTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), PROFILE_LOAD_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

const PROFILE_SECTIONS: Array<{
  id: ProfileSection;
  label: string;
  description: string;
  icon: typeof UserCircleIcon;
}> = [
  {
    id: 'profile',
    label: 'Mis datos',
    description: 'Información personal',
    icon: UserCircleIcon,
  },
  {
    id: 'teams',
    label: 'Mis equipos',
    description: 'Planteles y capitanía',
    icon: UserGroupIcon,
  },
];

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [positions, setPositions] = useState<OptionSelectNumber[]>([]);
  const [levels, setLevels] = useState<OptionSelectNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<ProfileSection>('profile');
  const [tabsOrientation, setTabsOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  const loadProfileData = useCallback(async () => {
    if (!user || isLoadingData) return;

    try {
      setIsLoadingData(true);
      setIsLoading(true);
      setError(null);

      const [profileResult, positionsResult, levelsResult] = await Promise.all([
        withFallbackTimeout(
          fetchProfile(user.id).catch((err) => {
            console.error('Error fetching profile:', err);
            return null;
          }),
          null
        ),
        withFallbackTimeout(
          fetchPlayersPosition().catch((err) => {
            console.error('Error fetching positions:', err);
            return [];
          }),
          []
        ),
        withFallbackTimeout(
          fetchLevels().catch((err) => {
            console.error('Error fetching levels:', err);
            return [];
          }),
          []
        ),
      ]);

      if (!profileResult) {
        throw new Error(
          'No pudimos recuperar tus datos. Reintenta antes de editar para evitar reemplazar información existente.'
        );
      }

      setProfileData(profileResult);
      setPositions((positionsResult || []) as OptionSelectNumber[]);
      setLevels((levelsResult || []) as OptionSelectNumber[]);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error loading profile data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
      setIsLoadingData(false);
    }
  }, [user, isLoadingData]);

  const handleProfileUpdated = useCallback((nextProfileData: UserProfileData | null) => {
    if (!nextProfileData) return;

    setProfileData((currentProfileData) => ({
      ...(currentProfileData ?? {}),
      ...nextProfileData,
    }));
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      setIsLoading(false);
      router.push('/login');
      return;
    }

    if (user && !hasLoaded && !isLoadingData && !loading) {
      loadProfileData();
    }
  }, [user, loading, hasLoaded, isLoadingData, loadProfileData, router]);

  useEffect(() => {
    function syncSectionWithHash() {
      setActiveSection(
        window.location.hash === '#mis-equipos' || window.location.hash === '#crear-equipo'
          ? 'teams'
          : 'profile'
      );
    }

    syncSectionWithHash();
    window.addEventListener('hashchange', syncSectionWithHash);
    return () => window.removeEventListener('hashchange', syncSectionWithHash);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const syncTabsOrientation = () => {
      setTabsOrientation(mediaQuery.matches ? 'vertical' : 'horizontal');
    };

    syncTabsOrientation();
    mediaQuery.addEventListener('change', syncTabsOrientation);
    return () => mediaQuery.removeEventListener('change', syncTabsOrientation);
  }, []);

  const selectSection = useCallback((section: ProfileSection) => {
    setActiveSection(section);

    const nextUrl = new URL(window.location.href);
    nextUrl.hash = section === 'teams' ? 'mis-equipos' : '';
    window.history.replaceState(
      window.history.state,
      '',
      `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
    );
    window.dispatchEvent(new Event('hashchange'));
  }, []);

  const handleSectionKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let nextIndex: number | null = null;

      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % PROFILE_SECTIONS.length;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + PROFILE_SECTIONS.length) % PROFILE_SECTIONS.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = PROFILE_SECTIONS.length - 1;
      }

      if (nextIndex === null) return;

      event.preventDefault();
      const nextSection = PROFILE_SECTIONS[nextIndex];
      selectSection(nextSection.id);
      document.getElementById(`${nextSection.id}-tab`)?.focus();
    },
    [selectSection]
  );

  // Loading
  if (loading || isLoading) {
    return (
      <div className="site-shell py-8 md:py-10">
        <div className="mb-7 animate-pulse px-1">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="mt-2 h-8 w-52 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-80 max-w-full rounded bg-slate-100" />
        </div>
        <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 h-16 rounded-xl bg-slate-100" />
            <div className="mb-3 h-px bg-slate-100" />
            <div className="h-16 rounded-xl bg-slate-100" />
            <div className="mt-2 h-16 rounded-xl bg-slate-100" />
          </div>
          <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
            <div className="h-6 w-40 rounded bg-slate-200" />
            <div className="mt-4 h-12 w-full rounded bg-slate-100" />
            <div className="mt-4 h-12 w-full rounded bg-slate-100" />
            <div className="mt-4 h-12 w-full rounded bg-slate-100" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
          <Image src={soccerBall} alt="" width={20} height={20} className="animate-spin" />
          {loading ? 'Verificando autenticación...' : 'Cargando perfil...'}
        </div>
      </div>
    );
  }

  // Redirecting
  if (!user) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-xl items-center justify-center px-4 py-10">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <Image
            src={soccerBall}
            alt=""
            width={24}
            height={24}
            className="mx-auto animate-spin"
          />
          <p className="mt-3 text-sm font-medium text-slate-600">Redirigiendo al inicio de sesión…</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-xl items-center justify-center px-4 py-10">
        <div className="w-full rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ExclamationTriangleIcon aria-hidden="true" className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">No pudimos cargar tu perfil</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">{error}</p>
          <button
            type="button"
            onClick={loadProfileData}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-btnBg-light px-5 text-sm font-semibold text-white transition-colors hover:bg-btnBg-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/15"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const positionOptions = positions || [];
  const levelOptions = levels || [];
  const hasCatalogFallback = positionOptions.length === 0 || levelOptions.length === 0;

  const currentLevelOption =
    findCurrentOptionByValue(levelOptions, profileData?.level_id) ??
    findCurrentOptionByLabel(levelOptions, profileData?.level);

  const currentPositionOptions = findCurrentOptionsByLabels(
    positionOptions,
    (profileData?.player_position ?? []).map((position: { name?: string | null }) => position?.name)
  );

  return (
    <section className="site-shell py-8 md:py-10">
      <header className="mb-7 px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry">Tu espacio</p>
        <h1 className="mt-1 font-eastman-extrabold text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Mi perfil
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Mantén tu información al día y administra los equipos de los que formas parte.
        </p>
      </header>

      <div className="grid items-start gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Secciones de mi perfil"
          className="sticky top-24 z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="hidden items-center gap-3 p-4 md:block">
            <UserImage
              src={user.avatar_url}
              name={profileData?.username || user.email || 'Usuario'}
              size={52}
            />
            <div className="min-w-0 md:mt-3">
              <p className="truncate text-sm font-semibold text-slate-900">
                {profileData?.username || user.email || 'Sin nombre'}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{user.email || 'Sin correo'}</p>
              <div
                className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium ${
                  user.email_confirmed_at || user.emailConfirmed
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {user.email_confirmed_at || user.emailConfirmed ? (
                  <CheckCircleIcon aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  <ExclamationTriangleIcon aria-hidden="true" className="h-3.5 w-3.5" />
                )}
                {user.email_confirmed_at || user.emailConfirmed
                  ? 'Correo verificado'
                  : 'Correo pendiente'}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 p-2">
            <p className="hidden px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:block">
              Navegación
            </p>
            <div
              role="tablist"
              aria-orientation={tabsOrientation}
              className="grid grid-cols-2 gap-2 md:grid-cols-1"
            >
              {PROFILE_SECTIONS.map((section, index) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    role="tab"
                    id={`${section.id}-tab`}
                    aria-selected={isActive}
                    aria-controls={`${section.id}-panel`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => selectSection(section.id)}
                    onKeyDown={(event) => handleSectionKeyDown(event, index)}
                    className={`flex min-h-[64px] items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/15 ${
                      isActive
                        ? 'bg-mulberry text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      aria-hidden="true"
                      className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{section.label}</span>
                      <span
                        className={`mt-0.5 hidden text-[11px] leading-4 md:block ${
                          isActive ? 'text-white/70' : 'text-slate-500'
                        }`}
                      >
                        {section.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="min-w-0 w-full">
          <div
            id="profile-panel"
            role="tabpanel"
            aria-labelledby="profile-tab"
            hidden={activeSection !== 'profile'}
            className="space-y-6"
          >
            {hasCatalogFallback && (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  No pudimos cargar niveles o posiciones. Reintenta antes de guardar tus cambios.
                </span>
                <button
                  type="button"
                  onClick={loadProfileData}
                  disabled={isLoadingData}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingData ? 'Reintentando…' : 'Reintentar'}
                </button>
              </div>
            )}
            <ProfileUpdateForm
              userProfile={profileData?.username || ''}
              updateProfile={updateProfile}
              onProfileUpdated={handleProfileUpdated}
              userId={user.id}
              levelsData={currentLevelOption}
              levelsOptions={levelOptions}
              playerPositionOptions={positionOptions}
              positionsData={currentPositionOptions}
              isCatalogReady={!hasCatalogFallback}
            />
          </div>

          <div
            id="teams-panel"
            role="tabpanel"
            aria-labelledby="teams-tab"
            hidden={activeSection !== 'teams'}
          >
            <TeamSection currentUserId={user.id} />
          </div>
        </div>
      </div>
    </section>
  );
}
