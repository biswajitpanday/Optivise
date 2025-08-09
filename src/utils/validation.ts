export function formatZodError(error: any): { code: string; message: string; issues: Array<{ path: string; message: string; code?: string }> } {
  const issues = Array.isArray(error?.issues)
    ? error.issues.map((i: any) => ({ path: (i.path || []).join('.') || '', message: i.message, code: i.code }))
    : [];
  return {
    code: 'INVALID_INPUT',
    message: 'One or more input fields are invalid',
    issues
  };
}


