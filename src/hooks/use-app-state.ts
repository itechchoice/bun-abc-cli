import { useAppDispatchContext, useAppStateContext } from "../state/context";
import { selectCanSubmit, selectErrorSummary } from "../state/selectors";

export function useAppState() {
  return useAppStateContext();
}

export function useAppDispatch() {
  return useAppDispatchContext();
}

export function useCanSubmit(): boolean {
  const state = useAppStateContext();
  return selectCanSubmit(state);
}

export function useErrorSummary(): string {
  const state = useAppStateContext();
  return selectErrorSummary(state);
}
