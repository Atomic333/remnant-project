import { useCallback, useEffect, useState } from "react";
import { DEFAULT_CITY_ID, getCity, type City } from "@/data/cities";

const STORAGE_KEY = "markerquest_city";
const EVENT = "markerquest:city-changed";

function read(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_CITY_ID;
  } catch {
    return DEFAULT_CITY_ID;
  }
}

/** The city the user is currently exploring, persisted per device. */
export function useSelectedCity(): { city: City; cityId: string; setCityId: (id: string) => void } {
  const [cityId, setId] = useState<string>(read);

  useEffect(() => {
    const onChange = () => setId(read());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const setCityId = useCallback((id: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    setId(id);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { city: getCity(cityId), cityId: getCity(cityId).id, setCityId };
}
