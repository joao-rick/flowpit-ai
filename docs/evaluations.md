# Evaluations and observability

## Evaluation plan

Versioned fixtures should cover priority consistency, evidence fidelity, missing information, recommendation usefulness, schema validity, prompt injection resistance, and partial provider failures. Expected results should include acceptable ranges and citations, not brittle exact prose matches.

## Tracing fields

Execution ID, step ID, agent, provider/model, prompt/schema version, start/end time, status, retry count, token usage when provided, and sanitized error. Estimate cost only from known provider pricing and known token usage; otherwise leave it unavailable.

## Status

Unit fixtures currently cover input schema validation, evidence quote fidelity, execution state transitions, dashboard count mapping, full per-issue priority coverage, issue-number matching, recommendation scope validation, archive/restore behavior, transactional review-route behavior, cost calculations with cached tokens, and a malicious-content cross-source citation case (44 tests across 14 files). Agent steps persist provider/model, schema prompt version, duration, token usage, and sanitized error fields. Live model evaluation, end-to-end prompt-injection resistance, live pricing configuration, and deployment-level tracing remain outstanding. Cost estimates are stored only when the exact model and complete token usage match operator-configured input, output, and (when applicable) cached-token rates. The evidence validator fails closed when a model cites an unknown segment or a quote absent from the source.

