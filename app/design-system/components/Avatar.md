# Avatar

Círculo con la foto de perfil o, si no hay, la inicial sobre un tono que sale del nombre.

- Uso: `<img class="av" style="--s:30px">` con foto; `<span class="av av-initial" style="--s:30px;--h:<tono>">` con inicial. `--h` (0–359) se calcula a partir del nombre, así que cada persona conserva su color.
- Tamaños habituales: 22px en listas de votantes y desempate, 30px en la barra superior y en participantes, 96px en el perfil.
- En grupo (`av-stack`) se solapan 7px con un aro de 2px en `card`; a partir de 4, el resto va como `av-more` («+3»).
- La foto se guarda recortada a 128×128. Sin foto, nunca un icono genérico: siempre la inicial.
