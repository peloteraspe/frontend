'use client';

import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import EventPromotionQuickAction from '@modules/admin/ui/events/EventPromotionQuickAction';
import EventShareActionButton from '@modules/admin/ui/events/EventShareActionButton';

type Props = {
  eventId: string;
  eventTitle: string;
  isPublished: boolean;
  canPromote: boolean;
  recipientCount: number;
};

const MENU_ITEM_CLASS_NAME =
  'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-mulberry';
const MENU_WIDTH = 220;
const MENU_OFFSET = 8;

export default function EventQuickActionsMenu({
  eventId,
  eventTitle,
  isPublished,
  canPromote,
  recipientCount,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const maxLeft = Math.max(MENU_OFFSET, window.innerWidth - MENU_WIDTH - MENU_OFFSET);
      const nextLeft = Math.min(maxLeft, Math.max(MENU_OFFSET, rect.right - MENU_WIDTH));

      setMenuPosition({
        top: rect.bottom + MENU_OFFSET,
        left: nextLeft,
      });
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedButton = buttonRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);

      if (!clickedButton && !clickedMenu) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    updatePosition();
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Más acciones para ${eventTitle}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={[
          'inline-flex h-9 w-9 appearance-none items-center justify-center rounded-full border border-slate-200 text-slate-600 outline-none transition [-webkit-tap-highlight-color:transparent] focus:outline-none focus:ring-0 focus:shadow-none focus-visible:border-mulberry/40 focus-visible:outline-none focus-visible:ring-0 focus-visible:text-mulberry focus-visible:shadow-[0_0_0_4px_rgba(84,8,111,0.14)]',
          isOpen
            ? 'border-mulberry/35 bg-mulberry/5 text-mulberry'
            : 'hover:border-mulberry/25 hover:bg-mulberry/5 hover:text-mulberry',
        ].join(' ')}
      >
        <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[140] min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: MENU_WIDTH,
              }}
            >
              <Link
                href={`/admin/events/new?templateId=${encodeURIComponent(eventId)}`}
                onClick={() => setIsOpen(false)}
                className={MENU_ITEM_CLASS_NAME}
              >
                Usar como plantilla
              </Link>

              {isPublished || canPromote ? <div className="my-2 h-px bg-slate-100" /> : null}

              {isPublished ? (
                <EventShareActionButton
                  eventId={eventId}
                  eventTitle={eventTitle}
                  buttonClassName={MENU_ITEM_CLASS_NAME}
                  onModalClose={() => setIsOpen(false)}
                />
              ) : null}

              {canPromote ? (
                <EventPromotionQuickAction
                  eventId={eventId}
                  eventTitle={eventTitle}
                  recipientCount={recipientCount}
                  buttonClassName={MENU_ITEM_CLASS_NAME}
                  onModalClose={() => setIsOpen(false)}
                />
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
