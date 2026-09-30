import React, { lazy, Suspense, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useUI } from './stores/ui';
import { Loading, Empty } from './components/common';
import { Button } from './components/ui/button';
import './styles.css';
const Landing = lazy(() => import('./pages/landing'));
const Auth = lazy(() => import('./pages/auth'));
const Layout = lazy(() => import('./layouts/app-layout'));
const Dashboard = lazy(() => import('./pages/dashboard'));
const Projects = lazy(() => import('./pages/projects'));
const Project = lazy(() => import('./pages/project'));
const MyTasks = lazy(() => import('./pages/my-tasks'));
const Team = lazy(() => import('./pages/team'));
const Inbox = lazy(() => import('./pages/inbox'));
const Activity = lazy(() => import('./pages/activity'));
const Settings = lazy(() => import('./pages/settings'));
const Profile = lazy(() => import('./pages/profile'));
const Invitation = lazy(() => import('./pages/invitation'));
const Legal = lazy(() => import('./pages/legal'));
const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 20000, retry: 1, refetchOnWindowFocus: true } },
});
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Empty
        title="Something went wrong"
        description="Please reload the page to get back to your work."
        action={<Button onClick={() => window.location.reload()}>Reload page</Button>}
      />
    ) : (
      this.props.children
    );
  }
}
function App() {
  const theme = useUI((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return (
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="initial-loading">
                <Loading />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Auth key="login" mode="login" />} />
              <Route path="/register" element={<Auth key="register" mode="register" />} />
              <Route path="/forgot-password" element={<Auth key="forgot" mode="forgot" />} />
              <Route path="/reset-password" element={<Auth key="reset" mode="reset" />} />
              <Route path="/verify-email" element={<Auth key="verify" mode="verify" />} />
              <Route path="/privacy" element={<Legal type="privacy" />} />
              <Route path="/terms" element={<Legal type="terms" />} />
              <Route path="/invitations/:token" element={<Invitation />} />
              <Route path="/app" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/:id" element={<Project />} />
                <Route path="my-tasks" element={<MyTasks />} />
                <Route path="team" element={<Team />} />
                <Route path="inbox" element={<Inbox />} />
                <Route path="activity" element={<Activity />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Profile />} />
              </Route>
              <Route
                path="*"
                element={
                  <Empty
                    title="A little off the path"
                    description="This page doesn’t exist. Let’s get you back to your workspace."
                    action={
                      <Button asChild>
                        <Link to="/app">Back to TaskFlow</Link>
                      </Button>
                    }
                  />
                }
              />
            </Routes>
          </Suspense>
          <Toaster position="bottom-right" theme={theme} richColors closeButton />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
