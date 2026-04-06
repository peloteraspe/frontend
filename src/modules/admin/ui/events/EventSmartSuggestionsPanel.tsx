'use client';

import { SmartSuggestion } from '@modules/admin/model/eventSmartSuggestions';

type Props = {
  suggestions: SmartSuggestion[];
};

export default function EventSmartSuggestionsPanel({ suggestions }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 mb-3 flex items-center gap-2">
        <span>✨ Sugerencias Inteligentes</span>
      </p>

      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="rounded-lg bg-white/60 backdrop-blur-sm border border-slate-200/50 p-3 text-sm"
          >
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">{suggestion.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{suggestion.suggestion}</p>
                <p className="text-xs text-slate-600 mt-0.5">{suggestion.hint}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-3 text-center">
        💡 Estos datos vienen de eventos exitosos en tu zona
      </p>
    </div>
  );
}
