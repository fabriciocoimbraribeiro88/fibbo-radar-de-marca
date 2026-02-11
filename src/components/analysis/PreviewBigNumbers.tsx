import { formatNum } from "@/lib/formatNumber";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface BigNumberItem {
  label: string;
  value: number;
  previousValue?: number | null;
}

interface PreviewBigNumbersProps {
  items: BigNumberItem[];
  comparePrevious: boolean;
}

export default function PreviewBigNumbers({ items, comparePrevious }: PreviewBigNumbersProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item) => {
        const pctChange =
          comparePrevious && item.previousValue != null && item.previousValue !== 0
            ? ((item.value - item.previousValue) / item.previousValue) * 100
            : null;
        const isPositive = pctChange != null && pctChange >= 0;

        return (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-card p-4 text-center"
          >
            <p className="text-2xl font-bold text-foreground">{formatNum(item.value)}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            {comparePrevious && pctChange != null && (
              <div
                className={`flex items-center justify-center gap-1 mt-2 text-xs font-medium ${
                  isPositive ? "text-green-600" : "text-destructive"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {pctChange.toFixed(0)}% ({formatNum(item.previousValue!)})
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
