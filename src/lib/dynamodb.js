import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';

import chunk from 'lodash.chunk';
import flatten from 'lodash.flatten';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});
const docClient = DynamoDBDocumentClient.from(client);

export async function get(table, hash) {
  const { Responses } = await docClient.send(
    new GetCommand({
      TableName: table,
      Key: { hash },
    }),
  );

  if (!Responses) {
    return;
  }

  return Responses[table];
}

export async function batchGet(table, keys) {
  async function getAll(query) {
    const { Responses, UnprocessedKeys } = await docClient.send(
      new BatchGetCommand(query),
    );

    // Recursively get all the items
    if (!!UnprocessedKeys[table]) {
      const unprocessed = await getAll({ RequestItems: UnprocessedKeys });
      Responses[table].push(...unprocessed);
    }

    return Responses[table];
  }

  const chunked = chunk(keys, 100);
  const responses = await Promise.all(
    chunked.map((chunkKeys) =>
      getAll({
        RequestItems: {
          [table]: {
            Keys: chunkKeys,
          },
        },
      }),
    ),
  );

  return flatten(responses);
}

export function put(table, data) {
  return docClient.send(
    new PutCommand({
      TableName: table,
      Item: data,
    }),
  );
}

export default { get, batchGet, put };
