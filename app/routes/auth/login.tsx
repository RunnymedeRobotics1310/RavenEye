import { logout, useRole } from "~/common/storage/local.ts";
import LoginForm from "~/common/auth/LoginForm.tsx";
import Spinner from "~/common/Spinner.tsx";

const Login = () => {
  const { loading, error, isMember } = useRole();

  if (error) {
    return (
      <p>
        A terrible thing has happened, and we have no idea if you are logged in
        or not.
      </p>
    );
  }

  if (loading) {
    return <Spinner />;
  }

  if (isMember) {
    return (
      <button
        onClick={() => {
          logout();
          window.location.reload();
        }}
      >
        Log Out
      </button>
    );
  } else {
    return <LoginForm />;
  }
};

export default Login;
