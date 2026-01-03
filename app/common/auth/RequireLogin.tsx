import { useLoginStatus } from "~/common/storage/auth.ts";
import Spinner from "~/common/Spinner.tsx";
import LoginForm from "~/common/auth/LoginForm.tsx";

type PropTypes = {
  children: React.ReactNode;
  showForm?: boolean;
};

/**
 * RequireLogin is a component that checks the user's login state and conditionally renders content based on it.
 *
 * If the user is logged in, it renders the children passed to the component. If the user is not logged in and the `showForm`
 * property is true, it displays a login form along with a message. If `showForm` is false, it renders nothing.
 *
 * While the login status is being determined (loading), it displays a spinner.
 *
 * @param {Object} props - The props for the RequireLogin component.
 * @param {React.ReactNode} props.children - The content to render if the user is logged in.
 * @param {boolean} [props.showForm=true] - Whether to display the login form when the user is not logged in. Defaults to true.
 * @returns {React.ReactNode} The rendered component based on the user's login state and provided props.
 */
const RequireLogin = (props: PropTypes) => {
  const { children, showForm = true } = props;
  const { loading, loggedIn } = useLoginStatus();
  if (loading) {
    return <Spinner />;
  }
  if (loggedIn) {
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

export default RequireLogin;
