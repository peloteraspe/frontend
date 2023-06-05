const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export const loginForm = [
  {
    id: 'email',
    label: 'Correo electrónico',
    name: 'email',
    placeholder: 'Correo electrónico',
    validation: {
      required: 'Email is required',
      pattern: {
        value: EMAIL_REGEX,
        message: 'Invalid email address',
      },
    },
  },
];
