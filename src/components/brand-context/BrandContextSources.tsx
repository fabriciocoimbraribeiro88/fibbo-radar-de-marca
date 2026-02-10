import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Globe, FileText, Upload, Trash2, Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: string;
  onFillWithAI: () => void;
  isFillingAI: boolean;
}

export default function BrandContextSources({ projectId, onFillWithAI, isFillingAI }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");

  const { data: sources, isLoading } = useQuery({
    queryKey: ["brand-sources", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_context_sources")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addSource = useMutation({
    mutationFn: async ({ source_type, content, file_name }: { source_type: string; content: string; file_name?: string }) => {
      // Insert source record
      const { data: source, error: insertErr } = await supabase
        .from("brand_context_sources")
        .insert({ project_id: projectId, source_type, content, file_name })
        .select()
        .single();
      if (insertErr) throw insertErr;

      // Extract content via edge function
      const { error: fnErr } = await supabase.functions.invoke("extract-brand-source", {
        body: { source_id: source.id, source_type, content },
      });
      if (fnErr) throw fnErr;

      return source;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-sources", projectId] });
      toast.success("Fonte adicionada com sucesso");
      setDialogOpen(false);
      setUrlInput("");
      setTextInput("");
    },
    onError: (e) => {
      toast.error("Erro ao adicionar fonte: " + (e as Error).message);
    },
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brand_context_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-sources", projectId] });
      toast.success("Fonte removida");
    },
  });

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    addSource.mutate({ source_type: "url", content: urlInput.trim() });
  };

  const handleAddText = () => {
    if (!textInput.trim()) return;
    addSource.mutate({
      source_type: "text",
      content: textInput.trim(),
      file_name: "Texto colado",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${projectId}/${Date.now()}_${safeName}`;
    const { error: uploadErr } = await supabase.storage
      .from("brand-documents")
      .upload(filePath, file, { contentType: file.type });

    if (uploadErr) {
      toast.error("Erro ao enviar arquivo: " + uploadErr.message);
      return;
    }

    // For now, we store the file reference — text extraction can be done later
    addSource.mutate({
      source_type: "document",
      content: "",
      file_name: file.name,
    });
  };

  const statusIcon = (status: string) => {
    if (status === "processed") return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
    if (status === "error") return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  };

  const typeIcon = (type: string) => {
    if (type === "url") return <Globe className="h-4 w-4" />;
    if (type === "document") return <Upload className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const processedCount = sources?.filter((s) => s.status === "processed").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Fontes de Contexto</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione materiais que servirão de base para preencher o contexto da marca.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Adicionar Fonte
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Fonte de Contexto</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="url" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="url">URL</TabsTrigger>
                  <TabsTrigger value="text">Texto</TabsTrigger>
                  <TabsTrigger value="document">Documento</TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Cole o link do site, rede social ou blog</Label>
                    <Input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <Button onClick={handleAddUrl} disabled={!urlInput.trim() || addSource.isPending} className="w-full">
                    {addSource.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                    Adicionar URL
                  </Button>
                </TabsContent>
                <TabsContent value="text" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Cole texto de briefing, ata de reunião, etc.</Label>
                    <Textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Cole aqui o texto..."
                      rows={8}
                    />
                  </div>
                  <Button onClick={handleAddText} disabled={!textInput.trim() || addSource.isPending} className="w-full">
                    {addSource.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                    Adicionar Texto
                  </Button>
                </TabsContent>
                <TabsContent value="document" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Envie um documento (PDF, DOCX, etc.)</Label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md"
                      onChange={handleFileUpload}
                      disabled={addSource.isPending}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          <Button
            onClick={onFillWithAI}
            disabled={isFillingAI || processedCount === 0}
            className="gradient-coral text-white"
          >
            {isFillingAI ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Preencher com IA
          </Button>
        </div>
      </div>

      {/* Sources list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : !sources?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma fonte adicionada ainda. Adicione URLs, textos ou documentos para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <Card key={source.id} className="group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex items-center justify-center h-9 w-9 rounded-md bg-muted text-muted-foreground shrink-0">
                  {typeIcon(source.source_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {source.file_name || source.content?.slice(0, 60) || "Fonte sem nome"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {source.source_type}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {statusIcon(source.status)}
                      {source.status === "processed" ? "Processado" : source.status === "error" ? "Erro" : "Pendente"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteSource.mutate(source.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
