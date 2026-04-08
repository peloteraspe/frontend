'use client';

import React from 'react';
import Select, { type Props as RSProps, type StylesConfig, ThemeConfig } from 'react-select';
import makeAnimated from 'react-select/animated';
import { Controller, type Control } from 'react-hook-form';
import { ParagraphM } from '@core/ui/Typography';

export interface OptionSelect {
  key?: number | string;
  value: string | number;
  label: string;
}

type CommonProps = {
  labelText?: string;
  required?: boolean;
  errorText?: string;
  isMulti?: boolean;
  isSearchable?: boolean;
  bgColor?: string; // para igualar con Input (por si lo usas)
  className?: string;
  tone?: 'default' | 'soft';
};

type ControlledProps = {
  /** Control RHF + name: modo RHF */
  control?: Control<any>;
  name?: string;
  /** onChange/value: modo controlado externo */
  onChange?: (value: any) => void;
  value?: any;
};

type SelectComponentProps = CommonProps &
  ControlledProps & {
    options: OptionSelect[];
    /** props adicionales de react-select si los necesitas */
    selectProps?: RSProps;
  };

const animatedComponents = makeAnimated();

/**
 * Paleta / constantes visuales para mantener consistencia con InternationalPhoneField
 */
const MULBERRY = '#5b1c70';
const MULBERRY_DARK = '#4a175f';
const BORDER_DEFAULT = '#cbd5e1';
const BORDER_HOVER = '#94a3b8';
const BORDER_ERROR = '#EF4444'; // --color-error
const TEXT_DEFAULT = '#0f172a';
const TEXT_MUTED = '#94a3b8';
const BG_WHITE = '#ffffff';
const HOVER_BG = 'rgba(91, 28, 112, 0.08)'; // morado 8%
const SELECTED_BG = MULBERRY;
const SELECTED_TEXT = '#ffffff';
const RADIUS = 16;
const HEIGHT = 44;
const BORDER_WIDTH = 1;
const FOCUS_RING = '0 0 0 4px rgba(91, 28, 112, 0.1)';

const buildStyles = (
  hasError?: boolean,
  isDisabled?: boolean,
  bg?: string,
  isMulti?: boolean,
  _tone: 'default' | 'soft' = 'default'
): StylesConfig =>
  ({
    control: (base, state) => ({
      ...base,
      minHeight: HEIGHT,
      alignItems: 'center',
      flexWrap: isMulti ? 'wrap' : 'nowrap',
      borderWidth: BORDER_WIDTH,
      borderRadius: RADIUS,
      backgroundColor: bg ?? BG_WHITE,
      borderColor:
        hasError
          ? BORDER_ERROR
          : state.isFocused
            ? MULBERRY
            : BORDER_DEFAULT,
      boxShadow: state.isFocused ? FOCUS_RING : 'none',
      '&:hover': {
        borderColor: hasError ? BORDER_ERROR : state.isFocused ? MULBERRY : BORDER_HOVER,
      },
      transition: 'border-color 150ms ease, box-shadow 150ms ease',
      opacity: isDisabled ? 0.6 : 1,
      cursor: isDisabled ? 'not-allowed' : 'default',
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0 16px',
      gap: 4,
      flexWrap: isMulti ? 'wrap' : 'nowrap',
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      lineHeight: '24px',
      caretColor: '#5b1c70',
    }),
    placeholder: (base) => ({
      ...base,
      color: TEXT_MUTED,
      margin: 0,
    }),
    singleValue: (base) => ({
      ...base,
      color: TEXT_DEFAULT,
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: HOVER_BG,
      borderRadius: 9999,
      margin: 2,
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: MULBERRY,
      fontWeight: 600,
      paddingRight: 4,
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: MULBERRY,
      ':hover': {
        backgroundColor: 'transparent',
        color: MULBERRY_DARK,
      },
    }),
    indicatorsContainer: (base) => ({
      ...base,
      color: MULBERRY,
      alignSelf: 'center',
      paddingRight: 12,
    }),

    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isFocused ? MULBERRY_DARK : MULBERRY,
      ':hover': { color: MULBERRY_DARK },
    }),
    clearIndicator: (base) => ({
      ...base,
      color: MULBERRY,
      ':hover': { color: MULBERRY_DARK },
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    menu: (base) => ({
      ...base,
      border: `1px solid ${BORDER_DEFAULT}`,
      borderRadius: RADIUS,
      overflow: 'hidden',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
      marginTop: 6,
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 60,
    }),
    menuList: (base) => ({
      ...base,
      paddingTop: 6,
      paddingBottom: 6,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? SELECTED_BG : state.isFocused ? HOVER_BG : 'transparent',
      color: state.isSelected ? SELECTED_TEXT : TEXT_DEFAULT,
      cursor: 'pointer',
      ':active': {
        backgroundColor: state.isSelected ? SELECTED_BG : HOVER_BG,
      },
      paddingTop: 10,
      paddingBottom: 10,
    }),
  }) as StylesConfig;

const buildTheme: ThemeConfig = (theme) => ({
  ...theme,
  colors: {
    ...theme.colors,
    primary: MULBERRY,
    primary25: HOVER_BG, // hover
    primary50: HOVER_BG,
    primary75: HOVER_BG,
    neutral0: BG_WHITE,
    neutral20: BORDER_DEFAULT, // borde
    neutral30: MULBERRY_DARK, // borde hover
    neutral40: MULBERRY,
    neutral50: TEXT_MUTED, // placeholder
    neutral60: MULBERRY,
    neutral70: MULBERRY_DARK,
    neutral80: TEXT_DEFAULT,
  },
  borderRadius: RADIUS,
});

const SelectComponent: React.FC<SelectComponentProps> = ({
  options,
  control,
  name,
  labelText,
  required = false,
  isMulti = false,
  isSearchable = true,
  onChange,
  value,
  errorText,
  bgColor,
  className,
  tone = 'soft',
  selectProps,
}) => {
  const hasError = Boolean(errorText);

  const renderSelect = (
    selectValue: any,
    selectOnChange: (v: any) => void,
    isDisabled?: boolean
  ) => (
    <Select
      components={animatedComponents}
      options={options}
      isMulti={isMulti}
      isSearchable={isSearchable}
      value={
        isMulti
          ? // si value son ids/values, mapear a objetos; si ya vienen objetos, respétalos
            Array.isArray(selectValue)
            ? selectValue.every((v) => typeof v === 'object')
              ? selectValue
              : options.filter((opt) => selectValue.includes(opt.value))
            : []
          : // single: si viene id, mapea; si viene objeto, úsalo
            typeof selectValue === 'object'
            ? selectValue
            : (options.find((opt) => opt.value === selectValue) ?? null)
      }
      onChange={(selected: any) => {
        // devolvemos el “value” (id/valor) para RHF o parent
        if (isMulti) {
          const arr = Array.isArray(selected) ? selected : [];
          selectOnChange(arr.map((o) => o.value));
        } else {
          selectOnChange(selected ? selected.value : null);
        }
      }}
      placeholder="Selecciona una opción"
      noOptionsMessage={() => 'Sin opciones'}
      isDisabled={isDisabled}
      styles={buildStyles(hasError, isDisabled, bgColor, isMulti, tone)}
      theme={buildTheme}
      className={className}
      classNamePrefix="rs" // por si quieres añadir CSS escoped adicional
      {...selectProps}
    />
  );

  return (
    <label className="w-full">
      {labelText && (
        <div className="mb-1">
          <ParagraphM fontWeight="semibold">
            {labelText}
            {required && <span className="text-error"> *</span>}
          </ParagraphM>
        </div>
      )}

      {control && name ? (
        <Controller
          name={name}
          control={control}
          render={({ field: { value: rhfValue, onChange: rhfOnChange }, fieldState }) =>
            renderSelect(rhfValue, rhfOnChange, selectProps?.isDisabled)
          }
        />
      ) : (
        renderSelect(value, (v) => onChange?.(v), selectProps?.isDisabled)
      )}

      {hasError && (
        <span className="text-sm text-error mt-1 inline-block">
          {errorText || 'Este campo es requerido'}
        </span>
      )}
    </label>
  );
};

export default SelectComponent;
