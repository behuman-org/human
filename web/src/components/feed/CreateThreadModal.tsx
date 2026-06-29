import { useState } from "react";
import { createCommunity } from "../../feed/feedApi";
import { useI18n } from "../../i18n/I18nProvider";
import "./EditProfileModal.css";
import "./CreateThreadModal.css";

interface CreateThreadModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (slug: string) => void;
}

export function CreateThreadModal({ open, onClose, onCreated }: CreateThreadModalProps) {
  const { t } = useI18n();
  const c = t.social.createThread;
  const common = t.social.common;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const community = await createCommunity({ name, description });
      setName("");
      setDescription("");
      onCreated(community.slug);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : c.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="create-thread-title">
      <button type="button" className="profile-modal__backdrop" aria-label={common.close} onClick={onClose} />
      <div className="profile-modal__panel">
        <header className="profile-modal__head">
          <button type="button" className="profile-modal__close" onClick={onClose}>
            ✕
          </button>
          <h2 id="create-thread-title">{c.title}</h2>
          <button
            type="button"
            className="profile-modal__save"
            disabled={busy}
            onClick={() => void submit()}
          >
            {c.create}
          </button>
        </header>

        <div className="profile-modal__body create-thread-modal__body">
          <label className="profile-modal__field">
            <span>{c.name}</span>
            <div className="create-thread-modal__name-row">
              <span className="create-thread-modal__prefix">r/</span>
              <input
                type="text"
                value={name}
                maxLength={21}
                placeholder={c.namePlaceholder}
                autoFocus
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </label>

          <label className="profile-modal__field">
            <span>{c.description}</span>
            <textarea
              value={description}
              rows={3}
              maxLength={200}
              placeholder={c.descriptionPlaceholder}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          {error && <p className="create-thread-modal__error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
