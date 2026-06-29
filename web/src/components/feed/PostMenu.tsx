import { useEffect, useState } from "react";
import { reportPost, wasReported } from "../../feed/feedApi";
import { PlatformApiError } from "../../feed/platformApi";
import { useI18n } from "../../i18n/I18nProvider";
import { ActionMenu } from "./ActionMenu";

interface PostMenuProps {
  postId: string;
}

export function PostMenu({ postId }: PostMenuProps) {
  const { t } = useI18n();
  const m = t.social.postMenu;
  const [reported, setReported] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    void wasReported("post", postId).then(setReported);
  }, [postId]);

  async function report() {
    if (reported) return;
    try {
      await reportPost(postId, m.reportReason);
      setReported(true);
      setToast(m.reportSent);
    } catch (err) {
      setToast(
        err instanceof PlatformApiError && err.status === 404 ? m.reportUnavailable : m.reportFailed,
      );
    }
    window.setTimeout(() => setToast(""), 2800);
  }

  return (
    <>
      <ActionMenu
        label={m.menuLabel}
        items={[
          {
            id: "report",
            label: reported ? m.reported : m.report,
            destructive: true,
            disabled: reported,
            onSelect: () => void report(),
          },
        ]}
      />
      {toast && (
        <p className="post-menu__toast" role="status">
          {toast}
        </p>
      )}
    </>
  );
}
