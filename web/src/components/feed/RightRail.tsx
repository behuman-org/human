import { Link } from "react-router-dom";
import { useUser } from "../../feed/UserContext";
import { useI18n } from "../../i18n/useI18n";
import { UserAvatar } from "./UserAvatar";
import "./RightRail.css";

export function RightRail() {
  const { user } = useUser();
  const { t } = useI18n();
  const r = t.social.rightRail;

  return (
    <aside className="right-rail" aria-label={r.aria}>
      <section className="right-rail__identity">
        <UserAvatar user={user} size="md" verified />
        <div>
          <p className="right-rail__name">{user.username || user.handle}</p>
          <p className="right-rail__handle">@{user.handle}</p>
        </div>
        <Link to="/app/profile" className="right-rail__edit">
          {r.edit}
        </Link>
      </section>
    </aside>
  );
}
