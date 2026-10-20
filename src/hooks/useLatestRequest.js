import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs async requests where only the latest one matters. Starting a new request
 * aborts the previous one, unmounting aborts the current one, and aborted
 * requests never update state. Tracks `busy` and a user-facing `error`.
 *
 * @returns {{
 *   busy: boolean,
 *   error: string,
 *   fields: Record<string, string>,
 *   run: <T>(request: (signal: AbortSignal) => Promise<T>) => Promise<T | undefined>,
 *   cancel: () => void,
 * }}
 */
export function useLatestRequest() {
  const controllerRef = useRef(/** @type {AbortController | null} */ (null));
  const [state, setState] = useState({ busy: false, error: '', fields: {} });

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState({ busy: false, error: '', fields: {} });
  }, []);

  const run = useCallback(async (request) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ busy: true, error: '', fields: {} });
    try {
      const result = await request(controller.signal);
      if (!controller.signal.aborted) setState({ busy: false, error: '', fields: {} });
      return result;
    } catch (err) {
      if (controller.signal.aborted) return undefined;
      setState({ busy: false, error: err.message, fields: err.fields ?? {} });
      return undefined;
    }
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return { ...state, run, cancel };
}
