import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllMetaAdAccounts } from "@/hooks/useMetaAdAccounts";
import { useMetaAdInsights, type MetaInsightsData } from "@/hooks/useMetaAdInsights";
import { useProjects } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Megaphone,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  DollarSign,
  Eye,
  MousePointer,
  TrendingUp,
  Users,
} from "lucide-react";

import MetaAdsOverviewCard from "@/components/dashboard/MetaAdsOverviewCard";
import MetaAdsSpendChart from "@/components/dashboard/MetaAdsSpendChart";
import MetaAdsCampaignTable from "@/components/dashboard/MetaAdsCampaignTable";

type ConnectionStatus = "idle" | "ok" | "error";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

function fmtCurrency(n: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

export default function MetaAdsManager() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: accounts, isLoading: loadingAccounts } = useAllMetaAdAccounts();
  const { data: projects } = useProjects();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [metaUser, setMetaUser] = useState("");
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fetchingAccount, setFetchingAccount] = useState<string | null>(null);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  // ── Test connection ──
  const testConnection = async () => {
    setTesting(true);
    setConnectionStatus("idle");
    try {
      const { data, error } = await supabase.functions.invoke("test-meta-ads");
      if (error) throw error;
      if (data?.success) {
        setConnectionStatus("ok");
        setMetaUser(data.user?.name || "");
        toast({
          title: "Meta Ads conectado!",
          description: `${data.accounts?.length ?? 0} contas de anúncio encontradas`,
        });
      } else {
        setConnectionStatus("error");
        toast({
          title: "Erro Meta Ads",
          description: data?.error,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      setConnectionStatus("error");
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  // ── Sync accounts ──
  const syncAccounts = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-meta-ads", {
        body: { action: "sync-accounts" },
      });
      if (error) throw error;
      if (data?.success) {
        toast({
          title: "Contas sincronizadas!",
          description: `${data.accounts_synced} contas atualizadas`,
        });
        queryClient.invalidateQueries({ queryKey: ["meta-ad-accounts"] });
      } else {
        toast({
          title: "Erro na sincronização",
          description: data?.error,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // ── Assign account to project ──
  const assignAccount = async (metaAccountId: string, projectId: string | null) => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-meta-ads", {
        body: {
          action: "assign-account",
          meta_account_id: metaAccountId,
          project_id: projectId,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Conta vinculada ao projeto" });
        queryClient.invalidateQueries({ queryKey: ["meta-ad-accounts"] });
      } else {
        toast({
          title: "Erro",
          description: data?.error,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  // ── Fetch insights for one account ──
  const fetchInsights = async (metaAccountId: string, projectId: string | null) => {
    setFetchingAccount(metaAccountId);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-meta-ads", {
        body: {
          action: "fetch-insights",
          meta_account_id: metaAccountId,
          project_id: projectId,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast({
          title: "Dados importados!",
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ["meta-ad-insights"] });
        queryClient.invalidateQueries({ queryKey: ["meta-ad-accounts"] });
      } else {
        toast({
          title: "Erro na coleta",
          description: data?.error,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setFetchingAccount(null);
    }
  };

  // ── Group accounts by project ──
  const grouped = useMemo(() => {
    if (!accounts) return { assigned: new Map<string, any[]>(), unassigned: [] as any[] };
    const assigned = new Map<string, any[]>();
    const unassigned: any[] = [];

    for (const acc of accounts) {
      if (acc.project_id) {
        const list = assigned.get(acc.project_id) || [];
        list.push(acc);
        assigned.set(acc.project_id, list);
      } else {
        unassigned.push(acc);
      }
    }
    return { assigned, unassigned };
  }, [accounts]);

  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Meta Ads
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as contas de anúncio de todos os clientes da sua agência
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={testConnection} disabled={testing}>
            {testing ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : connectionStatus === "ok" ? (
              <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-500" />
            ) : connectionStatus === "error" ? (
              <XCircle className="mr-2 h-3.5 w-3.5 text-destructive" />
            ) : null}
            Testar Conexão
          </Button>
          <Button size="sm" onClick={syncAccounts} disabled={syncing}>
            {syncing ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
            )}
            Sincronizar Contas
          </Button>
        </div>
      </div>

      {/* Connection status */}
      {connectionStatus === "ok" && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Conectado como {metaUser}
              </p>
              <p className="text-xs text-muted-foreground">
                Token válido. {accounts?.length ?? 0} conta(s) no banco de dados.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Contas de Anúncio ({accounts?.length ?? 0})
            </h2>
            <p className="text-xs text-muted-foreground">
              Vincule cada conta ao projeto correspondente e busque os dados de performance
            </p>
          </div>

          {loadingAccounts ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !accounts?.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma conta encontrada. Clique em "Sincronizar Contas" para buscar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Última Sync</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc) => (
                  <AccountRow
                    key={acc.id}
                    account={acc}
                    projects={projects ?? []}
                    isExpanded={expandedAccount === acc.meta_account_id}
                    onToggleExpand={() =>
                      setExpandedAccount(
                        expandedAccount === acc.meta_account_id
                          ? null
                          : acc.meta_account_id
                      )
                    }
                    onAssign={(projectId) =>
                      assignAccount(acc.meta_account_id, projectId)
                    }
                    onFetch={() =>
                      fetchInsights(acc.meta_account_id, acc.project_id)
                    }
                    isFetching={fetchingAccount === acc.meta_account_id}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Per-project summary cards */}
      {grouped.assigned.size > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Resumo por Projeto
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from(grouped.assigned.entries()).map(([projId, accs]) => {
              const project = projects?.find((p: any) => p.id === projId);
              return (
                <ProjectSummaryCard
                  key={projId}
                  projectId={projId}
                  projectName={project?.name ?? "Projeto desconhecido"}
                  accounts={accs}
                  onNavigate={() => navigate(`/projects/${projId}/dashboard`)}
                />
              );
            })}
          </div>

          {grouped.unassigned.length > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-50/5">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-yellow-600">
                  {grouped.unassigned.length} conta(s) sem projeto vinculado
                </p>
                <p className="text-xs text-muted-foreground">
                  Vincule essas contas a um projeto na tabela acima para começar a coletar dados.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Expanded account detail */}
      {expandedAccount && (
        <AccountDetailPanel metaAccountId={expandedAccount} />
      )}
    </div>
  );
}

// ── Account Row Component ──
function AccountRow({
  account,
  projects,
  isExpanded,
  onToggleExpand,
  onAssign,
  onFetch,
  isFetching,
}: {
  account: any;
  projects: any[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAssign: (projectId: string | null) => void;
  onFetch: () => void;
  isFetching: boolean;
}) {
  const isActive = account.account_status === 1;

  return (
    <TableRow className={!account.project_id ? "bg-yellow-50/5" : ""}>
      <TableCell>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleExpand}>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
      </TableCell>
      <TableCell className="font-medium text-sm">
        {account.account_name || "Sem nome"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {account.business_name || "–"}
      </TableCell>
      <TableCell className="text-xs font-mono text-muted-foreground">
        {account.meta_account_id}
      </TableCell>
      <TableCell>
        <Badge
          variant={isActive ? "secondary" : "destructive"}
          className="text-[10px]"
        >
          {isActive ? "Ativo" : "Inativo"}
        </Badge>
      </TableCell>
      <TableCell>
        <Select
          value={account.project_id || "__none__"}
          onValueChange={(v) => onAssign(v === "__none__" ? null : v)}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Vincular..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Nenhum</SelectItem>
            {projects.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {account.last_synced_at
          ? new Date(account.last_synced_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Nunca"}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={onFetch}
          disabled={isFetching}
          className="text-xs"
        >
          {isFetching ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3 w-3" />
          )}
          Buscar Dados
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ── Project Summary Card ──
function ProjectSummaryCard({
  projectId,
  projectName,
  accounts,
  onNavigate,
}: {
  projectId: string;
  projectName: string;
  accounts: any[];
  onNavigate: () => void;
}) {
  const lastSync = accounts
    .filter((a) => a.last_synced_at)
    .sort(
      (a, b) =>
        new Date(b.last_synced_at).getTime() -
        new Date(a.last_synced_at).getTime()
    )[0]?.last_synced_at;

  return (
    <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={onNavigate}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-foreground">{projectName}</h3>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{accounts.length} conta(s)</span>
          {lastSync && (
            <span>
              Sync:{" "}
              {new Date(lastSync).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Account Detail Panel (expanded view with insights) ──
function AccountDetailPanel({ metaAccountId }: { metaAccountId: string }) {
  const { data: insights, isLoading } = useMetaAdInsights(undefined, metaAccountId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!insights?.totals) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Nenhum dado de performance disponível para esta conta.
          Clique em "Buscar Dados" para importar.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Performance — {metaAccountId}
          </h3>
          <MetaAdsOverviewCard totals={insights.totals} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MetaAdsSpendChart daily={insights.daily} currency={insights.totals.currency} />
        <MetaAdsCampaignTable campaigns={insights.campaigns} currency={insights.totals.currency} />
      </div>
    </div>
  );
}
