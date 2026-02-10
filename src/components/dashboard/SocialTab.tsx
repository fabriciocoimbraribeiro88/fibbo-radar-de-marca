import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line, ScatterChart, Scatter, ZAxis,
} from "recharts";

/* ── Types ── */
export interface PostData {
  entity_id: string;
  entity_name: string;
  post_type: string | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  engagement_total: number;
  hashtags: string[] | null;
  posted_at: string | null;
  followers: number | null;
}

interface Props {
  posts: PostData[];
  brandEntityId: string | null;
  isComparative: boolean; // more than one entity
}

/* ── Helpers ── */
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

const TYPE_COLORS: Record<string, string> = {
  Image: "hsl(18 79% 50%)",
  Video: "hsl(239 84% 67%)",
  Sidecar: "hsl(160 84% 39%)",
  Carousel: "hsl(160 84% 39%)",
};

const ENTITY_COLORS = [
  "hsl(18 79% 50%)",
  "hsl(239 84% 67%)",
  "hsl(160 84% 39%)",
  "hsl(330 81% 60%)",
  "hsl(45 93% 47%)",
  "hsl(200 80% 50%)",
];

const RADIAN = Math.PI / 180;
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

/* ── Component ── */
export default function SocialTab({ posts, brandEntityId, isComparative }: Props) {
  const brandPosts = useMemo(() => posts.filter((p) => p.entity_id === brandEntityId), [posts, brandEntityId]);
  const displayPosts = brandEntityId ? brandPosts : posts;

  // Big numbers
  const bigNumbers = useMemo(() => {
    const total = displayPosts.length;
    const avgLikes = total > 0 ? Math.round(displayPosts.reduce((s, p) => s + p.likes_count, 0) / total) : 0;
    const avgComments = total > 0 ? Math.round(displayPosts.reduce((s, p) => s + p.comments_count, 0) / total) : 0;
    const avgViews = total > 0 ? Math.round(displayPosts.reduce((s, p) => s + p.views_count, 0) / total) : 0;
    const followers = displayPosts[0]?.followers ?? 0;
    const totalEng = displayPosts.reduce((s, p) => s + p.likes_count + p.comments_count, 0);
    const engRate = followers > 0 && total > 0 ? ((totalEng / total) / followers * 100) : 0;
    return { total, avgLikes, avgComments, avgViews, engRate };
  }, [displayPosts]);

  // Content type distribution (pie)
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of displayPosts) {
      const t = p.post_type ?? "Outro";
      counts[t] = (counts[t] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [displayPosts]);

  // Performance by type (bar)
  const perfByType = useMemo(() => {
    const groups: Record<string, { likes: number[]; comments: number[] }> = {};
    for (const p of displayPosts) {
      const t = p.post_type ?? "Outro";
      if (!groups[t]) groups[t] = { likes: [], comments: [] };
      groups[t].likes.push(p.likes_count);
      groups[t].comments.push(p.comments_count);
    }
    return Object.entries(groups).map(([name, g]) => ({
      name,
      "Média Likes": Math.round(g.likes.reduce((a, b) => a + b, 0) / g.likes.length),
      "Média Comentários": Math.round(g.comments.reduce((a, b) => a + b, 0) / g.comments.length),
    }));
  }, [displayPosts]);

  // Top 10 hashtags
  const topHashtags = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of displayPosts) {
      for (const h of p.hashtags ?? []) {
        const tag = h.startsWith("#") ? h : `#${h}`;
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [displayPosts]);

  // Likes over time (chronological)
  const likesOverTime = useMemo(() => {
    return displayPosts
      .filter((p) => p.posted_at)
      .sort((a, b) => new Date(a.posted_at!).getTime() - new Date(b.posted_at!).getTime())
      .map((p, i) => ({
        idx: i + 1,
        date: new Date(p.posted_at!).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        likes: p.likes_count,
        type: p.post_type ?? "Outro",
      }));
  }, [displayPosts]);

  // === COMPARATIVE DATA ===
  const entityNames = useMemo(() => {
    const names = new Set<string>();
    for (const p of posts) names.add(p.entity_name);
    return Array.from(names);
  }, [posts]);

  const comparativeMetrics = useMemo(() => {
    if (!isComparative) return [];
    const groups: Record<string, PostData[]> = {};
    for (const p of posts) {
      if (!groups[p.entity_name]) groups[p.entity_name] = [];
      groups[p.entity_name].push(p);
    }
    return Object.entries(groups).map(([name, psts]) => {
      const total = psts.length;
      const avgLikes = total > 0 ? Math.round(psts.reduce((s, p) => s + p.likes_count, 0) / total) : 0;
      const avgComments = total > 0 ? Math.round(psts.reduce((s, p) => s + p.comments_count, 0) / total) : 0;
      const followers = psts[0]?.followers ?? 0;
      const totalEng = psts.reduce((s, p) => s + p.likes_count + p.comments_count, 0);
      const engRate = followers > 0 && total > 0 ? ((totalEng / total) / followers * 100) : 0;

      // Content mix
      const imageCount = psts.filter((p) => p.post_type === "Image").length;
      const videoCount = psts.filter((p) => p.post_type === "Video").length;
      const carouselCount = psts.filter((p) => p.post_type === "Sidecar" || p.post_type === "Carousel").length;

      return {
        name,
        avgLikes,
        avgComments,
        volume: total,
        engRate: +engRate.toFixed(2),
        followers,
        pctImage: total > 0 ? +(imageCount / total * 100).toFixed(0) : 0,
        pctVideo: total > 0 ? +(videoCount / total * 100).toFixed(0) : 0,
        pctCarousel: total > 0 ? +(carouselCount / total * 100).toFixed(0) : 0,
      };
    });
  }, [posts, isComparative]);

  const scatterData = useMemo(() => {
    return comparativeMetrics.map((d) => ({
      x: d.volume,
      y: d.engRate,
      z: d.followers,
      name: d.name,
    }));
  }, [comparativeMetrics]);

  return (
    <div className="space-y-6">
      {/* Big numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Posts", value: bigNumbers.total.toString() },
          { label: "Média Likes", value: fmt(bigNumbers.avgLikes) },
          { label: "Média Comentários", value: fmt(bigNumbers.avgComments) },
          { label: "Média Views", value: fmt(bigNumbers.avgViews) },
          { label: "Taxa Engajamento", value: `${bigNumbers.engRate.toFixed(2)}%` },
        ].map((item) => (
          <Card key={item.label} className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row: Pie + Performance by type */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pie: Content type distribution */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por Tipo de Conteúdo</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={100}
                  dataKey="value"
                >
                  {typeDistribution.map((entry) => (
                    <Cell key={entry.name} fill={TYPE_COLORS[entry.name] ?? "hsl(var(--muted-foreground))"} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar: Performance by type */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Performance por Tipo de Conteúdo</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={perfByType} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Média Likes" fill="hsl(18 79% 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Média Comentários" fill="hsl(239 84% 67%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row: Hashtags + Likes over time */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Horizontal bar: Top hashtags */}
        {topHashtags.length > 0 && (
          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Top 10 Hashtags</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topHashtags} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(18 79% 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Bar: Likes over time */}
        {likesOverTime.length > 0 && (
          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Likes por Post ao Longo do Tempo</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={likesOverTime} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => fmt(v)}
                    labelFormatter={(l) => `Post ${l}`}
                  />
                  <Bar dataKey="likes" radius={[3, 3, 0, 0]}>
                    {likesOverTime.map((entry, i) => (
                      <Cell key={i} fill={TYPE_COLORS[entry.type] ?? "hsl(18 79% 50%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ═══ COMPARATIVE SECTION ═══ */}
      {isComparative && comparativeMetrics.length > 1 && (
        <>
          <div className="pt-4">
            <h2 className="text-base font-semibold text-foreground">Análise Comparativa</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Comparando {comparativeMetrics.length} entidades</p>
          </div>

          {/* Row: Avg Likes + Avg Comments + Volume */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/50">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Média de Likes por Post</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={comparativeMetrics} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="avgLikes" radius={[4, 4, 0, 0]}>
                      {comparativeMetrics.map((_, i) => (
                        <Cell key={i} fill={ENTITY_COLORS[i % ENTITY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Média de Comentários por Post</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={comparativeMetrics} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="avgComments" radius={[4, 4, 0, 0]}>
                      {comparativeMetrics.map((_, i) => (
                        <Cell key={i} fill={ENTITY_COLORS[i % ENTITY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Volume de Posts no Período</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={comparativeMetrics} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                      {comparativeMetrics.map((_, i) => (
                        <Cell key={i} fill={ENTITY_COLORS[i % ENTITY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Row: Engagement Rate + Content Mix + Scatter */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/50">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Taxa de Engajamento (%)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={comparativeMetrics} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="engRate" radius={[4, 4, 0, 0]}>
                      {comparativeMetrics.map((_, i) => (
                        <Cell key={i} fill={ENTITY_COLORS[i % ENTITY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Mix de Formatos de Conteúdo</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={comparativeMetrics} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="pctImage" name="Imagens" stackId="a" fill="hsl(18 79% 50%)" />
                    <Bar dataKey="pctVideo" name="Vídeos" stackId="a" fill="hsl(239 84% 67%)" />
                    <Bar dataKey="pctCarousel" name="Carrosséis" stackId="a" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Volume vs Engajamento</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" dataKey="x" name="Posts" tick={{ fontSize: 10 }} label={{ value: "Volume de Posts", position: "bottom", fontSize: 10 }} />
                    <YAxis type="number" dataKey="y" name="Eng. Rate" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <ZAxis type="number" dataKey="z" range={[60, 300]} name="Seguidores" />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: number, name: string) => [name === "Eng. Rate" ? `${v}%` : fmt(v), name]}
                    />
                    <Scatter data={scatterData} fill="hsl(18 79% 50%)">
                      {scatterData.map((_, i) => (
                        <Cell key={i} fill={ENTITY_COLORS[i % ENTITY_COLORS.length]} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
