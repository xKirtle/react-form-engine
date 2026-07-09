/**
 * Tracks which field names an explicit `Form.Field` has claimed, so
 * `AutoFields` skips them. Claims are counted (the same name can be
 * claimed by nested/repeated mounts) and released on unmount.
 */
export interface ClaimRegistry {
  claim(name: string): () => void;
  isClaimed(name: string): boolean;
  version(): number;
  subscribe(listener: () => void): () => void;
}

export function createClaimRegistry(): ClaimRegistry {
  const counts = new Map<string, number>();
  const listeners = new Set<() => void>();
  let version = 0;

  function notify(): void {
    version += 1;
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    claim(name) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
      notify();
      return () => {
        const count = counts.get(name) ?? 0;
        if (count <= 1) {
          counts.delete(name);
        } else {
          counts.set(name, count - 1);
        }
        notify();
      };
    },
    isClaimed: (name) => counts.has(name),
    version: () => version,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
