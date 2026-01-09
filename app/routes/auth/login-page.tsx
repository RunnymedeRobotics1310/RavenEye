import LoginForm from "~/common/auth/LoginForm.tsx";
import Spinner from "~/common/Spinner.tsx";
import { getDisplayName, useLoginStatus } from "~/common/storage/rbauth.ts";
import { NavLink } from "react-router";

const LoginPage = () => {
  const { loading, debug_alive, debug_hasToken, debug_expired, loggedIn } =
    useLoginStatus();

  if (loading) {
    return (
      <main>
        <Spinner />
      </main>
    );
  }

  if (loggedIn) {
    const fullName = getDisplayName();
    return (
      <main>
        <h1>Welcome {fullName}</h1>
        <p>You have logged in successfully</p>
        <NavLink to={`/`}>Home</NavLink>
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
