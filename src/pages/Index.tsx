import fibboLogo from "@/assets/fibbo-logo.png";
import { Radar, BarChart3, Users, TrendingUp, FileText } from "lucide-react";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <img src={fibboLogo} alt="Fibbo" className="h-12" />

        <div className="flex items-center gap-2 text-muted-foreground">
          <Radar className="h-5 w-5 text-primary" />
          <span className="text-lg font-medium tracking-tight">Radar</span>
        </div>

        <h1 className="text-2xl font-semibold text-foreground">
          Inteligência competitiva digital
        </h1>

        <p className="max-w-md text-center text-muted-foreground">
          Monitore concorrentes, analise dados e gere insights estratégicos com IA.
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {[
            { icon: BarChart3, label: "Dashboards" },
            { icon: Users, label: "Concorrentes" },
            { icon: TrendingUp, label: "Análises" },
            { icon: FileText, label: "Relatórios" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-accent"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
