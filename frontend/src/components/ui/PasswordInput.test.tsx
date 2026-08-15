import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PasswordInput } from "./PasswordInput";

const toggle = () => screen.getByRole("button");

describe("PasswordInput — révélation du mot de passe", () => {
  it("masque le mot de passe au départ", () => {
    render(<PasswordInput id="password" defaultValue="secret" />);
    expect(document.querySelector("#password")).toHaveAttribute("type", "password");
    expect(toggle()).toHaveAccessibleName("Afficher le mot de passe");
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
  });

  it("révèle le mot de passe au clic", () => {
    render(<PasswordInput id="password" defaultValue="secret" />);
    fireEvent.click(toggle());

    expect(document.querySelector("#password")).toHaveAttribute("type", "text");
    expect(toggle()).toHaveAccessibleName("Masquer le mot de passe");
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
  });

  it("remasque au second clic", () => {
    render(<PasswordInput id="password" defaultValue="secret" />);
    fireEvent.click(toggle());
    fireEvent.click(toggle());
    expect(document.querySelector("#password")).toHaveAttribute("type", "password");
  });

  it("conserve la saisie en basculant", () => {
    render(<PasswordInput id="password" />);
    const input = document.querySelector("#password") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "monSecret" } });
    fireEvent.click(toggle());
    expect(input).toHaveValue("monSecret");
  });

  it("n'envoie pas le formulaire en basculant", () => {
    // Sans type="button", le bouton soumettrait le formulaire qui l'entoure.
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <PasswordInput id="password" />
      </form>,
    );
    fireEvent.click(toggle());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("transmet les attributs de la page appelante", () => {
    render(
      <PasswordInput
        id="password"
        className="champ-de-la-page"
        placeholder="········"
        required
        autoComplete="current-password"
      />,
    );
    const input = document.querySelector("#password")!;
    expect(input).toHaveAttribute("placeholder", "········");
    expect(input).toHaveAttribute("autocomplete", "current-password");
    expect(input).toBeRequired();
    // La classe de la page est conservée, celle du composant s'y ajoute.
    expect(input).toHaveClass("champ-de-la-page");
  });

  it("relie le bouton au champ qu'il commande", () => {
    render(<PasswordInput id="password" />);
    expect(toggle()).toHaveAttribute("aria-controls", "password");
  });

  it("masque l'icône aux technologies d'assistance", () => {
    render(<PasswordInput id="password" />);
    expect(toggle().querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
