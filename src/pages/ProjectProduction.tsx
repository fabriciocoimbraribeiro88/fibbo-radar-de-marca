import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContractedServices } from "@/hooks/useContractedServices";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ProductionStepper, {
  statusToStep,
  getCompletedSteps,
  type ProductionStep,
} from "@/components/production/ProductionStepper";
import ProductionKanban from "@/components/production/ProductionKanban";
import PlanningWizardStep1 from "@/components/planning/PlanningWizardStep1";
import PlanningWizardStep2 from "@/components/planning/PlanningWizardStep2";
import PlanningWizardStep3 from "@/components/planning/PlanningWizardStep3";
import TitlesReview from "@/components/planning/TitlesReview";
import BriefingsReview from "@/components/planning/BriefingsReview";

import CreativesPanel from "@/components/production/CreativesPanel";
import type { WizardData, Channel, Colab } from "@/pages/ProjectPlanning";

type Phase =
  | "list"
  | "wizard_step1"
  | "wizard_step2"
  | "wizard_step3"
  | "titles_review"
  | "briefings_review"
  | "creatives";

const defaultWizardData: WizardData = {
  analysisId: "",
  channel: "social",
  contextIncludes: ["identity", "hashtags", "seasonal", "products", "memory"],
  periodPreset: "next_month",
  periodStart: "",
  periodEnd: "",
  postsPerWeek: 3,
  formatMix: { Reels: 40, Carrossel: 30, Estático: 20, Stories: 10 },
  useColabs: false,
  colabPercentage: 20,
  colabs: [],
  preferredTimes: { weekday: ["09:00", "12:00", "18:00"], weekend: ["11:00"] },
  usePreferredTimes: false,
  specialInstructions: "",
  adsPlatforms: ["Meta"],
  adsBudget: 5000,
  adsPlatformDistribution: { Meta: 100 },
  adsCampaignsPerMonth: 2,
  adsCreativesPerCampaign: 3,
  adsTypes: ["Awareness", "Tráfego"],
  adsProducts: [],
  seoBlogsPerMonth: 4,
  seoBlogMix: { "Artigo Padrão": 50, "Super Artigo": 30, "Artigo Âncora": 20 },
  seoKeywordStrategies: [],
  calendarId: null,
  title: "",
};

export default function ProjectProduction() {
  const { id: projectId } = useParams<{ id: string }>();
  const [phase, setPhase] = useState<Phase>("list");
  const [wizardData, setWizardData] = useState<WizardData>(defaultWizardData);
  const { channels: contractedChannels } = useContractedServices(projectId);
  const [activeCalendarId, setActiveCalendarId] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch active calendar status for stepper
  const { data: activeCalendar } = useQuery({
    queryKey: ["calendar-detail", activeCalendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_calendars")
        .select("*")
        .eq("id", activeCalendarId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!activeCalendarId,
  });

  if (!projectId) return null;

  const startWizard = () => {
    setWizardData(defaultWizardData);
    setPhase("wizard_step1");
  };

  const openTitlesReview = (calendarId: string) => {
    setActiveCalendarId(calendarId);
    setPhase("titles_review");
  };

  const openBriefingsReview = (calendarId: string) => {
    setActiveCalendarId(calendarId);
    setPhase("briefings_review");
  };

  const openCreatives = (calendarId: string) => {
    setActiveCalendarId(calendarId);
    setPhase("creatives");
  };

  // Determine stepper state from calendar status
  const calStatus = activeCalendar?.status ?? "draft";
  const currentStep = statusToStep(calStatus);
  const completedSteps = getCompletedSteps(
    phase === "creatives" ? "creatives" : currentStep
  );

  const handleStepClick = (step: ProductionStep) => {
    if (!activeCalendarId) return;
    switch (step) {
      case "titles":
        setPhase("titles_review");
        break;
      case "briefings":
        setPhase("briefings_review");
        break;
      case "creatives":
        setPhase("creatives");
        break;
    }
  };

  // Is in a detail view (not the list)?
  const isDetailView = phase !== "list" && !phase.startsWith("wizard");
  const isWizardView = phase.startsWith("wizard");

  const pipelinePhaseStep: ProductionStep =
    phase === "titles_review" ? "titles"
    : phase === "briefings_review" ? "briefings"
    : phase === "creatives" ? "creatives"
    : currentStep;

  return (
    <div className="max-w-5xl animate-fade-in">
      {/* Pipeline kanban view */}
      {phase === "list" && (
        <ProductionKanban
          projectId={projectId}
          onNewPlanning={startWizard}
          onOpenTitlesReview={openTitlesReview}
          onOpenBriefingsReview={openBriefingsReview}
          onOpenCreatives={openCreatives}
        />
      )}

      {/* Wizard steps */}
      {phase === "wizard_step1" && (
        <PlanningWizardStep1
          projectId={projectId}
          wizardData={wizardData}
          setWizardData={setWizardData}
          onNext={() => setPhase("wizard_step2")}
          onBack={() => setPhase("list")}
          contractedChannels={contractedChannels}
        />
      )}

      {phase === "wizard_step2" && (
        <PlanningWizardStep2
          projectId={projectId}
          wizardData={wizardData}
          setWizardData={setWizardData}
          onNext={() => setPhase("wizard_step3")}
          onBack={() => setPhase("wizard_step1")}
        />
      )}

      {phase === "wizard_step3" && (
        <PlanningWizardStep3
          projectId={projectId}
          project={project}
          wizardData={wizardData}
          setWizardData={setWizardData}
          onGenerated={(calendarId) => {
            setActiveCalendarId(calendarId);
            setWizardData((d) => ({ ...d, calendarId }));
            setPhase("titles_review");
          }}
          onBack={() => setPhase("wizard_step2")}
        />
      )}

      {/* Pipeline detail views with stepper */}
      {isDetailView && activeCalendarId && (
        <>
          {/* Stepper header */}
          <div className="mb-6">
            <Button variant="ghost" size="sm" onClick={() => { setPhase("list"); setActiveCalendarId(null); }} className="mb-3">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar para lista
            </Button>
            {activeCalendar && (
              <h2 className="text-lg font-semibold text-foreground mb-4">{activeCalendar.title}</h2>
            )}
            <ProductionStepper
              currentStep={pipelinePhaseStep}
              completedSteps={getCompletedSteps(pipelinePhaseStep)}
              onStepClick={handleStepClick}
            />
          </div>

          {/* Phase content */}

          {phase === "titles_review" && (
            <TitlesReview
              projectId={projectId}
              calendarId={activeCalendarId}
              wizardData={wizardData}
              onBriefingsGenerated={() => setPhase("briefings_review")}
              onBack={() => { setPhase("list"); setActiveCalendarId(null); }}
            />
          )}

          {phase === "briefings_review" && (
            <BriefingsReview
              projectId={projectId}
              calendarId={activeCalendarId}
              onFinalized={() => setPhase("creatives")}
              onBack={() => setPhase("titles_review")}
            />
          )}

          {phase === "creatives" && (
            <CreativesPanel
              projectId={projectId}
              calendarId={activeCalendarId}
              onCompleted={() => { setPhase("list"); setActiveCalendarId(null); }}
            />
          )}
        </>
      )}
    </div>
  );
}
