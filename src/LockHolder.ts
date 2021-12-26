export class LockHolder {
  private lockResolve = new Map<string, (value: boolean) => void>();
  private requesting = new Set<string>();

  getLockAndHold(name: string, options: LockManagerRequestOptions = {}) {
    if (this.requesting.has(name)) {
      console.error('Current instance is requesting the lock');
      return;
    }
    if (this.lockResolve.has(name)) {
      console.error('Current instance is holding a lock');
      return;
    }
    if (!navigator.locks) {
      console.error('Your browser does not support Web Locks API');
      return;
    }
    let lockResolve: (value: boolean) => void;
    const p = new Promise<boolean>((resolve) => {
      lockResolve = resolve;
    });

    let grantedResolve: (value: Lock) => void;
    let grantedReject: (value: null | DOMException) => void;
    const granted = new Promise<Lock>((resolve, reject) => {
      grantedResolve = resolve;
      grantedReject = reject;
    });
    let errResolve: (value: DOMException) => void;
    const error = new Promise<DOMException | null>((resolve) => {
      errResolve = resolve;
    });

    this.requesting.add(name);

    navigator.locks
      .request(name, options, (lock) => {
        this.requesting.delete(name);
        if (options?.ifAvailable) {
          if (lock === null) {
            errResolve(lock);
            // The lock was not granted - get out fast.
            return Promise.resolve();
          }
        }
        this.lockResolve.set(name, lockResolve);
        grantedResolve(lock);

        return p;
      })
      .catch((ex) => {
        this.requesting.delete(name);
        if (ex instanceof DOMException && ex.name === 'AbortError') {
          // lock got stolen or aborted
          errResolve(ex);
        }
      })
      .finally(() => {
        this.lockResolve.delete(name);
      });

    return {
      success: granted,
      error,
    };
  }

  releaseLock(name: string) {
    if (this.lockResolve.has(name)) {
      this.lockResolve.get(name)!(true);
    }
  }
}
