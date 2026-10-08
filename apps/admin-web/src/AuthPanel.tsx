import { useState, type FormEvent, type ReactNode } from "react";
import lyneLogo from "../../../website/logo-lyne.png";
import "./auth.css";

function Icon({ name }: { name: "user" | "lock" | "eye" | "eye-off" | "arrow" }) {
  const paths: Record<typeof name, ReactNode> = {
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    "eye-off": <><path d="m3 3 18 18M9.5 5.3A11 11 0 0 1 12 5c6.5 0 10 7 10 7a20 20 0 0 1-3 4M6 6.5A21 21 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5-1.2" /><path d="M10 10a3 3 0 0 0 4 4" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function PasswordField({ label, value, onChange, disabled, fresh = false }: {
  label: string; value: string; onChange: (value: string) => void; disabled: boolean; fresh?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const id = `password-${label.replaceAll(" ", "-")}`;
  return <div className="auth-field">
    <label htmlFor={id}>{label}</label>
    <div className="auth-input-wrap">
      <span className="field-icon"><Icon name="lock" /></span>
      <input id={id} type={visible ? "text" : "password"} autoComplete={fresh ? "new-password" : "current-password"}
        required minLength={fresh ? 12 : undefined} maxLength={128} value={value} onChange={event => onChange(event.target.value)}
        disabled={disabled} placeholder={fresh ? "12 caractères minimum" : "Votre mot de passe"} />
      <button className="password-toggle" type="button" aria-label={`${visible ? "Masquer" : "Afficher"} : ${label.toLowerCase()}`}
        aria-pressed={visible} aria-controls={id} disabled={disabled} onClick={() => setVisible(!visible)}><Icon name={visible ? "eye-off" : "eye"} /></button>
    </div>
  </div>;
}

type Props = {
  changing: boolean; mandatory: boolean; busy: boolean; error: string; notice: string;
  identifier: string; password: string; newPassword: string; confirmation: string;
  onIdentifier: (value: string) => void; onPassword: (value: string) => void;
  onNewPassword: (value: string) => void; onConfirmation: (value: string) => void;
  onSubmit: (event: FormEvent) => Promise<void>; onCancel: () => void; onLogout: () => Promise<void>;
};

export function AuthPanel(props: Props) {
  const { changing, mandatory, busy, error, notice } = props;
  return <main className={`auth-frame${changing ? " auth-frame-changing" : ""}`}>
    <section className="auth-form-panel" aria-labelledby="auth-title">
      <div className="auth-topline"><a href="/" className="auth-back"><span aria-hidden="true">←</span> Retour au site</a>
        {changing && <button className="auth-signout" type="button" onClick={() => void props.onLogout()} disabled={busy}>Se déconnecter</button>}</div>
      <div className="auth-form-content">
        <a className="auth-logo" href="/" aria-label="LYNE Restaurant, retour au site"><img src={lyneLogo} alt="LYNE Restaurant" width="104" height="104" /></a>
        <p className="auth-kicker">{changing ? "SÉCURITÉ DU COMPTE" : "L’ESPACE DE NOTRE ÉQUIPE"}</p>
        <h1 id="auth-title">{changing ? "Un nouveau départ, en toute sécurité." : <>Bienvenue<br />chez <span>LYNE.</span></>}</h1>
        <p className="auth-description">{changing ? "Choisissez votre nouveau mot de passe. Vous serez ensuite invité à vous reconnecter." : "Connectez-vous pour commencer votre service."}</p>
        <form className="auth-form" onSubmit={event => void props.onSubmit(event)} aria-busy={busy}>
          {error && <p className="alert error" role="alert">{error}</p>}
          {notice && <p className="alert success" role="status">{notice}</p>}
          {!changing && <div className="auth-field"><label htmlFor="auth-identifier">Identifiant ou e-mail</label>
            <div className="auth-input-wrap"><span className="field-icon"><Icon name="user" /></span>
              <input id="auth-identifier" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={191}
                value={props.identifier} onChange={event => props.onIdentifier(event.target.value)} placeholder="Votre identifiant" disabled={busy} />
            </div></div>}
          <PasswordField label={changing ? "Mot de passe actuel" : "Mot de passe"} value={props.password} onChange={props.onPassword} disabled={busy} />
          {changing && <><PasswordField label="Nouveau mot de passe" value={props.newPassword} onChange={props.onNewPassword} disabled={busy} fresh />
            <PasswordField label="Confirmer le nouveau mot de passe" value={props.confirmation} onChange={props.onConfirmation} disabled={busy} fresh /></>}
          <p className="auth-form-hint">{changing ? "12 caractères minimum · Toutes vos sessions seront déconnectées." : "Un accès personnel, réservé aux membres de l’équipe."}</p>
          <button type="submit" className="auth-submit" disabled={busy}><span>{busy ? "Veuillez patienter…" : changing ? "Enregistrer mon mot de passe" : "Se connecter"}</span><Icon name="arrow" /></button>
          {changing && !mandatory && <button className="auth-cancel" type="button" disabled={busy} onClick={props.onCancel}>Revenir à mon espace</button>}
        </form>
        <div className="auth-support">{changing ? <p>{mandatory ? "Ce changement est obligatoire avant de continuer." : "Votre mot de passe reste strictement personnel."}</p> : <><span className="auth-divider">Besoin d’aide ?</span><p>Pour retrouver vos accès,<br />contactez votre administrateur.</p></>}</div>
      </div>
      <p className="auth-bottom"><Icon name="lock" /> Espace interne · Accès sécurisé</p>
    </section>
    <aside className="auth-art" aria-label="L’esprit LYNE Restaurant">
      <div className="art-ribbon art-ribbon-one" aria-hidden="true" /><div className="art-ribbon art-ribbon-two" aria-hidden="true" />
      <div className="art-top"><span className="art-brand">LYNE<span>RESTAURANT</span></span><span className="art-star" aria-hidden="true">✦</span></div>
      <div className="art-message"><p>UNE ÉQUIPE. UNE MÊME PASSION.</p><h2>Le goût du partage.<br /><em>L’excellence du service.</em></h2><span className="art-rule" /></div>
      <div className="art-bottom"><span>Chaque service commence avec vous.</span><span aria-hidden="true">↗</span></div>
    </aside>
  </main>;
}
