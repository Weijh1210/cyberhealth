import { BlobPreconditionFailedError, get, put } from "@vercel/blob";

type Usage = {
  total: number;
  browsers: Record<string, number>;
  addresses: Record<string, number>;
};

export type Interest = {
  email: string;
  price: number;
  consentVersion: "plus-interest-v1";
  at: string;
};

type Reservation = {
  kind: "ai" | "interest";
  at: number;
  address: string;
  browser: string;
  dailyLimit: number;
};

export function cloudStoreConfigured(env = process.env) {
  return Boolean(env.BLOB_READ_WRITE_TOKEN || env.BLOB_STORE_ID);
}

export async function reserve({
  kind,
  at,
  address,
  browser,
  dailyLimit,
}: Reservation): Promise<
  "ok" | "browser_limit" | "rate_limited" | "daily_limit"
> {
  const day = new Date(at).toISOString().slice(0, 10);
  const hour = Math.floor(at / 3600000);
  const path = `usage/${kind}/${day}.json`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await get(path, { access: "private", useCache: false });
    const usage: Usage =
      current?.statusCode === 200
        ? await new Response(current.stream).json()
        : { total: 0, browsers: {}, addresses: {} };
    const addressWindow = `${hour}:${address}`;
    if ((usage.browsers[browser] ?? 0) >= dailyLimit) return "browser_limit";
    if ((usage.addresses[addressWindow] ?? 0) >= 60) return "rate_limited";
    if (usage.total >= (kind === "ai" ? 50 : 100)) return "daily_limit";
    usage.total++;
    usage.browsers[browser] = (usage.browsers[browser] ?? 0) + 1;
    usage.addresses[addressWindow] = (usage.addresses[addressWindow] ?? 0) + 1;
    try {
      await put(path, JSON.stringify(usage), {
        access: "private",
        contentType: "application/json",
        ttlDays: 2,
        ...(current
          ? { ifMatch: current.blob.etag }
          : { allowOverwrite: false }),
      });
      return "ok";
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) continue;
      // Two first requests may both see a missing object. Retry only if it now exists.
      if (!current && (await get(path, { access: "private", useCache: false })))
        continue;
      throw error;
    }
  }
  throw Error("Could not reserve a slot after concurrent updates");
}

export async function saveInterest(key: string, interest: Interest) {
  const path = `interests/${key}.json`;
  try {
    await put(path, JSON.stringify(interest), {
      access: "private",
      contentType: "application/json",
      allowOverwrite: false,
    });
  } catch (error) {
    // A repeated signup keeps the first consent receipt.
    if (!(await get(path, { access: "private", useCache: false }))) throw error;
  }
}
