import { DEPARTMENTS, DOC_TYPES } from '@/lib/permissions';
import { mapTeamToDepartment, VALID_DOC_TYPES, VALID_TEAMS } from '@/adapters/documentAdapter';
import type { ManagerAnalysisJSON } from '@/lib/prompt';
import type { DocumentRecord, ClassificationValues } from '@/types/documents';

export const CLASSIFICATION_DEPARTMENTS = [...new Set([...DEPARTMENTS, ...VALID_TEAMS.map(mapTeamToDepartment)])];
export const CLASSIFICATION_TYPES = [...new Set([...DOC_TYPES, ...VALID_DOC_TYPES.map(type => type.toUpperCase().replace(/\s+/g, '_'))])];

export function classificationTypeValue(type: string) {
  return VALID_DOC_TYPES.find(value => value.toUpperCase().replace(/\s+/g, '_') === type)?.toLowerCase() ?? type.toLowerCase();
}

function label(value: unknown, allowed: readonly string[]): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return allowed.includes(normalized) ? normalized : null;
}
export function validTags(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 20 || value.some(t => typeof t !== 'string' || !t.trim() || t.trim().length > 60)) return null;
  return Array.from(new Set(value.map(t => t.trim())));
}
export function validateClassification(value: unknown, existing?: ClassificationValues): ClassificationValues | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const currentDepartment = existing && input.department === existing.department;
  const currentType = existing && input.documentType === existing.documentType;
  const department = currentDepartment ? existing.department : label(input.department, CLASSIFICATION_DEPARTMENTS);
  const knownType = label(input.documentType, CLASSIFICATION_TYPES);
  const documentType = currentType ? existing.documentType : knownType && classificationTypeValue(knownType);
  const tags = validTags(input.tags);
  return (department || currentDepartment) && (documentType || currentType) && tags ? { department, documentType, tags } : null;
}
export function classificationSuggestion(analysis: ManagerAnalysisJSON | null) {
  if (!analysis) return null;
  const department = Array.isArray(analysis.departments) ? analysis.departments.map(d => label(d, CLASSIFICATION_DEPARTMENTS)).find(Boolean) || null : null;
  const knownType = label(analysis.documentType, CLASSIFICATION_TYPES);
  const documentType = knownType && classificationTypeValue(knownType);
  const tags = validTags(analysis.tags) || [];
  return department || documentType || tags.length ? { department, documentType, tags, source: 'oci' as const } : null;
}
export function classificationView(doc: DocumentRecord) {
  return {
    effective: { department: doc.metadata?.department || null, documentType: doc.metadata?.documentType || null, tags: doc.metadata?.tags || [] },
    suggestion: doc.classificationSuggestion || null,
    history: doc.classificationHistory || [],
  };
}
