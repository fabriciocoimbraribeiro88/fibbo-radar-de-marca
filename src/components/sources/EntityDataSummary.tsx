import { Badge } from "@/components/ui/badge";
import { formatNum } from "@/lib/formatNumber";
import type { EntityDataSummaryItem } from "@/hooks/useEntityDataSummary";
import {
  Calendar,
  FileText,
  Heart,
  Eye,
  MessageCircle,
  Hash,
  Brain,
  Users,
} from "lucide-react";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function EntityDataSummary({ data }: { data: EntityDataSummaryItem }) {
  if (data.totalPosts === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        Nenhum dado coletado ainda.
      </p>
    );
  }

  const hasComments = data.realCommentsCount > 0;
  const hasSentiment = data.commentsWithSentiment > 0;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Resumo dos Dados
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
        {/* Period */}
        <div className="flex items-start gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Período</p>
            <p className="text-xs font-medium text-foreground">
              {fmtDate(data.oldestPostDate)} — {fmtDate(data.newestPostDate)}
            </p>
          </div>
        </div>

        {/* Total posts */}
        <div className="flex items-start gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Posts</p>
            <p className="text-xs font-medium text-foreground">{formatNum(data.totalPosts)}</p>
          </div>
        </div>

        {/* Post types */}
        <div className="flex items-start gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Tipos</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {data.postTypes.length > 0 ? (
                data.postTypes.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[9px] h-4 rounded-full px-1.5">
                    {t}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Engagement */}
        <div className="flex items-start gap-2">
          <Heart className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Engajamento</p>
            <p className="text-xs font-medium text-foreground">
              {formatNum(data.totalLikes + data.totalComments + data.totalSaves + data.totalShares)}
            </p>
          </div>
        </div>

        {/* Views */}
        <div className="flex items-start gap-2">
          <Eye className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Views</p>
            <p className="text-xs font-medium text-foreground">
              {data.totalViews > 0 ? formatNum(data.totalViews) : (
                <span className="text-muted-foreground">Indisponível</span>
              )}
            </p>
          </div>
        </div>

        {/* Followers */}
        {data.followers !== null && (
          <div className="flex items-start gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Seguidores</p>
              <p className="text-xs font-medium text-foreground">{formatNum(data.followers)}</p>
            </div>
          </div>
        )}

        {/* Hashtags */}
        <div className="flex items-start gap-2">
          <Hash className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Posts c/ Hashtags</p>
            <p className="text-xs font-medium text-foreground">{formatNum(data.postsWithHashtags)}</p>
          </div>
        </div>

        {/* Real comments */}
        <div className="flex items-start gap-2">
          <MessageCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Comentários reais</p>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-foreground">{formatNum(data.realCommentsCount)}</p>
              <Badge
                variant="secondary"
                className={`text-[9px] h-4 rounded-full px-1.5 border-0 ${
                  hasComments ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {hasComments ? "Disponível" : "Indisponível"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Sentiment */}
        <div className="flex items-start gap-2">
          <Brain className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Sentimento</p>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-foreground">
                {hasSentiment ? formatNum(data.commentsWithSentiment) : "—"}
              </p>
              <Badge
                variant="secondary"
                className={`text-[9px] h-4 rounded-full px-1.5 border-0 ${
                  hasSentiment ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {hasSentiment ? "Analisado" : "Pendente"}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
