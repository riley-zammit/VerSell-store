import { eveChannel } from "eve/channels/eve";
import { type AuthFn, localDev, vercelOidc } from "eve/channels/auth";
import { isVisitorId, VISITOR_COOKIE } from "../../lib/visitor";

// The store has no login, so each browser's visitor cookie (set by proxy.ts) is the caller. Each customer gets their
// own Shop sign-in, which is stored per caller. It's a random id, not a verified person.
const visitor: AuthFn<Request> = async (request) => {
  const visitorId = readCookie(request.headers.get("cookie"), VISITOR_COOKIE);
  if (!isVisitorId(visitorId)) {
    return null;
  }
  return {
    attributes: {},
    authenticator: "visitor",
    principalId: visitorId,
    principalType: "user",
  };
};

export default eveChannel({
  // vercelOidc() for our own deployments and the CLI, localDev() for the eve dev terminal (and /eve/v1/info).
  // A browser without a visitor cookie gets a 401.
  auth: [vercelOidc(), visitor, localDev()],
  // The only upload is the customer's creative. Files are sent inline, so Vercel's 4.5 MB body
  // limit allows about 3.3 MB, and the model only sees images up to 3 MiB anyway.
  uploadPolicy: { maxBytes: 3 * 1024 * 1024, allowedMediaTypes: ["image/png", "image/jpeg"] },
});

function readCookie(header: string | null, name: string) {
  const prefix = `${name}=`;
  const cookies = header?.split("; ") ?? [];
  const cookie = cookies.find((entry) => entry.startsWith(prefix));
  return cookie?.slice(prefix.length);
}
