import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { SessionService } from "../services/session-service";
import { appReducer, createInitialState } from "./reducer";
import type { AppAction, AppState } from "./types";

interface AppStateProviderProps {
  children: ReactNode;
  sessionService: SessionService;
}

const AppStateContext = createContext<AppState | null>(null);
const AppDispatchContext = createContext<Dispatch<AppAction> | null>(null);

export function AppStateProvider({ children, sessionService }: AppStateProviderProps) {
  const [state, dispatch] = useReducer(
    appReducer,
    sessionService,
    (service) => createInitialState(service.createSessionId()),
  );

  return (
    <AppDispatchContext.Provider value={dispatch}>
      <AppStateContext.Provider value={state}>{children}</AppStateContext.Provider>
    </AppDispatchContext.Provider>
  );
}

export function useAppStateContext(): AppState {
  const state = useContext(AppStateContext);
  if (!state) {
    throw new Error("useAppStateContext must be used within AppStateProvider");
  }
  return state;
}

export function useAppDispatchContext(): Dispatch<AppAction> {
  const dispatch = useContext(AppDispatchContext);
  if (!dispatch) {
    throw new Error("useAppDispatchContext must be used within AppStateProvider");
  }
  return dispatch;
}
