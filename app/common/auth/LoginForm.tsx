import { useState } from "react";
import { authenticate, useLoginStatus } from "~/common/storage/rbauth.ts";
import Spinner from "~/common/Spinner.tsx";
import { useNavigate } from "react-router";

function LoginForm() {
  const [formName, setFormName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  function handleLoginClick() {
    setLoading(true);
    setSubmitted(true);
    authenticate(formName, formPassword)
      .then(() => {
        setSuccess(true);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setSuccess(false);
      });
  }

  function LoginFailed() {
    const { debug_alive } = useLoginStatus();
    if (!debug_alive) {
      return (
        <section>
          <p>Unable to log in: server not available</p>
        </section>
      );
    }

    return (
      <section>
        <p>Login failed</p>
      </section>
    );
  }

  if (!submitted) {
    return (
      <div>
        <h3>Login</h3>
        <form>
          <table className={"tools"}>
            <tbody>
              <tr>
                <td>
                  <label>
                    <input
                      className={"center"}
                      type={"text"}
                      id={"name"}
                      autoComplete="username"
                      placeholder={formName == "" ? "Name" : formName}
                      onChange={(e) => {
                        setFormName(e.target.value);
                      }}
                    />
                  </label>
                </td>
                <td>Please enter your username.</td>
              </tr>
              <tr>
                <td>
                  <label>
                    <input
                      className={"center"}
                      type={"password"}
                      id={"password"}
                      autoComplete={"current-password"}
                      placeholder={"Password"}
                      onChange={(e) => {
                        setFormPassword(e.target.value);
                      }}
                    />
                  </label>
                </td>
                <td>
                  Enter the password that you received from the strategy lead.
                  Do not share your password.
                </td>
              </tr>
              <tr>
                <td>
                  <button
                    disabled={formName == "" || formPassword == ""}
                    onClick={() => {
                      handleLoginClick();
                    }}
                  >
                    Log in
                  </button>
                </td>
                <td>
                  Log in. You need to be connected to the internet to log in.
                </td>
              </tr>
            </tbody>
          </table>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <section>
        <Spinner />
      </section>
    );
  }

  if (!success) {
    return <LoginFailed />;
  }

  navigate(0); // refresh
}
export default LoginForm;
