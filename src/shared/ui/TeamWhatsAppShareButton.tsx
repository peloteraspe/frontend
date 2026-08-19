'use client';

type Props = {
  teamName: string;
  compactOnMobile?: boolean;
};

const TEAM_SHARE_MESSAGES = [
  (teamName: string) => `⚽ Mira el perfil de ${teamName} en Peloteras`,
  (teamName: string) => `Te comparto el equipo ${teamName} en Peloteras 🙌`,
  (teamName: string) => `Conoce a ${teamName} y a sus jugadoras en Peloteras 💜`,
  (teamName: string) => `Encontré este equipo en Peloteras: ${teamName} ⚽`,
];

function getRandomMessage(teamName: string) {
  const messageFactory =
    TEAM_SHARE_MESSAGES[Math.floor(Math.random() * TEAM_SHARE_MESSAGES.length)] ??
    TEAM_SHARE_MESSAGES[0];
  return messageFactory(teamName);
}

export default function TeamWhatsAppShareButton({
  teamName,
  compactOnMobile = false,
}: Props) {
  function sendToWhatsApp() {
    const teamUrl = window.location.href.split('#')[0];
    const message = `${getRandomMessage(teamName)}\n${teamUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    const whatsappWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (whatsappWindow) whatsappWindow.opener = null;
  }

  return (
    <button
      type="button"
      onClick={sendToWhatsApp}
      className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/70 bg-white px-4 text-sm font-semibold text-mulberry shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/15"
      aria-label={`Enviar el perfil de ${teamName} por WhatsApp`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current">
        <path d="M12.04 2a9.84 9.84 0 0 0-8.48 14.82L2.05 22l5.3-1.47A9.97 9.97 0 0 0 12.04 22 10 10 0 0 0 12.04 2Zm0 18.18a8.12 8.12 0 0 1-4.14-1.13l-.3-.18-3.15.87.84-3.07-.2-.32a8.04 8.04 0 1 1 6.95 3.83Zm4.46-6.08c-.24-.12-1.44-.71-1.66-.79-.23-.08-.39-.12-.56.12-.16.25-.63.8-.78.96-.14.16-.28.18-.52.06-.24-.12-1.02-.37-1.94-1.2a7.25 7.25 0 0 1-1.34-1.67c-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.43.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.56-.42h-.47c-.16 0-.42.06-.64.3-.22.25-.85.84-.85 2.04 0 1.2.88 2.36 1 2.52.12.16 1.73 2.64 4.19 3.7.58.26 1.04.41 1.4.52.58.19 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
      </svg>
      {compactOnMobile ? (
        <>
          <span className="sm:hidden">WhatsApp</span>
          <span className="hidden sm:inline">Enviar por WhatsApp</span>
        </>
      ) : (
        'Enviar por WhatsApp'
      )}
    </button>
  );
}
