import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getSlaskecoins } from "../lib/api";
import { auth } from "../lib/firebase";

type AuthMode = "sign-in" | "sign-up";
type AccountView = "lobby" | "achievements" | "talents" | "game";

interface AuthPanelProps {
  currentUser: User | null;
  guestMode: boolean;
  currentView: AccountView;
  onNavigate: (view: Exclude<AccountView, "game">) => void;
  onGuestModeChange: (guestMode: boolean) => void;
}

export function AuthPanel({
  currentUser,
  guestMode,
  currentView,
  onNavigate,
  onGuestModeChange,
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [slaskecoins, setSlaskecoins] = useState<number | null>(null);

  useEffect(() => {
    setMenuOpen(false);
    setMessage("");
    setPassword("");

    if (!currentUser?.email) {
      setSlaskecoins(null);
      return;
    }

    void getSlaskecoins(currentUser.email)
      .then((coins) => setSlaskecoins(coins))
      .catch(() => setSlaskecoins(0));
  }, [currentUser]);

  async function handleAuthAction() {
    if (!email.trim() || !password.trim()) {
      setMessage("Email and password are required.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "sign-in") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        setMessage("Signed in.");
      } else {
        if (!username.trim()) {
          setMessage("Username is required.");
          setBusy(false);
          return;
        }
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        await updateProfile(credential.user, { displayName: username.trim() });
        setMessage("Account created.");
      }
      onGuestModeChange(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut(auth);
      setMessage("Signed out.");
      setEmail("");
      setUsername("");
      onGuestModeChange(false);
      onNavigate("lobby");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign out failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    const resetEmail = currentUser?.email ?? email.trim();
    if (!resetEmail) {
      setMessage("Enter your email first to reset your password.");
      return;
    }

    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setMessage("Password reset email sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset password failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {currentUser ? (
        <div className="account-chip" title={currentUser.email ?? "Signed in"}>
          <span className="account-chip-balance">💰 {slaskecoins ?? "..."}</span>
          <div className="account-menu">
            <button
              type="button"
              className="account-chip-button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label="Open account menu"
              aria-expanded={menuOpen}
              title={currentUser.email ?? "Signed in"}
            >
              👤
            </button>
            {menuOpen ? (
              <div className="account-dropdown">
                {currentView !== "lobby" && currentView !== "game" ? (
                  <button
                    type="button"
                    className="account-dropdown-item"
                    onClick={() => {
                      onNavigate("lobby");
                      setMenuOpen(false);
                    }}
                  >
                    Join lobby
                  </button>
                ) : null}
                {currentView !== "game" ? (
                  <>
                    <button
                      type="button"
                      className="account-dropdown-item"
                      onClick={() => {
                        onNavigate("achievements");
                        setMenuOpen(false);
                      }}
                    >
                      Achievements
                    </button>
                    <button
                      type="button"
                      className="account-dropdown-item"
                      onClick={() => {
                        onNavigate("talents");
                        setMenuOpen(false);
                      }}
                    >
                      Talent tree
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="account-dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    void handleSignOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!currentUser && guestMode ? (
        <div className="account-chip">
          <div className="account-menu">
            <button
              type="button"
              className="account-chip-button"
              onClick={() => onGuestModeChange(false)}
              aria-label="Open sign in"
              title="Open sign in"
            >
              👤
            </button>
          </div>
        </div>
      ) : null}

      {!currentUser && !guestMode ? (
        <section className="panel auth-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Account</p>
              <h2>Sign in or create an account</h2>
            </div>
          </div>

          <div className="auth-form">
            <div className="button-row">
              <button
                type="button"
                className={mode === "sign-in" ? "" : "secondary"}
                onClick={() => setMode("sign-in")}
              >
                Sign in
              </button>
              <button
                type="button"
                className={mode === "sign-up" ? "" : "secondary"}
                onClick={() => setMode("sign-up")}
              >
                Sign up
              </button>
            </div>

            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            {mode === "sign-up" ? (
              <label>
                Username
                <input
                  type="text"
                  name="username"
                  autoComplete="nickname"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Choose a username"
                />
              </label>
            ) : null}

            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>

            <div className="button-row">
              <button type="button" disabled={busy} onClick={() => void handleAuthAction()}>
                {busy ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => void handleResetPassword()}
              >
                Reset password
              </button>
            </div>

            <button
              type="button"
              className="guest-link-button"
              disabled={busy}
              onClick={() => onGuestModeChange(true)}
            >
              Continue as guest
            </button>
          </div>
          {message ? <p className="auth-message">{message}</p> : null}
        </section>
      ) : null}
    </>
  );
}
