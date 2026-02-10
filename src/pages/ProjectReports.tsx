import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function ProjectReports() {
  return (
    <div className="max-w-3xl animate-fade-in">
      <h1 className="text-xl font-semibold text-foreground mb-6">Relatórios</h1>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-16">
          <FileText className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">Em breve</p>
          <p className="mt-1 text-xs text-muted-foreground text-center max-w-sm">
            Exporte relatórios em PDF e Markdown a partir das análises aprovadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
