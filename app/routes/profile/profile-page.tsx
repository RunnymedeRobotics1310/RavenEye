import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { NavLink } from "react-router";
import { useEffect, useState } from "react";
import { rbfetch } from "~/common/storage/rbauth.ts";
import type { User } from "~/types/User.ts";
import {
  ProfileForm,
  type ProfileFormData,
} from "~/common/profile/ProfileForm.tsx";
import Spinner from "~/common/Spinner.tsx";
import ErrorMessage from "~/common/ErrorMessage.tsx";

function useProfile() {
  const [data, setData] = useState<User | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rbfetch("/api/users/me", {}).then((resp) => {
      if (resp.ok) {
        resp.json().then((data) => {
          if (data) {
            setData(data);
          } else {
            setError("Failed to fetch profile");
          }
          setLoading(false);
        });
      } else {
        setError("Failed to fetch profile: " + resp.status);
        setLoading(false);
      }
    });
  }, []);

  return { data, error, loading };
}

const Success = () => {
  return (
    <section>
      <h1>Success!</h1>
      <p>Profile updated successfully.</p>
      <NavLink to={"/"} className="btn">Back to Home</NavLink>
    </section>
  );
};

const ProfileContent = () => {
  const { data, loading, error: fetchError } = useProfile();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSubmit = async (item: ProfileFormData) => {
    setError(false);
    setMsg("");
    try {
      const resp = await rbfetch("/api/users/me", {
        method: "PUT",
        body: JSON.stringify(item),
      });
      if (!resp.ok) {
        throw new Error("Failed to update profile: " + resp.status);
      }
      sessionStorage.setItem("raveneye_displayName", item.displayName);
      sessionStorage.setItem("raveneye_login", item.login);
      setSuccess(true);
    } catch (err: any) {
      setError(true);
      setMsg("Something went wrong: " + err.message);
    }
  };

  if (loading) return <Spinner />;
  if (fetchError)
    return (
      <ErrorMessage title="Error fetching profile">{fetchError}</ErrorMessage>
    );
  if (!data)
    return <ErrorMessage title="Error">User not found</ErrorMessage>;

  return (
    <>
      {error && <p className={"errorMessage"}>{msg}</p>}
      {success ? (
        <Success />
      ) : (
        <ProfileForm
          submitFunction={handleSubmit}
          disabled={success}
          initialData={data}
        />
      )}
    </>
  );
};

const ProfilePage = () => {
  return (
    <main>
      <h1>My Profile</h1>
      <RequireLogin>
        <ProfileContent />
      </RequireLogin>
    </main>
  );
};

export default ProfilePage;
