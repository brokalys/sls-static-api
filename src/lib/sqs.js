import AWS from 'aws-sdk';

const sqs = new AWS.SQS({
  apiVersion: '2012-11-05',
});

const accountId = 173751334418;

export function sendMessage(message) {
  return sqs
    .sendMessage({
      MessageBody: JSON.stringify(message),
      MessageGroupId: 'price-loader',
      MessageDeduplicationId: JSON.stringify(message.hash),
      QueueUrl: `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${accountId}/${process.env.STAGE}-price-loader.fifo`,
    })
    .promise();
}

export default { sendMessage };
