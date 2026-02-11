import { formatNum } from "@/lib/formatNumber";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface EntityRow {
  name: string;
  handle?: string;
  isBrand?: boolean;
  posts?: number;
  likes?: number;
  comments?: number;
  avgEngagement?: number;
  followers?: number;
  engagementRate?: number;
  // ads
  adsTotal?: number;
  adsActive?: number;
  estimatedSpend?: number;
  platforms?: string;
  mainType?: string;
  // seo
  keywords?: number;
  avgPosition?: number;
  domainAuthority?: number;
  backlinks?: number;
  trafficEstimate?: number;
}

interface PreviewTableProps {
  rows: EntityRow[];
  channel: "social" | "ads" | "seo";
}

export default function PreviewTable({ rows, channel }: PreviewTableProps) {
  if (channel === "social") {
    return (
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entidade</TableHead>
              <TableHead className="text-right">Posts</TableHead>
              <TableHead className="text-right">Curtidas</TableHead>
              <TableHead className="text-right">Comentários</TableHead>
              <TableHead className="text-right">Eng. Médio</TableHead>
              <TableHead className="text-right">Seguidores</TableHead>
              <TableHead className="text-right">Taxa Eng.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.name}
                className={r.isBrand ? "bg-primary/5 font-medium" : ""}
              >
                <TableCell>
                  <div>
                    <span>{r.isBrand ? "👑 " : ""}{r.name}</span>
                    {r.handle && (
                      <span className="text-xs text-muted-foreground ml-1">{r.handle}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatNum(r.posts)}</TableCell>
                <TableCell className="text-right">{formatNum(r.likes)}</TableCell>
                <TableCell className="text-right">{formatNum(r.comments)}</TableCell>
                <TableCell className="text-right">{formatNum(r.avgEngagement)}</TableCell>
                <TableCell className="text-right">{formatNum(r.followers)}</TableCell>
                <TableCell className="text-right">
                  {r.engagementRate != null ? `${r.engagementRate.toFixed(1)}%` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (channel === "ads") {
    return (
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entidade</TableHead>
              <TableHead className="text-right">Anúncios</TableHead>
              <TableHead className="text-right">Ativos</TableHead>
              <TableHead className="text-right">Invest. Est.</TableHead>
              <TableHead>Plataformas</TableHead>
              <TableHead>Tipo Principal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.name}
                className={r.isBrand ? "bg-primary/5 font-medium" : ""}
              >
                <TableCell>{r.isBrand ? "👑 " : ""}{r.name}</TableCell>
                <TableCell className="text-right">{formatNum(r.adsTotal)}</TableCell>
                <TableCell className="text-right">{formatNum(r.adsActive)}</TableCell>
                <TableCell className="text-right">
                  {r.estimatedSpend != null ? `R$ ${formatNum(r.estimatedSpend)}` : "—"}
                </TableCell>
                <TableCell>{r.platforms ?? "—"}</TableCell>
                <TableCell>{r.mainType ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // SEO
  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entidade</TableHead>
            <TableHead className="text-right">Keywords</TableHead>
            <TableHead className="text-right">Posição Média</TableHead>
            <TableHead className="text-right">DA</TableHead>
            <TableHead className="text-right">Backlinks</TableHead>
            <TableHead className="text-right">Tráfego Est.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.name}
              className={r.isBrand ? "bg-primary/5 font-medium" : ""}
            >
              <TableCell>{r.isBrand ? "👑 " : ""}{r.name}</TableCell>
              <TableCell className="text-right">{formatNum(r.keywords)}</TableCell>
              <TableCell className="text-right">
                {r.avgPosition != null ? r.avgPosition.toFixed(1) : "—"}
              </TableCell>
              <TableCell className="text-right">{r.domainAuthority ?? "—"}</TableCell>
              <TableCell className="text-right">{formatNum(r.backlinks)}</TableCell>
              <TableCell className="text-right">{formatNum(r.trafficEstimate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
