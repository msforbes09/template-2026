"use client";

import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Undo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GalleryImagePickerDialog } from "@/modules/gallery/components/gallery-image-picker-dialog";
import type { GalleryImage } from "@/types/gallery";

function setLink(editor: Editor) {
  const previousUrl = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("URL", previousUrl ?? "");
  if (url === null) return; // cancelled
  if (url === "") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

function insertGalleryImage(editor: Editor, image: GalleryImage) {
  if (!image.url) return;
  editor.chain().focus().setImage({ src: image.url, alt: image.original_name ?? "image" }).run();
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  editorMinHeightClassName = "min-h-40",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  // Min-height utility for the editable area itself (so clicking anywhere in
  // the empty space focuses the editor).
  editorMinHeightClassName?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  // ARIA state belongs on the editable element (Tiptap renders it with
  // role="textbox"), not the wrapper div — recomputed so error-state changes
  // after a failed submit are re-applied via setOptions below.
  const editorAttributes = useMemo(
    () => ({
      ...(id ? { id } : {}),
      ...(ariaInvalid ? { "aria-invalid": "true" } : {}),
      ...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
      class:
        `${editorMinHeightClassName} max-w-none px-3 py-2 text-sm leading-relaxed focus:outline-none ` +
        "[&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold " +
        "[&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 " +
        "[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic",
    }),
    [id, ariaInvalid, ariaDescribedBy, editorMinHeightClassName],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false, autolink: true }),
      TiptapImage,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    immediatelyRender: false, // avoid SSR hydration mismatch (Next.js App Router)
    editorProps: { attributes: editorAttributes },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);

  useEffect(() => {
    editor?.setOptions({ editorProps: { attributes: editorAttributes } });
  }, [editor, editorAttributes]);

  if (!editor) {
    return <div className="h-48 w-full animate-pulse rounded-lg border border-border bg-muted" />;
  }

  return (
    <div className="rounded-lg border border-input has-aria-invalid:border-destructive">
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-0.5 border-b border-border p-1"
      >
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={() => setLink(editor)}>
          <LinkIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Insert image" onClick={() => setGalleryPickerOpen(true)}>
          <ImageIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="size-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      <GalleryImagePickerDialog
        open={galleryPickerOpen}
        onOpenChange={setGalleryPickerOpen}
        onSelect={(image) => insertGalleryImage(editor, image)}
      />
    </div>
  );
}
