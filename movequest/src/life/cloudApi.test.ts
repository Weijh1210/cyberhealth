import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudApi } from "../../server/cloudApi";
import { extract } from "../../server/ai";
import { reserve, saveInterest } from "../../server/cloudStore";

vi.mock("../../server/ai", async (load) => ({
  ...(await load<typeof import("../../server/ai")>()),
  extract: vi.fn(async () => ({
    delta: { locations: [], events: [], questions: [] },
  })),
}));
vi.mock("../../server/cloudStore", () => ({
  cloudStoreConfigured: () => !!process.env.BLOB_STORE_ID,
  reserve: vi.fn(async () => "ok"),
  saveInterest: vi.fn(async () => {}),
}));

const host = "https://example.test";
function post(path: string, value: unknown, headers?: HeadersInit) {
  return new Request(host + path, {
    method: "POST",
    body: JSON.stringify(value),
    headers,
  });
}
function configure() {
  vi.stubEnv("BLOB_STORE_ID", "store-test");
  vi.stubEnv("MOVEQUEST_COOKIE_SECRET", "signing-fixture");
  vi.stubEnv("OPENROUTER_API_KEY", "server-only-fixture");
}
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("production API", () => {
  it("reports AI only when the provider, storage and session signer are configured", async () => {
    configure();
    const status = async () =>
      (await cloudApi(new Request(host + "/api/status"), "status")).json();
    expect(await status()).toMatchObject({ ai: true });
    expect(JSON.stringify(await status())).not.toContain("server-only-fixture");
    vi.stubEnv("BLOB_STORE_ID", "");
    expect(await status()).toMatchObject({ ai: false });
  });

  it("reserves durable usage before calling the provider and rejects exhausted quota", async () => {
    configure();
    const input = {
      text: "I study at the library.",
      existing: { locations: [], events: [] },
    };
    vi.mocked(reserve)
      .mockResolvedValueOnce("daily_limit")
      .mockResolvedValueOnce("ok");
    expect(
      (await cloudApi(post("/api/life/extract", input), "ai")).status,
    ).toBe(429);
    expect(extract).not.toHaveBeenCalled();
    const allowed = await cloudApi(post("/api/life/extract", input), "ai");
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("set-cookie")).toContain(
      "HttpOnly; Secure; SameSite=Strict",
    );
    expect(extract).toHaveBeenCalledOnce();
  });

  it("rejects cross-site writes and saves only explicitly consented interests", async () => {
    configure();
    const details = { email: "fixture@example.test", price: 99, consent: true };
    expect(
      (
        await cloudApi(
          post("/api/interest", details, { origin: "https://other.example" }),
          "interest",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await cloudApi(
          post("/api/interest", { ...details, consent: false }),
          "interest",
        )
      ).status,
    ).toBe(400);
    expect(saveInterest).not.toHaveBeenCalled();
    const allowed = await cloudApi(
      post("/api/interest", details, { origin: host }),
      "interest",
    );
    expect(await allowed.json()).toEqual({ registered: true, payment: false });
    expect(saveInterest).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f]{64}$/),
      expect.objectContaining({
        email: details.email,
        consentVersion: "plus-interest-v1",
      }),
    );
  });
});
