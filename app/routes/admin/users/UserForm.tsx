import { type FormEvent, useState, useEffect } from "react";
import { NavLink } from "react-router";
import type { User } from "~/types/User.ts";

const AVAILABLE_ROLES = [
  "ROLE_SUPERUSER",
  "ROLE_ADMIN",
  "ROLE_EXPERTSCOUT",
  "ROLE_DATASCOUT",
  "ROLE_MEMBER",
];

export interface UserFormData {
  id: number;
  login: string;
  displayName: string;
  password: string;
  enabled: boolean;
  forgotPassword: boolean;
  roles: string[];
}

export const UserForm = ({
  submitFunction,
  disabled,
  initialData,
  isEdit = false,
}: {
  submitFunction: (item: UserFormData) => void;
  disabled: boolean;
  initialData?: User;
  isEdit?: boolean;
}) => {
  const [item, setItem] = useState<UserFormData>({
    id: 0,
    login: "",
    displayName: "",
    password: "",
    enabled: true,
    forgotPassword: false,
    roles: ["ROLE_MEMBER"],
  });

  useEffect(() => {
    if (initialData) {
      setItem({
        id: initialData.id,
        login: initialData.login,
        displayName: initialData.displayName,
        password: "",
        enabled: initialData.enabled,
        forgotPassword: initialData.forgotPassword,
        roles: initialData.roles,
      });
    }
  }, [initialData]);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitFunction(item);
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setItem({ ...item, roles: [...item.roles, role] });
    } else {
      setItem({ ...item, roles: item.roles.filter((r) => r !== role) });
    }
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
      <p>
        <label id={"password-label"}>
          Password:{isEdit && " (leave blank to keep current)"}
        </label>
        <br />
        <input
          aria-labelledby={"password-label"}
          type="password"
          name="password"
          required={!isEdit}
          autoComplete="new-password"
          value={item.password}
          onChange={(e) => setItem({ ...item, password: e.target.value })}
        />
      </p>
      <p>
        <label>
          <input
            type="checkbox"
            name="enabled"
            checked={item.enabled}
            onChange={(e) => setItem({ ...item, enabled: e.target.checked })}
          />{" "}
          Enabled
        </label>
      </p>
      <p>
        <label>
          <input
            type="checkbox"
            name="forgotPassword"
            checked={item.forgotPassword}
            onChange={(e) =>
              setItem({ ...item, forgotPassword: e.target.checked })
            }
          />{" "}
          Forgot Password (require password reset on next login)
        </label>
      </p>
      <fieldset>
        <legend>Roles:</legend>
        {AVAILABLE_ROLES.map((role) => (
          <p key={role}>
            <label>
              <input
                type="checkbox"
                name={`role-${role}`}
                checked={item.roles.includes(role)}
                onChange={(e) => handleRoleChange(role, e.target.checked)}
              />{" "}
              {role.replace("ROLE_", "")}
            </label>
          </p>
        ))}
      </fieldset>
      <p>
        <button type={"submit"} disabled={disabled}>
          Save
        </button>
        <NavLink to={"/admin/users"}>
          <button type="button">Cancel</button>
        </NavLink>
      </p>
    </form>
  );
};
