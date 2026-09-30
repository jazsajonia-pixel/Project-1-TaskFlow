import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Plus,
  LayoutDashboard,
  FolderKanban,
  Users,
  BarChart3,
  Bell,
  Zap,
  CheckSquare,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Circle,
  MessageSquare,
  CalendarDays,
} from 'lucide-react';
import { useState } from 'react';
import { Logo, CheckItem } from '../components/common';
import { Button } from '../components/ui/button';
const features = [
  {
    icon: FolderKanban,
    title: 'Big ideas, clear plans.',
    description:
      'Give every project a home. Set the direction, organize the details, and keep everyone on the same page.',
  },
  {
    icon: LayoutDashboard,
    title: 'Find your flow.',
    description:
      'Turn to-dos into done with flexible Kanban boards. Drag, drop, and see the bigger picture.',
  },
  {
    icon: Users,
    title: 'Better, together.',
    description:
      'Bring the right people into the conversation. Assign work, share files, and build something great.',
  },
  {
    icon: Zap,
    title: 'Always in sync.',
    description:
      'See changes as they happen. Live updates keep your team moving together, wherever they are.',
  },
  {
    icon: BarChart3,
    title: 'Progress you can see.',
    description:
      'Turn everyday effort into a clear view of what’s moving, what’s done, and what needs a little attention.',
  },
  {
    icon: Bell,
    title: 'A little more in the loop.',
    description:
      'Stay close to the work that matters with thoughtful updates, mentions, and upcoming deadlines.',
  },
];
export default function Landing() {
  const [mobile, setMobile] = useState(false);
  return (
    <div className="landing">
      <header className="landing-nav">
        <Logo />
        <nav className={mobile ? 'landing-links open' : 'landing-links'}>
          <a href="#features" onClick={() => setMobile(false)}>
            Features
          </a>
          <a href="#how-it-works" onClick={() => setMobile(false)}>
            How it works
          </a>
          <a href="/api/docs" target="_blank" rel="noreferrer">
            Documentation <ArrowUpRight size={12} />
          </a>
        </nav>
        <div className="landing-nav-actions">
          <Link to="/login" className="landing-signin">
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link to="/register">
              Get started <ArrowRight size={15} />
            </Link>
          </Button>
          <button
            className="icon-button mobile-only"
            aria-label="Toggle menu"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-glow" />
          <div className="hero-copy">
            <div className="hero-badge">
              <span>
                <Sparkles size={13} />
              </span>{' '}
              LESS CHAOS. MORE CLARITY. <ChevronRight size={13} />
            </div>
            <h1>
              Manage projects.
              <br />
              <span>Empower teams.</span>
            </h1>
            <p>
              Your projects, people, and progress. All in one happy place.
              <br className="desktop-break" /> TaskFlow brings a little clarity to your day — so
              your team
              <br className="desktop-break" /> can focus on doing great things.
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link to="/register">
                  Get started — it’s free <ArrowRight size={18} />
                </Link>
              </Button>
              <a href="#product" className="hero-tour">
                See how it works{' '}
                <span>
                  <ChevronRight size={15} />
                </span>
              </a>
            </div>
            <div className="hero-checks">
              <CheckItem>No credit card needed</CheckItem> <CheckItem>Set up in minutes</CheckItem>
            </div>
          </div>
          <div className="hero-product" id="product">
            <div className="preview-caption">
              <span className="live-dot" /> A PLACE FOR YOUR TEAM TO DO ITS BEST WORK{' '}
              <span>PRODUCT PREVIEW</span>
            </div>
            <ProductPreview />
            <div className="floating-complete">
              <span>
                <Check size={17} />
              </span>
              <div>
                <strong>Another small win.</strong>
                <small>Great things start with a little progress.</small>
              </div>
              <span className="complete-spark">✦</span>
            </div>
            <div className="floating-team">
              <div className="preview-avatar lavender">JL</div>
              <div className="preview-avatar mint">MK</div>
              <div className="preview-avatar peach">AS</div>
              <span>
                Better, together.<i>✦</i>
              </span>
            </div>
          </div>
          <div className="hero-footnote">
            <span>FOR EVERY TEAM WITH A BIG IDEA</span>
            <div>
              <span>
                <FolderKanban size={19} /> Product teams
              </span>
              <span>
                <Sparkles size={19} /> Creative studios
              </span>
              <span>
                <Zap size={19} /> Fast-moving startups
              </span>
              <span>
                <Users size={19} /> Your next project
              </span>
            </div>
          </div>
        </section>
        <section className="features-section" id="features">
          <div className="section-intro">
            <span className="eyebrow">EVERYTHING YOU NEED. ROOM TO BREATHE.</span>
            <h2>
              Good work starts
              <br />
              with a little clarity.
            </h2>
            <p>
              From the first “what if” to the final “we did it.”
              <br />A thoughtful set of tools for every step in between.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((f) => (
              <article key={f.title}>
                <span className="feature-icon">
                  <f.icon size={22} strokeWidth={1.7} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="how-section" id="how-it-works">
          <div className="section-intro">
            <span className="eyebrow">FROM IDEA TO DONE</span>
            <h2>Less setup. More momentum.</h2>
            <p>A fresh start for the way your team works.</p>
          </div>
          <div className="steps-grid">
            {[
              {
                title: 'Make yourself at home.',
                text: 'Create a workspace, start your first project, and give your next big idea a little structure.',
              },
              {
                title: 'Bring your people.',
                text: 'Invite your team, assign roles, and make sure everyone has a place at the table.',
              },
              {
                title: 'Find your rhythm.',
                text: 'Break work into small steps, move tasks forward, and celebrate every little win.',
              },
            ].map((s, i) => (
              <article key={s.title}>
                <span>0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-cta">
          <div className="cta-spark">✦</div>
          <span className="eyebrow">YOUR NEXT GREAT THING STARTS HERE</span>
          <h2>
            A little less busy.
            <br />A lot more done.
          </h2>
          <p>Give your team the space to do their best work.</p>
          <Button asChild>
            <Link to="/register">
              Create your workspace <ArrowRight size={17} />
            </Link>
          </Button>
          <small>Free to get started. Built to grow with you.</small>
        </section>
      </main>
      <footer className="landing-footer">
        <div>
          <Logo />
          <p>A little clarity. A lot of possibility.</p>
        </div>
        <div>
          <h3>Product</h3>
          <a href="#features">Features</a>
          <a href="#product">Product preview</a>
          <Link to="/register">Get started</Link>
        </div>
        <div>
          <h3>Resources</h3>
          <a href="/api/docs" target="_blank" rel="noreferrer">
            Documentation
          </a>
          <a
            href="https://github.com/jazsajonia-pixel/Project-1-TaskFlow"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ArrowUpRight size={12} />
          </a>
          <a
            href="https://github.com/jazsajonia-pixel/Project-1-TaskFlow/issues"
            target="_blank"
            rel="noreferrer"
          >
            Contact
          </a>
        </div>
        <div>
          <h3>The details</h3>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/login">Sign in</Link>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} TaskFlow. All rights reserved.</span>
          <span>
            Made for focused teams. <span className="purple">✦</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
function ProductPreview() {
  return (
    <div className="product-preview" aria-label="Illustrative TaskFlow project board">
      <aside aria-hidden="true">
        <div className="preview-logo">
          <span>»</span> taskflow.
        </div>
        <div className="preview-workspace">
          <span>S</span>
          <div>
            Studio workspace<small>Your team’s happy place</small>
          </div>
        </div>
        <div className="preview-nav">
          <span>
            <LayoutDashboard size={13} /> Overview
          </span>
          <span className="active">
            <FolderKanban size={13} /> Projects <i>3</i>
          </span>
          <span>
            <CheckSquare size={13} /> My tasks
          </span>
          <span>
            <Bell size={13} /> Inbox <i>2</i>
          </span>
        </div>
        <small className="preview-nav-label">YOUR PROJECTS</small>
        <div className="preview-projects">
          <span>
            <i /> Website redesign
          </span>
          <span>
            <i /> Mobile app
          </span>
          <span>
            <i /> Brand refresh
          </span>
        </div>
        <div className="preview-bottom">
          <div className="preview-avatar lavender">JL</div>
          <span>
            Jamie Lee<small>Personal account</small>
          </span>
        </div>
      </aside>
      <div className="preview-main" aria-hidden="true">
        <div className="preview-topbar">
          Studio workspace <ChevronRight size={11} /> Projects{' '}
          <span>
            <Bell size={13} />
            <div className="preview-avatar lavender">JL</div>
          </span>
        </div>
        <div className="preview-heading">
          <div>
            <small>LET’S MAKE SOMETHING GREAT</small>
            <h3>
              Website redesign <span>✦</span>
            </h3>
            <p>A fresh look. A better experience. A little more us.</p>
          </div>
          <span className="preview-button">
            <Plus size={12} /> New task
          </span>
        </div>
        <div className="preview-tabs">
          <span>Overview</span>
          <span className="active">Board</span>
          <span>Tasks</span>
          <span>Members</span>
          <span>Files</span>
          <span className="preview-live">
            <i /> Live
          </span>
        </div>
        <div className="preview-board">
          {[
            {
              title: 'To do',
              key: 'todo',
              cards: [
                {
                  label: 'Design',
                  title: 'Explore homepage concepts',
                  description: 'A few fresh directions for our first impression.',
                  color: 'lavender',
                  priority: 'Medium',
                  initials: 'JL',
                },
                {
                  label: 'Research',
                  title: 'Gather a little inspiration',
                  description: 'Good ideas are everywhere.',
                  color: 'mint',
                  priority: 'Low',
                  initials: 'AS',
                },
              ],
            },
            {
              title: 'In progress',
              key: 'in_progress',
              cards: [
                {
                  label: 'Development',
                  title: 'Build the component library',
                  description: 'Small pieces. A consistent experience.',
                  color: 'blue',
                  priority: 'High',
                  initials: 'MK',
                },
                {
                  label: 'Design',
                  title: 'Bring the dashboard to life',
                  description: 'Make the important things feel effortless.',
                  color: 'lavender',
                  priority: 'Medium',
                  initials: 'JL',
                },
              ],
            },
            {
              title: 'Done',
              key: 'done',
              cards: [
                {
                  label: 'Planning',
                  title: 'Kick things off together',
                  description: 'A shared vision for what comes next.',
                  color: 'peach',
                  priority: 'Low',
                  initials: 'AS',
                },
                {
                  label: 'Research',
                  title: 'Get to know our users',
                  description: 'Listen first. Design second.',
                  color: 'mint',
                  priority: 'Medium',
                  initials: 'MK',
                },
              ],
            },
          ].map((col) => (
            <div className="preview-column" key={col.key}>
              <header>
                <span className={`status-dot ${col.key}`} />
                {col.title}
                <i>2</i>
                <Plus size={12} />
              </header>
              {col.cards.map((c, i) => (
                <div
                  className={`preview-task ${col.key === 'done' ? 'preview-done' : ''}`}
                  key={c.title}
                >
                  <span className={`preview-label ${c.color}`}>{c.label}</span>
                  <h4>
                    {col.key === 'done' && <Check size={11} />}
                    {c.title}
                  </h4>
                  <p>{c.description}</p>
                  <div className="preview-task-priority">
                    <span>
                      <Circle size={8} /> {c.priority}
                    </span>
                    <span>
                      <CalendarDays size={9} /> Oct {12 + i}
                    </span>
                  </div>
                  <footer>
                    <span>
                      <MessageSquare size={10} /> {i + 2}
                    </span>
                    <div className={`preview-avatar ${c.color}`}>{c.initials}</div>
                  </footer>
                </div>
              ))}
              <div className="preview-add">
                <Plus size={11} /> Add task
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
