// utils.test.js - Utility functions test suite

const { cap, uid, ytEmbed, shuffle, orderByPosition } = require('../js/utils.js');

describe('Utils', () => {
  describe('cap', () => {
    it('capitalizes the first letter of a word', () => {
      expect(cap('core')).toBe('Core');
      expect(cap('calisthenics')).toBe('Calisthenics');
    });

    it('handles empty string or null/undefined gracefully', () => {
      expect(cap('')).toBe('');
      expect(cap(null)).toBe('');
      expect(cap(undefined)).toBe('');
    });
  });

  describe('uid', () => {
    it('generates a string id starting with e', () => {
      const id1 = uid();
      const id2 = uid();
      expect(typeof id1).toBe('string');
      expect(id1.startsWith('e')).toBe(true);
      expect(id1).not.toBe(id2);
    });
  });

  describe('ytEmbed', () => {
    it('returns empty string if url is missing', () => {
      expect(ytEmbed('')).toBe('');
      expect(ytEmbed(null)).toBe('');
    });

    it('converts youtube.com/watch?v= URL to embed URL', () => {
      const url = 'https://www.youtube.com/watch?v=abcdefghijk';
      const embed = ytEmbed(url, true);
      expect(embed).toBe('https://www.youtube.com/embed/abcdefghijk?autoplay=1&mute=1&rel=0&modestbranding=1');
    });

    it('converts youtu.be URL to embed URL with autoplay off', () => {
      const url = 'https://youtu.be/abcdefghijk';
      const embed = ytEmbed(url, false);
      expect(embed).toBe('https://www.youtube.com/embed/abcdefghijk?autoplay=0&rel=0&modestbranding=1');
    });

    it('returns original url if it does not match youtube pattern', () => {
      const url = 'https://example.com/video.mp4';
      expect(ytEmbed(url)).toBe(url);
    });
  });

  describe('shuffle', () => {
    it('returns an array with the same elements and length without mutating input', () => {
      const orig = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const copy = [...orig];
      const shuffled = shuffle(orig);
      expect(shuffled).toHaveLength(orig.length);
      expect(orig).toEqual(copy);
      expect(shuffled.sort()).toEqual(copy.sort());
    });

    it('handles empty array', () => {
      expect(shuffle([])).toEqual([]);
    });
  });

  describe('orderByPosition', () => {
    it('minimizes consecutive same positions', () => {
      const pool = [
        { name: 'p1', position: 'floor' },
        { name: 'p2', position: 'floor' },
        { name: 'p3', position: 'standing' },
        { name: 'p4', position: 'standing' },
      ];
      const ordered = orderByPosition(pool);
      expect(ordered).toHaveLength(4);
      expect(ordered[0].position).not.toBe(ordered[1].position);
    });

    it('handles empty and single-item pools', () => {
      expect(orderByPosition([])).toEqual([]);
      const single = [{ name: 'only', position: 'plank' }];
      expect(orderByPosition(single)).toEqual(single);
    });
  });
});

