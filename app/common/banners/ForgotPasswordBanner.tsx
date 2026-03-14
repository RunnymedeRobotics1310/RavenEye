import { Link } from "react-router";
import { useForgotPasswordUsers } from "~/common/storage/rb.ts";

const ForgotPasswordBanner = () => {
  const { data, loading } = useForgotPasswordUsers();

  if (loading || !data || data.length === 0) return null;

  return (
    <div className="banner banner-warning">
      <Link to="/admin/users">
        {data.length === 1
          ? "1 user has requested a password reset"
          : `${data.length} users have requested a password reset`}
      </Link>
    </div>
  );
};

export default ForgotPasswordBanner;
