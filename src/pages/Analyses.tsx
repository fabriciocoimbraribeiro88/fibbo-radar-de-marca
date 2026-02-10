import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function Analyses() {
  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Análises</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Análises de inteligência competitiva geradas por IA.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 rounded-full bg-accent p-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-lg font-medium text-foreground">
            Nenhuma análise ainda
          </h2>
          <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
            As análises serão geradas após a coleta de dados dos seus projetos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
