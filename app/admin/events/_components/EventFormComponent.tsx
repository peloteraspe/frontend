'use client';
import { useState } from 'react';
import Input from '@src/core/ui/Input';
import { ButtonWrapper } from '@src/core/ui/Button';

type Props = {
  initial?: Partial<{
    title: string;
    price: number;
    date: string;
    capacity: number;
    locationText: string;
  }>;
  onSubmit: (form: FormData) => Promise<void>;
  submitLabel: string;
};

export default function EventForm({ initial, onSubmit, submitLabel }: Props) {
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
      className="grid gap-4 max-w-xl"
      noValidate
    >
      <Input
        label="Título"
        name="title"
        required
        defaultValue={initial?.title ?? ''}
        bgColor="bg-white"
      />

      <Input
        label="Precio (S/.)"
        name="price"
        type="number"
        step="0.01"
        required
        defaultValue={initial?.price ?? ''} // number o string, ambos válidos
        bgColor="bg-white"
      />

      <Input
        label="Fecha/Hora"
        name="date"
        type="text"
        placeholder="p.ej. Sáb 12 | 7:00 PM"
        defaultValue={initial?.date ?? ''}
        bgColor="bg-white"
      />

      <Input
        label="Capacidad"
        name="capacity"
        type="number"
        defaultValue={initial?.capacity ?? ''} // number o string
        bgColor="bg-white"
      />

      <Input
        label="Ubicación"
        name="locationText"
        type="text"
        defaultValue={initial?.locationText ?? ''}
        bgColor="bg-white"
      />

      <div className="pt-2">
        <ButtonWrapper width="fit-content" disabled={pending}>
          {pending ? 'Guardando…' : submitLabel}
        </ButtonWrapper>
      </div>
    </form>
  );
}
