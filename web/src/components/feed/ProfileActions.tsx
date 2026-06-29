import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  followUser,
  isFollowingUser,
  messagesPath,
  reportUser,
  unfollowUser,
  wasReported,
} from "../../feed/feedApi";
import { PlatformApiError } from "../../feed/platformApi";
import { useI18n } from "../../i18n/useI18n";
import { ActionMenu } from "./ActionMenu";
import "./ProfileActions.css";

interface ProfileActionsProps {
  platformId: string;
  username: string;
  onFollowChange?: () => void;
}

export function ProfileActions({ platformId, onFollowChange }: ProfileActionsProps) {
  const { t } = useI18n();
  const a = t.social.profileActions;
  const messages = t.social.messages;
  const [following, setFollowing] = useState(false);
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    void isFollowingUser(platformId).then(setFollowing);
    void wasReported("user", platformId).then(setReported);
  }, [platformId]);

  async function toggleFollow() {
    setBusy(true);
    try {
      if (following) {
        await unfollowUser(platformId);
        setFollowing(false);
        setToast(a.unfollowed);
      } else {
        await followUser(platformId);
        setFollowing(true);
        setToast(a.followed);
      }
      onFollowChange?.();
    } catch (err) {
      const msg =
        err instanceof PlatformApiError && err.status === 404 ? a.followUnavailable : a.actionFailed;
      setToast(msg);
    } finally {
      setBusy(false);
      window.setTimeout(() => setToast(""), 3200);
    }
  }

  async function report() {
    if (reported) return;
    try {
      await reportUser(platformId, a.reportReason);
      setReported(true);
      setToast(a.reportSent);
    } catch (err) {
      const msg =
        err instanceof PlatformApiError && err.status === 404 ? a.reportUnavailable : a.reportFailed;
      setToast(msg);
    }
    window.setTimeout(() => setToast(""), 3200);
  }

  return (
    <div className="profile-actions">
      <button
        type="button"
        className={`profile-actions__follow ${following ? "is-following" : ""}`.trim()}
        disabled={busy}
        onClick={() => void toggleFollow()}
      >
        {following ? a.following : a.follow}
      </button>
      <Link to={messagesPath(platformId)} className="profile-actions__message">
        {messages.title}
      </Link>
      <ActionMenu
        label={a.menuLabel}
        items={[
          {
            id: "report",
            label: reported ? a.reported : a.report,
            destructive: true,
            disabled: reported,
            onSelect: () => void report(),
          },
        ]}
      />
      {toast && (
        <p className="profile-actions__toast" role="status">
          {toast}
        </p>
      )}
    </div>
  );
}
