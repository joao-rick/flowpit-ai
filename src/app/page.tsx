import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadDashboardOverview, type DashboardOverview } from "@/lib/dashboard/service";
import { signOut } from "@/app/auth/actions";
import {
  Activity,
  ArrowUpRight,
  BookOpenText,
  Boxes,
  Check,
  CircleHelp,
  CirclePlus,
  ChevronsUpDown,
  Clock3,
  GitBranch,
  GitPullRequest,
  LayoutDashboard,
  ListTodo,
  Settings2,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

const setupSteps = [
  { title: "Create your first project", detail: "Give your work a home", icon: CirclePlus, href: "/projects" },
  { title: "Connect a repository", detail: "Bring in open issues", icon: GitBranch, href: "#integrations" },
  { title: "Choose an AI provider", detail: "Keep your key on the server", icon: Sparkles, href: "#integrations" },
  { title: "Run your first analysis", detail: "Review every agent step", icon: ListTodo, href: "#analyses" },
];

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return "—";
  if (durationMs < 1000) return `${durationMs} ms`;
  const seconds = durationMs / 1000;
  return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)} s`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export const instant = false;

export default async function Home() {
  let overview: DashboardOverview | null = null;
  let dataError = false;
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) redirect("/auth/login");
    try {
      overview = await loadDashboardOverview(supabase);
      dataError = overview.partial;
    } catch {
      dataError = true;
    }
  }

  const projectCount = overview?.projectCount ?? 0;
  const repositoryCount = overview?.repositoryCount ?? 0;
  const analysisCount = overview?.analysisCount ?? 0;
  const providerReady = Boolean(process.env.OPENAI_API_KEY);
  const completionStates = [projectCount > 0, repositoryCount > 0, providerReady, analysisCount > 0];
  const progress = completionStates.filter(Boolean).length;
  const nextStepIndex = completionStates.findIndex((complete) => !complete);
  const integrationsConfigured = Boolean(overview?.repositoryCount || providerReady);
  const navigation = [
    { label: "Overview", href: "#overview", icon: LayoutDashboard },
    { label: "Analyses", href: "#analyses", icon: Workflow, count: overview && !dataError ? String(analysisCount) : "—" },
    { label: "Projects", href: "/projects", icon: Boxes },
  ];

  return (
    <div className="app-frame" id="overview">
      <aside className="sidebar" aria-label="Workspace navigation">
        <Link className="brand" href="#overview" aria-label="FlowPilot home">
          <span className="brand-mark" aria-hidden="true"><Workflow size={19} strokeWidth={2.1} /></span>
          <span className="brand-name">flowpilot<span>.ai</span></span>
        </Link>

        <div className="workspace-switcher" aria-label="FlowPilot workspace">
          <span className="workspace-avatar">F</span>
          <span className="workspace-copy"><strong>FlowPilot workspace</strong><small>{isSupabaseConfigured() ? "Account workspace" : "Setup preview"}</small></span>
          <ChevronsUpDown className="switcher-chevrons" size={14} aria-hidden="true" />
        </div>

        <div className="nav-group">
          <p className="nav-label">Workspace</p>
          {navigation.map(({ label, href, icon: Icon, count }) => (
            <a className={`nav-link${label === "Overview" ? " is-active" : ""}`} href={href} key={label} aria-label={label}>
              <Icon size={16} strokeWidth={1.8} /><span>{label}</span>{count && <span className="nav-count">{count}</span>}
            </a>
          ))}
        </div>

        <div className="nav-group nav-group-lower">
          <p className="nav-label">Manage</p>
          <a className="nav-link" href="#integrations" aria-label="Integrations"><GitPullRequest size={16} strokeWidth={1.8} /><span>Integrations</span>{!integrationsConfigured && <span className="nav-dot" />}</a>
          <a className="nav-link" href="#activity" aria-label="Activity"><Activity size={16} strokeWidth={1.8} /><span>Activity</span></a>
          <a className="nav-link" href="#settings" aria-label="Settings"><Settings2 size={16} strokeWidth={1.8} /><span>Settings</span></a>
        </div>

        <div className="sidebar-spacer" />
        <div className="sidebar-bottom">
          <div className="plan-note"><span className="plan-indicator" />Setup in progress <span>{progress}/4</span></div>
          <a className="nav-link help-link" href="#getting-started" aria-label="Getting started"><CircleHelp size={16} strokeWidth={1.8} /><span>Getting started</span><ArrowUpRight size={13} /></a>
          {isSupabaseConfigured() ? <form action={signOut} className="user-row"><span className="user-avatar">FP</span><span className="user-copy"><strong>Signed in</strong><small>Workspace member</small></span><button className="signout-button" type="submit">Sign out</button></form> : <div className="user-row"><span className="user-avatar">FP</span><span className="user-copy"><strong>Setup view</strong><small>No account connected</small></span></div>}
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-actions"><span className="environment-badge"><span /> {isSupabaseConfigured() ? "Workspace" : "Setup mode"}</span><a className="icon-button" href="#getting-started" aria-label="Getting started"><CircleHelp size={17} /></a><span className="top-avatar">FP</span></div>
        </header>

        <div className="content-wrap">
          <section className="page-heading">
            <div><p className="eyebrow"><span className="eyebrow-rule" />YOUR ENGINEERING WORKSPACE</p><h1>Good work starts<br className="mobile-break" /> with a clear queue.</h1><p className="heading-copy">Set up your workspace to turn incoming issues into decisions your team can trust.</p></div>
            <div className="heading-meta"><span className="meta-icon"><Clock3 size={15} /></span><span>Workspace status<br /><strong>{isSupabaseConfigured() ? "Connected" : "Setup preview"}</strong></span></div>
          </section>

          <section className="readiness-band" aria-label="Setup readiness">
            <div className="readiness-copy"><span className="readiness-mark"><Workflow size={18} /></span><div><strong>{dataError ? "Workspace data could not be loaded" : "Your workspace is ready to configure"}</strong><p>{dataError ? "Check the database connection and migration status, then refresh." : "Connect the pieces before your first real analysis."}</p></div></div>
            <div className="readiness-progress"><div className="progress-label"><span>Setup progress</span><strong>{dataError ? "Unavailable" : `${progress} of 4`}</strong></div><div className="progress-track" role="progressbar" aria-label="Workspace setup progress" aria-valuemin={0} aria-valuemax={4} aria-valuenow={dataError ? undefined : progress} aria-valuetext={dataError ? "Unavailable" : `${progress} of 4 steps complete`}><span style={{ width: `${dataError ? 0 : progress * 25}%` }} /></div></div>
          </section>

          {overview && !dataError && <section className="metrics-strip" aria-label="Workspace metrics">
            <div><span>Issue assessments</span><strong>{overview.assessedIssueCount}</strong></div>
            <div><span>Open issues</span><strong>{overview.activeIssues}</strong></div>
            <div><span>Analyses</span><strong>{overview.analysisCount}</strong></div>
            <div><span>Critical assessments</span><strong className={overview.criticalFindingCount ? "critical-value" : ""}>{overview.criticalFindingCount}</strong></div>
            <div><span>Completed runs</span><strong>{overview.completedCount}</strong></div>
            <div><span>Average duration</span><strong>{formatDuration(overview.averageDurationMs)}</strong></div>
          </section>}

          <section className="setup-section" id="getting-started">
            <div className="section-heading"><div><p className="section-kicker">FIRST RUN</p><h2>Make this workspace yours</h2><p className="section-description">Four short steps connect your work to a traceable analysis.</p></div><a className="text-link" href="#setup-notes">Read setup guide <ArrowUpRight size={14} /></a></div>
            <div className="setup-layout">
              <ol className="setup-list">
                {setupSteps.map(({ title, detail, icon: Icon, href }, index) => {
                  const done = completionStates[index];
                  const state = done ? "done" : index === nextStepIndex && isSupabaseConfigured() ? "next" : "locked";
                  return <li className={`setup-step ${state}`} key={title}>
                    <span className="step-marker">{done ? <Check size={14} /> : state === "next" ? <Icon size={16} /> : <span>{index + 1}</span>}</span>
                    <span className="step-copy"><strong>{title}</strong><small>{detail}</small></span>
                    {state === "next" ? <Link className="step-status" href={href}>NEXT UP</Link> : <span className="step-status muted">{done ? "DONE" : !isSupabaseConfigured() && index === 0 ? "SET UP" : "LOCKED"}</span>}
                  </li>;
                })}
              </ol>
              <aside className="setup-aside" id="setup-notes">
                <div className="aside-top"><span className="aside-icon"><ShieldCheck size={17} /></span><span className="aside-tag">PRIVATE BY DESIGN</span></div>
                <h3>Your keys stay yours.</h3>
                <p>When connected, provider credentials stay server-side and issue text is treated as untrusted evidence.</p>
                <a href="#integrations" className="aside-link">How connections work <ArrowUpRight size={13} /></a>
              </aside>
            </div>
          </section>

          <section className="work-section" id="analyses">
            <div className="work-section-heading"><div><p className="section-kicker">WORK QUEUE</p><h2>{overview?.recentRuns.length ? "Recent analyses" : "Nothing in the queue yet"}</h2></div><span className="quiet-pill"><span /> {overview?.recentRuns.length ? `${analysisCount} total runs` : "Waiting for a project"}</span></div>
            {overview?.recentRuns.length ? <div className="recent-runs">{overview.recentRuns.map((run) => <Link href={`/analyses/${run.id}`} className="run-row" key={run.id}><span className={`run-state ${run.status}`}>{run.status.replaceAll("_", " ")}</span><span className="run-title">{run.request_text}</span><span className="run-duration">{formatDuration(run.duration_ms)}</span><time dateTime={run.created_at}>{formatDate(run.created_at)}</time></Link>)}</div> : <div className="empty-work">
              <div className="empty-illustration" aria-hidden="true"><div className="trace-node node-one"><Check size={13} /></div><div className="trace-node node-two"><GitPullRequest size={13} /></div><div className="trace-node node-three"><Sparkles size={13} /></div><span className="trace-line trace-line-one" /><span className="trace-line trace-line-two" /></div>
              <div className="empty-copy"><h3>Your first analysis will show up here.</h3><p>Once a project is connected, you can select issues and follow each agent from intake to recommendation.</p><Link href="/projects" className="empty-link">See project setup <ArrowUpRight size={14} /></Link></div>
              <div className="empty-foot"><BookOpenText size={15} /><span>Every run keeps its inputs, evidence, and decisions together.</span></div>
            </div>}
          </section>

          <section className="lower-grid">
            <div className="lower-section" id="projects"><div className="lower-heading"><div><p className="section-kicker">PROJECTS</p><h2>{dataError ? "Project data unavailable" : !overview ? "Storage not connected" : projectCount ? `${projectCount} project${projectCount === 1 ? "" : "s"}` : "No projects yet"}</h2></div><Boxes size={17} /></div><p>Projects keep repositories, issues, and analysis history in one place.</p><Link href="/projects" className="subtle-link">Manage projects <ArrowUpRight size={13} /></Link></div>
            <div className="lower-section" id="integrations"><div className="lower-heading"><div><p className="section-kicker">CONNECTIONS</p><h2>{dataError ? "Connection status unavailable" : integrationsConfigured ? "Connections configured" : "Nothing connected"}</h2></div><GitBranch size={17} /></div><p>{dataError ? "Reconnect the database to check saved repository links." : overview ? `Connected public repositories: ${overview.repositoryCount}.` : "Public repository links are saved after Supabase is configured."} AI provider: {providerReady ? "server key present" : "not configured"}.</p><span className={`not-configured${integrationsConfigured && !dataError ? " is-configured" : ""}`}><span /> {dataError ? "Status unknown" : integrationsConfigured ? "Partially configured" : "Not configured"}</span></div>
          </section>

          {overview && <section className="activity-section" id="activity"><div className="activity-heading"><div><p className="section-kicker">AUDIT TRAIL</p><h2>Recent activity</h2></div><Activity size={16} /></div>{overview.activity.length ? <ul>{overview.activity.map((event) => <li key={event.id}><span className="activity-marker" /><span><strong>{event.action.replaceAll("_", " ")}</strong><small>{event.actor_type} activity</small></span><time dateTime={event.created_at}>{formatDate(event.created_at)}</time></li>)}</ul> : <p className="activity-empty">Activity will appear here as projects and analyses are created.</p>}</section>}

          <footer className="page-footer"><span>FlowPilot AI <span className="footer-separator">/</span> Workspace overview</span><span><Link href="/product">About FlowPilot</Link> · Built for decisions you can trace.</span></footer>
        </div>
      </main>
    </div>
  );
}
