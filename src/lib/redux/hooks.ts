import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { useCallback } from 'react';

/**
 * Toggle debug logs here. Defaults to true in development.
 * Set to `false` to disable logging entirely.
 */
const ENABLE_LOG = process.env.NODE_ENV === 'development';

/**
 * useAppDispatch
 * - returns a dispatch function (typed as AppDispatch)
 * - when ENABLE_LOG is true, it logs each dispatched action
 */
export const useAppDispatch = (): AppDispatch => {
  const dispatch = useDispatch<AppDispatch>();

  // memoize wrapper so its identity is stable across renders
  const debugDispatch = useCallback(
    (action: any) => {
      if (ENABLE_LOG) {
        try {
          // log small, useful info only
          console.debug('[redux][dispatch]', action && action.type ? action.type : action);
        } catch {
          console.debug('[redux][dispatch] (could not stringify action)');
        }
      }
      // forward to real dispatch
      return dispatch(action);
    },
    [dispatch]
  );

  // cast back to AppDispatch so call-sites keep correct typing
  return debugDispatch as unknown as AppDispatch;
};

/**
 * useAppSelector
 * - typed selector hook replacement
 * - logs the selector name (if available) and the returned value when ENABLE_LOG is true
 *
 * Usage: const value = useAppSelector(state => state.cart.totalQuantity)
 */
export function useAppSelector<TSelected>(selector: (state: RootState) => TSelected) {
  const selected = useSelector(selector as any) as TSelected;

  if (ENABLE_LOG) {
    try {
      const name = (selector as any).name || '<inline selector>';
      // Keep the log compact to avoid too much noise
      console.debug('[redux][selector]', name, selected);
    } catch {
      console.debug('[redux][selector] <error logging selector result>');
    }
  }

  return selected;
}
