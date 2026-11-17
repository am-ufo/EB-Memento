import { useEffect, useState } from "react";
import { TEACHER_KEY } from "../data/notices";
import type { ProfPose } from "./prof";
import { clearedIds, DEVICE_CLEARED } from "./storage";

export type TeacherId = "einstein" | "reza" | "newton" | "veritasium";

type Teacher = {
  id: TeacherId;
  name: string;
  lines: Record<ProfPose, readonly string[]>;
};

const DEFAULT_TEACHER: TeacherId = "veritasium";

export const TEACHERS: readonly Teacher[] = [
  {
    id: "einstein",
    name: "Einstein",
    lines: {
      idle: ["Curious."],
      typing: ["Think."],
      thinking: ["Hmm."],
      answer: ["Curious."],
      nomatch: ["Hmm."],
    },
  },
  {
    id: "reza",
    name: "Reza",
    lines: {
      idle: ["Calm."],
      typing: ["Listen."],
      thinking: ["Notice."],
      answer: ["Yes."],
      nomatch: ["Breathe."],
    },
  },
  {
    id: "newton",
    name: "Newton",
    lines: {
      idle: ["Observe."],
      typing: ["Observe."],
      thinking: ["Hence."],
      answer: ["Thus."],
      nomatch: ["Hence."],
    },
  },
  {
    id: "veritasium",
    name: "Veritasium",
    lines: {
      idle: ["Hey."],
      typing: ["Okay."],
      thinking: ["Why."],
      answer: ["See."],
      nomatch: ["Wait."],
    },
  },
];

const BY_ID = new Map(TEACHERS.map((teacher) => [teacher.id, teacher]));

export function isTeacherId(value: unknown): value is TeacherId {
  return typeof value === "string" && BY_ID.has(value as TeacherId);
}

export function teacherById(id: TeacherId): Teacher {
  return BY_ID.get(id) ?? TEACHERS[0];
}

const RETIRED = new Set(["artem", "hawking", "euler", "prof", "pierre"]);

function lineSlot(seed: string, count: number): number {
  if (count <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % count;
  }
  return hash;
}

export function teacherLine(id: TeacherId, pose: ProfPose, seed: string): string {
  const bank = teacherById(id).lines[pose];
  return bank[lineSlot(seed, bank.length)];
}

function readStored(): TeacherId {
  try {
    const stored = localStorage.getItem(TEACHER_KEY);
    if (stored && RETIRED.has(stored)) {
      localStorage.setItem(TEACHER_KEY, DEFAULT_TEACHER);
      return DEFAULT_TEACHER;
    }
    return isTeacherId(stored) ? stored : DEFAULT_TEACHER;
  } catch {
    return DEFAULT_TEACHER;
  }
}

export function useTeacher(): [TeacherId, (next: TeacherId) => void] {
  const [teacher, setTeacher] = useState<TeacherId>(readStored);

  useEffect(() => {
    function onCleared(event: Event) {
      const ids = clearedIds(event);
      if (ids && !ids.includes("teacher")) return;
      setTeacher(readStored());
    }
    window.addEventListener(DEVICE_CLEARED, onCleared);
    return () => window.removeEventListener(DEVICE_CLEARED, onCleared);
  }, []);

  function choose(next: TeacherId) {
    setTeacher(next);
    try {
      localStorage.setItem(TEACHER_KEY, next);
    } catch {
      // The choice still applies for this visit.
    }
  }

  return [teacher, choose];
}
