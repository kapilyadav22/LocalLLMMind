/**
 * Utility for parsing and computing granular LLM generation metrics,
 * including tokens per second, prompt vs completion breakdown, TTFT,
 * and duration analytics across Ollama and Cloud providers.
 */

export interface RawStreamMetrics {
  eval_count?: number;
  eval_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  total_duration?: number;
  load_duration?: number;
  model?: string;
}

export interface ComputedGenerationMetrics {
  evalCount: number;
  evalDuration: number;
  duration: string;
  tokPerSec: string;
  promptTokens: number | null;
  promptDuration: string | null;
  totalDuration: string;
  loadDuration: string | null;
  ttftMs: number | null;
  model: string;
  createdAt: string;
}

/**
 * Computes structured generation metrics from raw provider stream done payloads.
 * Supports Ollama (nanoseconds) and cloud adapter synthetic done events.
 */
export function computeGenerationMetrics(
  raw: RawStreamMetrics,
  defaultModel: string = 'Unknown Model'
): ComputedGenerationMetrics | null {
  if (!raw || !raw.eval_count || !raw.eval_duration) {
    return null;
  }

  // eval_duration is in nanoseconds (1s = 1e9 ns)
  const evalDurationSec = raw.eval_duration / 1e9;
  const promptDurationSec = raw.prompt_eval_duration ? raw.prompt_eval_duration / 1e9 : null;
  const totalDurationSec = raw.total_duration ? raw.total_duration / 1e9 : evalDurationSec;
  const loadDurationSec = raw.load_duration ? raw.load_duration / 1e9 : null;
  
  // TTFT in milliseconds from prompt_eval_duration (ns / 1e6)
  const ttftMs = raw.prompt_eval_duration
    ? Math.round(raw.prompt_eval_duration / 1e6)
    : null;

  const tokPerSec = evalDurationSec > 0 ? (raw.eval_count / evalDurationSec).toFixed(1) : '0.0';

  return {
    evalCount: raw.eval_count,
    evalDuration: raw.eval_duration,
    duration: evalDurationSec.toFixed(2),
    tokPerSec,
    promptTokens: raw.prompt_eval_count || null,
    promptDuration: promptDurationSec ? promptDurationSec.toFixed(2) : null,
    totalDuration: totalDurationSec.toFixed(2),
    loadDuration: loadDurationSec ? loadDurationSec.toFixed(2) : null,
    ttftMs,
    model: raw.model || defaultModel,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates a clean markdown or plaintext summary of the metrics.
 */
export function formatMetricsMarkdown(metrics: ComputedGenerationMetrics): string {
  const lines = [
    `### Generation Metrics (${metrics.model})`,
    `- **Speed:** ${metrics.tokPerSec} tokens/sec`,
    `- **Completion Tokens:** ${metrics.evalCount} tokens`,
    `- **Completion Time:** ${metrics.duration}s`,
  ];

  if (metrics.promptTokens) {
    lines.push(`- **Prompt Tokens:** ${metrics.promptTokens} tokens`);
  }
  if (metrics.ttftMs) {
    lines.push(`- **Time to First Token (TTFT):** ${metrics.ttftMs}ms`);
  }
  if (metrics.totalDuration) {
    lines.push(`- **Total Wall Time:** ${metrics.totalDuration}s`);
  }

  return lines.join('\n');
}
