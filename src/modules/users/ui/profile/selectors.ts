import type { OptionSelectNumber } from './types';

export function findCurrentOptionByLabel(
  options: OptionSelectNumber[],
  label: string | null | undefined
): OptionSelectNumber | null {
  if (!label) return null;
  return options.find((o) => o.label === label) ?? null;
}
