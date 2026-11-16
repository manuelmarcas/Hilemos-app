import type { Group } from "../lib/types";
import { sortedGroups } from "../lib/util";

// Desplegable para elegir grupo ("" = sin grupo). `extra` añade opciones al final.
export function GroupSelect({ groups, value, onChange, className, id, extra }: {
  groups: Record<string, Group> | null | undefined;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  id?: string;
  extra?: { value: string; label: string }[];
}) {
  return (
    <select id={id} className={className} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Sin grupo</option>
      {sortedGroups(groups).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      {extra?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
