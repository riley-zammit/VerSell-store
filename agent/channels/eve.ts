import { eveChannel } from "eve/channels/eve";
import { type AuthFn, localDev, none, vercelOidc } from "eve/channels/auth";

// Shop sign-in attaches a token to a user, but the local /chat page has no login and
// localDev() resolves to a "local-dev" principal, which user-scoped connections reject.
// TODO(prod): every local request is one shopper. Replace with real app auth before production.
const devCaller = localDev();
const localShopper: AuthFn<Request> = async (request) =>
  (await devCaller(request)) && {
    attributes: {},
    authenticator: "local-dev",
    principalId: "local-shopper",
    principalType: "user",
  };

export default eveChannel({
  // localDev() stays listed so eve still treats this as a local-dev channel (e.g. /eve/v1/info).
  auth: [vercelOidc(), localShopper, localDev(), none()],
  // The only upload is the customer's creative. Files are sent inline, so Vercel's 4.5 MB body
  // limit allows about 3.3 MB, and the model only sees images up to 3 MiB anyway.
  uploadPolicy: { maxBytes: 3 * 1024 * 1024, allowedMediaTypes: ["image/png", "image/jpeg"] },
});
