import { cn } from '@xwadex/react-utils'
import { useState } from 'react';

type TodoItem = {
  id: number;
  text: string;
  done: boolean;
}
type TodoInputProps = {
  onAdd: (text: string) => void;
}
type SearchInputProps = {
  keyword: string | undefined;
  onSearch: (text: string) => void;
}

type TodoItemProps = {
  todo: TodoItem;
  onCheck: (id: number) => void;
  onRemove: (id: number) => void;
}
// 輸入筐
export function TodoInput({ onAdd }: TodoInputProps) {
  const [text, setText] = useState<string>("");

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text);
    setText("");
  };

  return (
    <div className={cn(
      "flex",
      "gap-2",
      "mb-4"
    )}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="ENTER TODO"
        className={cn(
          "flex-1",
          "border",
          "rounded-lg",
          "px-3",
          "py-2",
          "focus:outline-none",
          "focus:ring"
        )}
      />
      <button
        onClick={submit}
        className={cn(
          "px-4",
          "py-2",
          "bg-(--sea-ink-soft)",
          "text-white",
          "rounded",
          "hover:bg-(--sea-ink)"
        )}
      >
        ADD
      </button>
    </div>
  );
}
export function SearchInput({
  keyword,
  onSearch
}: SearchInputProps) {
  const [text, setText] = useState<string | undefined>(keyword);

  const submit = () => {
    onSearch((text || '').trim());
  };
  const reset = () => {
    setText("");
    onSearch("");
  };

  return (
    <div className={cn(
      "flex",
      "gap-2",
      "mb-4",
      "border-b"
    )}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="SEARCH TODO"
        className={cn(
          "flex-1",
          "rounded-lg",
          "px-3",
          "py-2",
          "focus:outline-none",
        )}
      />
      <button
        onClick={submit}
        className={cn(
          "px-4",
          "py-2",
          "rounded",
        )}
      >
        GO!
      </button>
      <button
        onClick={reset}
        className={cn(
          "px-4",
          "py-2",
          "rounded",
        )}
      >
        RESET
      </button>
    </div>
  );
}
// 項目
export function TodoItem({ todo, onCheck, onRemove }: TodoItemProps) {
  return (
    <div
      className={cn(
        "flex",
        "items-center",
        "justify-between",
        "bg-gray-50",
        "color-black",
        "px-3",
        "py-2",
        "rounded-lg"
      )}
    >
      <label className={cn(
        "flex",
        "items-center",
        "gap-2",
        "cursor-pointer"
      )}>
        <input
          type="checkbox"
          checked={todo.done}
          onChange={() => onCheck(todo.id)}
        />
        <span className={cn(
          todo.done ? "line-through text-gray-400" : ""
        )}>
          {todo.text}
        </span>
      </label>
      <button
        onClick={() => onRemove(todo.id)}
        className={cn(
          "text-red-500",
          "hover:text-red-700",
          "text-xs",
        )}
      >
        REMOVE
      </button>
    </div>
  );
}
