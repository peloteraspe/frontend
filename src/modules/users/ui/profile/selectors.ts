import type { OptionSelectNumber } from './types';

export function findCurrentOptionByLabel(
  options: OptionSelectNumber[],
  label: string | null | undefined
): OptionSelectNumber | null {
  if (!label) return null;
  return options.find((o) => o.label === label) ?? null;
}

export function findCurrentOptionByValue(
  options: OptionSelectNumber[],
  value: number | null | undefined
): OptionSelectNumber | null {
  if (typeof value !== 'number') return null;
  return options.find((o) => o.value === value) ?? null;
}

export function findCurrentOptionsByLabels(
  options: OptionSelectNumber[],
  labels: Array<string | null | undefined>
): OptionSelectNumber[] {
  const validLabels = labels.filter((label): label is string => Boolean(label));
  return options.filter((option) => validLabels.includes(option.label));
}
