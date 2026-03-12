import { useEffect } from "react";
import LoginForm from "~/common/auth/LoginForm.tsx";
import Spinner from "~/common/Spinner.tsx";
import { useLoginStatus } from "~/common/storage/rbauth.ts";
import { useLocation, useNavigate } from "react-router";

const LoginPage = () => {
  const { loading, debug_alive, debug_hasToken, debug_expired, loggedIn } =
    useLoginStatus();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loggedIn) {
      const params = new URLSearchParams(location.search);
      navigate(params.get("redirect") || "/", { replace: true });
    }
  }, [loggedIn, navigate, location.search]);

  if (loading || loggedIn) {
    return (
      <main>
        <Spinner />
      </main>
    );
  }

  if (!debug_alive) {
    return (
      <main>
        <p>Communication failure connecting to server.</p>
      </main>
    );
  }

  if (!debug_hasToken) {
    return (
      <main>
        <LoginForm />
      </main>
    );
  }

  if (debug_expired) {
    return (
      <main>
        <h1>Login Expired</h1>
        <LoginForm />
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main>
        <LoginForm />
      </main>
    );
  }

  return <p>Unexpected login status</p>;
};

export default LoginPage;
