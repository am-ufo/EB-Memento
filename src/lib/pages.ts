export const PAGES = ["settings", "privacy", "cookies", "terms"] as const;

export type Page = (typeof PAGES)[number];

export const PAGE_TITLE: Record<Page, string> = {
  settings: "Settings",
  privacy: "Privacy",
  cookies: "Cookies",
  terms: "Terms",
};

export const PAGE_HEADING: Record<Page, string> = {
  settings: "Settings",
  privacy: "Privacy",
  cookies: "Cookies",
  terms: "Terms and conditions",
};

type PageState = {
  memento: true;
  depth: number;
  returnTo: string;
  fromApp: boolean;
};

export function pageFromPath(pathname: string): Page | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const name = path.slice(1);
  return (PAGES as readonly string[]).includes(name) ? (name as Page) : null;
}

function readState(): PageState | null {
  const state = history.state as Partial<PageState> | null;
  if (!state?.memento || typeof state.depth !== "number" || typeof state.returnTo !== "string") return null;
  return {
    memento: true,
    depth: state.depth,
    returnTo: state.returnTo,
    fromApp: state.fromApp === true,
  };
}

function here(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}` || "/";
}

/** Push a settings or legal URL. The first push remembers the formula page underneath. */
export function pushPage(page: Page) {
  const current = pageFromPath(window.location.pathname);
  const prev = readState();
  const next: PageState =
    current === null
      ? { memento: true, depth: 1, returnTo: here(), fromApp: true }
      : {
          memento: true,
          depth: (prev?.depth ?? 1) + 1,
          returnTo: prev?.returnTo ?? "/",
          fromApp: prev?.fromApp ?? false,
        };
  history.pushState(next, "", `/${page}`);
}

function replaceWithSettings(): "here" {
  const prev = readState();
  const next: PageState = {
    memento: true,
    depth: 1,
    returnTo: prev?.returnTo ?? "/",
    fromApp: false,
  };
  history.replaceState(next, "", "/settings");
  return "here";
}

/** Previous page. From a legal page opened in the app, that is one step back. */
export function backOne(): "back" | "here" {
  const prev = readState();
  if (prev?.fromApp && prev.depth > 1) {
    history.back();
    return "back";
  }
  return replaceWithSettings();
}

/**
 * Legal page → Settings, including when other notes sit in between.
 * Returns "back" when history will emit popstate, "here" when the URL was replaced.
 */
export function showSettingsFromNotice(): "back" | "here" {
  const prev = readState();
  if (prev?.fromApp && prev.depth > 1) {
    history.go(-(prev.depth - 1));
    return "back";
  }
  return replaceWithSettings();
}

/**
 * Leave settings or a legal page for the app.
 * "back" waits for popstate. "here" has already moved the URL.
 */
export function closeToApp(): "back" | "here" {
  const prev = readState();
  if (prev?.fromApp && prev.depth > 0) {
    history.go(-prev.depth);
    return "back";
  }
  history.replaceState(null, "", "/");
  return "here";
}
