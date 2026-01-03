import LoginForm from "~/common/auth/LoginForm.tsx";
import Spinner from "~/common/Spinner.tsx";
import { getFullName, useLoginStatus } from "~/common/storage/auth.ts";
import { NavLink } from "react-router";

const LoginPage = () => {
  const { loading, alive, authenticated, expired, loggedIn } = useLoginStatus();
  const fullName = getFullName();

  if (loading) {
    return <Spinner />;
  }

  if (loggedIn) {
    return (
      <section>
        <h2>Welcome {fullName}</h2>
        <p>You have logged in successfully</p>
        <NavLink to={`/`}>Home</NavLink>
      </section>
    );
  }

  if (!alive) {
    return (
      <section>
        <p>Communication failure connecting to server.</p>
      </section>
    );
  }

  if (!authenticated) {
    return (
      <section>
        <LoginForm />
      </section>
    );
  }

  if (expired) {
    return (
      <section>
        <h2>Login Expired</h2>;
        <LoginForm />
      </section>
    );
  }

  if (!loggedIn) {
    return (
      <section>
        <LoginForm />
      </section>
    );
  }

  return <p>Unexpected login status</p>;
};

export default LoginPage;
