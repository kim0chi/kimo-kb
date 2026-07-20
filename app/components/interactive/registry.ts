import type { Component } from 'vue'
import RequestLifecycle from './RequestLifecycle.vue'
import QueuePipeline from './QueuePipeline.vue'
import DataModel from './DataModel.vue'

// Registry of bespoke interactive explainers, keyed by the ids used in the
// sidecar map (lib/interactive-map.ts). Deliberately hand-curated — we build a
// few high-value explainers, not one per doc.
export const interactiveComponents: Record<string, Component> = {
  'request-lifecycle': RequestLifecycle,
  'queue-pipeline': QueuePipeline,
  'data-model': DataModel,
}
