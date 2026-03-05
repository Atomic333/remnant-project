import { useState, useEffect } from "react";

const STORAGE_KEY = "markerquest_visited";

function loadVisited(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveVisited(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function useVisited() {
  const [visited, setVisited] = useState<Set<string>>(loadVisited);

  useEffect(() => {
    saveVisited(visited);
  }, [visited]);

  const toggle = (id: string) => {
    setVisited((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isVisited = (id: string) => visited.has(id);

  return { visited, toggle, isVisited };
}
