import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastViewport, type ToastItem, type ToastVariant } from "../components/ui/Toast";

const SUCCESS_MS = 4000;
const ERROR_MS = 6000;

let nextId = 0;

/**
 * Notifications éphémères, sur le même modèle que useConfirm.
 * Usage : const { toast, toasts } = useToast();
 *         toast.success("Église créée.");
 *         try { … } catch (e) { toast.error(e); }
 *         return <>…{toasts}</>
 */
export function useToast() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = ++nextId;
      setItems((list) => [...list, { id, message, variant }]);
      const timer = window.setTimeout(
        () => dismiss(id),
        variant === "error" ? ERROR_MS : SUCCESS_MS,
      );
      timers.current.push(timer);
    },
    [dismiss],
  );

  // Les minuteries en attente sont annulées au démontage du panneau.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(window.clearTimeout);
  }, []);

  const toast = useMemo(
    () => ({
      success: (message: string) => push(message, "success"),
      /** Accepte une Error, une chaîne, ou n'importe quoi d'autre (repli). */
      error: (cause: unknown, fallback = "Une erreur est survenue.") =>
        push(
          cause instanceof Error
            ? cause.message
            : typeof cause === "string"
              ? cause
              : fallback,
          "error",
        ),
    }),
    [push],
  );

  return {
    toast,
    toasts: <ToastViewport toasts={items} onDismiss={dismiss} />,
  };
}
