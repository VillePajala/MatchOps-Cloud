import { normalizeRosterIds } from '../idUtils';

describe('idUtils', () => {
  describe('normalizeRosterIds', () => {
    it('should return empty array for falsy input', () => {
      expect(normalizeRosterIds(null)).toEqual([]);
      expect(normalizeRosterIds(undefined)).toEqual([]);
      expect(normalizeRosterIds('')).toEqual([]);
      expect(normalizeRosterIds(0)).toEqual([]);
      expect(normalizeRosterIds(false)).toEqual([]);
    });

    it('should handle array input', () => {
      expect(normalizeRosterIds(['id1', 'id2', 'id3'])).toEqual(['id1', 'id2', 'id3']);
      expect(normalizeRosterIds(['  id1  ', 'id2', '  id3  '])).toEqual(['id1', 'id2', 'id3']);
    });

    it('should filter out empty strings from arrays', () => {
      expect(normalizeRosterIds(['id1', '', '  ', 'id2'])).toEqual(['id1', 'id2']);
      expect(normalizeRosterIds(['', '  ', '   '])).toEqual([]);
    });

    it('should remove quotes from array elements', () => {
      expect(normalizeRosterIds(['"id1"', "'id2'", 'id3'])).toEqual(['id1', 'id2', 'id3']);
      expect(normalizeRosterIds(['  "id1"  ', "  'id2'  "])).toEqual(['id1', 'id2']);
    });

    it('should handle string input', () => {
      expect(normalizeRosterIds('id1')).toEqual(['id1']);
      expect(normalizeRosterIds('  id1  ')).toEqual(['id1']);
    });

    it('should return empty array for empty string', () => {
      expect(normalizeRosterIds('')).toEqual([]);
      expect(normalizeRosterIds('   ')).toEqual([]);
    });

    it('should remove quotes from string input', () => {
      expect(normalizeRosterIds('"id1"')).toEqual(['id1']);
      expect(normalizeRosterIds("'id1'")).toEqual(['id1']);
      expect(normalizeRosterIds('  "id1"  ')).toEqual(['id1']);
    });

    it('should treat JSON strings as single IDs (strings are not parsed)', () => {
      // String inputs are treated as single IDs, not parsed as JSON
      expect(normalizeRosterIds('["id1", "id2", "id3"]')).toEqual(['["id1", "id2", "id3"]']);
      expect(normalizeRosterIds('{"not": "array"}')).toEqual(['{"not": "array"}']);
    });

    it('should convert non-string array elements to strings', () => {
      expect(normalizeRosterIds([123, 456, true])).toEqual(['123', '456', 'true']);
      expect(normalizeRosterIds([null, undefined, 0])).toEqual(['null', 'undefined', '0']);
    });

    it('should handle non-string inputs by attempting JSON parse', () => {
      // This would be for cases where the input is not a string but could be JSON-parseable
      // Numbers, booleans, etc. get converted to string then JSON parsed
      const numberInput = 123;
      expect(normalizeRosterIds(numberInput)).toEqual([]); // "123" is not valid JSON array
    });

    it('should handle numbers and other types by converting to string', () => {
      expect(normalizeRosterIds(123)).toEqual([]);
      expect(normalizeRosterIds(true)).toEqual([]);
      expect(normalizeRosterIds({})).toEqual([]);
    });

    it('should handle edge cases with mixed quotes', () => {
      expect(normalizeRosterIds(["'id1\"", '"id2\''])).toEqual(['id1', 'id2']);
    });
  });
});