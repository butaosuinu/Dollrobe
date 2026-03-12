"use client";

import { useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

type Props = {
  readonly label?: string;
  readonly tags: readonly string[];
  readonly onChangeTags: (tags: readonly string[]) => void;
  readonly placeholder?: string;
};

const TagInput = ({ label, tags, onChangeTags, placeholder = "タグを入力..." }: Props) => {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed !== "" && !tags.includes(trimmed)) {
      onChangeTags([...tags, trimmed]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChangeTags(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
      return;
    }
    if (e.key === "Backspace" && input === "" && tags.length > 0) {
      const [lastTag] = tags.slice(-1);
      if (lastTag !== undefined) {
        removeTag(lastTag);
      }
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label !== undefined && (
        <span className="text-sm font-medium text-text-secondary">{label}</span>
      )}
      <div
        className={clsx(
          "flex flex-wrap gap-1.5 rounded-lg border border-border-default bg-surface-overlay px-3 py-2",
          "focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100",
        )}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => {
                removeTag(tag);
              }}
              className="rounded-full p-0.5 transition-colors hover:bg-primary-200"
              aria-label={`${tag}を削除`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="min-w-[80px] flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
        />
      </div>
    </div>
  );
};

export default TagInput;
