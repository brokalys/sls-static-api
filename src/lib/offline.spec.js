import isOffline from './offline';

describe('offline', () => {
  test('returns `false` by default', () => {
    expect(isOffline()).toBeFalsy();
  });

  test('returns `true` if offline mode is activated', () => {
    process.env.IS_OFFLINE = true;
    expect(isOffline()).toBeTruthy();
  });

  test('returns `false` if offline mode is not activated', () => {
    process.env.IS_OFFLINE = false;
    expect(isOffline()).toBeFalsy();
  });
});
