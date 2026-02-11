import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUSES = [
  { value: "idea", label: "📝 Ideia" },
  { value: "briefed", label: "📋 Briefado" },
  { value: "in_production", label: "🎨 Em Produção" },
  { value: "review", label: "👀 Revisão" },
  { value: "approved", label: "✅ Aprovado" },
  { value: "published", label: "📤 Publicado" },
];

interface Props {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: any) => Promise<void>;
  onStatusChange: (status: string) => Promise<void>;
}

export default function PlanningItemDialog({ item, open, onOpenChange, onSave, onStatusChange }: Props) {
  const md = (item.metadata as any) ?? {};
  const [form, setForm] = useState({
    title: item.title ?? "",
    description: item.description ?? "",
    scheduled_date: item.scheduled_date ?? "",
    scheduled_time: item.scheduled_time ?? "",
    content_type: item.content_type ?? "",
    format: item.format ?? "",
    copy_text: item.copy_text ?? "",
    theme: item.theme ?? "",
    target_audience: item.target_audience ?? "",
    visual_brief: item.visual_brief ?? "",
    hashtags: item.hashtags?.join(", ") ?? "",
    status: item.status ?? "idea",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title: form.title,
        description: form.description || null,
        scheduled_date: form.scheduled_date || null,
        scheduled_time: form.scheduled_time || null,
        content_type: form.content_type || null,
        format: form.format || null,
        copy_text: form.copy_text || null,
        theme: form.theme || null,
        target_audience: form.target_audience || null,
        visual_brief: form.visual_brief || null,
        hashtags: form.hashtags ? form.hashtags.split(",").map((h: string) => h.trim()) : null,
        status: form.status,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Título</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Data</Label>
              <Input type="date" value={form.scheduled_date} onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Horário</Label>
              <Input type="time" value={form.scheduled_time} onChange={(e) => setForm((f) => ({ ...f, scheduled_time: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Pilar</Label>
              <Input value={form.content_type} onChange={(e) => setForm((f) => ({ ...f, content_type: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Formato</Label>
              <Input value={form.format} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Conceito / Descrição</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Caption / Copy</Label>
            <Textarea rows={3} value={form.copy_text} onChange={(e) => setForm((f) => ({ ...f, copy_text: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">CTA</Label>
            <Input value={form.theme} onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Hashtags</Label>
            <Input value={form.hashtags} onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Público-alvo</Label>
            <Input value={form.target_audience} onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Brief Visual</Label>
            <Textarea rows={2} value={form.visual_brief} onChange={(e) => setForm((f) => ({ ...f, visual_brief: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
