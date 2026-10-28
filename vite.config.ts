import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { getPlatformProxy } from "wrangler";

const matchModule = "/functions/api/match.ts";
const wranglerConfig = "wrangler.toml";

type BodySource = {
  on(event: "data", listener: (chunk: Uint8Array) => void): void;
  on(event: "end", listener: () => void): void;
  on(event: "error", listener: (error: unknown) => void): void;
};

type MatchResponse = {
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
};

function readBody(source: BodySource): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    source.on("data", (chunk) => {
      chunks.push(chunk);
    });
    source.on("end", () => {
      const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
      const body = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
      }
      resolve(body);
    });
    source.on("error", reject);
  });
}

function requestFrom(body: Uint8Array): unknown {
  const RequestCtor = (
    globalThis as unknown as {
      Request: new (
        url: string,
        init: { method: string; headers: { "content-type": string }; body: Uint8Array },
      ) => unknown;
    }
  ).Request;
  return new RequestCtor("http://127.0.0.1/api/match", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

function askMatchDev(): Plugin {
  return {
    name: "ask-match-dev",
    apply: "serve",
    configureServer(server) {
      let proxyPromise: ReturnType<typeof getPlatformProxy> | undefined;

      const stop = () => {
        const pending = proxyPromise;
        proxyPromise = undefined;
        if (!pending) return;
        void pending.then((proxy) => proxy.dispose()).catch(() => undefined);
      };

      server.httpServer?.on("close", stop);

      server.middlewares.use((req, res, next) => {
        const incoming = req as BodySource & { url?: string; method?: string };
        const path = incoming.url?.split("?")[0];
        if (path !== "/api/match" || incoming.method !== "POST") {
          next();
          return;
        }

        void serveMatch(server, incoming, res).catch(() => {
          if (res.writableEnded) return;
          res.statusCode = 502;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "unavailable" }));
        });
      });

      async function serveMatch(
        devServer: ViteDevServer,
        req: BodySource,
        res: {
          statusCode: number;
          writableEnded: boolean;
          setHeader(name: string, value: string): void;
          end(body: string): void;
        },
      ) {
        try {
          proxyPromise ??= getPlatformProxy({ configPath: wranglerConfig });
          const proxy = await proxyPromise;
          const loaded = (await devServer.ssrLoadModule(matchModule)) as {
            onRequestPost: (context: { request: unknown; env: unknown }) => Promise<MatchResponse>;
          };
          const response = await loaded.onRequestPost({
            request: requestFrom(await readBody(req)),
            env: proxy.env,
          });
          res.statusCode = response.status;
          res.setHeader("content-type", response.headers.get("content-type") ?? "application/json");
          res.end(await response.text());
        } catch (error) {
          const pending = proxyPromise;
          proxyPromise = undefined;
          if (pending) void pending.then((proxy) => proxy.dispose()).catch(() => undefined);
          const message = error instanceof Error ? error.message : "Ask match is unavailable.";
          (globalThis as unknown as { console?: { error(message: string): void } }).console?.error(message);
          throw error instanceof Error ? error : new Error("match unavailable");
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    askMatchDev(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "EB Memento",
        short_name: "Memento",
        description:
          "Syllabus-exact maths and physics formulas for European Baccalaureate students.",
        theme_color: "#1c1916",
        background_color: "#f4efe6",
        display: "standalone",
        start_url: "/",
        lang: "en",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json,woff2}"],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkOnly",
            method: "GET",
          },
          {
            urlPattern: /\/api\//,
            handler: "NetworkOnly",
            method: "POST",
          },
        ],
      },
    }),
  ],
});
