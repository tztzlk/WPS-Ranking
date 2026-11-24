import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

// One request per page load, shared by every component that shows the date.
let request: Promise<string | null> | null = null;

function loadDataDate(): Promise<string | null> {
  request ??= apiService.getAbout().then(
    (about) => about.generatedAt ?? null,
    () => {
      request = null;
      return null;
    },
  );
  return request;
}

/** Date (ISO) of the WCA export the current data is built from; format it with useFormat().date. */
export function useDataDate(): string | null {
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    loadDataDate().then((d) => active && setDate(d));
    return () => {
      active = false;
    };
  }, []);
  return date;
}
