"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  AdminButton,
  ErrorNote,
  Field,
  InfoNote,
  Input,
  PageHeader,
  Panel,
  Spinner,
  Textarea,
  useToast,
} from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync } from "@/components/admin/useAsync";
import { AdminApiError, isSuperAdmin, useApi } from "@/lib/admin";

/**
 * Site settings.
 *
 * The store is a free-form key/value table, which is flexible but offers no
 * guidance about what the site actually reads. This screen supplies that: the
 * keys the frontend consumes are laid out as a proper form in the order they
 * appear on the site, and anything else in the table is shown underneath as raw
 * pairs so nothing becomes invisible just because this screen has not been
 * taught about it.
 */

interface KnownSetting {
  key: string;
  label: string;
  hint?: string;
  type?: "text" | "url" | "email" | "textarea";
  placeholder?: string;
}

const GROUPS: { title: string; description: string; keys: KnownSetting[] }[] = [
  {
    title: "Identity",
    description: "Used in the page title, the manifest, and every social card.",
    keys: [
      { key: "site.title", label: "Site title", placeholder: "Radhakundah" },
      {
        key: "site.description",
        label: "Site description",
        type: "textarea",
        hint: "The default meta description, used wherever a page sets none of its own.",
      },
      { key: "site.logo", label: "Logo URL", type: "url" },
      {
        key: "seo.defaultOgImage",
        label: "Default social image",
        type: "url",
        hint: "1200×630. Shown when a page has no image of its own.",
      },
    ],
  },
  {
    title: "Contact",
    description: "Shown in the footer and on the contact page.",
    keys: [
      { key: "contact.email", label: "Email", type: "email" },
      { key: "contact.phone", label: "Phone" },
      { key: "contact.address", label: "Address", type: "textarea" },
      {
        key: "contact.mapEmbed",
        label: "Map embed URL",
        type: "url",
        hint: "The src of an embeddable map iframe.",
      },
    ],
  },
  {
    title: "Social",
    description: "Empty fields are simply not shown.",
    keys: [
      { key: "social.facebook", label: "Facebook", type: "url" },
      { key: "social.twitter", label: "X / Twitter", type: "url" },
      { key: "social.instagram", label: "Instagram", type: "url" },
      { key: "social.youtube", label: "YouTube", type: "url" },
      { key: "social.linkedin", label: "LinkedIn", type: "url" },
    ],
  },
  {
    title: "Analytics",
    description: "Leave blank to load no tracking script at all.",
    keys: [
      {
        key: "analytics.ga4",
        label: "Google Analytics 4 measurement ID",
        placeholder: "G-XXXXXXXXXX",
      },
    ],
  },
];

const KNOWN_KEYS = new Set(GROUPS.flatMap((group) => group.keys.map((item) => item.key)));

export default function SettingsPage() {
  return (
    <RequirePermission allow={isSuperAdmin}>
      <Settings />
    </RequirePermission>
  );
}

function Settings() {
  const api = useApi();
  const { notify } = useToast();

  const { data, error, loading, reload } = useAsync(
    () => api.get<{ settings: Record<string, unknown> }>("/admin/settings"),
    []
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState<{ key: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const settings = data.settings ?? {};

    const next: Record<string, string> = {};
    for (const key of KNOWN_KEYS) {
      const raw = settings[key];
      next[key] = typeof raw === "string" ? raw : raw == null ? "" : JSON.stringify(raw);
    }
    setValues(next);

    setExtra(
      Object.entries(settings)
        .filter(([key]) => !KNOWN_KEYS.has(key))
        .map(([key, raw]) => ({
          key,
          value: typeof raw === "string" ? raw : JSON.stringify(raw),
        }))
    );
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = { ...values };
      for (const row of extra) {
        if (row.key.trim()) payload[row.key.trim()] = row.value;
      }
      await api.patch("/admin/settings", payload);
      notify("Settings saved.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not save settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <Spinner label="Loading settings" />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Sitewide values. Only a super admin can change these."
        actions={
          <AdminButton onClick={save} loading={saving}>
            <Save className="size-4" aria-hidden />
            Save settings
          </AdminButton>
        }
      />

      <div className="mb-5">
        <InfoNote>
          Public pages cache settings for an hour, so a change here can take that long to appear for
          a visitor who has already loaded the site.
        </InfoNote>
      </div>

      <div className="space-y-5">
        {GROUPS.map((group) => (
          <Panel key={group.title} title={group.title} description={group.description}>
            <div className="grid gap-4 sm:grid-cols-2">
              {group.keys.map((setting) => (
                <Field
                  key={setting.key}
                  label={setting.label}
                  hint={setting.hint}
                  className={setting.type === "textarea" ? "sm:col-span-2" : undefined}
                >
                  {setting.type === "textarea" ? (
                    <Textarea
                      rows={3}
                      value={values[setting.key] ?? ""}
                      onChange={(event) =>
                        setValues({ ...values, [setting.key]: event.target.value })
                      }
                      placeholder={setting.placeholder}
                    />
                  ) : (
                    <Input
                      type={setting.type === "url" || setting.type === "email" ? "text" : "text"}
                      inputMode={setting.type === "email" ? "email" : undefined}
                      value={values[setting.key] ?? ""}
                      onChange={(event) =>
                        setValues({ ...values, [setting.key]: event.target.value })
                      }
                      placeholder={setting.placeholder}
                    />
                  )}
                  <p className="mt-1 font-mono text-[0.6875rem] text-ink-muted">{setting.key}</p>
                </Field>
              ))}
            </div>
          </Panel>
        ))}

        <Panel
          title="Other keys"
          description="Anything in the settings table this screen does not have a field for. Edit with care."
          actions={
            <AdminButton
              tone="secondary"
              size="sm"
              onClick={() => setExtra([...extra, { key: "", value: "" }])}
            >
              <Plus className="size-3.5" aria-hidden />
              Add key
            </AdminButton>
          }
        >
          {extra.length ? (
            <ul className="space-y-2">
              {extra.map((row, index) => (
                <li key={index} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
                  <Input
                    value={row.key}
                    onChange={(event) =>
                      setExtra(
                        extra.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, key: event.target.value } : item
                        )
                      )
                    }
                    placeholder="namespace.key"
                    aria-label="Setting key"
                    className="font-mono text-[0.8125rem]"
                  />
                  <Input
                    value={row.value}
                    onChange={(event) =>
                      setExtra(
                        extra.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value: event.target.value } : item
                        )
                      )
                    }
                    placeholder="value"
                    aria-label="Setting value"
                  />
                  <button
                    type="button"
                    onClick={() => setExtra(extra.filter((_, itemIndex) => itemIndex !== index))}
                    aria-label="Remove this key"
                    className="grid size-10 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[0.8125rem] text-ink-muted">
              Nothing outside the fields above. Removing a row here stops it being sent, but does not
              delete the stored key.
            </p>
          )}
        </Panel>

        <div className="flex justify-end">
          <AdminButton onClick={save} loading={saving}>
            <Save className="size-4" aria-hidden />
            Save settings
          </AdminButton>
        </div>
      </div>
    </>
  );
}
