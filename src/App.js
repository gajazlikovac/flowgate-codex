import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import Layout from './components/layout/Layout';
import { ChatProvider } from './components/utils/ChatContext';
import { TaskGoalProvider } from './context/TaskGoalContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { ProfileProvider } from './context/ProfileContext';
import LiveblocksProvider from './context/LiveblocksProvider';
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

// Import Liveblocks rooms
import LiveTasksRoom from './components/tasks/LiveTasksRoom';
import LiveWorkflowsRoom from './components/tasks/LiveWorkflowsRoom';
import LiveWorkflowsWizardRoom from './components/tasks/LiveWorkflowsWizardRoom';

import './styles/global.css';

function App() {
  return (
    <Auth0Provider
      domain="dev-2sqzvgejnwhp8a3e.us.auth0.com"
      clientId="rnipYiMM9azbvZyxQ7Lfcw3Qyv6MDDYr"
      authorizationParams={{
        redirect_uri: window.location.origin,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
    >
      <LiveblocksProvider>
        <ProfileProvider>
          <ChatProvider>
            <TaskGoalProvider>
              <OnboardingProvider>
                <Router>
                  <Routes>
                    <Route path="/onboarding/*" element={<OnboardingFlow />} />
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
    </Auth0Provider>
  );
}

export default App;