import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, FolderKanban } from 'lucide-react';
import { Avatars, Badge, Progress } from '../components/common';
import { date } from '../lib/utils';
import type { Project } from '../types';
export function ProjectCard({ project }: { project: Project }) {
  const progress = project._count.tasks
    ? Math.round((project.completedTasks / project._count.tasks) * 100)
    : 0;
  return (
    <Link className="project-card" to={`/app/projects/${project.id}`}>
      <div className="project-card-top">
        <span
          className="project-card-icon"
          style={{ color: project.color, background: `${project.color}13` }}
        >
          <FolderKanban size={21} />
        </span>
        <Badge value={project.status} />
        <ArrowUpRight size={17} className="project-card-arrow" />
      </div>
      <h3>{project.name}</h3>
      <p>{project.description || 'A fresh space for your team’s next great idea.'}</p>
      <div className="project-progress-label">
        <span>Progress</span>
        <span>
          <strong>{project.completedTasks}</strong> / {project._count.tasks} tasks
        </span>
      </div>
      <Progress value={progress} color={project.color} />
      <div className="project-card-footer">
        <Avatars people={project.members.map((m) => m.user)} />
        <span>
          <CalendarDays size={13} />
          {date(project.dueDate)}
        </span>
      </div>
    </Link>
  );
}
