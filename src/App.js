import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { ChatProvider } from './components/utils/ChatContext';
import { TaskGoalProvider } from './context/TaskGoalContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { ProfileProvider } from './context/ProfileContext';
import LiveblocksProvider from './context/LiveblocksProvider';
import { CustomAuthProvider } from './context/CustomAuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import OnboardingGuard from './components/auth/OnboardingGuard';

// Import page components
import DataCenterHub from './components/DataCenterHub';
import ComplianceChat from './components/ComplianceChat';
import DataValidation from './components/DataValidation';
import Goals from './components/Goals';
import VisualizedMetrics from './components/VisualizedMetrics';
import OnboardingFlow from './pages/OnboardingFlow';
import Settings from './pages/Settings';
import ChatWidget from './components/ui/ChatWidget';
import LoginPage from './pages/LoginPage';

// Import Liveblocks rooms
import LiveTasksRoom from './components/tasks/LiveTasksRoom';
import LiveWorkflowsRoom from './components/tasks/LiveWorkflowsRoom';
import LiveWorkflowsWizardRoom from './components/tasks/LiveWorkflowsWizardRoom';

import './styles/global.css';

function App() {
  return (
    <CustomAuthProvider>
      <LiveblocksProvider>
        <ProfileProvider>
          <ChatProvider>
            <TaskGoalProvider>
              <OnboardingProvider>
                <Router>
                  <Routes>
                    <Route path="/onboarding/*" element={<OnboardingFlow />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                      path="*"
                      element={
                        <ProtectedRoute>
                          <OnboardingGuard>
                            <Layout>
                              <Routes>
                                <Route path="/" element={<DataCenterHub />} />
                                <Route path="/compliance-chat" element={<ComplianceChat />} />
                                <Route path="/workflows" element={<LiveWorkflowsRoom />} />
                                <Route path="/workflowwizard" element={<LiveWorkflowsWizardRoom />} />
                                <Route path="/data-validation" element={<DataValidation />} />
                                <Route path="/goals" element={<Goals />} />
                                <Route path="/task-management" element={<LiveTasksRoom />} />
                                <Route path="/visualized-metrics" element={<VisualizedMetrics />} />
                                <Route path="/settings" element={<Settings />} />
                              </Routes>
                            </Layout>
                            <ChatWidget />
                          </OnboardingGuard>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </Router>
              </OnboardingProvider>
            </TaskGoalProvider>
          </ChatProvider>
        </ProfileProvider>
      </LiveblocksProvider>
    </CustomAuthProvider>
  );
}

export default App;