import AWS from 'aws-sdk';

import isOffline from './offline';

const sns = new AWS.SNS({
  apiVersion: '2010-03-31',
  endpoint: isOffline() ? 'http://127.0.0.1:4002' : undefined,
});

const accountId = isOffline() ? 123456789012 : 173751334418;

export function publish(message) {
  return sns
    .publish({
      Message: JSON.stringify({
        default: JSON.stringify(message),
      }),
      MessageStructure: 'json',
      TopicArn: `arn:aws:sns:${process.env.AWS_REGION}:${accountId}:${process.env.APP_STAGE}-load-properties`,
    })
    .promise();
}

export default { publish };
