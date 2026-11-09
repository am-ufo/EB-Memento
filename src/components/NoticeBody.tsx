import type { ReactNode } from "react";
import {
  CLEAR_NOTE,
  COOKIES,
  DEVICE,
  DEVICE_LIST_NOTE,
  NOT_A_COOKIE_NOTE,
  SENT,
  TECHNICAL,
  THIRD_PARTIES,
  cookieIntro,
  privacyClosing,
  privacyIntro,
  sentEmptyParagraph,
  termsBlocks,
  updatedLine,
  type NoticeBlock,
} from "../data/notices";
import { PAGE_TITLE, type Page } from "../lib/pages";

type NoticePage = Exclude<Page, "settings">;

type Props = {
  page: NoticePage;
  onOpen: (page: Page) => void;
};

const MORE: Page[] = ["settings", "privacy", "cookies", "terms"];

export function NoticeBody({ page, onOpen }: Props) {
  return (
    <div className="notice">
      <p className="notice-updated">{updatedLine()}</p>
      {page === "privacy" ? <Privacy /> : null}
      {page === "cookies" ? <Cookies /> : null}
      {page === "terms" ? <Terms /> : null}
      <nav className="notice-nav" aria-label="Other notes">
        {MORE.filter((item) => item !== page).map((item) => (
          <button key={item} type="button" onClick={() => onOpen(item)}>
            {PAGE_TITLE[item]}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Blocks({ blocks }: { blocks: readonly NoticeBlock[] }) {
  return blocks.map((block) => (
    <section key={block.heading || block.paragraphs[0]} className="notice-section">
      {block.heading ? <h3>{block.heading}</h3> : null}
      {block.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </section>
  ));
}

function RecordList({ children }: { children: ReactNode }) {
  return <ul className="notice-list">{children}</ul>;
}

function RecordItem({ title, lines }: { title: string; lines: string[] }) {
  return (
    <li className="notice-item">
      <h3>{title}</h3>
      {lines.map((line, index) => (
        <p key={`${title}-${index}`}>{line}</p>
      ))}
    </li>
  );
}

function Privacy() {
  return (
    <>
      <Blocks blocks={privacyIntro()} />
      <section className="notice-section">
        <h3>On this device</h3>
        <RecordList>
          {DEVICE.map((row) => (
            <RecordItem key={row.id} title={row.name} lines={[row.holds, row.lasts]} />
          ))}
        </RecordList>
        <p>{DEVICE_LIST_NOTE}</p>
      </section>
      <section className="notice-section">
        <h3>What leaves the device</h3>
        {SENT.length === 0 ? (
          <p>{sentEmptyParagraph()}</p>
        ) : (
          <RecordList>
            {SENT.map((row) => (
              <RecordItem key={row.id} title={row.name} lines={[row.when, row.sends, row.kept]} />
            ))}
          </RecordList>
        )}
      </section>
      {TECHNICAL.length > 0 ? (
        <section className="notice-section">
          <h3>Offline</h3>
          <RecordList>
            {TECHNICAL.map((row) => (
              <RecordItem key={row.id} title={row.name} lines={[row.holds, row.lasts]} />
            ))}
          </RecordList>
        </section>
      ) : null}
      <Blocks blocks={privacyClosing()} />
    </>
  );
}

function Cookies() {
  return (
    <>
      <Blocks blocks={cookieIntro()} />
      {COOKIES.length > 0 ? (
        <section className="notice-section">
          <h3>Cookies Memento sets</h3>
          <RecordList>
            {COOKIES.map((cookie) => (
              <RecordItem
                key={cookie.name}
                title={cookie.name}
                lines={[
                  cookie.purpose,
                  cookie.lasts,
                  cookie.required === "essential" ? "The app needs this cookie." : "Off until you allow it.",
                ]}
              />
            ))}
          </RecordList>
        </section>
      ) : null}
      {THIRD_PARTIES.length > 0 ? (
        <section className="notice-section">
          <h3>Other tools</h3>
          <RecordList>
            {THIRD_PARTIES.map((party) => (
              <RecordItem key={party.name} title={party.name} lines={[party.receives]} />
            ))}
          </RecordList>
        </section>
      ) : null}
      <section className="notice-section">
        <h3>On this device, not a cookie</h3>
        <p>{NOT_A_COOKIE_NOTE}</p>
        <RecordList>
          {DEVICE.map((row) => (
            <RecordItem key={row.id} title={row.name} lines={[row.holds, row.lasts]} />
          ))}
          {TECHNICAL.map((row) => (
            <RecordItem key={row.id} title={row.name} lines={[row.holds, row.lasts]} />
          ))}
        </RecordList>
        <p>{CLEAR_NOTE}</p>
      </section>
    </>
  );
}

function Terms() {
  return <Blocks blocks={termsBlocks()} />;
}
