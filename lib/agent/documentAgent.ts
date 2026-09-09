import { analyzeDocumentWithGemini, type AgentImage, type AgentPage, type AgentNode, type AgentResult } from '@/lib/agent/geminiAgent';

export type { AgentImage, AgentPage, AgentNode, AgentResult };

/**
 * Analyzes a document using OpenCode Zen - Muse Spark 1.2 free model
 */
export async function analyzeDocumentWithAgent(options: {
  pages: AgentPage[];
  openAIKey?: string;
  maxToolLoops?: number;
}): Promise<AgentResult> {
  return analyzeDocumentWithGemini({
    pages: options.pages,
    maxLoops: options.maxToolLoops
  });
}
