/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['var(--font-poppins)', 'sans-serif'],
        'poppins-bold': ['var(--font-poppins-bold)', 'sans-serif'],
        'poppins-extrabold': ['var(--font-poppins-extrabold)', 'sans-serif'],
        'eastman-bold': ['var(--font-eastman-bold)', 'sans-serif'],
        'eastman-extrabold': ['var(--font-eastman-extrabold)', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#F0815B',
          dark: '#E86D3E',
          light: '#F59E7B',
          lightest: '#F9BDAF',
        },
        secondary: {
          DEFAULT: '#27097E',
          dark: '#1C053D',
          light: '#3A0CA3',
        },
        btn: {
          DEFAULT: '#F0815B',
          hover: '#E86D3E',
        },
        btnBg: {
          light: '#54086F',
          dark: '#470B62',
          trans: '#c7b8cb',
        },
        mulberry: '#54086F',
        plum: '#744D7C',
        inputBg: '#F1F3F5',
        clear: '#C03C84',
        // Tokens semanticos para estados
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
      },
      // Estandarizar border-radius (solo 3 valores)
      borderRadius: {
        DEFAULT: '0.5rem',    // 8px - para inputs, badges pequenos
        lg: '0.75rem',        // 12px - para cards, contenedores
        xl: '1rem',           // 16px - para botones, modales
        '2xl': '1.25rem',     // 20px - para hero sections
        full: '9999px',       // pills, avatares
      },
      // Escala de espaciado consistente (base 4px)
      spacing: {
        '4.5': '1.125rem',    // 18px
        '5.5': '1.375rem',    // 22px
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
