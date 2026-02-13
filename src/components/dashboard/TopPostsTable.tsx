import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { PostData } from "@/hooks/useProjectDashboardData";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

interface Props {
  posts: PostData[];
  entityId: string;
  mode: "best" | "worst";
  limit?: number;
}

export default function TopPostsTable({ posts, entityId, mode, limit = 10 }: Props) {
  const sorted = useMemo(() => {
    const entityPosts = posts.filter((p) => p.entity_id === entityId && p.engagement_total > 0);
    const s = [...entityPosts].sort((a, b) =>
      mode === "best"
        ? b.engagement_total - a.engagement_total
        : a.engagement_total - b.engagement_total
    );
    return s.slice(0, limit);
  }, [posts, entityId, mode, limit]);

  const title = mode === "best" ? "🔥 Top 10 Melhores Posts" : "📉 Top 10 Piores Posts";

  return (
    <div className="card-flat">
      <div className="px-5 pt-5 pb-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="px-0 pb-0">
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Sem posts disponíveis.</p>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-accent/30">
                  <TableHead className="text-[10px] w-10">#</TableHead>
                  <TableHead className="text-[10px]">Data</TableHead>
                  <TableHead className="text-[10px] min-w-[160px]">Caption</TableHead>
                  <TableHead className="text-[10px]">Tipo</TableHead>
                  <TableHead className="text-[10px] text-right">Likes</TableHead>
                  <TableHead className="text-[10px] text-right">Coment.</TableHead>
                  <TableHead className="text-[10px] text-right">Views</TableHead>
                  <TableHead className="text-[10px] text-right">Eng.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((p, i) => (
                  <TableRow key={`${p.posted_at}-${i}`} className="text-xs hover:bg-accent/20">
                    <TableCell className="py-2 font-mono text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">
                      {p.posted_at ? new Date(p.posted_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="py-2 max-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-muted-foreground">
                          {p.caption ? p.caption.slice(0, 80) : "—"}
                        </span>
                        {p.post_url && (
                          <a href={p.post_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary hover:text-primary/80">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {p.post_type ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono">{formatNum(p.likes_count)}</TableCell>
                    <TableCell className="py-2 text-right font-mono">{formatNum(p.comments_count)}</TableCell>
                    <TableCell className="py-2 text-right font-mono">{formatNum(p.views_count)}</TableCell>
                    <TableCell className="py-2 text-right font-mono font-semibold">{formatNum(p.engagement_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
