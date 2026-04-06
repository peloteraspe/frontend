export type MicrocopyContext = 'first_event' | 'subsequent_event' | 'with_draft' | 'no_payment_methods' | 'editing';

export type MicrocopyState = {
  title: string;
  subtitle: string;
  emoji: string;
  hint?: string;
  cta: string;
};

export const microcopyByContext: Record<MicrocopyContext,  MicrocopyState> = {
  first_event: {
    emoji: '🎯',
    title: '¡Es hora de crear tu primer evento!',
    subtitle: 'Empieza con lo básico y pulimos los detalles juntos',
    hint: '⏱️ Podrás terminar en menos de 5 minutos',
    cta: '¡Vamos!',
  },
  subsequent_event: {
    emoji: '⚡',
    title: '¿Listo para otro evento?',
    subtitle: 'Vamos a hacerlo aún más rápido que el anterior',
    hint: '🚀 Sugerencias basadas en tus eventos anteriores',
    cta: 'Crear evento',
  },
  with_draft: {
    emoji: '📝',
    title: 'Retomemos tu evento',
    subtitle: 'Tienes un borrador pendiente que ya completaste la mitad',
    hint: '🎉 ¡Casi listo para publicar!',
    cta: 'Continuar',
  },
  no_payment_methods: {
    emoji: '💳',
    title: 'Necesitamos tus formas de pago',
    subtitle: 'Primero configura cómo recibirás dinero de tus participantes',
    hint: '🔒 Tus datos están 100% seguros',
    cta: 'Agregar formas de pago',
  },
  editing: {
    emoji: '✏️',
    title: 'Editando evento',
    subtitle: 'Puedes cambiar cualquier detalle',
    hint: '💾 Los cambios se guardan automáticamente',
    cta: 'Listo',
  },
};

export const fieldHints: Record<string, string> = {
  title: '📝 Dale un nombre atractivo. Ej: "Pichanga libre miércoles"',
  description: '✍️ Describe el evento brevemente. ¿Qué hará que sea especial?',
  startTime: '⏰ ¿A qué hora quieres jugar? Los miércoles a las 19hs vuelven muchos',
  endTime: '🏁 Tiempo total recomendado: 90 minutos',
  district: '📍 ¿En qué zona de Lima jugarán?',
  locationText: '🏟️ Nombre de tu cancha o dirección exacta',
  price: '💰 La mayoría cobran entre S/ 25 a S/ 50',
  minUsers: '👥 Mínimo necesario para que se juegue',
  maxUsers: '📊 Máximo de participantes que caben',
  isFieldReservedConfirmed: '✅ Por favor confirma que ya reservaste la cancha para esta fecha',
  paymentMethods: '💳 Agrega todas tus formas de cobro (Yape, Plin, efectivo)',
};

export const progressMessages = {
  starting: '🚀 Empezando...',
  basicInfoDone: '✅ Información básica completa',
  locationDone: '✅ Ubicación definida',
  detailsDone: '✅ Detalles listos',
  readyToPublish: '🎉 ¡Listo para publicar!',
  publishing: '⏳ Publicando tu evento...',
  published: '🎊 ¡Tu evento está en vivo!',
  saving: '💾 Guardando cambios...',
  saved: '✅ Guardado',
  validating: '🔍 Validando información...',
  error: '⚠️ Algo no está bien. Vamos a corregirlo.',
};

export const celebratoryMessages = [
  '🎉 ¡Lo hiciste! Tu evento está en vivo',
  '⚽ ¡Tu pichanga está lista para que se llene!',
  '🙌 ¡Excelente! Ya puedes compartir tu evento',
  '✨ ¡Tu evento está en Peloteras!',
  '🚀 ¡Listo para las primeras inscripciones!',
];

export function getMicrocopy(context: MicrocopyContext): MicrocopyState {
  return microcopyByContext[context];
}

export function getFieldHint(field: string): string | undefined {
  return fieldHints[field];
}

export function getRandomCelebratoryMessage(): string {
  return celebratoryMessages[Math.floor(Math.random() * celebratoryMessages.length)];
}

export function getProgressMessage(stage: keyof typeof progressMessages): string {
  return progressMessages[stage];
}
