const SCRIPT_ID = "vireon-google-maps-js";
const GLOBAL_LOAD_PROMISE_KEY = "__vireonGoogleMapsLoadPromise";
const GLOBAL_INIT_CALLBACK = "__vireonGoogleMapsInit";

type VireonMapsWindow = Window & {
  [GLOBAL_LOAD_PROMISE_KEY]?: Promise<void>;
  [GLOBAL_INIT_CALLBACK]?: () => void;
};

function getMapsApiKey(): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new Error("missing_key");
  }
  return key;
}

/** True when Maps JS API (Map + Geocoder) is ready on window.google. */
export function isGoogleMapsReady(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      window.google?.maps?.Map &&
      window.google?.maps?.Geocoder
  );
}

function waitForMapsReady(): Promise<void> {
  if (isGoogleMapsReady()) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (isGoogleMapsReady()) {
        resolve();
        return;
      }
      if (Date.now() - start > 15000) {
        reject(new Error("timeout"));
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

function findExistingMapsScript(): HTMLScriptElement | null {
  const byId = document.getElementById(SCRIPT_ID);
  if (byId instanceof HTMLScriptElement) {
    return byId;
  }
  return document.querySelector<HTMLScriptElement>(
    'script[src*="maps.googleapis.com/maps/api/js"]'
  );
}

function injectMapsScript(key: string): Promise<void> {
  if (findExistingMapsScript()) {
    return waitForMapsReady();
  }

  return new Promise((resolve, reject) => {
    const win = window as VireonMapsWindow;

    win[GLOBAL_INIT_CALLBACK] = () => {
      delete win[GLOBAL_INIT_CALLBACK];
      waitForMapsReady().then(resolve).catch(reject);
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${GLOBAL_INIT_CALLBACK}`;
    script.onerror = () => {
      delete win[GLOBAL_INIT_CALLBACK];
      delete win[GLOBAL_LOAD_PROMISE_KEY];
      reject(new Error("load_failed"));
    };
    document.head.appendChild(script);
  });
}

function createLoadPromise(): Promise<void> {
  if (isGoogleMapsReady()) {
    return Promise.resolve();
  }

  const key = getMapsApiKey();
  const existingScript = findExistingMapsScript();
  if (existingScript) {
    return waitForMapsReady();
  }

  return injectMapsScript(key);
}

/**
 * Loads the Google Maps JS API exactly once per page lifetime.
 * Uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as the only key source.
 */
export function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("ssr"));
  }

  if (isGoogleMapsReady()) {
    return Promise.resolve();
  }

  const win = window as VireonMapsWindow;
  const existing = win[GLOBAL_LOAD_PROMISE_KEY];
  if (existing) {
    return existing;
  }

  const promise = createLoadPromise().catch((err) => {
    delete win[GLOBAL_LOAD_PROMISE_KEY];
    throw err;
  });

  win[GLOBAL_LOAD_PROMISE_KEY] = promise;
  return promise;
}
