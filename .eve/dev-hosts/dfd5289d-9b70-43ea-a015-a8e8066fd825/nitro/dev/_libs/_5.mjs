import { fileURLToPath as __eveFileURLToPath } from "node:url";
import { dirname as __eveDirname } from "node:path";
const __filename = __eveFileURLToPath(import.meta.url);
__eveDirname(__filename);
export { oe as DiagConsoleLogger, f as DiagLogLevel, D$2 as INVALID_SPANID, k$2 as INVALID_SPAN_CONTEXT, O$1 as INVALID_TRACEID, z as ProxyTracer, B as ProxyTracerProvider, g as ROOT_CONTEXT, V as SamplingDecision, H as SpanKind, U$3 as SpanStatusCode, E$1 as TraceFlags, x$1 as ValueType, m as baggageEntryMetadataFromString, G as context, h as createContextKey, Ce as createNoopMeter, He as createTraceState, Ze as default, S$2 as defaultTextMapGetter, C as defaultTextMapSetter, K as diag, L$2 as isSpanContextValid, I$1 as isValidSpanId, F$1 as isValidTraceId, J as metrics, Z as propagation, $$1 as trace } from "./eve.mjs";
