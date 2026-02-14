import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContractedServices } from "@/hooks/useContractedServices";
import PlanningList from "@/components/planning/PlanningList";
import PlanningWizardStep1 from "@/components/planning/PlanningWizardStep1";
import PlanningWizardStep2 from "@/components/planning/PlanningWizardStep2";
import PlanningWizardStep3 from "@/components/planning/PlanningWizardStep3";
import TitlesReview from "@/components/planning/TitlesReview";
import BriefingsReview from "@/components/planning/BriefingsReview";
import CalendarFinalView from "@/components/planning/CalendarFinalView";

export type PlanningPhase =
  | "list"
  | "wizard_step1"
  | "wizard_step2"
  | "wizard_step3"
  | "titles_review"
  | "briefings_review"
  | "calendar_final";

export type Channel = "social" | "ads" | "seo";

export interface Colab {
  instagram: string;
  description: string;
  percentage: number;
}

/** @deprecated kept for backward compat with edge functions that reference responsible */
export interface Responsible {
  name: string;
  code: string;
  handle: string | null;
  percentage: number;
}

export interface WizardData {
  analysisId: string;
  channel: Channel;
  contextIncludes: string[];
  // Social config
  periodPreset: string;
  periodStart: string;
  periodEnd: string;
  postsPerWeek: number;
  formatMix: Record<string, number>;
  useColabs: boolean;
  colabPercentage: number;
  colabs: Colab[];
  preferredTimes: { weekday: string[]; weekend: string[] };
  usePreferredTimes: boolean;
  specialInstructions: string;
  // Ads config
  adsPlatforms: string[];
  adsBudget: number;
  adsPlatformDistribution: Record<string, number>;
  adsCampaignsPerMonth: number;
  adsCreativesPerCampaign: number;
  adsTypes: string[];
  adsProducts: string[];
  // SEO config
  seoBlogsPerMonth: number;
  seoBlogMix: Record<string, number>;
  seoKeywordStrategies: string[];
  // Generated
  calendarId: string | null;
  title: string;
}

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

export default function ProjectPlanning() {
  const { id: projectId } = useParams<{ id: string }>();
  const [phase, setPhase] = useState<PlanningPhase>("list");
  const [wizardData, setWizardData] = useState<WizardData>(defaultWizardData);
  const { channels: contractedChannels } = useContractedServices(projectId);
  const [activeCalendarId, setActiveCalendarId] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const startWizard = () => {
    setWizardData(defaultWizardData);
    setPhase("wizard_step1");
  };

  const openCalendar = (calendarId: string) => {
    setActiveCalendarId(calendarId);
    setPhase("calendar_final");
  };

  const openTitlesReview = (calendarId: string) => {
    setActiveCalendarId(calendarId);
    setPhase("titles_review");
  };

  const openBriefingsReview = (calendarId: string) => {
    setActiveCalendarId(calendarId);
    setPhase("briefings_review");
  };

  if (!projectId) return null;

  return (
    <div className="max-w-5xl animate-fade-in">
      {phase === "list" && (
        <PlanningList
          projectId={projectId}
          onNewPlanning={startWizard}
          onOpenCalendar={openCalendar}
          onOpenTitlesReview={openTitlesReview}
          onOpenBriefingsReview={openBriefingsReview}
        />
      )}

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

      {phase === "titles_review" && activeCalendarId && (
        <TitlesReview
          projectId={projectId}
          calendarId={activeCalendarId}
          wizardData={wizardData}
          onBriefingsGenerated={() => setPhase("briefings_review")}
          onBack={() => setPhase("list")}
        />
      )}

      {phase === "briefings_review" && activeCalendarId && (
        <BriefingsReview
          projectId={projectId}
          calendarId={activeCalendarId}
          onFinalized={() => {
            setPhase("calendar_final");
          }}
          onBack={() => setPhase("titles_review")}
        />
      )}

      {phase === "calendar_final" && activeCalendarId && (
        <CalendarFinalView
          projectId={projectId}
          calendarId={activeCalendarId}
          onBack={() => setPhase("list")}
        />
      )}
    </div>
  );
}
