import { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import type { MetaProgress } from "../types/game";
import type { AudioSettings } from "../lib/audio";

const avatarOptions = [
  "🧙",
  "🧝",
  "🧛",
  "🧞",
  "🥷",
  "🦊",
  "🐸",
  "🐼",
  "🦁",
  "🐺",
  "🐻",
  "🐙",
  "🐉",
  "🦄",
  "🦋",
  "🔥",
  "🌙",
  "⭐",
  "⚡",
  "🌈",
  "🍀",
  "🪐",
  "☄️",
  "🌊",
  "🌿",
  "🧠",
  "😎",
  "🤠",
  "🥳",
  "👑",
  "💀",
  "🎭",
];

type AuthMode = "sign-in" | "sign-up";
type AccountView = "lobby" | "achievements" | "talents" | "spells" | "tutorial" | "rulebook" | "game";

interface AuthPanelProps {
  currentUser: User | null;
  guestMode: boolean;
  currentView: AccountView;
  metaProgress: MetaProgress | null;
  audioSettings: AudioSettings;
  onAudioSettingsChange: (settings: AudioSettings) => void;
  onOpenProgression: () => void;
  onAccountIconClick?: () => void;
  onSetProfileIcon: (icon: string) => void | Promise<void>;
  onSetProfileBorder: (border: string) => void | Promise<void>;
  onNavigate: (view: Exclude<AccountView, "game">) => void | Promise<void>;
  onGuestModeChange: (guestMode: boolean) => void;
}

export function AuthPanel({
  currentUser,
  guestMode,
  currentView,
  metaProgress,
  audioSettings,
  onAudioSettingsChange,
  onOpenProgression,
  onAccountIconClick,
  onSetProfileIcon,
  onSetProfileBorder,
  onNavigate,
  onGuestModeChange,
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("😎");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const audioMenuRef = useRef<HTMLDivElement | null>(null);
  const selectedProfileIcon = metaProgress?.selected_icon ?? currentUser?.photoURL ?? "👤";
  const selectedProfileBorder = metaProgress?.selected_border ?? "default";

  useEffect(() => {
    setMenuOpen(false);
    setMessage("");
    setPassword("");
  }, [currentUser]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!audioMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!audioMenuRef.current?.contains(event.target as Node)) {
        setAudioMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [audioMenuOpen]);

  function setAudioSetting<K extends keyof AudioSettings>(key: K, value: number) {
    onAudioSettingsChange({
      ...audioSettings,
      [key]: value,
    });
  }

  function renderAudioMenu() {
    return (
      <div className="account-menu audio-menu" ref={audioMenuRef}>
        <button
          type="button"
          className="account-chip-button audio-chip-button"
          aria-label="Open audio controls"
          aria-expanded={audioMenuOpen}
          title="Audio settings"
          onClick={() => setAudioMenuOpen((current) => !current)}
        >
          {audioSettings.masterVolume <= 0.01 ? "🔇" : audioSettings.masterVolume < 0.4 ? "🔉" : "🔊"}
        </button>
        {audioMenuOpen ? (
          <div className="account-dropdown audio-dropdown">
            <div className="audio-dropdown-header">
              <strong>Audio</strong>
              <span>Shape the mix</span>
            </div>
            <label className="audio-control-row">
              <span>Master</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audioSettings.masterVolume}
                onChange={(event) => setAudioSetting("masterVolume", Number(event.target.value))}
              />
              <strong>{Math.round(audioSettings.masterVolume * 100)}</strong>
            </label>
            <label className="audio-control-row">
              <span>Music</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audioSettings.musicVolume}
                onChange={(event) => setAudioSetting("musicVolume", Number(event.target.value))}
              />
              <strong>{Math.round(audioSettings.musicVolume * 100)}</strong>
            </label>
            <label className="audio-control-row">
              <span>SFX</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audioSettings.sfxVolume}
                onChange={(event) => setAudioSetting("sfxVolume", Number(event.target.value))}
              />
              <strong>{Math.round(audioSettings.sfxVolume * 100)}</strong>
            </label>
            <label className="audio-control-row">
              <span>Ambience</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audioSettings.ambienceVolume}
                onChange={(event) => setAudioSetting("ambienceVolume", Number(event.target.value))}
              />
              <strong>{Math.round(audioSettings.ambienceVolume * 100)}</strong>
            </label>
          </div>
        ) : null}
      </div>
    );
  }

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
        await updateProfile(credential.user, {
          displayName: username.trim(),
          photoURL: avatar,
        });
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
        <div className="account-hud" title={currentUser.email ?? "Signed in"}>
          <div className="account-chip">
            <span className="account-chip-balance" title="Talent points">
              ✦ {metaProgress?.available_talent_points ?? "..."}
            </span>
            <span className="account-chip-balance" title="Current ELO">
              Elo {metaProgress?.elo_rating ?? "..."}
            </span>
            <span className="account-chip-balance" title="Current level">
              Lv. {metaProgress?.level ?? "..."}
            </span>
            {renderAudioMenu()}
            <div className="account-menu" ref={accountMenuRef}>
              <button
                type="button"
                className="account-chip-button"
                onClick={() => {
                  onAccountIconClick?.();
                  setMenuOpen((current) => !current);
                }}
                aria-label="Open account menu"
                aria-expanded={menuOpen}
                title={currentUser.email ?? "Signed in"}
              >
                <span className={`player-avatar-badge avatar-border-${selectedProfileBorder}`}>
                  {selectedProfileIcon}
                </span>
              </button>
              {menuOpen ? (
                <div className="account-dropdown">
                  {currentView !== "lobby" && currentView !== "game" ? (
                    <button
                      type="button"
                      className="account-dropdown-item"
                      onClick={() => {
                        void onNavigate("lobby");
                        setMenuOpen(false);
                      }}
                    >
                      Join lobby
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="account-dropdown-item"
                    onClick={() => {
                      void onNavigate("achievements");
                      setMenuOpen(false);
                    }}
                  >
                    Achievements
                  </button>
                  <button
                    type="button"
                    className="account-dropdown-item"
                    onClick={() => {
                      void onNavigate("talents");
                      setMenuOpen(false);
                    }}
                  >
                    Talent tree
                  </button>
                  <button
                    type="button"
                    className="account-dropdown-item"
                    onClick={() => {
                      void onNavigate("spells");
                      setMenuOpen(false);
                    }}
                  >
                    Spells
                  </button>
                  <button
                    type="button"
                    className="account-dropdown-item"
                    onClick={() => {
                      void onNavigate("rulebook");
                      setMenuOpen(false);
                    }}
                  >
                    Rulebook
                  </button>
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
                  <div className="account-dropdown-section account-dropdown-section-cosmetics">
                    <span className="account-dropdown-label">Profile icon</span>
                    <div className="profile-choice-grid">
                      {avatarOptions.map((iconOption) => (
                        <button
                          key={iconOption}
                          type="button"
                          className={`profile-choice-button${
                            iconOption === selectedProfileIcon ? " active" : ""
                          }`}
                          onClick={() => void onSetProfileIcon(iconOption)}
                        >
                          {iconOption}
                        </button>
                      ))}
                    </div>
                    <span className="account-dropdown-help">
                      Icons can be changed any time. Special borders unlock in campaign.
                    </span>
                  </div>
                  <div className="account-dropdown-section account-dropdown-section-cosmetics">
                    <span className="account-dropdown-label">Profile border</span>
                    <div className="profile-border-grid">
                      {(metaProgress?.unlocked_borders ?? ["default"]).map((borderOption) => (
                        <button
                          key={borderOption}
                          type="button"
                          className={`profile-border-button avatar-border-${borderOption}${
                            borderOption === selectedProfileBorder ? " active" : ""
                          }`}
                          onClick={() => void onSetProfileBorder(borderOption)}
                        >
                          <span className={`player-avatar-badge avatar-border-${borderOption}`}>
                            {selectedProfileIcon}
                          </span>
                        </button>
                      ))}
                    </div>
                    <span className="account-dropdown-help">
                      New borders unlock by beating campaign bosses.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {currentView !== "game" ? (
            <button
              type="button"
              className="account-xp-bar"
              onClick={onOpenProgression}
              title="Open level progression"
            >
              <span className="account-xp-label">
                XP {metaProgress?.experience_in_level ?? "..."}/
                {metaProgress?.experience_for_next_level ?? "..."}
              </span>
              <span className="account-xp-shell" aria-hidden="true">
                <span
                  className="account-xp-fill"
                  style={{
                    width: `${
                      metaProgress
                        ? Math.min(
                            100,
                            (metaProgress.experience_in_level /
                              Math.max(1, metaProgress.experience_for_next_level)) *
                              100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      {!currentUser && guestMode ? (
        <div className="account-chip">
          {renderAudioMenu()}
          <div className="account-menu">
            <button
              type="button"
              className="account-chip-button"
              onClick={() => {
                onAccountIconClick?.();
                onGuestModeChange(false);
              }}
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

          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAuthAction();
            }}
          >
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
              {renderAudioMenu()}
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
              <>
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
                <div className="avatar-picker">
                  <span className="locked-player-label">Choose an avatar</span>
                  <div className="avatar-grid">
                    {avatarOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`avatar-option${avatar === option ? " selected" : ""}`}
                        onClick={() => setAvatar(option)}
                        aria-pressed={avatar === option}
                        title={`Choose ${option} as your avatar`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </>
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
              <button type="submit" disabled={busy}>
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
          </form>
          {message ? <p className="auth-message">{message}</p> : null}
        </section>
      ) : null}
    </>
  );
}
