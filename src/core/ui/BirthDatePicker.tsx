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
  label?: string;
  name?: string;
  value?: string;
  minDate?: string;
  maxDate: string;
  errorText?: string;
  required?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
};

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
  return new Date(maxDate.getFullYear() - 25, 0, 1);
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
  label = 'Fecha de nacimiento',
  name = 'birth_date',
  value = '',
  minDate = '1900-01-01',
  maxDate,
  errorText,
  required = false,
  disabled = false,
  onChange,
}: Props) {
  const generatedId = useId();
  const fieldId = `birth-date-${generatedId.replace(/:/g, '')}`;
  const errorId = `${fieldId}-error`;
  const calendarId = `${fieldId}-calendar`;
  const rootRef = useRef<HTMLDivElement>(null);
  const minDateValue = useMemo(() => parseIsoDate(minDate) || new Date(1900, 0, 1), [minDate]);
  const maxDateValue = useMemo(() => parseIsoDate(maxDate) || new Date(), [maxDate]);
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const [isOpen, setIsOpen] = useState(false);
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
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

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
    setIsOpen(false);
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
        aria-describedby={errorText ? errorId : undefined}
        onClick={() => setIsOpen((current) => !current)}
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
      ) : null}

      {isOpen ? (
        <div
          id={calendarId}
          role="dialog"
          aria-label="Seleccionar fecha de nacimiento"
          className="absolute right-0 z-[150] mt-2 w-[calc(100vw-2rem)] max-w-[340px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)]"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Mes anterior"
              disabled={!canGoPrevious}
              onClick={() => changeView(previousMonth.getFullYear(), previousMonth.getMonth())}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-mulberry/10 hover:text-mulberry disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <select
              aria-label="Mes"
              value={viewMonth.getMonth()}
              onChange={(event) => changeView(viewMonth.getFullYear(), Number(event.currentTarget.value))}
              className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-slate-800 outline-none focus:border-mulberry focus:ring-2 focus:ring-mulberry/10"
            >
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>

            <select
              aria-label="Año"
              value={viewMonth.getFullYear()}
              onChange={(event) => changeView(Number(event.currentTarget.value), viewMonth.getMonth())}
              className="h-9 w-[88px] rounded-xl border border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-slate-800 outline-none focus:border-mulberry focus:ring-2 focus:ring-mulberry/10"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              type="button"
              aria-label="Mes siguiente"
              disabled={!canGoNext}
              onClick={() => changeView(nextMonth.getFullYear(), nextMonth.getMonth())}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-mulberry/10 hover:text-mulberry disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
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
            Elige el mes y el año, luego selecciona el día.
          </p>
        </div>
      ) : null}
    </div>
  );
}
