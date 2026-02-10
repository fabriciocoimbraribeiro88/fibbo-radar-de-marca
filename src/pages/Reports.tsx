import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function Reports() {
  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Relatórios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Relatórios de inteligência competitiva prontos para apresentação.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 rounded-full bg-accent p-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-lg font-medium text-foreground">
            Nenhum relatório ainda
          </h2>
          <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
            Relatórios serão criados a partir das análises dos seus projetos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
