import { useLoginStatus } from "~/common/storage/auth.ts";
import Spinner from "~/common/Spinner.tsx";
import LoginForm from "~/common/auth/LoginForm.tsx";

type PropTypes = {
  children: React.ReactNode;
};

const RequireLogin = (props: PropTypes) => {
  const { children } = props;
  const { loading, loggedIn } = useLoginStatus();
  if (loading) {
    return <Spinner />;
  }
  if (loggedIn) {
    return children;
  } else {
    return (
      <section>
        <h2>Login required</h2>
        <p>You must be logged in to access this page</p>
        <LoginForm />
      </section>
    );
  }
};

export default RequireLogin;
