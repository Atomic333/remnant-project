import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const GUEST_KEY = "markerquest_guest";
const EVENT = "markerquest:guest-changed";

function readGuest(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

export function enableGuestMode() {
  try {
    localStorage.setItem(GUEST_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function exitGuestMode() {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Guest browsing. A device-local flag that lets people explore the app without
 * an account. Cleared automatically once a real session exists.
 */
export function useGuest() {
  const { user } = useAuth();
  const [flag, setFlag] = useState(readGuest);

  useEffect(() => {
    const onChange = () => setFlag(readGuest());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  // A signed-in session always wins over guest mode.
  useEffect(() => {
    if (user && readGuest()) exitGuestMode();
  }, [user]);

  return {
    isGuest: !user && flag,
    enableGuest: useCallback(() => enableGuestMode(), []),
    exitGuest: useCallback(() => exitGuestMode(), []),
  };
}
