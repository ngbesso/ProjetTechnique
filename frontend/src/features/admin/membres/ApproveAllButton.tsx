import { useState } from "react";
import styles from "../AdminPage.module.css";
import type { ConfirmOptions } from "../../../components/ui/ConfirmDialog";
import type { useToast } from "../../../hooks/useToast";

interface ApproveAllButtonProps {
  /** Nombre de demandes en attente : le bouton n'a de sens qu'au-delà de zéro. */
  pendingCount: number;
  approveAll: () => Promise<{ approved: number }>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  toast: ReturnType<typeof useToast>["toast"];
  /** Appelé après une approbation groupée, pour rafraîchir liste et compteurs. */
  onApproved: () => void;
}

/** Accord en nombre du récapitulatif de confirmation. */
function confirmDescription(count: number): string {
  if (count > 1) {
    return `${count} membres en attente seront approuvés et recevront un courriel d'activation.`;
  }
  return `${count} membre en attente sera approuvé et recevra un courriel d'activation.`;
}

function successMessage(approved: number): string {
  const plural = approved > 1 ? "s" : "";
  return `${approved} membre${plural} approuvé${plural}.`;
}

export function ApproveAllButton({
  pendingCount,
  approveAll,
  confirm,
  toast,
  onApproved,
}: ApproveAllButtonProps) {
  const [approving, setApproving] = useState(false);

  async function handleClick() {
    const ok = await confirm({
      title: "Approuver tous les membres en attente ?",
      description: confirmDescription(pendingCount),
      confirmLabel: "Tout approuver",
    });
    if (!ok) return;
    setApproving(true);
    try {
      const { approved } = await approveAll();
      onApproved();
      toast.success(successMessage(approved));
    } catch (err) {
      toast.error(err, "Approbation groupée impossible.");
    } finally {
      setApproving(false);
    }
  }

  return (
    <button className={styles.btnPrimarySm} onClick={handleClick} disabled={approving}>
      {approving ? "Approbation…" : `Tout approuver (${pendingCount})`}
    </button>
  );
}
