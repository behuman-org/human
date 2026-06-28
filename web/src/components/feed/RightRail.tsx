import { Link } from "react-router-dom";
import { useUser } from "../../feed/UserContext";
import { UserAvatar } from "./UserAvatar";
import "./RightRail.css";

export function RightRail() {
  const { user } = useUser();

  return (
    <aside className="right-rail" aria-label="Contexto del feed">
      <section className="right-rail__identity">
        <UserAvatar user={user} size="md" verified />
        <div>
          <p className="right-rail__name">{user.username || user.handle}</p>
          <p className="right-rail__handle">@{user.handle}</p>
        </div>
        <Link to="/app/profile" className="right-rail__edit">
          Editar
        </Link>
      </section>
    </aside>
  );
}
