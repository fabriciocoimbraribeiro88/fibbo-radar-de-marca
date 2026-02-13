import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function fmtCurrency(n: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_AWARENESS: "Awareness",
  OUTCOME_ENGAGEMENT: "Engajamento",
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_LEADS: "Leads",
  OUTCOME_SALES: "Vendas",
  OUTCOME_APP_PROMOTION: "App",
  LINK_CLICKS: "Cliques",
  POST_ENGAGEMENT: "Engajamento",
  REACH: "Alcance",
  BRAND_AWARENESS: "Awareness",
  CONVERSIONS: "Conversões",
  LEAD_GENERATION: "Leads",
  MESSAGES: "Mensagens",
  VIDEO_VIEWS: "Vídeo Views",
};

interface Props {
  campaigns: any[];
  currency?: string;
}

export default function MetaAdsCampaignTable({
  campaigns,
  currency = "BRL",
}: Props) {
  if (!campaigns.length) return null;

  // Sort by spend descending
  const sorted = [...campaigns].sort((a, b) => b.spend - a.spend);

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3 text-center">
          Campanhas ({sorted.length})
        </p>
        <div className="max-h-[280px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Campanha</TableHead>
                <TableHead className="text-xs">Objetivo</TableHead>
                <TableHead className="text-xs text-right">Gasto</TableHead>
                <TableHead className="text-xs text-right">Impr.</TableHead>
                <TableHead className="text-xs text-right">Cliques</TableHead>
                <TableHead className="text-xs text-right">CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c: any) => (
                <TableRow key={c.campaign_id}>
                  <TableCell className="text-xs font-medium max-w-[140px] truncate">
                    {c.campaign_name || c.campaign_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[9px]">
                      {OBJECTIVE_LABELS[c.campaign_objective] ||
                        c.campaign_objective ||
                        "–"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    {fmtCurrency(c.spend, currency)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {fmt(c.impressions)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {fmt(c.clicks)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {c.ctr.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
