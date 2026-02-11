import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { WizardData } from "@/pages/ProjectPlanning";
import SocialConfig from "./SocialConfig";
import AdsConfig from "./AdsConfig";
import SeoConfig from "./SeoConfig";

interface Props {
  projectId: string;
  wizardData: WizardData;
  setWizardData: React.Dispatch<React.SetStateAction<WizardData>>;
  onNext: () => void;
  onBack: () => void;
}

export default function PlanningWizardStep2({ projectId, wizardData, setWizardData, onNext, onBack }: Props) {
  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Configuração</h1>
        <p className="mt-1 text-sm text-muted-foreground">Etapa 2 de 3 — Configuração do {wizardData.channel === "social" ? "Social" : wizardData.channel === "ads" ? "Ads" : "SEO"}</p>
      </div>

      {wizardData.channel === "social" && (
        <SocialConfig wizardData={wizardData} setWizardData={setWizardData} />
      )}
      {wizardData.channel === "ads" && (
        <AdsConfig projectId={projectId} wizardData={wizardData} setWizardData={setWizardData} />
      )}
      {wizardData.channel === "seo" && (
        <SeoConfig wizardData={wizardData} setWizardData={setWizardData} />
      )}

      <div className="flex justify-end mt-8">
        <Button onClick={onNext}>
          Próximo
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
