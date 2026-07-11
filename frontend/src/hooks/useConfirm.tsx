import { useCallback, useRef, useState } from "react";
import { ConfirmDialog, type ConfirmOptions } from "../components/ui/ConfirmDialog";

/**
 * Remplace window.confirm par une modale accessible (Radix AlertDialog).
 * Usage : const { confirm, dialog } = useConfirm();
 *         if (!(await confirm("Supprimer ?"))) return;
 *         return <>...{dialog}</>
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<(value: boolean) => void>();

  const confirm = useCallback((opts: ConfirmOptions | string) => {
    setOptions(typeof opts === "string" ? { title: opts } : opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function settle(result: boolean) {
    setOptions(null);
    resolveRef.current?.(result);
  }

  const dialog = options ? (
    <ConfirmDialog
      open
      {...options}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return { confirm, dialog };
}