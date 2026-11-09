/**
 * PRIVACY, COOKIES, AND TERMS
 *
 * Settings renders this file. Edit it in the same change whenever the app
 * starts doing something new with data, then set `SITE.updated`.
 *
 * Checklist:
 * 1. SITE.updated — the date students see on Privacy, Cookies, and Terms.
 *    SITE.version — the version in Settings. Match package.json when you release.
 * 2. DEVICE — anything saved in localStorage, sessionStorage, or IndexedDB.
 *    If it must apply before first paint (theme, text size), also update public/theme-init.js.
 * 3. COOKIES — any cookie the app sets. `essential` means the app needs it.
 *    `optional` means it stays off until the student allows it.
 * 4. THIRD_PARTIES — analytics, ads, error reporters, or any extra script.
 * 5. SENT — any request that sends what the student typed or did.
 * 6. TECHNICAL — caches or other browser storage that is not personal.
 * 7. ACCOUNT, PAYMENT, CONTACT — set `exists: true` and a summary when an
 *    account, a payment, or a real contact address exists.
 * 8. Rewrite any paragraph that would become untrue.
 */
import type { Subject } from "../lib/subject";

export const SITE = {
  name: "EB Memento",
  makers: "Artem and Andrii",
  host: "Vercel",
  /** Shown in Settings. Keep this in step with package.json when you release. */
  version: "0.1.0",
  updated: "9 November 2026",
} as const;

export const THEME_KEY = "memento:theme";
export const TEXT_KEY = "memento:text";
export const PROFILE_KEY = "memento:profile";
export const ACCOUNTS_KEY = "memento:accounts";
export const FAVOURITES_KEY = "memento:favourites";

/** One Ask thread per subject. Add a key here when a new subject stores a thread. */
export const ASK_KEYS: Record<Subject, string> = {
  maths: "memento-ask:maths",
  physics: "memento-ask:physics",
};

export type DeviceRecord = {
  id: string;
  keys: readonly string[];
  area: "local" | "session";
  name: string;
  holds: string;
  lasts: string;
};

export const DEVICE = [
  {
    id: "theme",
    keys: [THEME_KEY],
    area: "local",
    name: "Theme",
    holds: "Whether Memento is light, dark, or following this device.",
    lasts: "Stays until you change it, or clear data in Settings.",
  },
  {
    id: "text",
    keys: [TEXT_KEY],
    area: "local",
    name: "Text size",
    holds: "Large text, if you turn it on. The default size is not saved.",
    lasts: "Stays until you switch back to default, or clear data in Settings.",
  },
  {
    id: "profile",
    keys: [PROFILE_KEY, ACCOUNTS_KEY],
    area: "local",
    name: "Sign-in",
    holds: "Your email, a hash of the password, your name, your username, your class, and who is signed in. The password itself is not kept. A connected copy also keeps a Supabase session.",
    lasts: "Stays until you delete the account or clear data in Settings. Sign out leaves the account on this device.",
  },
  {
    id: "favourites",
    keys: [FAVOURITES_KEY],
    area: "local",
    name: "Favourites",
    holds: "The formulas and notations you star, kept with the signed-in email. A connected copy also saves that list on the account.",
    lasts: "Stays until you unstar them, clear data in Settings, or delete the account.",
  },
  {
    id: "ask",
    keys: Object.values(ASK_KEYS),
    area: "session",
    name: "Ask",
    holds: "The problem you are in the middle of, so a follow-up stays on the same question. Each person, and maths and physics, keep their own thread.",
    lasts: "Stays until you close the tab, start a new problem, or clear it in Settings. Closing the tab removes it.",
  },
] as const satisfies readonly DeviceRecord[];

export type DeviceId = (typeof DEVICE)[number]["id"];

export type CookieNotice = {
  name: string;
  purpose: string;
  lasts: string;
  required: "essential" | "optional";
};

/** Empty on purpose. Add a row when Memento sets a cookie. */
export const COOKIES: readonly CookieNotice[] = [];

export type ThirdParty = {
  name: string;
  receives: string;
};

export const THIRD_PARTIES: readonly ThirdParty[] = [
  {
    name: "Supabase",
    receives:
      "Only when this copy is connected to Supabase: your email and password, your name, your username, your class, and the ids of starred formulas. The password is stored as a hash. Memento does not see the password.",
  },
];

export type SentRecord = {
  id: string;
  name: string;
  when: string;
  sends: string;
  kept: string;
};

export const SENT: readonly SentRecord[] = [
  {
    id: "ask",
    name: "Ask",
    when: "You send a message on the Ask tab.",
    sends:
      "The words you typed, earlier lines in that problem, a short note of the problem, and the formula list it is choosing from. No name is attached.",
    kept: "Memento has no database of Ask questions and does not keep what you typed. On the public site no model is connected, so the request comes back empty and the answer is chosen on your device. A preview build can pass the same text to Cloudflare Workers AI, only to pick formula ids. The host may keep an ordinary server log of the request.",
  },
  {
    id: "account",
    name: "Account",
    when: "You create an account, sign in, reset a password, change your class, star something, or delete the account.",
    sends:
      "Your email and a hash of the password stay on this device, with your name, your username, year, maths course, Advanced, physics, and the ids you star. The username is unique. The first name can be the same as someone else's. When this copy is connected to Supabase, that same information is saved there. Ask questions are not attached to the email or the username.",
    kept: "The account stays until you delete it in Settings or clear data on this device. On a connected copy, Supabase keeps it until Delete account. The password is stored as a hash.",
  },
];

export type TechnicalRecord = {
  id: string;
  name: string;
  holds: string;
  lasts: string;
};

export const TECHNICAL: readonly TechnicalRecord[] = [
  {
    id: "offline-copy",
    name: "Offline copy",
    holds: "The app itself — pages, formulas, and styles — so Memento opens with no connection. Not your stars, your theme, or what you typed in Ask.",
    lasts: "Stays until a new version is saved, or you clear site data for Memento in the browser.",
  },
];

export type OptionalNotice = { exists: false } | { exists: true; summary: string };

export const ACCOUNT: OptionalNotice = {
  exists: true,
  summary:
    "You sign in with an email and a password. On this device the account holds your email, a hash of the password, your name, your username, your class, and your stars, so the sheet opens offline. The username is unique, so it can be used later to find a friend or someone from your school. The first name can be shared. Memento does not see the password. When this copy is connected to Supabase, the same account is saved there and opens on another device. Sign out leaves the account in place. Delete account removes it.",
};
export const PAYMENT: OptionalNotice = { exists: false };
export const CONTACT: OptionalNotice = { exists: false };

export type NoticeBlock = {
  heading: string;
  paragraphs: readonly string[];
};

export function updatedLine(): string {
  return `Updated ${SITE.updated}.`;
}

export function accountParagraph(): string {
  return ACCOUNT.exists
    ? ACCOUNT.summary
    : "Sign-in stays on this device. You give your name and your class so the sheet and your stars stay with you. There is no password, no email, and no account on a server. Someone else on this phone can sign in too. A new device does not know who you are.";
}

export function paymentParagraph(): string {
  return PAYMENT.exists ? PAYMENT.summary : "Memento is free. There is nothing to buy and no subscription.";
}

export function contactParagraph(): string {
  return CONTACT.exists ? CONTACT.summary : "There is no support address yet.";
}

export function trackingParagraph(): string {
  if (THIRD_PARTIES.length === 0) return "There is no analytics and no advertising.";
  return "Extra tools that receive data are listed with the cookies.";
}

export function hostParagraph(): string {
  return `Opening the site tells ${SITE.host} your IP address and browser, the same as any website. Memento does not add its own tracker on top.`;
}

export function cookieLead(): string {
  if (COOKIES.length === 0) {
    return "Memento does not set cookies. There is no banner asking you to accept any, because there is nothing to accept or refuse.";
  }
  return "Memento sets the cookies below. Optional ones stay off until you allow them. Essential ones are needed for the app to work.";
}

export function cookieSettingsHint(): string {
  if (COOKIES.length === 0 && THIRD_PARTIES.length === 0) return "None set by Memento";
  if (COOKIES.length === 0) return "No Memento cookie; extra tools are listed";
  return "What is set, and how long it lasts";
}

export const DEVICE_LIST_NOTE =
  "That is everything Memento stores on this device. If a later version stores something else, it is added here in the same update.";

export const NOT_A_COOKIE_NOTE =
  "The list below is easy to confuse with cookies. A copy stays on this device so the sheet opens offline. It is not a cookie. The account copy goes to Supabase, listed under Other tools.";

export const CLEAR_NOTE =
  "Settings can clear the accounts on this device, theme, text size, stars, and Ask. Delete account removes one email. On a connected copy, clearing this device signs you out here and the Supabase account stays until Delete account. To remove the offline copy as well, clear site data for Memento in the browser.";

export function sentEmptyParagraph(): string {
  return "Nothing you type is sent to a server. The sheet stays on your device.";
}

export function privacyIntro(): readonly NoticeBlock[] {
  return [
    {
      heading: "",
      paragraphs: [
        "Memento is a formula sheet for European Baccalaureate maths and physics. It runs in your browser. Open it, take a formula, close it.",
        accountParagraph(),
        trackingParagraph(),
        "Personal data is not sold.",
      ],
    },
  ];
}

export function privacyClosing(): readonly NoticeBlock[] {
  return [
    {
      heading: "Opening the site",
      paragraphs: [hostParagraph()],
    },
    {
      heading: "Your name",
      paragraphs: [
        "Memento is for students, including under 18. The account asks for your first name and a username. The first name can match someone else's. The username cannot, so a friend or someone from your school matches one person. Don't type your school, or a classmate's name, into Ask.",
      ],
    },
    {
      heading: "Cookies",
      paragraphs: ["Every cookie Memento sets is listed on the Cookies page."],
    },
    {
      heading: "When this page changes",
      paragraphs: [
        "The date above is when these notes last matched the app. If Memento starts storing, sending, or selling something new, this page is updated in that same change.",
      ],
    },
  ];
}

export function cookieIntro(): readonly NoticeBlock[] {
  return [
    {
      heading: "",
      paragraphs: [cookieLead(), trackingParagraph()],
    },
  ];
}

export function termsBlocks(): readonly NoticeBlock[] {
  const ask = SENT.find((item) => item.id === "ask");
  return [
    {
      heading: "What this is",
      paragraphs: [
        `Memento is a free formula sheet for European Baccalaureate maths and physics, made by ${SITE.makers}. It is a student project, not a product of the European Schools.`,
      ],
    },
    {
      heading: "Sign-in",
      paragraphs: [
        "You sign in with an email and a password. The account stores your first name, a unique username, year, maths course, and whether physics is on, so the sheet shows that syllabus. Stars stay with that email. The account lives on this device, and on a connected copy it is also saved so the same login opens on another device. After sign-in the sheet still opens with no connection. Delete account removes the email, the username, the class, and the stars.",
      ],
    },
    {
      heading: "Not the official syllabus",
      paragraphs: [
        "It is not the official syllabus, not an exam paper, and not published by your school. If a formula matters for a mark, the official syllabus and your teacher win.",
      ],
    },
    {
      heading: "Formulas can be wrong",
      paragraphs: [
        "The catalog is written to follow the syllabus, and a line can still be missing or wrong. You do the working. Memento does not do it for you.",
      ],
    },
    {
      heading: "Ask",
      paragraphs: ask
        ? [
            "Ask suggests which syllabus formulas might fit what you typed. It does not calculate the answer, and it can pick the wrong formula.",
            `${ask.sends} ${ask.kept}`,
          ]
        : [
            "Ask suggests which syllabus formulas might fit what you typed, on this device. It does not calculate the answer, and it can pick the wrong formula.",
          ],
    },
    {
      heading: "Using it",
      paragraphs: [
        "Use it for homework and revision. Your school sets the rules for phones in class.",
        "Don't present Memento as an official European Schools app.",
      ],
    },
    {
      heading: "Money",
      paragraphs: [paymentParagraph()],
    },
    {
      heading: "Contact",
      paragraphs: [contactParagraph()],
    },
    {
      heading: "No warranty",
      paragraphs: [
        "The app is provided as it is. There is no promise that it will stay online, stay complete, or stay correct. It can change or go away.",
      ],
    },
    {
      heading: "These terms",
      paragraphs: [
        `They match the app as of ${SITE.updated}. When the app changes the deal — an account, a payment, analytics, or something new sent off the device — these terms change in that same update.`,
      ],
    },
  ];
}
