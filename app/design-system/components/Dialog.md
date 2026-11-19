# Dialog

Diálogo modal que pide confirmar una acción importante y explica su consecuencia antes de hacerla.

- Uso: `<dialog class="dlg">` con `h2` (la pregunta), `dlg-msg` (la consecuencia) y `dlg-actions` («Cancelar» y el botón que confirma).
- El título es una pregunta con el verbo de la acción: «¿Cerrar la votación?», «¿Abrir un desempate?».
- El botón que confirma repite el verbo. Si borra o anula algo, es `danger-solid`; si no, `primary`.
- Se cierra con Escape o «Cancelar», que equivale a no hacer nada.
