import Link from "next/link";
import { ArrowDown, ArrowRight, Check, CircleDot, GitBranch, LockKeyhole, Network, ShieldCheck, Sparkles } from "lucide-react";

export const metadata = {
  title: "FlowPilot AI — Evidence-led engineering triage",
  description: "A human-reviewed workflow for understanding software issues, setting priority, and tracking AI agent decisions.",
};

const steps = [
  { number: "01", name: "Import", description: "Bring open issues from a public GitHub repository into a private project workspace." },
  { number: "02", name: "Analyze", description: "Specialist agents summarize evidence, assess impact, and draft practical next steps." },
  { number: "03", name: "Review", description: "Inspect the trace and sources, then approve or dismiss the analysis. No repository write runs automatically." },
];

export default function ProductPage() {
  return <main className="product-page">
    <nav className="product-nav"><Link href="/product" className="product-brand"><span><CircleDot size={18} /></span>FlowPilot <small>AI</small></Link><div><Link href="/auth/login">Sign in</Link><Link href="/auth/sign-up" className="product-nav-cta">Create account <ArrowRight size={14} /></Link></div></nav>
    <section className="product-hero">
      <div className="product-hero-copy"><p className="product-eyebrow"><span /> ENGINEERING WORKFLOW · HUMAN REVIEW</p><h1>Make the next<br /><em>engineering decision</em><br />easier to see.</h1><p className="product-lede">FlowPilot turns incoming issues into an evidence-led triage workflow, with every agent step visible and every recommendation left for a person to review.</p><div className="product-hero-actions"><Link href="/auth/sign-up">Start with a project <ArrowRight size={15} /></Link><a href="#workflow">See how it works <ArrowDown size={14} /></a></div><p className="product-honesty"><ShieldCheck size={14} /> Recommendations are proposals. Review never changes GitHub.</p></div>
      <div className="product-orchestration" aria-label="Analysis workflow stages">
        <div className="product-flow-heading"><span>ANALYSIS FLOW</span><span>5 SPECIALISTS</span></div>
        <div className="product-flow-source"><GitBranch size={15} /><span><strong>Issue evidence</strong><small>Title · body · labels</small></span><Check size={14} /></div>
        <div className="product-flow-line" />
        <div className="product-agent"><span className="product-agent-index">01</span><span><strong>Issue Analyst</strong><small>Facts, hypotheses, unknowns</small></span><span className="product-agent-tag">ANALYZE</span></div>
        <div className="product-flow-line" />
        <div className="product-agent"><span className="product-agent-index">02</span><span><strong>Documentation Agent</strong><small>Relevant project notes and requirements</small></span><span className="product-agent-tag">RETRIEVE</span></div>
        <div className="product-flow-line" />
        <div className="product-agent"><span className="product-agent-index">03</span><span><strong>Priority Agent</strong><small>Impact · urgency · confidence</small></span><span className="product-agent-tag">ASSESS</span></div>
        <div className="product-flow-line" />
        <div className="product-agent"><span className="product-agent-index">04</span><span><strong>Recommendation Agent</strong><small>Next steps and risks</small></span><span className="product-agent-tag">PROPOSE</span></div>
        <div className="product-flow-line" />
        <div className="product-agent"><span className="product-agent-index">05</span><span><strong>Report Agent</strong><small>Decision-ready summary</small></span><span className="product-agent-tag">SYNTHESIZE</span></div>
        <div className="product-flow-review"><LockKeyhole size={14} /><span><strong>Human review</strong><small>Approval records a decision; it does not execute a write.</small></span></div>
        <p className="product-flow-caption">Workflow design · not a live execution trace</p>
      </div>
    </section>
    <section className="product-problem"><div><p className="product-eyebrow">THE PROBLEM</p><h2>Issues arrive as fragments.<br />Teams need a clear next step.</h2></div><p>Bug reports mix observed behavior with guesses. Feature requests hide unresolved questions. Manual triage slows down when the why behind a priority is difficult to find. FlowPilot organizes the evidence and makes uncertainty visible before the team decides what to do.</p></section>
    <section className="product-workflow" id="workflow"><div className="product-section-heading"><p className="product-eyebrow">A CONTROLLED WORKFLOW</p><h2>From incoming issue to reviewed decision.</h2></div><div className="product-steps">{steps.map((step) => <article key={step.number}><span>{step.number}</span><h3>{step.name}</h3><p>{step.description}</p></article>)}</div></section>
    <section className="product-capabilities"><div><p className="product-eyebrow">BUILT FOR TRACEABILITY</p><h2>See what led to the recommendation.</h2></div><div className="product-capability-grid"><article><Sparkles size={17} /><h3>Focused agents</h3><p>Separate issue analysis, priority, recommendations, and synthesis into explicit steps.</p></article><article><Network size={17} /><h3>Durable execution</h3><p>Persist each run and its trace so long model calls do not depend on a browser request.</p></article><article><ShieldCheck size={17} /><h3>Evidence checks</h3><p>Agent citations must point to a matching segment of imported issue text.</p></article><article><LockKeyhole size={17} /><h3>Human decision</h3><p>Review and dismissal are recorded. The current workflow performs no external writes.</p></article></div></section>
    <section className="product-architecture"><div><p className="product-eyebrow">ARCHITECTURE</p><h2>One application.<br />Clear service boundaries.</h2><p>Next.js handles authenticated product flows. Supabase stores tenant-scoped projects, issues, executions, and approvals. Inngest coordinates durable analysis steps. The OpenAI provider returns schema-validated output.</p></div><dl><div><dt>Application</dt><dd>Next.js · TypeScript · React</dd></div><div><dt>Data &amp; auth</dt><dd>Supabase · Postgres · RLS</dd></div><div><dt>Workflow</dt><dd>Inngest · persisted agent trace</dd></div><div><dt>Model</dt><dd>OpenAI · Zod structured outputs</dd></div><div><dt>Source</dt><dd>GitHub public issues (current connector)</dd></div></dl></section>
    <section className="product-cta"><div><p className="product-eyebrow">START WITH YOUR WORK</p><h2>Bring one project into focus.</h2><p>Create a workspace, connect a public repository, and choose the issues that need a closer look.</p></div><Link href="/auth/sign-up">Create a FlowPilot account <ArrowRight size={15} /></Link></section>
    <footer className="product-footer"><Link href="/product">FlowPilot AI</Link><span>Evidence-led issue triage with human review.</span><Link href="/">Workspace</Link></footer>
  </main>;
}
