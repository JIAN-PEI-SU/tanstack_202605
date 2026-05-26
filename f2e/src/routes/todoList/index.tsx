import { TodoInput, SearchInput, TodoItem } from '#/components/todoComponents';
import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start';
import { getCookies } from '@tanstack/react-start/server';
import { cn } from '@xwadex/react-utils'
import { useState, useEffect } from 'react';

type SearchParams = {
  keyword?: string;
}
type TodoItem = {
  id: number;
  text: string;
  done: boolean;
}
const saveData = createServerFn({ method: 'POST' }).handler(async () => {
  const todos = getCookies();
  return {
    _todos: todos._todos
  }
})
export const Route = createFileRoute('/todoList/')({
  validateSearch: (search: Record<string, any>): SearchParams => ({
    keyword: search?.keyword,
  }),
  beforeLoad: async ({ }) => {
    const data = await saveData();
    return { data }
  },

  component: App,
})



function App() {
  const navigate = useNavigate();
  const { keyword } = useSearch({ from: "/todoList/" });
  const routeContext = Route.useRouteContext();
  const cookie = routeContext.data._todos ? JSON.parse(routeContext.data._todos) : [];
  const [todos, setTodos] = useState<TodoItem[]>(cookie);

  // 同步 storage
  useEffect(() => {
    document.cookie = `_todos=${JSON.stringify(todos)}`;
  }, [todos]);

  // 新增
  const addTodo = (text: string) => {
    setTodos((prev) => [
      ...prev,
      {
        id: Date.now(),
        text,
        done: false
      },
    ]);
  };

  // 勾選
  const checkTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, done: !item.done }
          : item
      )
    );
  };

  // 刪除
  const removeTodo = (id: number) => {
    setTodos((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  // 搜尋
  const searchTodo = (text: string) => {
    navigate({
      to: "/todoList",
      search: {
        keyword: text,
      },
    });
  };

  // 真正顯示的資料
  const filteredTodos = todos.filter((item) =>
    item.text
      .toLowerCase()
      .includes((keyword || '').toLowerCase())

  );

  return (
    <main className="page-wrap px-4 py-12">
      <div
        className={cn(
          "flex",
          "flex-col",
          "justify-center",
          "p-40",
          "items-center",
          "gap-4",
        )}
      >
        {/* 新增 Todo */}
        <div
          className={cn(
            "w-full",
            "max-w-md",
            "bg-(--header-bg)",
            "rounded-2xl",
            "shadow-lg",
            "p-6"
          )}
        >
          <div
            className={cn(
              "text-2xl",
              "font-bold",
              "mb-4",
              "text-center"
            )}
          >
            TodoList
          </div>

          <TodoInput onAdd={addTodo} />
        </div>

        {/* Todo List */}
        {todos.length > 0 && (
          <div
            className={cn(
              "w-full",
              "max-w-md",
              "bg-(--header-bg)",
              "rounded-2xl",
              "shadow-lg",
              "p-6"
            )}
          >
            <SearchInput keyword={keyword} onSearch={searchTodo} />

            <ul className={cn("space-y-3")}>
              {filteredTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onCheck={checkTodo}
                  onRemove={removeTodo}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}