import { useCallback, useEffect, useRef, useState } from 'react';

/** @typedef {{ busy: boolean, error: string, fields: Record<string, string> }} RequestState */

/** @type {RequestState} */
const IDLE = Object.freeze({ busy: false, error: '', fields: {} });

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
  const [state, setState] = useState(IDLE);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(IDLE);
  }, []);

  const run = useCallback(async (/** @type {(signal: AbortSignal) => Promise<any>} */ request) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ busy: true, error: '', fields: {} });
    try {
      const result = await request(controller.signal);
      if (!controller.signal.aborted) setState(IDLE);
      return result;
    } catch (err) {
      if (controller.signal.aborted) return undefined;
      const { message, fields } = /** @type {{ message?: string, fields?: Record<string, string> }} */ (err ?? {});
      setState({ busy: false, error: message ?? '', fields: fields ?? {} });
      return undefined;
    }
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return { ...state, run, cancel };
}
