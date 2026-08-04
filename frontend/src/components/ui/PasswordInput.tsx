import { useState, type InputHTMLAttributes } from "react";
import styles from "./PasswordInput.module.css";
import { IconEye, IconEyeOff } from "./icons";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Champ de mot de passe avec bouton de révélation. Le champ garde la classe
 * passée par la page appelante — seul l'espace du bouton est ajouté — pour que
 * chaque écran conserve son propre habillage de formulaire.
 */
export function PasswordInput({ className, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className={styles.wrap}>
      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        className={[className, styles.input].filter(Boolean).join(" ")}
      />
      <button
        type="button"
        className={styles.toggle}
        // Le libellé décrit l'action à venir, pas l'état courant ; aria-pressed
        // porte l'état, pour qu'un lecteur d'écran annonce les deux.
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        aria-controls={inputProps.id}
        // tabIndex -1 serait plus discret, mais le bouton doit rester
        // atteignable au clavier : c'est une commande à part entière.
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </span>
  );
}
