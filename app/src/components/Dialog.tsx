import { useEffect, useRef, type ReactNode, type MouseEvent } from "react";

// <dialog> modal nativo: se abre al montarse y avisa con onClose al cerrarse
// (botón, Escape o clic en el fondo oscuro).
export function Dialog({ id, className, onClose, children, onOpen, dismissable = true }: {
  id?: string;
  className: string;
  onClose: () => void;
  onOpen?: (dlg: HTMLDialogElement) => void;
  children: ReactNode;
  /** false: ni Escape ni el clic en el fondo lo cierran (solo sus botones). */
  dismissable?: boolean;
}) {
  const dismissRef = useRef(dismissable);
  dismissRef.current = dismissable;
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const dlg = ref.current!;
    if (!dlg.open) dlg.showModal();
    onOpen?.(dlg);
    const handler = () => closeRef.current();
    const onCancel = (e: Event) => { if (!dismissRef.current) e.preventDefault(); };
    dlg.addEventListener("close", handler);
    dlg.addEventListener("cancel", onCancel);
    return () => { dlg.removeEventListener("close", handler); dlg.removeEventListener("cancel", onCancel); };
  }, []); // solo al montar: onOpen y onClose se leen de la primera/última versión

  const onClick = (e: MouseEvent<HTMLDialogElement>) => {
    const dlg = ref.current!;
    if (e.target !== dlg || !dismissRef.current) return; // clic en el fondo oscuro (fuera de la caja)
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  };

  return <dialog ref={ref} id={id} className={className} onClick={onClick}>{children}</dialog>;
}
