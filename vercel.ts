import { withEve } from "eve/vercel";

// The store and the agent deploy as separate Vercel services in one project. withEve adds the agent's service and
// its /eve/v1/* route ahead of the catch-all, so everything else goes to Next.js.
export default await withEve({
    services: {
        web: {
            framework: "nextjs",
            root: ".",
        },
    },
    routes: [
        {
            src: "^(.*)$",
            destination: {
                type: "service",
                service: "web",
            },
        },
    ],
    crons: [
        {
            path: "/api/health",
            schedule: "0 * * * *",
        },
    ],
});
