// Editar una votación (#/v/<id>/editar): carga la votación y sus votos y abre «Nueva votación» en modo edición.
// Solo para quien la administra. Los votos se siguen en directo: lo que alguien vote mientras se edita tampoco se
// puede quitar.
import { useEffect, useState } from "react";
import { isAdmin } from "../../lib/model";
import type { Poll, Votes } from "../../lib/types";
import { errMsg } from "../../lib/util";
import { useSession } from "../../state/session";
import { Icon } from "../../components/Icon";
import { Create } from "../Create";
import { Loading } from "../../components/Loading";

export function EditPoll({ id }: { id: string }) {
  const { store, user } = useSession();
  const [poll, setPoll] = useState<Poll | null | undefined>(undefined);
  const [votes, setVotes] = useState<Votes | null>(null);
  const [error, setError] = useState("");
  const admin = !!poll && isAdmin(poll, user.uid);

  useEffect(() => store.watchPoll(id, setPoll, e => setError(errMsg(e))), [store, id]);
  useEffect(() => {
    if (!admin) return;
    return store.watchVotes(id, setVotes, e => setError(errMsg(e)));
  }, [store, id, admin]);

  const back = <p><a href={`#/v/${id}`}><Icon name="back" /> Volver a la votación</a></p>;
  if (error) return <><div className="empty-box empty-box--error">{error}</div>{back}</>;
  if (poll === undefined || (admin && !votes)) return <Loading>Cargando votación…</Loading>;
  if (!poll) {
    return <><div className="empty-box">Esta votación no existe o ha sido eliminada.</div><p><a href="#/"><Icon name="back" /> Volver a mis votaciones</a></p></>;
  }
  if (!admin) return <><div className="empty-box">Solo quien administra la votación puede editarla.</div>{back}</>;
  return <Create key={id} edit={{ id, poll, votes: votes! }} />;
}
