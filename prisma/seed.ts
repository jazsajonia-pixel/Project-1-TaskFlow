import 'dotenv/config';
import { PrismaClient, type TaskStatus, type Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db = new PrismaClient();
const email = process.env.DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;
if (process.env.NODE_ENV === 'production') throw new Error('Seeding is disabled in production');
if (!email || !password || password.length < 10)
  throw new Error('Set DEMO_EMAIL and a DEMO_PASSWORD of at least 10 characters in .env');
const passwordHash = await bcrypt.hash(password, 12);
const today = new Date();
const day = (offset: number) => new Date(today.getTime() + offset * 86400000);
try {
  const user = await db.user.upsert({
    where: { email },
    create: {
      email,
      name: 'Jazz Sajonia',
      passwordHash,
      emailVerified: true,
      bio: 'Building thoughtful digital experiences. One small win at a time.',
    },
    update: { passwordHash },
  });
  if (await db.workspace.findFirst({ where: { ownerId: user.id, name: 'Studio workspace' } })) {
    console.info('Demo workspace already exists. No duplicate seed data created.');
  } else {
    const people = await Promise.all(
      [
        { name: 'Maria Kim', email: 'maria@taskflow.local' },
        { name: 'Alex Santos', email: 'alex@taskflow.local' },
        { name: 'Jamie Lee', email: 'jamie@taskflow.local' },
      ].map((p) =>
        db.user.upsert({
          where: { email: p.email },
          create: {
            ...p,
            passwordHash: bcrypt.hashSync(crypto.randomUUID(), 12),
            emailVerified: true,
          },
          update: {},
        }),
      ),
    );
    const workspace = await db.workspace.create({
      data: {
        name: 'Studio workspace',
        description: 'A shared home for thoughtful ideas and great digital experiences.',
        ownerId: user.id,
        members: {
          create: [
            { userId: user.id, role: 'OWNER' },
            ...people.map((p, i) => ({
              userId: p.id,
              role: i === 0 ? ('ADMIN' as const) : ('MEMBER' as const),
            })),
          ],
        },
      },
    });
    const projectDefinitions = [
      {
        name: 'Portfolio Website',
        description: 'A fresh look. A better experience. A little more us.',
        color: '#9982cb',
        due: 18,
      },
      {
        name: 'Mobile App',
        description: 'Make everyday moments simpler, wherever you are.',
        color: '#85a9ce',
        due: 30,
      },
      {
        name: 'Brand Refresh',
        description: 'A thoughtful new chapter for our visual identity.',
        color: '#c7a285',
        due: 12,
      },
    ];
    const definitions = [
      [
        'Explore homepage concepts',
        'A few fresh directions for our first impression.',
        'TODO',
        'MEDIUM',
        'Design',
      ],
      [
        'Build the component library',
        'Small pieces. A consistent experience across every screen.',
        'IN_PROGRESS',
        'HIGH',
        'Frontend',
      ],
      [
        'Get to know our users',
        'Listen first. Design second. Gather feedback from the team.',
        'DONE',
        'LOW',
        'Research',
      ],
      [
        'Bring the dashboard to life',
        'Make the important things feel effortless.',
        'IN_PROGRESS',
        'HIGH',
        'Frontend',
      ],
      [
        'Review mobile navigation',
        'Check touch targets, keyboard focus, and responsive layouts.',
        'IN_REVIEW',
        'MEDIUM',
        'Design',
      ],
      [
        'Authentication API',
        'Secure sessions, validation, and thoughtful error messages.',
        'IN_PROGRESS',
        'URGENT',
        'Backend',
      ],
      [
        'Kick things off together',
        'Align on goals and agree on what a great outcome looks like.',
        'DONE',
        'LOW',
        'Planning',
      ],
      [
        'Write the onboarding copy',
        'A welcoming first step. Keep it clear and human.',
        'TODO',
        'LOW',
        'Content',
      ],
      [
        'Polish the project cards',
        'Refine spacing, hierarchy, and those little finishing touches.',
        'IN_REVIEW',
        'MEDIUM',
        'Design',
      ],
      [
        'Document the API',
        'Give the team a clear reference for every endpoint.',
        'DONE',
        'MEDIUM',
        'Backend',
      ],
      [
        'Gather a little inspiration',
        'Good ideas are everywhere. Collect references and patterns.',
        'TODO',
        'LOW',
        'Research',
      ],
      [
        'Set up the design tokens',
        'A shared vocabulary for color, type, and space.',
        'DONE',
        'MEDIUM',
        'Design',
      ],
    ];
    for (const [index, p] of projectDefinitions.entries()) {
      const project = await db.project.create({
        data: {
          workspaceId: workspace.id,
          name: p.name,
          description: p.description,
          color: p.color,
          status: index === 2 ? 'PLANNING' : 'ACTIVE',
          createdBy: user.id,
          startDate: day(-12),
          dueDate: day(p.due),
          members: {
            create: [user, ...people.slice(0, index === 1 ? 2 : 3)].map((u) => ({ userId: u.id })),
          },
        },
      });
      const labels = await Promise.all(
        ['Design', 'Frontend', 'Backend', 'Research', 'Planning', 'Content'].map((name, i) =>
          db.label.create({
            data: {
              projectId: project.id,
              name,
              color: ['#9982cb', '#7da8cb', '#be9674', '#80a68e', '#ab90b8', '#c7a66f'][i],
            },
          }),
        ),
      );
      for (const [i, t] of definitions.slice(0, index === 0 ? 12 : index === 1 ? 8 : 5).entries()) {
        const status = t[2] as TaskStatus;
        const assignee = [user, ...people][i % 4];
        const task = await db.task.create({
          data: {
            projectId: project.id,
            title: t[0],
            description: t[1],
            status,
            priority: t[3] as Priority,
            createdBy: user.id,
            position: (i + 1) * 1024,
            dueDate: day(i === 5 ? -2 : i + 1),
            createdAt: day(-(i % 7)),
            completedAt: status === 'DONE' ? day(-(i % 5)) : null,
            assignees: { create: { userId: assignee.id } },
            labels: { create: { labelId: labels.find((l) => l.name === t[4])!.id } },
            subtasks:
              i % 3 === 0
                ? {
                    create: [
                      { title: 'Gather requirements', completed: true },
                      { title: 'Create first draft', completed: status === 'DONE' },
                      { title: 'Review with the team', completed: status === 'DONE' },
                    ],
                  }
                : undefined,
          },
        });
        if (i < 4)
          await db.comment.create({
            data: {
              taskId: task.id,
              userId: people[i % people.length].id,
              body: [
                'The direction is looking good. Let’s review the first draft together.',
                'I’ve added the latest notes. Ready for your feedback!',
                'A small step forward — the foundation is in place.',
                'Thanks for the thoughtful work on this. Looking forward to the next iteration.',
              ][i],
            },
          });
        await db.activityLog.create({
          data: {
            workspaceId: workspace.id,
            projectId: project.id,
            actorId: assignee.id,
            action:
              status === 'DONE'
                ? 'completed task'
                : status === 'IN_PROGRESS'
                  ? 'started working on'
                  : 'created task',
            entity: 'task',
            entityId: task.id,
            metadata: { title: task.title },
            createdAt: new Date(today.getTime() - (index * 12 + i) * 45 * 60000),
          },
        });
        if (index === 0 && i < 3)
          await db.notification.create({
            data: {
              userId: user.id,
              type: i === 0 ? 'TASK_ASSIGNED' : i === 1 ? 'COMMENT' : 'TASK_MENTION',
              title: ['A new task for you', 'Maria shared an update', 'Alex mentioned you'][i],
              body: task.title,
              href: `/app/projects/${project.id}?task=${task.id}`,
              readAt: i === 2 ? day(-1) : null,
            },
          });
      }
    }
    console.info(
      'Demo workspace, projects, tasks, members, comments, and notifications created. Sign in using your configured DEMO_EMAIL and DEMO_PASSWORD.',
    );
  }
} finally {
  await db.$disconnect();
}
