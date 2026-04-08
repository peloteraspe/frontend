'use client';

import { useActionState, useState } from 'react';
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
  selectedRecipientEmails: string[];
  selectedCount: number;
  totalSelectableCount: number;
};

const INITIAL_USERS_BROADCAST_ACTION_STATE: UsersBroadcastActionState = {
  status: 'idle',
  message: '',
  sentCount: 0,
  failedCount: 0,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseManualEmails(rawValue: string) {
  const tokens = String(rawValue || '')
    .split(/[\s,;]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  const valid = new Set<string>();
  const invalid = new Set<string>();

  tokens.forEach((token) => {
    if (EMAIL_REGEX.test(token)) {
      valid.add(token);
      return;
    }

    invalid.add(token);
  });

  return {
    valid: Array.from(valid),
    invalid: Array.from(invalid),
  };
}

function EmailPills({
  emails,
  emptyMessage,
  tone = 'slate',
}: {
  emails: string[];
  emptyMessage: string;
  tone?: 'slate' | 'mulberry' | 'emerald' | 'rose';
}) {
  const toneClassName =
    tone === 'mulberry'
      ? 'border-mulberry/20 bg-mulberry/10 text-mulberry'
      : tone === 'emerald'
        ? 'border-emerald-200 bg-emerald-100 text-emerald-900'
        : tone === 'rose'
          ? 'border-rose-200 bg-rose-100 text-rose-900'
          : 'border-slate-200 bg-white text-slate-700';

  if (!emails.length) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
      {emails.map((email) => (
        <span
          key={email}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${toneClassName}`}
          title={email}
        >
          {email}
        </span>
      ))}
    </div>
  );
}

function SubmitButton({ disabled, recipientCount }: { disabled: boolean; recipientCount: number }) {
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
      {pending
        ? 'Enviando...'
        : recipientCount > 0
          ? `Enviar a ${recipientCount} ${recipientCount === 1 ? 'correo' : 'correos'}`
          : 'Enviar correo'}
    </button>
  );
}

export default function UsersBroadcastForm({
  defaultSubject,
  defaultBody,
  selectedUserIds,
  selectedRecipientEmails,
  selectedCount,
  totalSelectableCount,
}: Props) {
  const [state, formAction] = useActionState(sendUsersBroadcast, INITIAL_USERS_BROADCAST_ACTION_STATE);
  const [manualEmails, setManualEmails] = useState('');
  const parsedManualEmails = parseManualEmails(manualEmails);
  const finalRecipients = Array.from(new Set([...selectedRecipientEmails, ...parsedManualEmails.valid]));
  const hasManualInput = manualEmails.trim().length > 0;
  const finalRecipientCount = finalRecipients.length;
  const canSend = finalRecipientCount > 0 && parsedManualEmails.invalid.length === 0;

  return (
    <form action={formAction} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {selectedUserIds.map((userId) => (
        <input key={userId} type="hidden" name="userIds" value={userId} readOnly />
      ))}

      <div className="mb-4 flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-mulberry">Enviar correo a usuarias o a un correo manual</h3>
        <p className="text-sm text-slate-600">
          Escribe el mensaje que quieras comunicar. Antes de enviar verás abajo exactamente qué correos recibirán el
          mensaje final.
        </p>
      </div>

      <div className="rounded-2xl border border-mulberry/15 bg-gradient-to-br from-mulberry/5 via-white to-slate-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry">Resumen de envío</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{finalRecipientCount}</p>
            <p className="text-sm text-slate-600">
              {finalRecipientCount === 0
                ? 'Todavía no hay destinatarias listas para enviar.'
                : `${finalRecipientCount} correo${finalRecipientCount === 1 ? '' : 's'} únicos recibirán este mensaje.`}
            </p>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seleccionadas</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{selectedCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manuales válidos</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{parsedManualEmails.valid.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Disponibles</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totalSelectableCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Desde selección</p>
            <p className="mt-1 mb-3 text-sm text-slate-600">
              {selectedCount === 0
                ? 'No hay usuarias seleccionadas.'
                : `${selectedCount} correo${selectedCount === 1 ? '' : 's'} vendrán de la tabla.`}
            </p>
            <EmailPills
              emails={selectedRecipientEmails}
              emptyMessage="Selecciona usuarias en la tabla para agregarlas aquí."
              tone="mulberry"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correos finales</p>
            <p className="mt-1 mb-3 text-sm text-slate-600">
              Vista final, combinando selección y manuales sin repetir correos.
            </p>
            <EmailPills
              emails={finalRecipients}
              emptyMessage="Agrega correos manuales o selecciona usuarias para construir el envío final."
              tone="emerald"
            />
          </div>
        </div>
      </div>

      {finalRecipientCount === 0 && !hasManualInput ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Selecciona 1 o más usuarias o agrega uno o varios correos manuales antes de enviar.
        </div>
      ) : null}

      <div className="mt-4">
        <label htmlFor="users-broadcast-manual-emails" className="mb-2 block text-sm font-semibold text-slate-800">
          Correos manuales
        </label>
        <textarea
          id="users-broadcast-manual-emails"
          name="manualEmails"
          value={manualEmails}
          onChange={(event) => setManualEmails(event.target.value)}
          rows={4}
          placeholder={'correo1@ejemplo.com\ncorreo2@ejemplo.com\ncorreo3@ejemplo.com'}
          className={[
            'peloteras-form-control peloteras-form-control--textarea',
            parsedManualEmails.invalid.length === 0
              ? ''
              : 'peloteras-form-control--error',
          ].join(' ')}
        />
        <p className="mt-2 text-xs text-slate-500">
          Puedes escribir varios correos separados por coma, salto de línea o punto y coma.
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manuales válidos</p>
            <div className="mt-3">
              <EmailPills
                emails={parsedManualEmails.valid}
                emptyMessage="Todavía no agregaste correos manuales válidos."
                tone="slate"
              />
            </div>
          </div>

          {parsedManualEmails.invalid.length > 0 ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Revisar antes de enviar</p>
              <p className="mt-1 mb-3 text-sm text-rose-800">
                Estos valores no parecen correos válidos y bloquean el envío.
              </p>
              <EmailPills
                emails={parsedManualEmails.invalid}
                emptyMessage=""
                tone="rose"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Listo para combinar</p>
              <p className="mt-1 text-sm text-emerald-800">
                Los correos manuales válidos se sumarán a la selección y los duplicados se eliminarán automáticamente.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="users-broadcast-subject" className="mb-2 block text-sm font-semibold text-slate-800">
          Asunto
        </label>
        <input
          id="users-broadcast-subject"
          name="subject"
          type="text"
          defaultValue={defaultSubject}
          className="peloteras-form-control h-11"
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
        <SubmitButton disabled={!canSend} recipientCount={finalRecipientCount} />
      </div>
    </form>
  );
}
