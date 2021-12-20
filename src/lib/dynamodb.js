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
  async function getAll(query) {
    const { Responses, UnprocessedKeys } = await dynamodb.doc
      .batchGet(query)
      .promise();

    // Recursively get all the items
    if (!!UnprocessedKeys[table]) {
      const unprocessed = await getAll({ RequestItems: UnprocessedKeys });
      Responses[table].push(...unprocessed);
    }

    return Responses[table];
  }

  return getAll({
    RequestItems: {
      [table]: {
        Keys: keys,
      },
    },
  });
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
