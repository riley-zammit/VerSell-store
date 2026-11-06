import type { ApiResponse } from './types'

// No `server-only` or Next imports here: the eve agent's tools call the store API too.

export enum ApiHeader { Bypass = 'x-vercel-protection-bypass' }
export enum Category { Bottles = 'bottles', Cups = 'cups', Mugs = 'mugs' }

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message)
    }
}

/** Returns { data, meta }. Throws ApiError on failure. */
export async function apiFetch<T>(path: string, init?: RequestInit) {
    const res = await fetch(process.env.SWAG_API_URL + path, {
        ...init,
        signal: AbortSignal.timeout(8000), // ~3× worst observed latency: a hung API fails fast instead of hanging the render
        headers: { [ApiHeader.Bypass]: process.env.SWAG_API_BYPASS_TOKEN!, ...init?.headers },
    })
    const body: ApiResponse<T> = await res
        .json()
        .catch(() => ({ success: false, error: { message: res.statusText } }))
    if (!res.ok || !body.success) throw new ApiError(res.status, body.success ? res.statusText : body.error.message)
    return body
}
