import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CollectDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allKeyResults: any[];
  brandEntityId?: string;
  quarter: string;
  year: number;
  onSaved: () => void;
}

export function CollectDataDialog({
  open,
  onOpenChange,
  allKeyResults,
  brandEntityId,
  quarter,
  year,
  onSaved,
}: CollectDataDialogProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"manual" | "auto" | null>(null);
  const [values, setValues] = useState<Record<string, { value: string; notes: string; suggested?: boolean }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [measurementDate, setMeasurementDate] = useState(new Date().toISOString().split("T")[0]);

  const initValues = () => {
    const init: Record<string, { value: string; notes: string }> = {};
    allKeyResults.forEach(kr => {
      init[kr.id] = { value: "", notes: "" };
    });
    setValues(init);
  };

  const handleManual = () => {
    setMode("manual");
    initValues();
  };

  const handleAutoCollect = async () => {
    setMode("auto");
    setLoading(true);
    initValues();

    try {
      const quarterMonths: Record<string, [number, number]> = {
        Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11],
      };
      const [sm, em] = quarterMonths[quarter] ?? [0, 2];
      const qStart = new Date(year, sm, 1).toISOString();
      const qEnd = new Date(year, em + 1, 0).toISOString();

      // Fetch latest profile
      let followers: number | null = null;
      if (brandEntityId) {
        const { data: profile } = await supabase
          .from("instagram_profiles")
          .select("followers_count")
          .eq("entity_id", brandEntityId)
          .order("snapshot_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        followers = profile?.followers_count ?? null;
      }

      // Fetch posts for period
      let avgLikes: number | null = null;
      let avgEngagement: number | null = null;
      let engagementRate: number | null = null;
      let postsCount: number | null = null;
      if (brandEntityId) {
        const { data: posts } = await supabase
          .from("instagram_posts")
          .select("likes_count, comments_count, engagement_total")
          .eq("entity_id", brandEntityId)
          .gte("posted_at", qStart)
          .lte("posted_at", qEnd);

        if (posts?.length) {
          postsCount = posts.length;
          avgLikes = Math.round(posts.reduce((s, p) => s + (p.likes_count ?? 0), 0) / posts.length);
          avgEngagement = Math.round(posts.reduce((s, p) => s + (p.engagement_total ?? (p.likes_count ?? 0) + (p.comments_count ?? 0)), 0) / posts.length);
          if (followers && followers > 0) {
            engagementRate = Number(((avgEngagement / followers) * 100).toFixed(2));
          }
        }
      }

      // Map to KRs
      const newValues: Record<string, { value: string; notes: string; suggested?: boolean }> = {};
      allKeyResults.forEach(kr => {
        let suggested: number | null = null;
        const ds = kr.data_source || "";
        const mt = kr.metric_type || "";
        const unit = (kr.unit || "").toLowerCase();

        if (ds === "instagram" || mt === "followers" || unit.includes("seguidor")) {
          if (followers !== null) suggested = followers;
        }
        if (mt === "engagement" || unit === "%") {
          if (engagementRate !== null) suggested = engagementRate;
        }
        if (unit.includes("like")) {
          if (avgLikes !== null) suggested = avgLikes;
        }
        if (unit.includes("post")) {
          if (postsCount !== null) suggested = postsCount;
        }

        newValues[kr.id] = {
          value: suggested !== null ? String(suggested) : "",
          notes: "",
          suggested: suggested !== null,
        };
      });

      setValues(newValues);
    } catch (err: any) {
      toast({ title: "Erro ao coletar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const inserts: any[] = [];
      const updates: { id: string; value: number }[] = [];

      for (const kr of allKeyResults) {
        const v = values[kr.id];
        if (!v?.value) continue;
        const numVal = Number(v.value);
        if (isNaN(numVal)) continue;

        inserts.push({
          key_result_id: kr.id,
          value: numVal,
          measured_at: measurementDate,
          source: mode === "auto" ? "automatic" : "manual",
          notes: v.notes || null,
        });
        updates.push({ id: kr.id, value: numVal });
      }

      if (inserts.length > 0) {
        const { error: insertErr } = await supabase.from("okr_measurements").insert(inserts);
        if (insertErr) throw insertErr;

        for (const u of updates) {
          await supabase.from("okr_key_results").update({ current_value: u.value }).eq("id", u.id);
        }
      }

      toast({ title: `${inserts.length} medições salvas!` });
      onSaved();
      onOpenChange(false);
      setMode(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setMode(null); }}>
      <DialogContent className="bg-card sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Coletar Dados dos KRs</DialogTitle>
        </DialogHeader>

        {!mode && (
          <div className="flex gap-3 py-6">
            <Button variant="outline" className="flex-1 h-20 flex-col gap-2" onClick={handleManual}>
              <PenLine className="h-5 w-5" />
              <span className="text-sm">Manual</span>
            </Button>
            <Button variant="outline" className="flex-1 h-20 flex-col gap-2" onClick={handleAutoCollect}>
              <Bot className="h-5 w-5" />
              <span className="text-sm">Coleta Automática</span>
            </Button>
          </div>
        )}

        {mode && loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Buscando dados...</span>
          </div>
        )}

        {mode && !loading && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Data da medição</Label>
              <Input type="date" value={measurementDate} onChange={(e) => setMeasurementDate(e.target.value)} className="h-9" />
            </div>

            {allKeyResults.map(kr => {
              const v = values[kr.id] ?? { value: "", notes: "" };
              return (
                <div key={kr.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{kr.title}</p>
                    {v.suggested && <Badge variant="secondary" className="text-[10px]">🤖 Sugerido</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Valor atual</Label>
                      <Input
                        type="number"
                        className="h-8 text-sm"
                        value={v.value}
                        onChange={(e) => setValues(prev => ({ ...prev, [kr.id]: { ...prev[kr.id], value: e.target.value } }))}
                        placeholder="—"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Notas</Label>
                      <Input
                        className="h-8 text-sm"
                        value={v.notes}
                        onChange={(e) => setValues(prev => ({ ...prev, [kr.id]: { ...prev[kr.id], notes: e.target.value } }))}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {mode && !loading && (
          <DialogFooter>
            <Button variant="outline" onClick={() => { onOpenChange(false); setMode(null); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Medições
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
