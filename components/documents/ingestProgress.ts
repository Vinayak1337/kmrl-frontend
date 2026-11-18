import type { AnalysisProgress, IngestStage } from '@/types/documents';

const stageLabels: Record<IngestStage, string> = {
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


export function stageLabel(stage: IngestStage, analysis?: AnalysisProgress) {
  if (stage !== 'analyzing' || !analysis) return stageLabels[stage];
  if (!analysis.ranges.length) return analysis.summarizing ? 'Writing the document summary…' : stageLabels[stage];

  const ranges = analysis.ranges.map(({ start, end }) => start === end ? String(start) : `${start}–${end}`);
  const unit = analysis.ranges.length === 1 && analysis.ranges[0].start === analysis.ranges[0].end ? 'page' : 'pages';
  return `Analyzing ${unit} ${ranges.join(', ')} of ${analysis.totalPages}…`;
}
