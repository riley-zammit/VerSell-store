import { disableTool } from "eve/tools";

// The concierge only talks to Shop and our own store. Open web access is a prompt-injection path with no shopping use.
export default disableTool();
