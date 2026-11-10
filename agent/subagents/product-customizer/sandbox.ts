import { defineSandbox } from "eve/sandbox";
import { VercelSandbox } from "eve/sandbox/vercel";

// The customizer's own sandbox, separate from the root's. Image editing is open-ended, so the
// agent gets a lightweight but flexible toolbox: ImageMagick on the shell, plus Python (Pillow,
// NumPy) and Node (sharp) for edits it writes as scripts. eve's base image already has Python 3 and Node 24.
// Everything here is installed once into the build snapshot, not on each session.
export const environment = VercelSandbox.environment({
  prepare: async (sandbox) => {
    const steps = [
      "sudo apt-get update",
      "sudo apt-get install -y --no-install-recommends imagemagick python3-pil python3-numpy",
      // A tiny Node project so scripts in ~/image-tools can import sharp.
      "mkdir -p ~/image-tools && cd ~/image-tools && npm init -y > /dev/null && npm install sharp",
    ];
    for (const command of steps) {
      const result = await sandbox.run({ command });
      if (result.exitCode !== 0) throw new Error(`${command}\n${result.stderr}`);
    }
  },
});

// No network: customer feedback reaches this agent almost word for word and it runs code, so a hijacked
// run must not be able to download or send anything. The toolbox above is baked into the snapshot instead.
// Images still come in and go out through load_image and publish_mockup in the app runtime,
// so the Blob and Redis credentials never enter the sandbox.
// Applies only when a session's sandbox is created; existing sandboxes keep their policy.
export default defineSandbox(() => environment.open({ networkPolicy: "deny-all" }));
