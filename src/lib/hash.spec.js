import createHash from './hash';

describe('hash', () => {
  test('crates a hash out of an object', () => {
    const output = createHash({ some: 'value' });
    expect(output).toEqual(expect.any(String));
  });
});
