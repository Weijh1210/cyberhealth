import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { reduce, type Command } from "../domain/engine";
import type { State } from "../domain/types";
import { load, STORAGE_KEY, transact } from "../storage/repository";
const initial = () => load();
type Store = {
  state: State;
  send: (command: Command) => Promise<boolean>;
  error: string;
  owner: string;
  busy: boolean;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, dispatch] = useReducer(
    (
      _: { state: State; error: string; busy: boolean },
      next: { state: State; error: string; busy: boolean },
    ) => next,
    undefined,
    () => ({ ...initial(), busy: false }),
  );
  const ref = useRef(view);
  ref.current = view;
  const [owner] = useReducer(
    () => crypto.randomUUID(),
    undefined,
    () => crypto.randomUUID(),
  );
  const send = useCallback(async (command: Command) => {
    const previous = ref.current;
    const optimistic = {
      // A controlled mode switch needs immediate feedback. Completion, learning,
      // and edits become visible only after their durable transaction succeeds.
      state:
        command.type === "demo"
          ? reduce(previous.state, command)
          : previous.state,
      error: "",
      busy: true,
    };
    ref.current = optimistic;
    dispatch(optimistic);
    try {
      const state = await transact(command);
      dispatch({ state, error: "", busy: false });
      return (
        command.type !== "start" ||
        state.sessions.some((session) => session.id === command.id)
      );
    } catch {
      dispatch({
        ...previous,
        error:
          "保存失败：原有数据仍保留。请检查浏览器存储空间与权限，导出数据后重试。",
        busy: false,
      });
      return false;
    }
  }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null)
        dispatch({ ...load(), busy: false });
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return (
    <Context
      value={{
        ...view,
        state:
          view.state.demo && view.state.demoProfile
            ? { ...view.state, profile: view.state.demoProfile }
            : view.state,
        send,
        owner,
      }}
    >
      {children}
    </Context>
  );
}
export function useStore() {
  const s = useContext(Context);
  if (!s) throw new Error("Missing StoreProvider");
  return s;
}
