import { v } from "convex/values";

// Recruitment pipeline for association applications, in order.
// The last four are outcomes, shown together under the "Decision" tab.
export const STAGES = ["applied", "review", "interview", "case", "offer", "accepted", "declined", "rejected"] as const;
export type Stage = (typeof STAGES)[number];

export const stageValidator = v.union(...STAGES.map((s) => v.literal(s)));
