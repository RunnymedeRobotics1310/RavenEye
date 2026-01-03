import { useEffect, useState } from "react";
import { authenticate, getUserid } from "~/common/storage/auth.ts";
import Spinner from "~/common/Spinner.tsx";
import { useNavigate } from "react-router";

function LoginForm() {
  const [savedName, setSavedName] = useState("");
  const [formName, setFormName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (savedName == "") {
      const loadedName = getUserid();
      if (loadedName && loadedName != "") {
        setSavedName(loadedName);
        setFormName(loadedName);
      }
    }
  }, []);

  function handleLoginClick() {
    setLoading(true);
    setSubmitted(true);
    authenticate(formName, formPassword)
      .then(() => {
        setSuccess(true);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        setSuccess(false);
      });
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
                      placeholder={"password"}
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
    return (
      <section>
        <p>Login failed</p>
      </section>
    );
  }

  navigate(0); // refresh
}
export default LoginForm;
