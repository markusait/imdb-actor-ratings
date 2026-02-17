import { describe, it, expect } from 'vitest';

describe('Scraper Helper Functions', () => {
  describe('IMDb ID extraction', () => {
    it('should extract IMDb ID from URL', () => {
      const url = '/name/nm0000138/?ref_=fn_t_1';
      const match = url.match(/\/name\/(nm\d+)/);
      expect(match).toBeTruthy();
      expect(match?.[1]).toBe('nm0000138');
    });

    it('should extract title ID from URL', () => {
      const url = '/title/tt0111161/?ref_=fn_t_1';
      const match = url.match(/\/title\/(tt\d+)/);
      expect(match).toBeTruthy();
      expect(match?.[1]).toBe('tt0111161');
    });
  });

  describe('Year extraction', () => {
    it('should extract year from title with parentheses', () => {
      const title = 'The Shawshank Redemption (1994)';
      const match = title.match(/\((\d{4})\)/);
      expect(match).toBeTruthy();
      expect(match?.[1]).toBe('1994');
    });

    it('should extract year from text', () => {
      const text = 'Released in 2020 and was a hit';
      const match = text.match(/\b(19|20)\d{2}\b/);
      expect(match).toBeTruthy();
      expect(match?.[0]).toBe('2020');
    });
  });

  describe('Title cleaning', () => {
    it('should remove year from title', () => {
      const title = 'The Shawshank Redemption (1994)';
      const clean = title.replace(/\s*\(\d{4}\).*$/, '').trim();
      expect(clean).toBe('The Shawshank Redemption');
    });

    it('should handle titles without years', () => {
      const title = 'The Shawshank Redemption';
      const clean = title.replace(/\s*\(\d{4}\).*$/, '').trim();
      expect(clean).toBe('The Shawshank Redemption');
    });
  });

  describe('Rating parsing', () => {
    it('should parse float ratings', () => {
      const ratingText = '8.7';
      const rating = parseFloat(ratingText);
      expect(rating).toBe(8.7);
    });

    it('should handle invalid ratings', () => {
      const ratingText = 'N/A';
      const rating = parseFloat(ratingText) || 0;
      expect(rating).toBe(0);
    });
  });
});
