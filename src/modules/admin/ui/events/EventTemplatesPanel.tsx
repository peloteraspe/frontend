'use client';

import { CatalogOption } from '@modules/events/model/types';
import type { EventTemplate } from '@shared/hooks/useEventTemplates';

type Props = {
  templates: EventTemplate[];
  eventTypes: CatalogOption[];
  levels: CatalogOption[];
  onSelectTemplate: (template: EventTemplate) => void;
  isLoading?: boolean;
};

export default function EventTemplatesPanel({
  templates,
  eventTypes,
  levels,
  onSelectTemplate,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse">
        <div className="h-6 w-40 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (templates.length === 0) return null;

  const getEventTypeName = (id: number) =>
    eventTypes.find((t) => t.id === id)?.name || 'Evento';

  const getLevelName = (id: number) =>
    levels.find((l) => l.id === id)?.name || 'Sin especificar';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700 mb-4 flex items-center gap-2">
        <span>⚡ Templates de tus eventos anteriores</span>
      </p>

      <div className="grid gap-3">
        {templates.slice(0, 3).map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4 text-left transition hover:border-mulberry hover:shadow-md active:scale-98"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 truncate">
                  {template.title}
                </h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                    {getEventTypeName(template.eventTypeId)}
                  </span>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                    {getLevelName(template.levelId)}
                  </span>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                    📍 {template.district}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                  <span>👥 {template.minUsers} - {template.maxUsers}</span>
                  <span>💰 S/ {template.price}</span>
                </div>
              </div>
              <div className="flex-shrink-0 text-lg">✨</div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-4 text-center">
        💡 Selecciona uno para usarlo como base del nuevo evento
      </p>
    </div>
  );
}
