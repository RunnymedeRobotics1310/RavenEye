import { useRole } from "~/common/storage/rbauth.ts";
import Spinner from "~/common/Spinner.tsx";
import LoginForm from "~/common/auth/LoginForm.tsx";

type Role = "SUPERUSER" | "ADMIN" | "EXPERTSCOUT" | "DATASCOUT" | "DRIVE_TEAM" | "PROGRAMMER" | "MEMBER";

type PropTypes = {
  children: React.ReactNode;
  roles: Role[];
  showForm?: boolean;
};

/**
 * RequireRole is an offline-capable guard that checks whether the user has
 * an established session (roles present in sessionStorage) without making
 * any network requests.
 *
 * Use this instead of RequireLogin on pages that must work offline (e.g. Track).
 * Pass a `roles` array specifying which roles are allowed. The user passes the
 * gate if they have at least one of the listed roles.
 */
const ROLE_MAP: Record<Role, keyof ReturnType<typeof useRole>> = {
  SUPERUSER: "isSuperuser",
  ADMIN: "isAdmin",
  EXPERTSCOUT: "isExpertScout",
  DATASCOUT: "isDataScout",
  DRIVE_TEAM: "isDriveTeam",
  PROGRAMMER: "isProgrammer",
  MEMBER: "isMember",
};

const RequireRole = (props: PropTypes) => {
  const { children, roles, showForm = true } = props;
  const userRoles = useRole();

  if (userRoles.loading) {
    return <Spinner />;
  }

  const hasRole = roles.some((r) => userRoles[ROLE_MAP[r]]);

  if (hasRole) {
    return children;
  } else if (showForm) {
    return (
      <section>
        <h2>Login required</h2>
        <p>You must be logged in to access this page</p>
        <LoginForm />
      </section>
    );
  } else {
    return null;
  }
};

export default RequireRole;
