import dynamodb from 'serverless-dynamodb-client';

export async function batchGet(table, keys) {
  const { Responses } = await dynamodb.doc
    .batchGet({
      RequestItems: {
        [table]: {
          Keys: keys,
        },
      },
    })
    .promise();

  return Responses[table];
}

export function put(table, data) {
  return dynamodb.doc
    .put({
      TableName: table,
      Item: data,
    })
    .promise();
}

export default { batchGet, put };
