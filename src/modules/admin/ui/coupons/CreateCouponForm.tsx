'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Input from '@core/ui/Input';
import SelectComponent, { OptionSelect } from '@core/ui/SelectComponent';
import { ButtonWrapper } from '@core/ui/Button';
import toast from 'react-hot-toast';

export type CouponEventOption = {
  id: string;
  title: string;
  label: string;
};

type FormValues = {
  code: string;
  discountAmount: string;
  type: 'company' | 'individual';
  scope: 'general' | 'event';
  companyName: string;
  assignedEmail: string;
  maxUses: string;
  selectedEventId: string;
  expiresAt: string;
};

const DEFAULT_VALUES: FormValues = {
  code: '',
  discountAmount: '',
  type: 'company',
  scope: 'general',
  companyName: '',
  assignedEmail: '',
  maxUses: '1',
  selectedEventId: '',
  expiresAt: '',
};

export default function CreateCouponForm({
  eventOptions,
  onCancel,
  onCreated,
}: {
  eventOptions: CouponEventOption[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const couponType = watch('type');
  const couponScope = watch('scope');

  const selectOptions: OptionSelect[] = eventOptions.map((option) => ({
    value: option.id,
    label: option.label,
  }));

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: data.code.trim().toUpperCase(),
          discountAmount: parseFloat(data.discountAmount),
          type: data.type,
          companyName: data.type === 'company' ? data.companyName.trim() : undefined,
          assignedEmail: data.type === 'individual' ? data.assignedEmail.trim().toLowerCase() : undefined,
          maxUses: data.type === 'individual' ? 1 : parseInt(data.maxUses, 10),
          eventId: data.scope === 'event' ? parseInt(data.selectedEventId, 10) : null,
          expiresAt: data.expiresAt || null,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = body?.error || 'Error al crear cupón.';
        setSubmitError(msg);
        toast.error(msg);
        return;
      }

      toast.success(`Cupón ${body?.coupon?.code || data.code} creado.`);
      reset(DEFAULT_VALUES);
      onCreated();
    } catch {
      const msg = 'Error de conexión.';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-slate-900">Nuevo cupón</h3>
        <p className="mt-1 text-sm text-slate-600">
          Define si el cupón aplica a cualquier evento o a un evento específico. Si es específico, se elige desde la
          lista, no por ID manual.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {submitError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Código"
            placeholder="Ej: LIBROS2026"
            {...register('code', { required: 'Ingresa un código.' })}
            errorText={errors.code?.message as string | undefined}
          />

          <Input
            label="Monto de descuento (S/.)"
            placeholder="Ej: 20.00"
            type="number"
            step="0.01"
            {...register('discountAmount', {
              required: 'Ingresa el monto.',
              min: { value: 0.01, message: 'Debe ser mayor a 0.' },
            })}
            errorText={errors.discountAmount?.message as string | undefined}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Tipo de cupón</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
                <input type="radio" value="company" {...register('type')} className="mt-1" />
                <span>
                  <span className="block font-semibold text-slate-900">Empresa</span>
                  <span className="block text-xs text-slate-500">Múltiples usos para alianzas o campañas.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
                <input type="radio" value="individual" {...register('type')} className="mt-1" />
                <span>
                  <span className="block font-semibold text-slate-900">Individual</span>
                  <span className="block text-xs text-slate-500">Un solo uso para una jugadora específica.</span>
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Aplica a</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
                <input type="radio" value="general" {...register('scope')} className="mt-1" />
                <span>
                  <span className="block font-semibold text-slate-900">Cualquier evento</span>
                  <span className="block text-xs text-slate-500">El cupón queda disponible de forma general.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
                <input type="radio" value="event" {...register('scope')} className="mt-1" />
                <span>
                  <span className="block font-semibold text-slate-900">Evento específico</span>
                  <span className="block text-xs text-slate-500">Elige el evento desde la lista.</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {couponType === 'company' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nombre de la empresa"
              placeholder="Ej: LibrosFutbol"
              {...register('companyName', {
                validate: (value) =>
                  couponType === 'company' && !value.trim() ? 'Ingresa el nombre de la empresa.' : true,
              })}
              errorText={errors.companyName?.message as string | undefined}
            />

            <Input
              label="Máximo de usos"
              type="number"
              placeholder="Ej: 50"
              {...register('maxUses', {
                validate: (value) => {
                  if (couponType !== 'company') return true;
                  const parsed = parseInt(value, 10);
                  return parsed > 0 || 'Debe ser mayor a 0.';
                },
              })}
              errorText={errors.maxUses?.message as string | undefined}
            />
          </div>
        ) : (
          <Input
            label="Email de la jugadora"
            type="email"
            placeholder="jugadora@email.com"
            {...register('assignedEmail', {
              validate: (value) =>
                couponType === 'individual' && !value.trim() ? 'Ingresa el email.' : true,
            })}
            errorText={errors.assignedEmail?.message as string | undefined}
          />
        )}

        {couponScope === 'event' ? (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <SelectComponent
              labelText="Evento"
              options={selectOptions}
              value={watch('selectedEventId')}
              onChange={(value) => setValue('selectedEventId', String(value || ''), { shouldValidate: true })}
              isSearchable={true}
              errorText={errors.selectedEventId?.message as string | undefined}
              selectProps={{
                placeholder: eventOptions.length > 0 ? 'Busca y selecciona un evento' : 'No hay eventos disponibles',
                isDisabled: eventOptions.length === 0,
              }}
            />

            <Input
              label="Fecha de expiración"
              type="date"
              {...register('expiresAt')}
            />
          </div>
        ) : (
          <Input
            label="Fecha de expiración (opcional)"
            type="date"
            {...register('expiresAt')}
          />
        )}

        <input
          type="hidden"
          {...register('selectedEventId', {
            validate: (value) => {
              if (couponScope !== 'event') return true;
              return value ? true : 'Selecciona un evento.';
            },
          })}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <ButtonWrapper type="submit" width="fit-content" disabled={submitting}>
            {submitting ? 'Creando...' : 'Crear cupón'}
          </ButtonWrapper>
        </div>
      </form>
    </section>
  );
}
