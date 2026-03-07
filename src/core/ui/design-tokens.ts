/**
 * ============================================
 * SISTEMA DE DISENO - PELOTERAS
 * ============================================
 * 
 * Este archivo documenta los tokens de diseno del proyecto.
 * Los valores reales estan definidos en:
 * - tailwind.config.js (colores, spacing, borderRadius)
 * - global.css (CSS variables)
 * 
 * USO EN COMPONENTES:
 * - Colores de marca: text-primary, bg-mulberry, text-plum
 * - Estados: text-success, bg-error-light, border-warning
 * - Spacing: p-4, gap-6, m-8 (escala de 4px)
 * - Border radius: rounded-lg (cards), rounded-xl (botones)
 */

// ============================================
// COLORES DE MARCA
// ============================================
export const brandColors = {
  primary: {
    DEFAULT: '#F0815B',
    dark: '#E86D3E',
    light: '#F59E7B',
    lightest: '#F9BDAF',
  },
  mulberry: '#54086F',
  plum: '#744D7C',
} as const;

// ============================================
// TOKENS SEMANTICOS PARA ESTADOS
// ============================================
export const semanticColors = {
  success: {
    DEFAULT: '#10B981',
    light: '#D1FAE5',
    dark: '#059669',
    foreground: '#065F46',
  },
  warning: {
    DEFAULT: '#F59E0B',
    light: '#FEF3C7',
    dark: '#D97706',
    foreground: '#92400E',
  },
  error: {
    DEFAULT: '#EF4444',
    light: '#FEE2E2',
    dark: '#DC2626',
    foreground: '#991B1B',
  },
  info: {
    DEFAULT: '#3B82F6',
    light: '#DBEAFE',
    dark: '#2563EB',
    foreground: '#1E40AF',
  },
} as const;

// ============================================
// BORDER RADIUS (estandarizado)
// ============================================
export const borderRadius = {
  DEFAULT: '0.5rem',    // 8px - inputs, badges pequenos
  lg: '0.75rem',        // 12px - cards, contenedores
  xl: '1rem',           // 16px - botones, modales
  '2xl': '1.25rem',     // 20px - hero sections
  full: '9999px',       // pills, avatares
} as const;

// ============================================
// ESPACIADO (escala base 4px)
// ============================================
export const spacing = {
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
} as const;

// ============================================
// GUIA DE USO
// ============================================
/**
 * COLORES DE ESTADO EN TAILWIND:
 * 
 * Success:
 *   - Fondo: bg-success-light
 *   - Texto: text-success-foreground
 *   - Borde: border-success
 *   - Icono: text-success
 * 
 * Warning:
 *   - Fondo: bg-warning-light
 *   - Texto: text-warning-foreground
 *   - Borde: border-warning
 * 
 * Error:
 *   - Fondo: bg-error-light
 *   - Texto: text-error-foreground / text-error
 *   - Borde: border-error
 * 
 * Info:
 *   - Fondo: bg-info-light
 *   - Texto: text-info-foreground
 *   - Borde: border-info
 * 
 * COMPONENTES DISPONIBLES:
 * - Alert: import { Alert, SuccessAlert, ErrorAlert } from '@core/ui/Alert'
 * - Badge: import { StatusBadge, SuccessBadge, ErrorBadge } from '@core/ui/Badge'
 * 
 * BORDER RADIUS ESTANDARIZADO:
 * - rounded-lg: cards, contenedores (12px)
 * - rounded-xl: botones, modales (16px)
 * - rounded-full: avatares, pills
 * 
 * SPACING (usa la escala de Tailwind):
 * - Evitar valores arbitrarios como py-[0.75rem]
 * - Usar: p-3 (12px), p-4 (16px), py-2.5 (10px)
 */
