const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export const loginForm = [
  {
    id: "email",
    label: "Correo electrónico",
    name: "email",
    placeholder: "Correo electrónico",
    required: "Email is required",
    pattern: {
      value: EMAIL_REGEX,
      message: "Invalid email address",
    },
  },
];

export const optionsPositionCard = [
  {
    index: "1",
    title: "Delantera",
    description: "Delantera description",
  },
  {
    index: "2",
    title: "Mediocampista",
    description: "Mediocampista description",
  },
  {
    index: "3",
    title: "Defensa",
    description: "Defensa description",
  },
  {
    index: "4",
    title: "Portera",
    description: "Portera description",
  },
  {
    index: "5",
    title: "Cualquiera",
    description: "Cualquiera description",
  }
];

export const signUpForm = [
  {
    id: "username",
    label: "Nombre",
    placeholder: "Nombre",
    required: "Nombre es requerido",
    maxLength: 16,
  },
  {
    id: "playerPosition",
    label: "¿En qué posición de fútbol te gustaría jugar? (Puedes elegir más de una opción)",
    required: "Al menos una posición es requerida",
    options: optionsPositionCard,
    selectCard: true,
  },
];


