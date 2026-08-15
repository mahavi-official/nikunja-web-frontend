"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
  Unlink,
} from "lucide-react";
import { MediaPickerModal } from "./MediaPicker";
import { AdminButton, Modal, Field, Input } from "./ui";
import { cn, mediaUrl } from "@/lib/format";
import type { Media } from "@/lib/types";

/**
 * The body editor for articles, blogs, and long-form page sections.
 *
 * Deliberately small. The backend runs every submission through `sanitize-html`
 * with a fixed allow-list, so the editor's job is not to be a complete word
 * processor — it is to produce the handful of tags that survive that filter,
 * and to let someone paste HTML directly when they need something it cannot
 * express. Hence the source view: it is the escape hatch that keeps the visual
 * toolbar from having to grow.
 *
 * `document.execCommand` is formally deprecated and has no replacement with
 * comparable browser support; every alternative is a third-party editor
 * framework. For a fixed, small tag set it remains the right trade.
 */

type Command = {
  label: string;
  Icon: typeof Bold;
  run: (exec: (command: string, value?: string) => void) => void;
  /** Query for the active state, so the button can light up. */
  active?: string;
};

const COMMANDS: Command[][] = [
  [
    { label: "Bold", Icon: Bold, run: (exec) => exec("bold"), active: "bold" },
    { label: "Italic", Icon: Italic, run: (exec) => exec("italic"), active: "italic" },
  ],
  [
    {
      label: "Heading 2",
      Icon: Heading2,
      run: (exec) => exec("formatBlock", "<h2>"),
    },
    {
      label: "Heading 3",
      Icon: Heading3,
      run: (exec) => exec("formatBlock", "<h3>"),
    },
    {
      label: "Quote",
      Icon: Quote,
      run: (exec) => exec("formatBlock", "<blockquote>"),
    },
    {
      label: "Code block",
      Icon: Code2,
      run: (exec) => exec("formatBlock", "<pre>"),
    },
  ],
  [
    {
      label: "Bulleted list",
      Icon: List,
      run: (exec) => exec("insertUnorderedList"),
      active: "insertUnorderedList",
    },
    {
      label: "Numbered list",
      Icon: ListOrdered,
      run: (exec) => exec("insertOrderedList"),
      active: "insertOrderedList",
    },
  ],
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write the body…",
  minHeight = "28rem",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [, forceRender] = useState(0);

  /**
   * The selection is lost the moment a toolbar button takes focus, so it is
   * captured on every change inside the editor and restored before any command
   * that needs it (link insertion, image insertion).
   */
  const savedRange = useRef<Range | null>(null);

  const rememberSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.current?.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const range = savedRange.current;
    if (!range) {
      editor.current?.focus();
      return;
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.current?.focus();
  }, []);

  // Write the incoming value in only when it differs from what is on screen —
  // assigning innerHTML on every keystroke would reset the caret to the start.
  useEffect(() => {
    if (source) return;
    const node = editor.current;
    if (node && node.innerHTML !== value) node.innerHTML = value || "";
  }, [value, source]);

  const exec = useCallback(
    (command: string, argument?: string) => {
      restoreSelection();
      document.execCommand(command, false, argument);
      onChange(editor.current?.innerHTML ?? "");
      forceRender((count) => count + 1);
    },
    [onChange, restoreSelection]
  );

  const isActive = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    setLinkOpen(false);
    if (!url) return;
    exec("createLink", url);
    setLinkUrl("");
  };

  const insertImage = (media: Media) => {
    const url = mediaUrl(media, "large") ?? media.url;
    const alt = (media.alt ?? media.fileName).replace(/"/g, "&quot;");
    restoreSelection();
    document.execCommand(
      "insertHTML",
      false,
      `<figure><img src="${url}" alt="${alt}" />${
        media.alt ? `<figcaption>${media.alt}</figcaption>` : ""
      }</figure><p><br /></p>`
    );
    onChange(editor.current?.innerHTML ?? "");
  };

  const toolButton = (
    key: string,
    label: string,
    Icon: typeof Bold,
    onClick: () => void,
    active = false
  ) => (
    <button
      key={key}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      // Prevents the editor losing its selection when the button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-lg transition-colors",
        active
          ? "bg-flame-500 text-white"
          : "text-ink-soft hover:bg-surface-sunken hover:text-ink"
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-line-strong bg-surface focus-within:border-flame-400 focus-within:ring-2 focus-within:ring-flame-500/20">
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-surface-sunken/70 px-2 py-1.5">
        {!source ? (
          <>
            {COMMANDS.map((group, groupIndex) => (
              <div key={groupIndex} className="flex items-center gap-1">
                {groupIndex > 0 ? <span className="mx-1 h-5 w-px bg-line" aria-hidden /> : null}
                {group.map((command) =>
                  toolButton(
                    command.label,
                    command.label,
                    command.Icon,
                    () => command.run(exec),
                    command.active ? isActive(command.active) : false
                  )
                )}
              </div>
            ))}

            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            {toolButton("link", "Add link", Link2, () => {
              rememberSelection();
              setLinkOpen(true);
            })}
            {toolButton("unlink", "Remove link", Unlink, () => exec("unlink"))}
            {toolButton("image", "Insert image", ImageIcon, () => {
              rememberSelection();
              setImageOpen(true);
            })}

            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            {toolButton("undo", "Undo", Undo2, () => exec("undo"))}
            {toolButton("redo", "Redo", Redo2, () => exec("redo"))}
          </>
        ) : (
          <p className="px-2 py-1 text-[0.8125rem] text-ink-muted">
            Editing the HTML directly. Anything the sanitiser disallows is dropped on save.
          </p>
        )}

        <div className="ml-auto">
          <AdminButton tone="ghost" size="sm" onClick={() => setSource((current) => !current)}>
            {source ? "Visual" : "HTML"}
          </AdminButton>
        </div>
      </div>

      {source ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          style={{ minHeight }}
          className="w-full resize-y bg-surface px-4 py-3 font-mono text-[0.8125rem] leading-relaxed text-ink outline-none"
        />
      ) : (
        <div
          ref={editor}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Body"
          data-placeholder={placeholder}
          style={{ minHeight }}
          onInput={() => onChange(editor.current?.innerHTML ?? "")}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onBlur={rememberSelection}
          className="prose-content admin-editor max-w-none px-4 py-3 outline-none"
        />
      )}

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Add a link"
        description="Selected text becomes the link. Internal links can be relative, e.g. /research."
        size="sm"
        footer={
          <>
            <AdminButton tone="ghost" onClick={() => setLinkOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton onClick={applyLink}>Add link</AdminButton>
          </>
        }
      >
        <Field label="URL">
          <Input
            autoFocus
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && applyLink()}
            placeholder="https://example.org or /articles/slug"
          />
        </Field>
      </Modal>

      <MediaPickerModal
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        onPick={insertImage}
      />
    </div>
  );
}
