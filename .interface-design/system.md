# FlowPilot interface system

## Direction

An engineering triage workbench: calm graphite and paper surfaces, precise evidence, and status colors that carry operational meaning. The memorable element is a traceable, step-by-step agent run, not a chatbot or collection of metric cards.

## Tokens

- `--canvas`: `#F4F6F8`, cool slate workspace background.
- `--surface`: `#FFFFFF`, primary reading surface.
- `--surface-raised`: `#FAFBFC`, inset/secondary regions.
- `--ink`: `#17212B`, high-contrast graphite text.
- `--ink-secondary`: `#526170`, supporting text.
- `--ink-muted`: `#7C8996`, metadata.
- `--line`: `#DCE2E8`, quiet structure.
- `--signal`: `#B56812`, queued/attention state.
- `--complete`: `#287A58`, completed state.
- `--incident`: `#B94343`, failure/critical state.
- `--focus`: `#1769AA`, keyboard focus.

## Type and spacing

Use Geist Sans for interface text and Geist Mono only for IDs, issue references, and timing values. Base text is 14px; use a compact 1.2 hierarchy for a workbench. Spacing follows a 4px base, with 12–16px control density and larger separation between work areas.

## Composition and behavior

- Sidebar shares the canvas color and uses a quiet separator.
- Overview leads with onboarding/readiness and recent real activity, not fabricated KPIs.
- Agent execution is represented as an ordered trace with status, owner and evidence.
- Inputs are subtly inset; borders remain low contrast; elevation uses small tonal shifts.
- Use semantic status labels and icons together; never rely on color alone.
- Responsive navigation collapses to a labeled mobile menu; content can scroll without horizontal overflow.
- Motion is limited to action feedback and respects reduced-motion preferences.
- Native controls first, visible focus, meaningful labels, sentence-case copy.
