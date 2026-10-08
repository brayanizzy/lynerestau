export class HttpError extends Error {
  constructor(public statusCode: number, public code: string, message: string) { super(message); }
}
export function failure(status: number, code: string, message: string): never { throw new HttpError(status, code, message); }
