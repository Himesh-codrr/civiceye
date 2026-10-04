import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModalProps {
  open: boolean;
  /** Optional: omit to make the dialog non-dismissible (e.g. mid-animation). */
  onClose?: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Tailwind size classes for the dialog. */
  size?: string;
  /** Hide the default close button (for custom layouts). */
  hideClose?: boolean;
}

/**
 * Accessible modal dialog — chunky comic-book style (square corners, thick
 * black border, hard offset shadow). Always centered in the viewport via
 * flex items-center + auto margins so it never jumps when the cursor moves.
 *
 * Rendered through a portal to the body so stacking/z-index isn't affected
 * by parent overflow transforms (a common source of "glitch when moving
 * the mouse off the popup").
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'max-w-lg',
  hideClose = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const node = (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop — plain div (NOT a button) so hovering the edge
              doesn't trigger button focus/active states that cause the
              "cursor leaves and everything flickers" glitch. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#172b44]/65"
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12, rotate: -1 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className={cn(
              'relative z-10 my-auto w-full overflow-hidden border-[4px] border-[#172b44] bg-[#fffdf4] shadow-[8px_8px_0_#172b44] dark:border-white dark:bg-slate-900',
              'max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)]',
              size,
            )}
            style={{ borderRadius: 0 }}
            // Stop mouse clicks inside the dialog from reaching the backdrop
            // (which would otherwise close the modal when you drag off a
            // button and release over the background).
            onClick={(e) => e.stopPropagation()}
          >
            {title !== undefined ? (
              <div className="flex items-center justify-between border-b-[3px] border-[#172b44] bg-[#ffd630] px-5 py-3 dark:border-white dark:bg-slate-800">
                <h2 className="font-serif text-lg font-black uppercase leading-none text-[#172b44] dark:text-white">
                  {title}
                </h2>
                {!hideClose && onClose ? (
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center border-[3px] border-[#172b44] bg-[#fffdf4] text-[#172b44] shadow-[2px_2px_0_#172b44] transition hover:bg-[#ef6b59] hover:text-white"
                    style={{ borderRadius: 0 }}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" strokeWidth={3} />
                  </button>
                ) : null}
              </div>
            ) : !hideClose && onClose ? (
              <button
                onClick={onClose}
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center border-[3px] border-[#172b44] bg-[#fffdf4] text-[#172b44] shadow-[2px_2px_0_#172b44] transition hover:bg-[#ef6b59] hover:text-white"
                style={{ borderRadius: 0 }}
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>
            ) : null}

            <div
              className="overflow-y-auto overscroll-contain"
              style={{ maxHeight: title !== undefined ? 'calc(90vh - 3.5rem)' : '90vh' }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );

  // Portal to document.body so the modal always sits at the root of the
  // DOM — prevents any parent transform/overflow from misaligning the
  // popup when you move the mouse off of it.
  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
}
