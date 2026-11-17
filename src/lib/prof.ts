export type ProfPose = "idle" | "typing" | "thinking" | "answer" | "nomatch";

type PoseMessage = {
  role: "user" | "assistant";
  steps: readonly { formulaIds: readonly string[] }[];
};

const EXAMPLES = [
  "I know the radius of a circle and need the area",
  "I have the two shorter sides of a right triangle and need the hypotenuse",
  "I know the mass and the acceleration and need the force",
  "I know the speed and the time and need the distance",
] as const;

export function profPose(input: {
  pending: boolean;
  draft: string;
  messages: readonly PoseMessage[];
}): ProfPose {
  if (input.pending) return "thinking";
  if (input.draft.trim()) return "typing";
  for (let i = input.messages.length - 1; i >= 0; i -= 1) {
    const message = input.messages[i];
    if (message.role !== "assistant") continue;
    const matched = message.steps.some((step) => step.formulaIds.length > 0);
    return matched ? "answer" : "nomatch";
  }
  return "idle";
}

export function profExample(index: number): string {
  const count = EXAMPLES.length;
  const slot = index % count;
  return EXAMPLES[slot < 0 ? slot + count : slot];
}
