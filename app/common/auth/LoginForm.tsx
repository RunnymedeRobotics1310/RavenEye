import { useState } from "react";
import { authenticate, useLoginStatus } from "~/common/storage/rbauth.ts";
import { forgotPassword } from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import { useNavigate } from "react-router";

function LoginForm() {
  const [formName, setFormName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const navigate = useNavigate();

  function handleLoginClick() {
    setLoading(true);
    setSubmitted(true);
    authenticate(formName, formPassword)
      .then(() => {
        setSuccess(true);
        setLoading(false);
      })
      .catch((ex: any) => {
        console.log("Login failed", ex);
        setLoading(false);
        setSuccess(false);
      });
  }

  function handleForgotPassword() {
    if (formName === "") {
      setForgotError("Please enter your username first.");
      return;
    }
    setForgotError(null);
    setForgotMsg(null);
    setForgotLoading(true);
    forgotPassword(formName)
      .then(() => {
        setForgotMsg(
          "Your password has been flagged for reset. An administrator will reset your password and share it with you via Teams, email, or voice.",
        );
        setForgotLoading(false);
      })
      .catch((err: any) => {
        setForgotError("Failed to flag password for reset: " + err.message);
        setForgotLoading(false);
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
              <tr>
                <td>
                  <button
                    type="button"
                    disabled={forgotLoading}
                    onClick={handleForgotPassword}
                  >
                    Forgot Password
                  </button>
                </td>
                <td>
                  Flag your account for a password reset by an administrator.
                </td>
              </tr>
            </tbody>
          </table>
        </form>
        {forgotLoading && <Spinner />}
        {forgotMsg && <p>{forgotMsg}</p>}
        {forgotError && <p className={"errorMessage"}>{forgotError}</p>}
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
