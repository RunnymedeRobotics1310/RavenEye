import LoginForm from "~/common/auth/LoginForm.tsx";
import Spinner from "~/common/Spinner.tsx";
import { getFullName, useLoginStatus } from "~/common/storage/auth.ts";
import { NavLink } from "react-router";

const LoginPage = () => {
  const { loading, alive, authenticated, expired, loggedIn } = useLoginStatus();
  const fullName = getFullName();

  if (loading) {
    return (
      <main>
        <Spinner />
      </main>
    );
  }

  if (loggedIn) {
    return (
      <main>
        <h1>Welcome {fullName}</h1>
        <p>You have logged in successfully</p>
        <NavLink to={`/`}>Home</NavLink>
      </main>
    );
  }

  if (!alive) {
    return (
      <main>
        <p>Communication failure connecting to server.</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main>
        <LoginForm />
      </main>
    );
  }

  if (expired) {
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
