import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, CalendarDays, Circle, CheckCircle2, Sparkles } from 'lucide-react';
import { useUser, useWorkspace } from '../hooks/use-data';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { PageHeading, Loading, ErrorState, Empty, Badge } from '../components/common';
import { WorkspaceDialog, ProjectDialog } from '../components/forms';
import { Stats, ProgressChart, StatusChart } from '../features/analytics';
import { ProjectCard } from '../features/projects';
import { ActivityFeed } from '../features/activity';
import { date } from '../lib/utils';
import type { Analytics, Project, Page } from '../types';
export default function Dashboard() {
  const user = useUser();
  const workspace = useWorkspace();
  const [create, setCreate] = useState(false);
  const stats = useQuery({
    queryKey: ['dashboard', workspace.workspace?.id],
    queryFn: () => api<Analytics>(`/dashboard?workspaceId=${workspace.workspace!.id}`),
    enabled: !!workspace.workspace,
  });
  const projects = useQuery({
    queryKey: ['projects', 'recent', workspace.workspace?.id],
    queryFn: () => api<Page<Project>>(`/projects?workspaceId=${workspace.workspace!.id}&limit=3`),
    enabled: !!workspace.workspace,
  });
  if (workspace.isPending) return <Loading />;
  if (workspace.error)
    return <ErrorState error={workspace.error} retry={() => void workspace.refetch()} />;
  if (!workspace.workspace)
    return (
      <>
        <PageHeading
          title={`Welcome to TaskFlow, ${user.data?.name.split(' ')[0] ?? 'there'}.`}
          description="A little clarity. A lot of possibility."
        />
        <div className="onboarding-panel">
          <span className="onboarding-sparkle">
            <Sparkles size={40} />
          </span>
          <h2>Your next chapter starts here.</h2>
          <p>
            Create a workspace to bring your projects, your people, and your best ideas together.
          </p>
          <Button onClick={() => setCreate(true)}>
            <Plus size={17} /> Create your first workspace
          </Button>
          <div className="onboarding-steps">
            <span>
              <i>1</i> Create a workspace
            </span>
            <span>
              <i>2</i> Invite your people
            </span>
            <span>
              <i>3</i> Make progress
            </span>
          </div>
        </div>
        <WorkspaceDialog open={create} onClose={() => setCreate(false)} />
      </>
    );
  const hour = new Date().getHours();
  return (
    <>
      <PageHeading
        eyebrow="LET’S MAKE THINGS HAPPEN"
        title={`Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${user.data?.name.split(' ')[0] ?? 'there'} ✦`}
        description="Here’s what’s happening with your team today."
        actions={
          <>
            <span className="date-chip">
              <CalendarDays size={15} />
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            {workspace.canManage && (
              <Button onClick={() => setCreate(true)}>
                <Plus size={16} /> New project
              </Button>
            )}
          </>
        }
      />
      {stats.isPending ? (
        <Loading />
      ) : stats.error ? (
        <ErrorState error={stats.error} retry={() => void stats.refetch()} />
      ) : (
        <>
          <Stats data={stats.data} />
          <div className="section-heading">
            <div>
              <h2>
                Your projects <span>{projects.data?.total ?? 0}</span>
              </h2>
              <p>A little closer to the finish line.</p>
            </div>
            <Link to="/app/projects" className="text-link">
              View all projects <ArrowRight size={15} />
            </Link>
          </div>
          {projects.isPending ? (
            <Loading compact />
          ) : projects.error ? (
            <ErrorState error={projects.error} />
          ) : projects.data.items.length ? (
            <div className="project-grid">
              {projects.data.items.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <div className="panel">
              <Empty
                title="Big things start with a project"
                description="Give your next idea a home."
                action={
                  workspace.canManage && (
                    <Button onClick={() => setCreate(true)}>Create a project</Button>
                  )
                }
              />
            </div>
          )}
          <div className="dashboard-charts">
            <ProgressChart data={stats.data} />
            <StatusChart data={stats.data} />
          </div>
          <div className="dashboard-bottom">
            <section className="panel">
              <header className="panel-header">
                <div>
                  <h2>On your radar</h2>
                  <p>Your next small wins.</p>
                </div>
                <Link to="/app/my-tasks" className="text-link">
                  View all <ArrowRight size={14} />
                </Link>
              </header>
              {stats.data.assigned.length ? (
                <div className="dashboard-tasks">
                  {stats.data.assigned.map((t) => (
                    <Link to={`/app/projects/${t.projectId}?task=${t.id}`} key={t.id}>
                      <Circle size={17} />
                      <div>
                        <strong>{t.title}</strong>
                        <span>
                          <i style={{ background: t.project.color }} />
                          {t.project.name}
                        </span>
                      </div>
                      <Badge value={t.priority} />
                      <small>{date(t.dueDate)}</small>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={<CheckCircle2 size={25} />}
                  title="A little breathing room"
                  description="Your assigned tasks will appear here."
                />
              )}
            </section>
            <section className="panel">
              <header className="panel-header">
                <div>
                  <h2>Team activity</h2>
                  <p>Good work happens together.</p>
                </div>
                <Link to="/app/activity" className="text-link">
                  <ArrowRight size={16} />
                  <span className="sr-only">View activity</span>
                </Link>
              </header>
              {stats.data.activity.length ? (
                <ActivityFeed items={stats.data.activity.slice(0, 4)} />
              ) : (
                <Empty
                  title="Your story starts now"
                  description="Team activity will appear here."
                />
              )}
            </section>
          </div>
          {stats.data.deadlines.length > 0 && (
            <section className="panel deadline-panel">
              <header className="panel-header">
                <h2>Coming up soon</h2>
                <span className="subtle-pill">Next 14 days</span>
              </header>
              <div className="deadline-list">
                {stats.data.deadlines.map((t) => (
                  <Link key={t.id} to={`/app/projects/${t.projectId}?task=${t.id}`}>
                    <CalendarDays size={17} />
                    <span>
                      {t.title}
                      <small>{t.project.name}</small>
                    </span>
                    <strong>{date(t.dueDate)}</strong>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      <ProjectDialog open={create} onClose={() => setCreate(false)} />
    </>
  );
}
