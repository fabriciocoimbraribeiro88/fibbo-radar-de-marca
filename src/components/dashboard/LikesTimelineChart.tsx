import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import type { PostData } from "@/hooks/useProjectDashboardData";

const FORMAT_COLORS: Record<string, string> = {
  Image: "#ef4444",
  Video: "#1e3a5f",
  Reel: "#3b82f6",
  Sidecar: "#10b981",
  Other: "#9ca3af",
};

interface Props { posts: PostData[]; entityId: string }

export default function LikesTimelineChart({ posts, entityId }: Props) {
  const entityPosts = posts
    .filter((p) => p.entity_id === entityId && p.posted_at)
    .sort((a, b) => new Date(a.posted_at!).getTime() - new Date(b.posted_at!).getTime());

  const data = entityPosts.map((p, i) => ({
    idx: i + 1,
    likes: p.likes_count,
    type: p.post_type ?? "Image",
    date: new Date(p.posted_at!).toLocaleDateString("pt-BR"),
  }));

  const avgLikes = data.length ? Math.round(data.reduce((s, d) => s + d.likes, 0) / data.length) : 0;

  if (!data.length) return null;

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3 text-center">Likes por Post ao Longo do Tempo</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <XAxis dataKey="idx" tick={{ fontSize: 8 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-md bg-popover border border-border p-2 text-xs shadow-md">
                    <p className="text-muted-foreground">{d.date}</p>
                    <p className="font-medium text-foreground">{d.likes.toLocaleString("pt-BR")} likes</p>
                    <p className="text-muted-foreground">{d.type}</p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={avgLikes} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: `Média: ${avgLikes}`, fontSize: 9, position: "right" }} />
            <Bar dataKey="likes" name="Likes" radius={[2, 2, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={FORMAT_COLORS[d.type] ?? "#9ca3af"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
