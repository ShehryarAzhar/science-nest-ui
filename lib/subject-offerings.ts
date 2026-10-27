import type { SubjectLevel } from "@/lib/subjects";

// What a subject offers, derived from its level codes. Fixed frontend labels,
// not backend data (CLAUDE.md › Subjects data)

const ALL_OFFERINGS = [
  "Exam Preparation",
  "Past Papers",
  "Notes & Practice",
  "Research Guidance",
  "Assignments Help",
] as const;

export type SubjectOffering = (typeof ALL_OFFERINGS)[number];

const OFFERINGS_BY_LEVEL: Record<string, readonly SubjectOffering[]> = {
  o_level: ["Exam Preparation", "Past Papers", "Notes & Practice"],
  a_level: ["Exam Preparation", "Past Papers", "Notes & Practice"],
  all_levels: ["Exam Preparation", "Notes & Practice"],
  university: ["Research Guidance", "Assignments Help"],
};

// The union across the subject's levels, in the fixed order above. Unknown
// level codes add nothing
export function subjectOfferings(levels: SubjectLevel[]): SubjectOffering[] {
  const offered = new Set(
    levels.flatMap((level) => OFFERINGS_BY_LEVEL[level.code] ?? []),
  );
  return ALL_OFFERINGS.filter((offering) => offered.has(offering));
}
