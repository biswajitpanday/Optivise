export interface RedactionResult {
  text: string;
  redactions: Array<{ type: string; count: number }>;
}

export function redactSensitive(input: string): RedactionResult {
  if (!input) return { text: input, redactions: [] };
  let text = input;
  const redactions: Array<{ type: string; count: number }> = [];

  const rules: Array<{ type: string; regex: RegExp; replacement: string }> = [
    { type: 'email', regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
    // Simple phone number patterns (US/international)
    { type: 'phone', regex: /\b(?:\+\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})\b/g, replacement: '[REDACTED_PHONE]' },
    // Credit card-like numbers (13-19 digits with optional separators)
    { type: 'credit_card', regex: /\b(?:\d[ -]*?){13,19}\b/g, replacement: '[REDACTED_CC]' },
    // AWS Access Key ID pattern
    { type: 'aws_access_key', regex: /\bAKIA[0-9A-Z]{16}\b/g, replacement: '[REDACTED_AWS_KEY]' },
    // Bearer token style long token
    { type: 'bearer_token', regex: /Bearer\s+[A-Za-z0-9-_.]{20,}/g, replacement: 'Bearer [REDACTED_TOKEN]' }
  ];

  for (const rule of rules) {
    const before = text;
    text = text.replace(rule.regex, rule.replacement);
    if (before !== text) {
      const matches = before.match(rule.regex) || [];
      if (matches.length > 0) redactions.push({ type: rule.type, count: matches.length });
    }
  }

  return { text, redactions };
}


