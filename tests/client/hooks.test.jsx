// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLatestRequest } from '../../src/hooks/useLatestRequest.js';
import { SAVE_DEBOUNCE_MS, usePlanner } from '../../src/hooks/usePlanner.js';
import { actions } from '../../src/state/actions.js';
import { STORAGE_KEY } from '../../src/state/plannerReducer.js';
import { plan } from './helpers.jsx';
import { validEvent } from '../fixtures.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

/** A promise plus its resolve/reject, for driving async state by hand. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useLatestRequest', () => {
  it('tracks busy state and returns the result', async () => {
    const { result } = renderHook(() => useLatestRequest());
    const d = deferred();
    let pending;
    act(() => {
      pending = result.current.run(() => d.promise);
    });
    expect(result.current.busy).toBe(true);
    await act(async () => d.resolve('done'));
    await expect(pending).resolves.toBe('done');
    expect(result.current).toMatchObject({ busy: false, error: '' });
  });

  it('exposes the error message and field errors', async () => {
    const { result } = renderHook(() => useLatestRequest());
    const failure = Object.assign(new Error('Nope'), { fields: { date: 'Bad date' } });
    await act(async () => {
      await result.current.run(() => Promise.reject(failure));
    });
    expect(result.current).toMatchObject({ busy: false, error: 'Nope', fields: { date: 'Bad date' } });
  });

  it('aborts the previous request when a new one starts and ignores its outcome', async () => {
    const { result } = renderHook(() => useLatestRequest());
    const signals = [];
    const first = deferred();
    act(() => {
      result.current.run((signal) => {
        signals.push(signal);
        return first.promise;
      });
    });
    await act(async () => {
      await result.current.run((signal) => {
        signals.push(signal);
        return Promise.resolve('second');
      });
    });
    expect(signals[0].aborted).toBe(true);
    await act(async () => first.reject(new Error('stale failure')));
    expect(result.current.error).toBe('');
  });

  it('cancels on request and on unmount', () => {
    const { result, unmount } = renderHook(() => useLatestRequest());
    const signals = [];
    act(() => {
      result.current.run((signal) => {
        signals.push(signal);
        return new Promise(() => {});
      });
    });
    act(() => result.current.cancel());
    expect(signals[0].aborted).toBe(true);
    expect(result.current.busy).toBe(false);
    act(() => {
      result.current.run((signal) => {
        signals.push(signal);
        return new Promise(() => {});
      });
    });
    unmount();
    expect(signals[1].aborted).toBe(true);
  });
});

describe('usePlanner', () => {
  it('saves after a short debounce and clears storage on reset', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePlanner());
    act(() => result.current[1](actions.planLoaded(validEvent, plan, 'gemini')));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    act(() => vi.advanceTimersByTime(SAVE_DEBOUNCE_MS));
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).event.name).toBe(validEvent.name);
    act(() => result.current[1](actions.reset()));
    act(() => vi.advanceTimersByTime(SAVE_DEBOUNCE_MS));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps working when storage is unavailable', () => {
    vi.useFakeTimers();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => usePlanner());
    expect(result.current[0].plan).toBeNull();
    act(() => result.current[1](actions.planLoaded(validEvent, plan, 'gemini')));
    expect(() => act(() => vi.advanceTimersByTime(SAVE_DEBOUNCE_MS))).not.toThrow();
    expect(result.current[0].plan).toBe(plan);
  });
});
