'use client';

import { getFieldHint, getProgressMessage } from '@modules/admin/model/eventMicrocopy';

type Props = {
  field?: string;
  stage?: 'saving' | 'saved' | 'validating' | 'error';
  error?: string;
};

export default function EventFormGuidance({ field, stage, error }: Props) {
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
        <p className="text-red-900 font-medium">⚠️ {error}</p>
      </div>
    );
  }

  if (stage) {
    return (
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
        <p className="text-blue-900">
          {getProgressMessage(stage as any)}
        </p>
      </div>
    );
  }

  if (field) {
    const hint = getFieldHint(field);
    if (hint) {
      return (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
          <p className="text-slate-700">{hint}</p>
        </div>
      );
    }
  }

  return null;
}
