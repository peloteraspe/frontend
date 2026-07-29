'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

const WEEKDAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

type Props = {
  id?: string;
  label?: string;
  name?: string;
  value?: string;
  minDate?: string;
  maxDate: string;
  errorText?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
};

type CalendarMenu = 'month' | 'year' | null;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIsoDate(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDefaultViewDate(maxDate: Date) {
  return new Date(maxDate.getFullYear() - 7, 0, 1);
}

function clampViewMonth(date: Date, minDate: Date, maxDate: Date) {
  const candidate = startOfMonth(date);
  const minMonth = startOfMonth(minDate);
  const maxMonth = startOfMonth(maxDate);
  if (candidate < minMonth) return minMonth;
  if (candidate > maxMonth) return maxMonth;
  return candidate;
}

function formatDisplayDate(value: string | undefined) {
  const parsed = parseIsoDate(value);
  if (!parsed) return '';
  return `${parsed.getDate()} de ${MONTH_NAMES[parsed.getMonth()].toLowerCase()} de ${parsed.getFullYear()}`;
}

function buildCalendarDays(viewMonth: Date) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayFirstOffset = (new Date(year, month, 1).getDay() + 6) % 7;

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - mondayFirstOffset + 1;
    return day >= 1 && day <= daysInMonth ? new Date(year, month, day) : null;
  });
}

export default function BirthDatePicker({
  id,
  label = 'Fecha de nacimiento',
  name = 'birth_date',
  value = '',
  minDate = '1900-01-01',
  maxDate,
  errorText,
  helperText,
  required = false,
  disabled = false,
  onChange,
}: Props) {
  const generatedId = useId();
  const fieldId = id || `birth-date-${generatedId.replace(/:/g, '')}`;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  const calendarId = `${fieldId}-calendar`;
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedYearRef = useRef<HTMLButtonElement>(null);
  const minDateValue = useMemo(() => parseIsoDate(minDate) || new Date(1900, 0, 1), [minDate]);
  const maxDateValue = useMemo(() => parseIsoDate(maxDate) || new Date(), [maxDate]);
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const [isOpen, setIsOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<CalendarMenu>(null);
  const [viewMonth, setViewMonth] = useState(() =>
    clampViewMonth(selectedDate || getDefaultViewDate(maxDateValue), minDateValue, maxDateValue)
  );

  useEffect(() => {
    if (selectedDate) {
      setViewMonth(clampViewMonth(selectedDate, minDateValue, maxDateValue));
    }
  }, [maxDateValue, minDateValue, selectedDate]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (openMenu) {
        setOpenMenu(null);
      } else {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, openMenu]);

  useEffect(() => {
    if (openMenu !== 'year') return undefined;
    const frame = window.requestAnimationFrame(() => {
      const selectedOption = selectedYearRef.current;
      const menu = selectedOption?.parentElement;
      if (selectedOption && menu) {
        menu.scrollTop =
          selectedOption.offsetTop - menu.clientHeight / 2 + selectedOption.clientHeight / 2;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openMenu]);

  const displayValue = formatDisplayDate(value);
  const calendarDays = buildCalendarDays(viewMonth);
  const minIso = toIsoDate(minDateValue);
  const maxIso = toIsoDate(maxDateValue);
  const selectedIso = selectedDate ? toIsoDate(selectedDate) : '';
  const previousMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
  const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
  const canGoPrevious = previousMonth >= startOfMonth(minDateValue);
  const canGoNext = nextMonth <= startOfMonth(maxDateValue);
  const years = useMemo(() => {
    const result: number[] = [];
    for (let year = maxDateValue.getFullYear(); year >= minDateValue.getFullYear(); year -= 1) {
      result.push(year);
    }
    return result;
  }, [maxDateValue, minDateValue]);

  function changeView(year: number, month: number) {
    setViewMonth(clampViewMonth(new Date(year, month, 1), minDateValue, maxDateValue));
  }

  function chooseDate(date: Date) {
    const nextValue = toIsoDate(date);
    if (nextValue < minIso || nextValue > maxIso) return;
    onChange(nextValue);
    setOpenMenu(null);
    setIsOpen(false);
  }

  function toggleCalendar() {
    if (isOpen) setOpenMenu(null);
    setIsOpen((current) => !current);
  }

  function toggleMenu(menu: Exclude<CalendarMenu, null>) {
    setOpenMenu((current) => (current === menu ? null : menu));
  }

  return (
    <div ref={rootRef} className="relative w-full">
      {label ? (
        <label htmlFor={fieldId} className="mb-1 block text-sm font-semibold text-slate-700">
          {label}
          {required ? <span className="text-error"> *</span> : null}
        </label>
      ) : null}

      <button
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? calendarId : undefined}
        aria-invalid={Boolean(errorText) || undefined}
        aria-describedby={errorText ? errorId : helperText ? helperId : undefined}
        onClick={toggleCalendar}
        className={[
          'peloteras-form-control flex h-11 items-center justify-between gap-3 text-left',
          errorText ? 'peloteras-form-control--error' : '',
          displayValue ? 'text-slate-900' : 'text-slate-400',
        ].join(' ')}
      >
        <span className="min-w-0 truncate">{displayValue || 'Selecciona tu fecha'}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5 shrink-0 text-mulberry"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3m10-3v3M4.5 9.5h15" />
          <rect x="4" y="5" width="16" height="15" rx="3" />
        </svg>
      </button>
      <input type="hidden" name={name} value={value} />

      {errorText ? (
        <span id={errorId} className="mt-1 block text-sm text-error">
          {errorText}
        </span>
      ) : helperText ? (
        <span id={helperId} className="mt-1 block text-sm text-slate-500">
          {helperText}
        </span>
      ) : null}

      {isOpen ? (
        <div
          id={calendarId}
          role="dialog"
          aria-label="Seleccionar fecha de nacimiento"
          className="absolute right-0 z-[150] mt-2 w-[calc(100vw-2rem)] max-w-[340px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)]"
        >
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              aria-label="Mes anterior"
              disabled={!canGoPrevious}
              onClick={() => {
                setOpenMenu(null);
                changeView(previousMonth.getFullYear(), previousMonth.getMonth());
              }}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-mulberry/10 hover:text-mulberry disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              aria-label={`Elegir mes, ${MONTH_NAMES[viewMonth.getMonth()]}`}
              aria-haspopup="listbox"
              aria-expanded={openMenu === 'month'}
              onClick={() => toggleMenu('month')}
              className="flex h-9 min-w-0 flex-1 items-center justify-between gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition hover:border-mulberry/40 focus:border-mulberry focus:ring-2 focus:ring-mulberry/10"
            >
              <span className="truncate">{MONTH_NAMES[viewMonth.getMonth()]}</span>
              <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
              </svg>
            </button>

            <button
              type="button"
              aria-label={`Elegir año, ${viewMonth.getFullYear()}`}
              aria-haspopup="listbox"
              aria-expanded={openMenu === 'year'}
              onClick={() => toggleMenu('year')}
              className="flex h-9 w-[94px] items-center justify-between gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition hover:border-mulberry/40 focus:border-mulberry focus:ring-2 focus:ring-mulberry/10"
            >
              <span>{viewMonth.getFullYear()}</span>
              <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
              </svg>
            </button>

            <button
              type="button"
              aria-label="Mes siguiente"
              disabled={!canGoNext}
              onClick={() => {
                setOpenMenu(null);
                changeView(nextMonth.getFullYear(), nextMonth.getMonth());
              }}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-mulberry/10 hover:text-mulberry disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>

            {openMenu === 'month' ? (
              <div
                role="listbox"
                aria-label="Elegir mes"
                className="absolute left-10 right-10 top-11 z-20 grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                {MONTH_NAMES.map((month, monthIndex) => {
                  const monthValue = new Date(viewMonth.getFullYear(), monthIndex, 1);
                  const isDisabled =
                    monthValue < startOfMonth(minDateValue) ||
                    monthValue > startOfMonth(maxDateValue);
                  const isSelected = monthIndex === viewMonth.getMonth();
                  return (
                    <button
                      key={month}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={isDisabled}
                      onClick={() => {
                        changeView(viewMonth.getFullYear(), monthIndex);
                        setOpenMenu(null);
                      }}
                      className={[
                        'rounded-xl px-2 py-2 text-xs font-semibold transition',
                        isSelected
                          ? 'bg-mulberry text-white'
                          : 'text-slate-700 hover:bg-mulberry/10 hover:text-mulberry',
                        isDisabled ? 'cursor-not-allowed opacity-25' : '',
                      ].join(' ')}
                    >
                      {month.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {openMenu === 'year' ? (
              <div
                role="listbox"
                aria-label="Elegir año"
                className="absolute right-10 top-11 z-20 max-h-56 w-[110px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl [scrollbar-width:thin]"
              >
                {years.map((year) => {
                  const isSelected = year === viewMonth.getFullYear();
                  return (
                    <button
                      key={year}
                      ref={isSelected ? selectedYearRef : undefined}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        changeView(year, viewMonth.getMonth());
                        setOpenMenu(null);
                      }}
                      className={[
                        'mb-1 flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition last:mb-0',
                        isSelected
                          ? 'bg-mulberry text-white'
                          : 'text-slate-700 hover:bg-mulberry/10 hover:text-mulberry',
                      ].join(' ')}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1" aria-hidden="true">
            {WEEKDAY_NAMES.map((weekday) => (
              <span key={weekday} className="flex h-7 items-center justify-center text-[11px] font-bold text-slate-400">
                {weekday}
              </span>
            ))}
          </div>

          <div role="grid" className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} className="h-9" aria-hidden="true" />;

              const isoDate = toIsoDate(date);
              const isSelected = isoDate === selectedIso;
              const isDisabled = isoDate < minIso || isoDate > maxIso;
              return (
                <button
                  key={isoDate}
                  type="button"
                  role="gridcell"
                  aria-label={`${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`}
                  aria-selected={isSelected}
                  disabled={isDisabled}
                  onClick={() => chooseDate(date)}
                  className={[
                    'inline-flex h-9 items-center justify-center rounded-full text-sm font-semibold transition',
                    isSelected
                      ? 'bg-mulberry text-white shadow-sm'
                      : 'text-slate-700 hover:bg-mulberry/10 hover:text-mulberry',
                    isDisabled ? 'cursor-not-allowed opacity-25' : '',
                  ].join(' ')}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-center text-xs text-slate-500">
            Solo mostramos fechas válidas para mayores de 18 años.
          </p>
        </div>
      ) : null}
    </div>
  );
}
