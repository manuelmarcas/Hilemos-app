# Badge

Etiqueta de una o dos palabras que dice el estado de una votación o de un resultado.

- `badge--mine`: «Tuya» y «Admin». `badge--anon`: «Anónima». `badge--gone`: «Eliminada». `badge--closing` (ámbar): «Se cierra en N días».
- Cerrada ya no es una etiqueta: en «Mis votaciones» es un candado rojo (`poll-card__closed`, icono `lock`).
- `mode-pill`: sobre el título de la votación, solo lo que cambia cómo se vota: «Anónima», «Solo invitados», «Con
  aprobación», el plazo o la cuenta atrás. «Votos visibles» es lo normal y no se dice (está en ⓘ).
- `tb-state` y `tb-badge` (ámbar): estado del desempate y la marca «Ganó el desempate» en el ranking.
- No son botones: si se puede pulsar, usa Chip.
