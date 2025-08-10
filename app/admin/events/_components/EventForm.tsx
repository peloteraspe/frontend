"use client";
import { useState } from 'react';
import Input from '@/components/Input';
import { ButtonWrapper } from '@/components/Button';

type Props = {
  initial?: Partial<{ title: string; price: number; date: string; capacity: number; locationText: string }>;
  onSubmit: (form: FormData) => Promise<void>;
  submitLabel: string;
};

export default function EventForm({ initial, onSubmit, submitLabel }: Props) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd: FormData) => {
        setPending(true);
        try { await onSubmit(fd); } finally { setPending(false); }
      }}
      className="grid gap-4 max-w-xl"
    >
      <Input label="Título" name="title" required defaultValue={initial?.title || ''} register={(n:any)=>({ name:n })} errors={{}} bgColor="bg-white" />
      <Input label="Precio (S/.)" name="price" type="number" step="0.01" required defaultValue={initial?.price as any || ''} register={(n:any)=>({ name:n })} errors={{}} bgColor="bg-white" />
      <Input label="Fecha/Hora" name="date" type="text" placeholder="p.ej. Sáb 12 | 7:00 PM" defaultValue={initial?.date || ''} register={(n:any)=>({ name:n })} errors={{}} bgColor="bg-white" />
      <Input label="Capacidad" name="capacity" type="number" defaultValue={initial?.capacity as any || ''} register={(n:any)=>({ name:n })} errors={{}} bgColor="bg-white" />
      <Input label="Ubicación" name="locationText" type="text" defaultValue={initial?.locationText || ''} register={(n:any)=>({ name:n })} errors={{}} bgColor="bg-white" />

      <div className="pt-2">
        <ButtonWrapper width="fit-content" disabled={pending}>{pending ? 'Guardando…' : submitLabel}</ButtonWrapper>
      </div>
    </form>
  );
}
