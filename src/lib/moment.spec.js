import moment from './moment';

describe('moment', () => {
  test('initializes moment with moment-range', () => {
    expect(moment.range).toBeDefined();
  });
});
