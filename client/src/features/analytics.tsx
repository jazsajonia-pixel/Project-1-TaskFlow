import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { FolderKanban, CheckCircle2, ListTodo, Clock3, ArrowUpRight } from 'lucide-react';
import type { Analytics } from '../types';
import { pretty } from '../lib/utils';
export function Stats({ data }: { data: Analytics }) {
  const cards = [
    {
      label: 'Total projects',
      value: data.projects,
      icon: FolderKanban,
      color: 'purple',
      note: 'Ideas moving forward',
    },
    {
      label: 'Open tasks',
      value: data.open,
      icon: ListTodo,
      color: 'blue',
      note: 'One step at a time',
    },
    {
      label: 'Completed tasks',
      value: data.completed,
      icon: CheckCircle2,
      color: 'green',
      note: `${data.completion}% of all tasks`,
    },
    {
      label: 'Overdue tasks',
      value: data.overdue,
      icon: Clock3,
      color: 'orange',
      note: data.overdue ? 'A little attention needed' : 'Right on track',
    },
  ];
  return (
    <div className="stats-grid">
      {cards.map((c) => (
        <article className="stat-card" key={c.label}>
          <div className="stat-top">
            <span>{c.label}</span>
            <span className={`stat-icon ${c.color}`}>
              <c.icon size={18} />
            </span>
          </div>
          <strong>{c.value.toLocaleString()}</strong>
          <p>
            <span className={c.color}>
              <ArrowUpRight size={13} />
            </span>
            {c.note}
          </p>
        </article>
      ))}
    </div>
  );
}
export function ProgressChart({ data }: { data: Analytics }) {
  return (
    <section className="panel chart-panel">
      <header className="panel-header">
        <div>
          <h2>Task activity</h2>
          <p>Small steps. Meaningful progress.</p>
        </div>
        <span className="subtle-pill">Last 7 days</span>
      </header>
      <div className="chart-legend">
        <span>
          <i style={{ background: '#635bff' }} /> Completed
        </span>
        <span>
          <i style={{ background: '#c7c4ff' }} /> Created
        </span>
      </div>
      <div
        className="area-chart"
        role="img"
        aria-label={`${data.completed} completed tasks, ${data.total} total tasks. Seven-day task activity chart.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.timeline} margin={{ left: -25, right: 8, top: 15, bottom: 0 }}>
            <defs>
              <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#635bff" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#635bff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#93929e', fontSize: 11 }}
              dy={8}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#93929e', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="created"
              stroke="#c7c4ff"
              strokeWidth={2}
              fill="transparent"
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="#635bff"
              strokeWidth={2.5}
              fill="url(#taskGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
const colors = ['#635bff', '#a79fff', '#ddd9ff', '#eeeaf8'];
export function StatusChart({ data }: { data: Analytics }) {
  return (
    <section className="panel status-panel">
      <header className="panel-header">
        <div>
          <h2>Work at a glance</h2>
          <p>Every task has its place.</p>
        </div>
      </header>
      <div className="donut-chart">
        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                rootTabIndex={-1}
                data={data.byStatus.length ? data.byStatus : [{ name: 'No tasks', value: 1 }]}
                dataKey="value"
                innerRadius={57}
                outerRadius={73}
                paddingAngle={4}
                stroke="none"
              >
                {(data.byStatus.length ? data.byStatus : [{ name: 'empty' }]).map((s, i) => (
                  <Cell key={s.name} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="donut-center">
          <strong>{data.completion}%</strong>
          <span>complete</span>
        </div>
      </div>
      <div className="status-legend">
        {data.byStatus.map((s, i) => (
          <div key={s.name}>
            <i style={{ background: colors[i % colors.length] }} />
            <span>{pretty(s.name)}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
        {!data.total && <p className="muted">Create a task to get started.</p>}
      </div>
    </section>
  );
}
