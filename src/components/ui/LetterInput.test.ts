import { test, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import LetterInput from './LetterInput.astro';

test('LetterInput renders with default props', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(LetterInput as any);
  
  expect(html).toContain('id="letters-input"');
  expect(html).toContain('name="letters"');
  expect(html).toContain('aria-label="Your Letters"');
  expect(html).toContain('aria-describedby="letters-input-help"');
});

test('LetterInput renders with custom props', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(LetterInput as any, {
    props: {
      id: 'custom-id',
      name: 'custom-name',
      label: 'Custom Label',
      helpText: 'Custom help',
      maxLength: 7
    }
  });

  expect(html).toContain('id="custom-id"');
  expect(html).toContain('name="custom-name"');
  expect(html).toContain('Custom Label');
  expect(html).toContain('Custom help');
  expect(html).toContain('maxlength="7"');
});
