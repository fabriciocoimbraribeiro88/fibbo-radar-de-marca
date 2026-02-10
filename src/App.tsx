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
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import NewProject from "@/pages/NewProject";
import ProjectOverview from "@/pages/ProjectOverview";
import ProjectBrand from "@/pages/ProjectBrand";
import ProjectEntities from "@/pages/ProjectEntities";
import ProjectDataSources from "@/pages/ProjectDataSources";
import ProjectAnalyses from "@/pages/ProjectAnalyses";
import NewAnalysis from "@/pages/NewAnalysis";
import AnalysisView from "@/pages/AnalysisView";
import Analyses from "@/pages/Analyses";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";
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
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/new" element={<NewProject />} />

              {/* Project sub-pages with ProjectLayout */}
              <Route path="/projects/:id" element={<ProjectLayout />}>
                <Route index element={<ProjectOverview />} />
                <Route path="brand" element={<ProjectBrand />} />
                <Route path="entities" element={<ProjectEntities />} />
                <Route path="data-sources" element={<ProjectDataSources />} />
                <Route path="analyses" element={<ProjectAnalyses />} />
                <Route path="analyses/new" element={<NewAnalysis />} />
                <Route path="analyses/:analysisId" element={<AnalysisView />} />
              </Route>

              <Route path="/analyses" element={<Analyses />} />
              <Route path="/reports" element={<Reports />} />
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
