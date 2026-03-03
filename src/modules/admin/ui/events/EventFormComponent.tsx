'use client';

import { useState } from 'react';
import Input from '@src/core/ui/Input';
import { ButtonWrapper } from '@src/core/ui/Button';

type Props = {
  initial?: Partial<{
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    price: number;
    minUsers: number;
    maxUsers: number;
    district: string;
    locationText: string;
    lat: number;
    lng: number;
    eventTypeId: number;
    levelId: number;
  }>;
  onSubmit: (form: FormData) => Promise<void>;
  submitLabel: string;
};

const EventForm = ({ initial, onSubmit, submitLabel }: Props) => {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (fd: FormData) => {
        setPending(true);
        try {
          await onSubmit(fd);
        } finally {
          setPending(false);
        }
      }}
      className="grid gap-4 max-w-2xl"
      noValidate
    >
      <Input label="Título" name="title" required defaultValue={initial?.title ?? ''} bgColor="bg-white" />

      <label className="w-full">
        <div className="mb-1 text-sm font-semibold text-slate-700">Descripción</div>
        <textarea
          name="description"
          defaultValue={initial?.description ?? ''}
          rows={4}
          className="w-full rounded-lg border-2 border-mulberry bg-white px-4 py-2"
          required
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Inicio"
          name="startTime"
          type="datetime-local"
          required
          defaultValue={initial?.startTime ?? ''}
          bgColor="bg-white"
        />

        <Input
          label="Fin"
          name="endTime"
          type="datetime-local"
          required
          defaultValue={initial?.endTime ?? ''}
          bgColor="bg-white"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Precio (S/.)"
          name="price"
          type="number"
          step="0.01"
          required
          defaultValue={initial?.price ?? 0}
          bgColor="bg-white"
        />

        <Input
          label="Distrito"
          name="district"
          type="text"
          defaultValue={initial?.district ?? ''}
          bgColor="bg-white"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Mínimo de jugadoras"
          name="minUsers"
          type="number"
          required
          defaultValue={initial?.minUsers ?? 10}
          bgColor="bg-white"
        />

        <Input
          label="Máximo de jugadoras"
          name="maxUsers"
          type="number"
          required
          defaultValue={initial?.maxUsers ?? 20}
          bgColor="bg-white"
        />
      </div>

      <Input
        label="Dirección"
        name="locationText"
        type="text"
        required
        defaultValue={initial?.locationText ?? ''}
        bgColor="bg-white"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Latitud"
          name="lat"
          type="number"
          step="0.000001"
          required
          defaultValue={initial?.lat ?? -12.0464}
          bgColor="bg-white"
        />

        <Input
          label="Longitud"
          name="lng"
          type="number"
          step="0.000001"
          required
          defaultValue={initial?.lng ?? -77.0428}
          bgColor="bg-white"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Tipo de evento (id)"
          name="eventTypeId"
          type="number"
          required
          defaultValue={initial?.eventTypeId ?? 1}
          bgColor="bg-white"
        />

        <Input
          label="Nivel (id)"
          name="levelId"
          type="number"
          required
          defaultValue={initial?.levelId ?? 1}
          bgColor="bg-white"
        />
      </div>

      <div className="pt-2">
        <ButtonWrapper width="fit-content" disabled={pending}>
          {pending ? 'Guardando…' : submitLabel}
        </ButtonWrapper>
      </div>
    </form>
  );
};

export default EventForm;
