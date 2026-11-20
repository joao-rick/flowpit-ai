import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Boxes, CirclePlus, GitBranch, History } from "lucide-react";
import { ProjectForm } from "@/app/projects/ProjectForm";
import { listProjects, listProjectRepositories } from "@/lib/projects/service";
import { GitHubRepositoryPanel } from "@/app/projects/GitHubRepositoryPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ProjectManageForm } from "@/app/projects/ProjectManageForm";
import { ProjectArchiveButton } from "@/app/projects/ProjectArchiveButton";
import { ProjectDocumentsPanel } from "@/app/projects/ProjectDocumentsPanel";

export const instant = false;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const configured = isSupabaseConfigured();
  let projects = [] as Awaited<ReturnType<typeof listProjects>>;
  let repositories = [] as Awaited<ReturnType<typeof listProjectRepositories>>;
  let loadError = false;
  if (configured) {
    const supabase = await createSupabaseServerClient();
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims?.sub) redirect("/auth/login");
    try {
      projects = await listProjects(supabase);
      repositories = await listProjectRepositories(supabase, projects.map((project) => project.id));
    } catch { loadError = true; }
  }
  const activeProjects = projects.filter((project) => !project.archived_at);
  const archivedProjects = projects.filter((project) => project.archived_at);
  const params = await searchParams;

  return (
    <main className="projects-page">
      <div className="projects-container">
        <Link href="/" className="projects-back"><ArrowLeft size={15} /> Workspace overview</Link>
        <header className="projects-header"><span className="projects-icon"><Boxes size={20} /></span><div><p className="section-kicker">WORKSPACE</p><h1>Projects</h1><p>Group repositories, incoming issues, and analysis history by team or service.</p></div></header>
        {params.created === "1" && <p className="project-success" role="status">Project created. You can connect a repository when GitHub is configured.</p>}
        <div className="projects-columns">
          <section className="projects-list" aria-labelledby="projects-list-title">
            <div className="projects-section-title"><div><p className="section-kicker">YOUR WORK</p><h2 id="projects-list-title">{!configured ? "Storage not connected" : loadError ? "Could not load projects" : activeProjects.length ? `${activeProjects.length} project${activeProjects.length === 1 ? "" : "s"}` : projects.length ? "No active projects" : "No projects yet"}</h2></div><CirclePlus size={17} /></div>
            {loadError ? <div className="project-empty"><p>Projects could not be loaded.</p><a href="/projects">Try again</a></div> : activeProjects.length ? (
              <ul className="project-items">{activeProjects.map((project) => {
                const repository = repositories.find((item) => item.project_id === project.id);
                return <li className="project-item" key={project.id}><div className="project-item-main"><span className="project-item-icon"><Boxes size={16} /></span><span className="project-item-copy"><strong>{project.name}</strong><small>{project.description || "No description"}</small></span><span className="project-repo"><GitBranch size={13} /> {repository?.full_name ?? "No repository"}</span></div><div className="project-item-links"><Link href={`/projects/${project.id}/history`}><History size={12} /> Analysis history</Link><ProjectManageForm project={project} /><ProjectArchiveButton project={project} archived={false} /><details className="project-manage"><summary>Manage repository</summary><GitHubRepositoryPanel projectId={project.id} repository={repository} /></details><ProjectDocumentsPanel projectId={project.id} /></div></li>;
              })}</ul>
            ) : !configured ? <div className="project-empty"><span className="project-empty-icon"><Boxes size={18} /></span><h3>Connect your database first.</h3><p>Set the Supabase URL and publishable key, then apply the included migration to enable private project storage.</p></div> : <div className="project-empty"><span className="project-empty-icon"><Boxes size={18} /></span><h3>Your projects stay private.</h3><p>Create a project to keep issue intake and future agent runs together.</p></div>}
            {archivedProjects.length > 0 && <details className="archived-projects"><summary>Archived projects <span>{archivedProjects.length}</span></summary><ul className="project-items">{archivedProjects.map((project) => <li className="project-item archived-project-item" key={project.id}><div className="project-item-main"><span className="project-item-icon"><Boxes size={16} /></span><span className="project-item-copy"><strong>{project.name}</strong><small>{project.description || "No description"}</small></span><span className="project-repo">Archived</span></div><div className="project-item-links"><Link href={`/projects/${project.id}/history`}><History size={12} /> Analysis history</Link><ProjectArchiveButton project={project} archived={true} /></div></li>)}</ul></details>}
          </section>
          <section className="project-create-panel" aria-labelledby="project-create-title"><p className="section-kicker">NEW PROJECT</p><h2 id="project-create-title">Start with a name</h2><p>Connect a repository after the project is created.</p><ProjectForm configured={configured} /></section>
        </div>
      </div>
    </main>
  );
}

