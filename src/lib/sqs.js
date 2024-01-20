import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

const client = new SQSClient({
  region: process.env.AWS_REGION,
});

const accountId = 173751334418;

export function sendMessage(message) {
  return client.send(
    new SendMessageCommand({
      MessageBody: JSON.stringify(message),
      MessageGroupId: 'price-loader',
      MessageDeduplicationId: JSON.stringify(message.hash),
      QueueUrl: `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${accountId}/${process.env.STAGE}-price-loader.fifo`,
    }),
  );
}

export default { sendMessage };
