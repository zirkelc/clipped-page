import { describe, test, expect } from 'vitest';
import { parseCount, formatCount } from './count.js';

describe('parseCount', () => {
  test(`should parse a plain integer`, () => {
    // Arrange
    const input = `42`;

    // Act
    const result = parseCount(input);

    // Assert
    expect(result).toBe(42);
  });

  test(`should strip thousands separators`, () => {
    // Arrange
    const input = `1,234`;

    // Act
    const result = parseCount(input);

    // Assert
    expect(result).toBe(1_234);
  });

  test(`should expand the K suffix`, () => {
    // Arrange
    const input = `1.2K`;

    // Act
    const result = parseCount(input);

    // Assert
    expect(result).toBe(1_200);
  });

  test(`should expand the M suffix`, () => {
    // Arrange
    const input = `12M`;

    // Act
    const result = parseCount(input);

    // Assert
    expect(result).toBe(12_000_000);
  });

  test(`should expand the B suffix`, () => {
    // Arrange
    const input = `2.5B`;

    // Act
    const result = parseCount(input);

    // Assert
    expect(result).toBe(2_500_000_000);
  });

  test(`should be case-insensitive for the suffix`, () => {
    // Arrange
    const input = `1.5k`;

    // Act
    const result = parseCount(input);

    // Assert
    expect(result).toBe(1_500);
  });

  test(`should ignore trailing label text`, () => {
    // Arrange
    const input = `1.2K Likes`;

    // Act
    const result = parseCount(input);

    // Assert
    expect(result).toBe(1_200);
  });

  test(`should round the scaled value`, () => {
    // Arrange
    const input = `1.9999K`;

    // Act
    const result = parseCount(input);

    // Assert
    expect(result).toBe(2_000);
  });

  test(`should return null for an empty string`, () => {
    // Arrange
    const input = ``;

    // Act
    const result = parseCount(input);

    // Assert
    expect(result).toBe(null);
  });

  test(`should return null when no number is present`, () => {
    // Arrange
    const input = `Likes`;

    // Act
    const result = parseCount(input);

    // Assert
    expect(result).toBe(null);
  });
});

describe('formatCount', () => {
  test(`should leave values under 1000 as-is`, () => {
    // Arrange
    const input = 999;

    // Act
    const result = formatCount(input);

    // Assert
    expect(result).toBe(`999`);
  });

  test(`should format zero`, () => {
    // Arrange
    const input = 0;

    // Act
    const result = formatCount(input);

    // Assert
    expect(result).toBe(`0`);
  });

  test(`should format thousands with one decimal below 10K`, () => {
    // Arrange
    const input = 1_200;

    // Act
    const result = formatCount(input);

    // Assert
    expect(result).toBe(`1.2K`);
  });

  test(`should drop a trailing .0`, () => {
    // Arrange
    const input = 1_000;

    // Act
    const result = formatCount(input);

    // Assert
    expect(result).toBe(`1K`);
  });

  test(`should format thousands without decimals at or above 10K`, () => {
    // Arrange
    const input = 15_000;

    // Act
    const result = formatCount(input);

    // Assert
    expect(result).toBe(`15K`);
  });

  test(`should format millions with one decimal below 10M`, () => {
    // Arrange
    const input = 1_200_000;

    // Act
    const result = formatCount(input);

    // Assert
    expect(result).toBe(`1.2M`);
  });

  test(`should format millions without decimals at or above 10M`, () => {
    // Arrange
    const input = 12_000_000;

    // Act
    const result = formatCount(input);

    // Assert
    expect(result).toBe(`12M`);
  });

  test(`should format billions`, () => {
    // Arrange
    const input = 2_500_000_000;

    // Act
    const result = formatCount(input);

    // Assert
    expect(result).toBe(`2.5B`);
  });
});
