import { useEffect, useState } from "react";
import { authenticate, ping, validate } from "~/common/storage/ravenbrain.ts";
import { useNavigate, Outlet } from "react-router";
import Spinner from "~/common/Spinner.tsx";

type PropTypes = {
  loginMode: boolean;
  username?: string;
  password?: string;
  children?: React.ReactNode;
};
function RavenBrainSyncConnection(props: PropTypes) {
  const { loginMode, username, password, children } = props;
  const navigate = useNavigate();
  const [error, setError] = useState<string>("");
  const [alive, setAlive] = useState(false);
  const [credsPresent, setCredsPresent] = useState<boolean>(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (loginMode) {
      if (username && password) {
        setCredsPresent(true);
      } else {
        setError("Cannot log in without a username and password");
      }
      setCredsPresent(true);
    } else {
      setCredsPresent(false);
    }
  }, [loginMode, username, password]);

  useEffect(() => {
    if (!alive) {
      ping()
        .then((ok) => {
          if (ok) {
            setAlive(true);
          } else {
            setError("Ping failed");
          }
        })
        .catch((e) => {
          setError("Ping failed: " + e.message);
        });
    }
  }, []);

  useEffect(() => {
    if (error == "" && alive && credsPresent) {
      authenticate(username!, password!)
        .then(() => {
          setAuthenticated(true);
        })
        .catch((e) => {
          setError("Authentication failed: " + e.message);
        });
    }
  }, [error, alive, authenticated]);

  useEffect(() => {
    if ((!credsPresent || authenticated) && !validated) {
      console.log("trying to validate");
      validate()
        .then(() => {
          setValidated(true);
        })
        .catch((e) => {
          setError("Validation failed: " + e.message);
        });
    }
  }, [authenticated, validated]);

  if (!error && !validated) {
    return (
      <section>
        <h2>Connecting to Raven Brain</h2>
        <p>Connecting... Please wait.</p>
        <Spinner />
        <button onClick={() => navigate("/")}>Return Home</button>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <h2>
          {loginMode ? "Login failed" : "Error Connecting to Raven Brain"}
        </h2>
        <ul>
          <li>Host is accessible? {alive ? "YES" : "NO"}</li>
          <li>Successfully authenticated? {authenticated ? "YES" : "NO"}</li>
          <li>Reason: {error}</li>
        </ul>
        <button
          onClick={() => (loginMode ? window.location.reload() : navigate("/"))}
        >
          {loginMode ? "Try again" : "Return Home"}
        </button>
      </section>
    );
  }

  if (!validated) {
    return (
      <section>
        <h2>Validating Connection to Raven Brain</h2>
        <p>
          You have been successfully authenticated, but we are confirming that
          secured requests can be made successfully. If you see this message for
          <strong> more than 2 seconds</strong> please contact the developer.
        </p>
        <Spinner />
        <button onClick={() => navigate("/")}>Return Home</button>
      </section>
    );
  }

  if (loginMode) {
    window.location.reload();
  }
  return <section>{children}</section>;
}

export default RavenBrainSyncConnection;
