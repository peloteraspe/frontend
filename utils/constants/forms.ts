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
    value: "1",
    title: "Delantera",
    description: "Delantera description",
    imageSrc: "/path/to/your/image2.jpg",
  },
  {
    value: "2",
    title: "Mediocampista",
    description: "Mediocampista description",
    imageSrc: "/path/to/your/image2.jpg",
  },
  {
    value: "3",
    title: "Defensa",
    description: "Defensa description",
    imageSrc: "/path/to/your/image2.jpg",
  },
  {
    value: "4",
    title: "Portera",
    description: "Portera description",
    imageSrc: "/path/to/your/image2.jpg",
  },
  {
    value: "5",
    title: "Cualquiera",
    description: "Cualquiera description",
    imageSrc: "/path/to/your/image2.jpg",
  },
];

export const signUpForm = [
  {
    id: "name",
    label: "Nombre",
    placeholder: "Nombre",
    required: "Nombre es requerido",
    maxLength: 16,
  },
  {
    id: "playerPosition",
    label:
      "¿En qué posición de fútbol te gustaría jugar? (Puedes elegir más de una opción)",
    required: "Al menos una posición es requerida",
    options: optionsPositionCard,
    selectCard: true,
  },
];
