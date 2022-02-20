import * as AWS from 'aws-sdk';

import { sendMessage } from './sqs';

describe('sqs', () => {
  describe('sendMessage', () => {
    test('successfully publishes a message', async () => {
      await sendMessage({ test: true });

      expect(AWS.SQS.mock.results[0].value.sendMessage).toBeCalled();
    });
  });
});
