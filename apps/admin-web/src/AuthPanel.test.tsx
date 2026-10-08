import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthPanel } from "./AuthPanel.js";

const props = { changing: false, mandatory: false, busy: false, error: "", notice: "",
  identifier: "", password: "", newPassword: "", confirmation: "",
  onIdentifier: () => {}, onPassword: () => {}, onNewPassword: () => {}, onConfirmation: () => {},
  onSubmit: async () => {}, onCancel: () => {}, onLogout: async () => {} };

describe("écran de connexion LYNE", () => {
  it("conserve des champs nommés, masqués et compatibles avec les gestionnaires de mots de passe", () => {
    const html = renderToStaticMarkup(<AuthPanel {...props} />);
    expect(html).toContain('for="auth-identifier"');
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('type="password"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('href="/"');
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain('Google');
  });
  it("présente trois champs et impose la longueur minimale au changement initial", () => {
    const html = renderToStaticMarkup(<AuthPanel {...props} changing mandatory />);
    expect(html.match(/type="password"/g)).toHaveLength(3);
    expect(html.match(/minLength="12"/g)).toHaveLength(2);
    expect(html).not.toContain('id="auth-identifier"');
    expect(html).not.toContain('Revenir à mon espace');
    expect(html).toContain('Se déconnecter');
    expect(html).toContain('Ce changement est obligatoire');
  });
  it("autorise le retour pour un changement volontaire uniquement", () => {
    expect(renderToStaticMarkup(<AuthPanel {...props} changing />)).toContain('Revenir à mon espace');
  });
  it("désactive le formulaire et signale son chargement", () => {
    const html = renderToStaticMarkup(<AuthPanel {...props} busy />);
    expect(html).toContain('aria-busy="true"');
    expect(html.match(/disabled=""/g)).toHaveLength(4);
    expect(html).toContain('Veuillez patienter');
  });
  it("annonce les erreurs et succès sans interpréter leur contenu comme HTML", () => {
    const html = renderToStaticMarkup(<AuthPanel {...props} error="<script>erreur</script>" notice="Vous êtes déconnecté." />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('role="status"');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
