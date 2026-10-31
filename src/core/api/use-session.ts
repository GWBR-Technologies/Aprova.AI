import { useSyncExternalStore } from 'react';

import { session } from './http';
import type { SessionState } from './session';

export function useSessionState(): SessionState {
  return useSyncExternalStore(session.subscribe, session.getState, session.getState);
}
