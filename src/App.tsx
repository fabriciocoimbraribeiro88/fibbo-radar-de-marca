import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ProjectLayout from "@/components/ProjectLayout";
import Login from "@/pages/Login";
import Projects from "@/pages/Projects";
import NewProject from "@/pages/NewProject";
import ProjectOverview from "@/pages/ProjectOverview";
import ProjectBrand from "@/pages/ProjectBrand";
import ProjectSources from "@/pages/ProjectSources";
import ProjectAnalyses from "@/pages/ProjectAnalyses";
import NewAnalysis from "@/pages/NewAnalysis";
import AnalysisView from "@/pages/AnalysisView";
import ProjectPlanning from "@/pages/ProjectPlanning";
import ProjectOKRs from "@/pages/ProjectOKRs";
import ProjectDashboard from "@/pages/ProjectDashboard";
import SettingsPage from "@/pages/Settings";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route index element={<Index />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/new" element={<NewProject />} />

              {/* Project sub-pages with ProjectLayout */}
              <Route path="/projects/:id" element={<ProjectLayout />}>
                <Route index element={<ProjectOverview />} />
                <Route path="brand" element={<ProjectBrand />} />
                <Route path="sources" element={<ProjectSources />} />
                <Route path="dashboard" element={<ProjectDashboard />} />
                <Route path="analyses" element={<ProjectAnalyses />} />
                <Route path="analyses/new" element={<NewAnalysis />} />
                <Route path="analyses/:analysisId" element={<AnalysisView />} />
                <Route path="planning" element={<ProjectPlanning />} />
                <Route path="okrs" element={<ProjectOKRs />} />
              </Route>

              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
