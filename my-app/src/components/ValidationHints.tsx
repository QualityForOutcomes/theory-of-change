import React from "react";

type Hint = { label: string; valid: boolean };

export default function ValidationHints({ hints, id }: { hints: Hint[]; id?: string }) {
  return (
    <ul id={id} className="mt-1 text-sm text-gray-600">
      {hints.map((h, i) => (
        <li key={i} className={`flex items-center gap-2 ${h.valid ? "text-green-600" : "text-gray-500"}`}>
          <span aria-hidden="true">{h.valid ? "✅" : "○"}</span>
          <span>{h.label}</span>
        </li>
      ))}
    </ul>
  );
}
