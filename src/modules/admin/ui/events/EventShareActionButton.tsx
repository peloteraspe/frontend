'use client';

import { useEffect, useState } from 'react';
import EventShareModal from '@modules/admin/ui/events/EventShareModal';

type Props = {
  eventId: string | number;
  eventTitle?: string;
  buttonClassName?: string;
  onModalClose?: () => void;
};

export default function EventShareActionButton({
  eventId,
  eventTitle,
  buttonClassName,
  onModalClose,
}: Props) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    setShareUrl(`${window.location.origin}/events/${eventId}`);
  }, [eventId, open]);

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    onModalClose?.();
  }

  return (
    <>
      <button
        type="button"
        className={buttonClassName || 'text-mulberry hover:underline'}
        onClick={handleOpen}
      >
        Compartir
      </button>

      <EventShareModal
        isOpen={open}
        status="success"
        message="Comparte este evento para que nuevas jugadoras se inscriban."
        eventTitle={eventTitle || 'Evento'}
        shareUrl={shareUrl}
        onClose={handleClose}
      />
    </>
  );
}
