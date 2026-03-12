'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  sendUsersBroadcast,
  type UsersBroadcastActionState,
} from '@modules/admin/api/users/communications/_actions';
import UsersRichTextEditor from '@modules/admin/ui/users/UsersRichTextEditor';

type Props = {
  defaultSubject: string;
  defaultBody: string;
  selectedUserIds: string[];
  selectedCount: number;
  totalSelectableCount: number;
};

const INITIAL_USERS_BROADCAST_ACTION_STATE: UsersBroadcastActionState = {
  status: 'idle',
  message: '',
  sentCount: 0,
  failedCount: 0,
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={[
        'inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition',
        disabled || pending
          ? 'cursor-not-allowed bg-slate-400'
          : 'bg-mulberry hover:bg-mulberry/90',
      ].join(' ')}
    >
      {pending ? 'Enviando...' : 'Enviar correo a seleccionadas'}
    </button>
  );
}

export default function UsersBroadcastForm({
  defaultSubject,
  defaultBody,
  selectedUserIds,
  selectedCount,
  totalSelectableCount,
}: Props) {
  const [state, formAction] = useActionState(sendUsersBroadcast, INITIAL_USERS_BROADCAST_ACTION_STATE);
  const canSend = selectedCount > 0;

  return (
    <form action={formAction} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {selectedUserIds.map((userId) => (
        <input key={userId} type="hidden" name="userIds" value={userId} readOnly />
      ))}

      <div className="mb-4 flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-mulberry">Enviar correo a usuarias seleccionadas</h3>
        <p className="text-sm text-slate-600">
          Escribe el mensaje que quieras comunicar. Solo se enviará a las usuarias marcadas en la tabla usando el
          template oficial de Peloteras.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seleccionadas</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{selectedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Con correo válido</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalSelectableCount}</p>
        </div>
      </div>

      {selectedCount === 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Selecciona 1 o más usuarias antes de enviar.
        </div>
      ) : null}

      <div className="mt-4">
        <label htmlFor="users-broadcast-subject" className="mb-2 block text-sm font-semibold text-slate-800">
          Asunto
        </label>
        <input
          id="users-broadcast-subject"
          name="subject"
          type="text"
          defaultValue={defaultSubject}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-mulberry focus:ring-2 focus:ring-mulberry/20"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="users-broadcast-body" className="mb-2 block text-sm font-semibold text-slate-800">
          Contenido
        </label>
        <UsersRichTextEditor
          id="users-broadcast-body"
          textName="body"
          htmlName="bodyHtml"
          defaultValue={defaultBody}
        />
      </div>

      {state.status !== 'idle' ? (
        <div
          className={[
            'mt-4 rounded-xl px-4 py-3 text-sm',
            state.status === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border border-rose-200 bg-rose-50 text-rose-900',
          ].join(' ')}
        >
          <p>{state.message}</p>
          {state.status === 'success' ? (
            <p className="mt-1 text-xs">
              Enviados: {state.sentCount} · Fallidos: {state.failedCount}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Se enviará inmediatamente desde <strong>contacto@peloteras.com</strong>.
        </p>
        <SubmitButton disabled={!canSend} />
      </div>
    </form>
  );
}
