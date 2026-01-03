import { useEffect, useState } from "react";
import { authenticate, getUserid } from "~/common/storage/auth.ts";
import Spinner from "~/common/Spinner.tsx";

function LoginForm() {
  const [savedName, setSavedName] = useState("");
  const [formName, setFormName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
        <h1>Welcome to Raven Eye!</h1>
        <p>
          To use this app, you need to log in first. The app is designed to
          allow scouting and logging activity without an internet connection,
          but to sync data to the server, you will need to be online. To sync,
          simply click on the sync icon in the top right of the page. Do not
          reload if you are not online.
        </p>
        <br />
        <h3>Login</h3>
        <table className={"tools"}>
          <tbody>
            <tr>
              <td>
                <label>
                  <input
                    className={"center"}
                    type={"text"}
                    id={"name"}
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
                    placeholder={"password"}
                    onChange={(e) => {
                      setFormPassword(e.target.value);
                    }}
                  />
                </label>
              </td>
              <td>
                Enter the password that you received from the strategy lead. Do
                not share your password.
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

  return (
    <section>
      <p>Logged in! Yay!</p>
    </section>
  );
}
export default LoginForm;
