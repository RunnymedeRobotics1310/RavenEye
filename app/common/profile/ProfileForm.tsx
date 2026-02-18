import { type FormEvent, useState } from "react";
import type { User } from "~/types/User.ts";

export interface ProfileFormData {
  id: number;
  login: string;
  displayName: string;
  passwordHash: string;
  enabled: boolean;
  forgotPassword: boolean;
  roles: string[];
}

export const ProfileForm = ({
  submitFunction,
  disabled,
  initialData,
}: {
  submitFunction: (item: ProfileFormData) => void;
  disabled: boolean;
  initialData: User;
}) => {
  const [item, setItem] = useState<ProfileFormData>({
    id: initialData.id,
    login: initialData.login,
    displayName: initialData.displayName,
    passwordHash: "",
    enabled: initialData.enabled,
    forgotPassword: initialData.forgotPassword,
    roles: initialData.roles,
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const passwordsMatch =
    !changingPassword || item.passwordHash === confirmPassword;

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordError(null);
    submitFunction(item);
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <div className="form-field">
        <label htmlFor="login">Login</label>
        <input
          id="login"
          type="text"
          name="login"
          required
          autoComplete="off"
          value={item.login}
          onChange={(e) => setItem({ ...item, login: e.target.value })}
        />
      </div>
      <div className="form-field">
        <label htmlFor="displayName">Display Name</label>
        <input
          id="displayName"
          type="text"
          name="displayName"
          required
          autoComplete="off"
          value={item.displayName}
          onChange={(e) => setItem({ ...item, displayName: e.target.value })}
        />
      </div>
      {!changingPassword ? (
        <div className="form-field">
          <button type="button" className="secondary" onClick={() => setChangingPassword(true)}>
            Change Password
          </button>
        </div>
      ) : (
        <>
          <div className="form-field">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              name="password"
              required
              autoComplete="new-password"
              onChange={(e) =>
                setItem({ ...item, passwordHash: e.target.value })
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              required
              autoComplete="new-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {passwordError && (
            <p className={"errorMessage"}>{passwordError}</p>
          )}
        </>
      )}
      <div className="form-actions">
        <button type={"submit"} disabled={disabled || !passwordsMatch}>
          Save
        </button>
      </div>
    </form>
  );
};
