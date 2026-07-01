import { test, expect } from 'vitest';
import { buildShareFields } from './share.js';
import type { Payload, Post } from './payload.js';

function makePost(handle: string, name: string, text: string): Post {
  return {
    author: { handle, name },
    text,
    timestamp: `2026-01-01T00:00:00.000Z`,
  };
}

test(`should build title as "@handle name" and text from the focal post`, () => {
  // Arrange
  const payload: Payload = {
    posts: [makePost(`theo`, `Theo`, `hello world`)],
    focal: 0,
  };

  // Act
  const result = buildShareFields(payload);

  // Assert
  expect(result).toEqual({ title: `@theo Theo`, text: `hello world` });
});

test(`should select the post at the focal index`, () => {
  // Arrange
  const payload: Payload = {
    posts: [makePost(`a`, `Alice`, `first`), makePost(`b`, `Bob`, `second`)],
    focal: 1,
  };

  // Act
  const result = buildShareFields(payload);

  // Assert
  expect(result).toEqual({ title: `@b Bob`, text: `second` });
});

test(`should fall back to the first post when focal is out of range`, () => {
  // Arrange
  const payload = {
    posts: [makePost(`a`, `Alice`, `only`)],
    focal: 5,
  } as Payload;

  // Act
  const result = buildShareFields(payload);

  // Assert
  expect(result).toEqual({ title: `@a Alice`, text: `only` });
});
