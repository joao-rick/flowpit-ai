export default function ProjectsLoading() {
  return <main className="projects-page" aria-busy="true" aria-label="Loading projects">
    <div className="projects-container loading-projects">
      <span className="skeleton skeleton-back" />
      <div className="skeleton-projects-header"><span className="skeleton skeleton-icon" /><span className="skeleton skeleton-title" /></div>
      <div className="projects-columns"><section className="skeleton-project-list"><span className="skeleton skeleton-row" /><span className="skeleton skeleton-row" /><span className="skeleton skeleton-row" /></section><section className="skeleton-project-form"><span className="skeleton skeleton-row" /><span className="skeleton skeleton-row" /><span className="skeleton skeleton-button" /></section></div>
      <span className="sr-only">Loading project data…</span>
    </div>
  </main>;
}
