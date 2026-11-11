import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Cpu } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listDevices, revokeDevice } from "@/lib/iot.functions";

type Device = { id: string; name: string; device_type: string; status: string | null; last_seen_at: string | null; created_at: string };

export function RegisteredDevices({ projectId }: { projectId: string }) {
  const fetchDevices = useServerFn(listDevices);
  const remove = useServerFn(revokeDevice);
  const qc = useQueryClient();
  const [target, setTarget] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["iot-devices", projectId],
    queryFn: () => fetchDevices({ data: { project_id: projectId } }),
  });
  const devices = (data?.devices ?? []) as Device[];

  async function confirmDelete() {
    if (!target) return;
    setDeleting(true);
    try {
      await remove({ data: { device_id: target.id } });
      toast.success("Dispositivo eliminado");
      qc.invalidateQueries({ queryKey: ["iot-devices", projectId] });
      setTarget(null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setDeleting(false); }
  }

  const online = (d: Device) => !!d.last_seen_at && Date.now() - new Date(d.last_seen_at).getTime() < 5 * 60_000;

  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2"><Cpu className="h-5 w-5" /> Dispositivos registrados ({devices.length})</h2>
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : devices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay dispositivos registrados. Usa «Instalar firmware y registrar placa».</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {devices.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{d.name}</p>
                <p className="font-mono text-xs text-muted-foreground truncate">{d.id}</p>
                <p className="text-xs text-muted-foreground">Registrado: {new Date(d.created_at).toLocaleString()} · Última lectura: {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : "nunca"}</p>
              </div>
              <Badge variant={online(d) ? "default" : "secondary"}>{online(d) ? "En línea" : "Fuera de línea"}</Badge>
              <Button size="sm" variant="destructive" onClick={() => setTarget(d)} aria-label={`Eliminar ${d.name}`}><Trash2 className="h-4 w-4 mr-1" />Eliminar</Button>
            </li>
          ))}
        </ul>
      )}
      <AlertDialog open={!!target} onOpenChange={(o) => !o && !deleting && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este dispositivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{target?.name}». Su clave API dejará de funcionar y la placa ya no podrá enviar lecturas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={(e) => { e.preventDefault(); confirmDelete(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Eliminando…" : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
