import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  usePlatformConnections,
  type PlatformType,
  type ConnectionStatus,
} from "@/hooks/usePlatformConnections";
import {
  Loader2,
  RefreshCw,
  Link2,
  Megaphone,
  Globe,
  Search,
  BarChart3,
  TrendingUp,
  Monitor,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlatformDef {
  platform: PlatformType;
  label: string;
  description: string;
  icon: typeof Megaphone;
  channel: "ads" | "seo";
}

const PLATFORMS: PlatformDef[] = [
  { platform: "meta_ads", label: "Meta Ads", description: "Campanhas Facebook & Instagram Ads", icon: Megaphone, channel: "ads" },
  { platform: "google_ads", label: "Google Ads", description: "Campanhas Google Search & Display", icon: Monitor, channel: "ads" },
  { platform: "tiktok_ads", label: "TikTok Ads", description: "Campanhas TikTok Ads", icon: TrendingUp, channel: "ads" },
  { platform: "ga4", label: "Google Analytics", description: "Tráfego orgânico, sessões, bounce rate", icon: BarChart3, channel: "seo" },
  { platform: "search_console", label: "Search Console", description: "Keywords, posições, CTR, impressões", icon: Search, channel: "seo" },
  { platform: "semrush", label: "SEMrush", description: "Domain authority, backlinks, keywords", icon: Globe, channel: "seo" },
];

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; dotClass: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  disconnected: { label: "Desconectado", dotClass: "bg-muted-foreground", badgeVariant: "outline" },
  connected: { label: "Conectado", dotClass: "bg-emerald-500", badgeVariant: "default" },
  error: { label: "Erro", dotClass: "bg-destructive", badgeVariant: "destructive" },
};

function PlatformCard({
  def,
  status,
  lastSync,
  isSyncing,
  onConnect,
  onSync,
}: {
  def: PlatformDef;
  status: ConnectionStatus;
  lastSync: string | null;
  isSyncing: boolean;
  onConnect: () => void;
  onSync: () => void;
}) {
  const Icon = def.icon;
  const cfg = STATUS_CONFIG[status];

  return (
    <Card className="p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="rounded-lg bg-primary/10 p-2 shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{def.label}</span>
            <div className="flex items-center gap-1">
              <div className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
              <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{def.description}</p>
          {lastSync && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Último sync: {formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {status === "connected" ? (
          <Button variant="outline" size="sm" onClick={onSync} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="ml-1.5 hidden sm:inline">Sync</span>
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onConnect}>
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            Conectar
          </Button>
        )}
      </div>
    </Card>
  );
}

interface PlatformIntegrationsProps {
  projectId: string;
  activeChannels: string[];
}

export default function PlatformIntegrations({ projectId, activeChannels }: PlatformIntegrationsProps) {
  const { connections, getConnection, upsertConnection, syncPlatform } = usePlatformConnections(projectId);

  const hasAds = activeChannels.includes("ads");
  const hasSeo = activeChannels.includes("seo");

  if (!hasAds && !hasSeo) return null;

  const adsPlatforms = PLATFORMS.filter((p) => p.channel === "ads" && hasAds);
  const seoPlatforms = PLATFORMS.filter((p) => p.channel === "seo" && hasSeo);

  const handleConnect = (platform: PlatformType) => {
    // Placeholder: in the future this will open OAuth flow or API key dialog
    upsertConnection.mutate({ platform, status: "disconnected" });
  };

  const handleSync = (platform: PlatformType) => {
    syncPlatform.mutate(platform);
  };

  return (
    <Card className="p-5 mb-8">
      <h3 className="text-sm font-semibold mb-1">Integrações de API</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Conecte suas plataformas de Ads e SEO para importar dados automaticamente.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adsPlatforms.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ads</span>
            </div>
            <div className="space-y-2">
              {adsPlatforms.map((def) => {
                const conn = getConnection(def.platform);
                return (
                  <PlatformCard
                    key={def.platform}
                    def={def}
                    status={(conn?.status as ConnectionStatus) ?? "disconnected"}
                    lastSync={conn?.last_sync_at ?? null}
                    isSyncing={syncPlatform.isPending && syncPlatform.variables === def.platform}
                    onConnect={() => handleConnect(def.platform)}
                    onSync={() => handleSync(def.platform)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {seoPlatforms.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SEO</span>
            </div>
            <div className="space-y-2">
              {seoPlatforms.map((def) => {
                const conn = getConnection(def.platform);
                return (
                  <PlatformCard
                    key={def.platform}
                    def={def}
                    status={(conn?.status as ConnectionStatus) ?? "disconnected"}
                    lastSync={conn?.last_sync_at ?? null}
                    isSyncing={syncPlatform.isPending && syncPlatform.variables === def.platform}
                    onConnect={() => handleConnect(def.platform)}
                    onSync={() => handleSync(def.platform)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
