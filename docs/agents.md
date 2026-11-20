# Agents

## Implemented specialists

1. **Issue Analyst:** summarize the source issue, extract facts, identify unknowns, and distinguish source text from inference.
2. **Documentation Agent:** retrieve relevant project text chunks lexically and cite document and chunk IDs with exact source quotes.
3. **Priority Agent:** return a separate priority, severity, impact, urgency, confidence, reasoning, and evidence record for every selected issue using a versioned schema; run-level priority is derived from the most urgent issue.
4. **Recommendation Agent:** propose steps, affected areas, and risks without claiming code changes; each proposal names its affected issue IDs and can cite only those issues.
5. **Report Agent:** consolidate prior structured outputs and preserve provenance.

## Shared rules

Issue text, comments, repository files, and documents are untrusted data. They cannot change system policy, authorize tools, or trigger external writes. Agent tools should be read-only for the initial release. Validate all model output against schemas, retain model/provider/version metadata when available, and keep evidence tied to input source IDs.

## Status

Five specialists call the server-only OpenAI provider with strict Zod response schemas. Issue text, comments, and documents are untrusted input; citations must point to catalog segment IDs and exact source text (case and whitespace normalized). Document references also retain chunk IDs and source offsets. Refusals, malformed output, timeouts, and rate limits are handled without exposing raw provider messages. Priority output is checked for exact issue coverage and cross-issue citation scope, then persisted in `agent_issue_assessments`. Recommendations are validated against selected IDs and citation scope. The documentation specialist is skipped when no relevant excerpts are found. Prompt/evidence unit tests exist; live model evaluations require credentials. The comment context step caches up to 20 public comments per selected issue for six hours.
