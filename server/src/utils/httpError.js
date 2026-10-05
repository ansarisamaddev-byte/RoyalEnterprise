export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Throws the Supabase error (logged as a 500) or returns data.
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}
