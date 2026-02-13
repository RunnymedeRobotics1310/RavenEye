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
      <p>
        <label id={"login-label"}>Login:</label>
        <br />
        <input
          aria-labelledby={"login-label"}
          type="text"
          name="login"
          required
          autoComplete="off"
          value={item.login}
          onChange={(e) => setItem({ ...item, login: e.target.value })}
        />
      </p>
      <p>
        <label id={"displayName-label"}>Display Name:</label>
        <br />
        <input
          aria-labelledby={"displayName-label"}
          type="text"
          name="displayName"
          required
          autoComplete="off"
          value={item.displayName}
          onChange={(e) => setItem({ ...item, displayName: e.target.value })}
        />
      </p>
      {!changingPassword ? (
        <p>
          <button type="button" onClick={() => setChangingPassword(true)}>
            Change Password
          </button>
        </p>
      ) : (
        <>
          <p>
            <label id={"password-label"}>New Password:</label>
            <br />
            <input
              aria-labelledby={"password-label"}
              type="password"
              name="password"
              required
              autoComplete="new-password"
              onChange={(e) =>
                setItem({ ...item, passwordHash: e.target.value })
              }
            />
          </p>
          <p>
            <label id={"confirm-password-label"}>Confirm Password:</label>
            <br />
            <input
              aria-labelledby={"confirm-password-label"}
              type="password"
              name="confirmPassword"
              required
              autoComplete="new-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </p>
          {passwordError && (
            <p className={"errorMessage"}>{passwordError}</p>
          )}
        </>
      )}
      <p>
        <button type={"submit"} disabled={disabled || !passwordsMatch}>
          Save
        </button>
      </p>
    </form>
  );
};
