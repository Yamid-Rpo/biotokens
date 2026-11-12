import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SECTOR_FIELDS, type SectorField } from "@/lib/sector-fields";
import { updateProjectInfo } from "@/lib/projects.functions";
import type { Sector } from "@/lib/sectors";

type Info = Record<string, string>;

export function SectorInfoCards({ projectId, sector, details, current, canEdit }: {
  projectId: string; sector: Sector; details: Info; current: Info; canEdit: boolean;
}) {
  const set = SECTOR_FIELDS[sector];
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState<Info>(details);
  const [c, setC] = useState<Info>(current);
  const [saving, setSaving] = useState(false);
  const save = useServerFn(updateProjectInfo);
  const qc = useQueryClient();

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await save({ data: { id: projectId, details: d, current_info: c } });
      await qc.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Información del proyecto actualizada");
      setEditing(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setSaving(false); }
  }

  const block = (title: string, fields: SectorField[], v: Info, setV: (x: Info) => void, prefix: string) => (
    <Card className="p-5">
      <h2 className="font-semibold">{title}</h2>
      <dl className="mt-3 grid sm:grid-cols-2 gap-3">
        {fields.map((fd) => (
          <div key={fd.key}>
            {editing ? (
              <>
                <Label htmlFor={`${prefix}-${fd.key}`} className="text-xs">{fd.label}</Label>
                <Input id={`${prefix}-${fd.key}`} className="mt-1" maxLength={500} placeholder={fd.hint}
                  value={v[fd.key] ?? ""} onChange={(e) => setV({ ...v, [fd.key]: e.target.value })} />
              </>
            ) : (
              <>
                <dt className="text-xs text-muted-foreground">{fd.label}{fd.hint ? ` (${fd.hint})` : ""}</dt>
                <dd className="text-sm font-medium mt-0.5">{v[fd.key]?.trim() || "—"}</dd>
              </>
            )}
          </div>
        ))}
      </dl>
    </Card>
  );

  return (
    <form onSubmit={onSave} className="mt-6 grid gap-4">
      {block("Información del proyecto", set.project, d, setD, "d")}
      {block("Información actual", set.current, c, setC, "c")}
      {canEdit && (
        <div className="flex gap-2 justify-end">
          {editing ? (
            <>
              <Button type="button" variant="outline" onClick={() => { setD(details); setC(current); setEditing(false); }}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar información"}</Button>
            </>
          ) : (
            <Button type="button" onClick={() => setEditing(true)}>Editar información</Button>
          )}
        </div>
      )}
    </form>
  );
}
