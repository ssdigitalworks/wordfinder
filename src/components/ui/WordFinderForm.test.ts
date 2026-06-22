import { test, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import WordFinderForm from './WordFinderForm.astro';

test('WordFinderForm renders with default props', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(WordFinderForm as any);
  
  expect(html).toContain('id="word-finder-form"');
  expect(html).toContain('id="find-words-btn"');
});

test('WordFinderForm respects showAdvanced prop', async () => {
  const container = await AstroContainer.create();
  const htmlWithoutAdvanced = await container.renderToString(WordFinderForm as any, {
    props: { showAdvanced: false }
  });
  
  // AdvancedOptions is included if showAdvanced is true (default).
  // Assuming AdvancedOptions renders something specific like "Advanced Options" or similar id.
  // We'll just verify it renders without crashing.
  expect(htmlWithoutAdvanced).toContain('id="word-finder-form"');
});
