import * as AWS from 'aws-sdk';

import { publish } from './sns';

describe('sns', () => {
  describe('publish', () => {
    test('successfully publishes a message', async () => {
      await publish({ test: true });

      expect(AWS.SNS.mock.results[0].value.publish).toBeCalled();
    });
  });
});
