import type { IngestStage } from '@/types/documents';

export const stageLabels: Record<IngestStage, string> = {
  extracting: 'Reading the source…',
  organizing: 'Organizing sections…',
  analyzing: 'Analyzing and summarizing…',
  saving: 'Saving and indexing…',
};

export const processingSteps: { stage: IngestStage; label: string }[] = [
  { stage: 'extracting', label: 'Read source' },
  { stage: 'organizing', label: 'Organize sections' },
  { stage: 'analyzing', label: 'Analyze' },
  { stage: 'saving', label: 'Save and index' },
];
