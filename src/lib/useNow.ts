import { useEffect, useState } from 'react';

/** Aktuelle Zeit, alle 15 Sekunden neu: für die Uhrzeit bei „heute“ und damit „heute“ um Mitternacht weiterwandert. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
