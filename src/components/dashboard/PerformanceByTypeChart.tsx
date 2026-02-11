import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import type { PostData } from "@/hooks/useProjectDashboardData";

interface Props { posts: PostData[]; entityId: string }

export default function PerformanceByTypeChart({ posts, entityId }: Props) {
  const entityPosts = posts.filter((p) => p.entity_id === entityId);
  const typeMap: Record<string, { likes: number[]; comments: number[] }> = {};

  entityPosts.forEach((p) => {
    const t = p.post_type ?? "Image";
    if (!typeMap[t]) typeMap[t] = { likes: [], comments: [] };
    typeMap[t].likes.push(p.likes_count);
    typeMap[t].comments.push(p.comments_count);
  });

  const data = Object.entries(typeMap).map(([type, v]) => ({
    type,
    avgLikes: Math.round(v.likes.reduce((s, n) => s + n, 0) / v.likes.length),
    avgComments: Math.round(v.comments.reduce((s, n) => s + n, 0) / v.comments.length),
  }));

  if (!data.length) return null;

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3 text-center">Performance por Tipo de Conteúdo</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
            <XAxis dataKey="type" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="avgLikes" name="Média Likes" fill="hsl(18, 79%, 50%)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="avgLikes" position="top" fontSize={9} />
            </Bar>
            <Bar dataKey="avgComments" name="Média Comentários" fill="#3b82f6" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="avgComments" position="top" fontSize={9} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
