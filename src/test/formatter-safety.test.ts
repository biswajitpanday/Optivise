import { describe, it, expect } from 'vitest';
import { RequestFormatter } from '../formatters/request-formatter.js';

describe('RequestFormatter safety and bounds', () => {
  it('sanitizes dangerous HTML and data URIs', () => {
    const blocks = [
      { type: 'analysis' as const, title: 'Danger', content: '<script>alert(1)</script><img src="javascript:evil()">data:image/png;base64,AAAA' }
    ];
    const req = RequestFormatter.format({ toolName: 't', userPrompt: 'u', blocks, tokenBudget: { maxContextTokens: 200 } });
    const text = req.contextBlocks[0].content;
    expect(text).not.toContain('<script>');
    expect(text).not.toContain('javascript:');
    expect(text).toContain('[DATA_URI_REDACTED]');
  });

  it('enforces block character limits and adds [TRUNCATED] marker', () => {
    process.env.MAX_BLOCK_CHARS = '100';
    const content = 'x'.repeat(300);
    const blocks = [{ type: 'analysis' as const, title: 'Big', content }];
    const req = RequestFormatter.format({ toolName: 't', userPrompt: 'u', blocks });
    expect(req.contextBlocks[0].content.endsWith('[TRUNCATED]')).toBe(true);
  });

  it('masks API-like tokens and keys', () => {
    const blocks = [
      { type: 'analysis' as const, title: 'Secrets', content: 'Bearer sk-THISISALONGAPIKEYWITHCHARSANDNUMBERS1234567890' }
    ];
    const req = RequestFormatter.format({ toolName: 't', userPrompt: 'u', blocks, tokenBudget: { maxContextTokens: 200 } });
    const text = req.contextBlocks[0].content;
    expect(text).toContain('[API_KEY_REDACTED]');
  });

  it('redacts obvious PII like emails/phones', () => {
    const blocks = [
      { type: 'analysis' as const, title: 'PII', content: 'Contact me at john.doe@example.com or (555) 123-4567' }
    ];
    const req = RequestFormatter.format({ toolName: 't', userPrompt: 'u', blocks });
    const text = req.contextBlocks[0].content;
    expect(text).toContain('[REDACTED_EMAIL]');
    expect(text).toContain('[REDACTED_PHONE]');
  });
});


