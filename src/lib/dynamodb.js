import dynamodb from 'serverless-dynamodb-client';

export async function get(table, hash) {
  const { Responses } = await dynamodb.doc
    .get({
      TableName: table,
      Key: { hash },
    })
    .promise();

  if (!Responses) {
    return;
  }

  return Responses[table];
}

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

export default { get, batchGet, put };
