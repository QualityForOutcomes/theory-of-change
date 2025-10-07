import MDEditor from "@uiw/react-md-editor";
import { useMemo } from "react";

export default function RichTextEditor({ value, onChange, height = 400 }) {
  const extraCommands = useMemo(() => {
    return [
      "bold",
      "italic",
      "strikethrough",
      "divider",
      "header",
      "list",
      "quote",
      "code",
      "link",
      "image",
      "table",
      "divider",
      "checked-list",
      "fullscreen",
    ];
  }, []);

  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={onChange}
        height={height}
        preview="edit"
        extraCommands={extraCommands}
      />
    </div>
  );
}