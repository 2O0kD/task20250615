import 'aws-sdk-client-mock-jest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from './connect';
import { APIGatewayEvent } from 'aws-lambda';

const ddbMock = mockClient(DynamoDBDocumentClient);
const connectionId = 'abc-123';
const table = 'test-connections-table';

describe('websocket connect handler', () => {
  beforeEach(() => {
    process.env.CONNECTIONS_TABLE = table;
    ddbMock.reset();
  });

  it('should store connectionId in DynamoDB and return 200', async () => {
    ddbMock.on(PutCommand).resolves({});

    const event = { requestContext: { connectionId } } as APIGatewayEvent;

    const result = await handler(event);

    expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: table,
      Item: { connectionId },
    });

    expect(result).toEqual({ statusCode: 200 });
  });

  it('should return 500 if DynamoDB put fails', async () => {
    ddbMock.on(PutCommand).rejects(new Error('DynamoDB error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const event = { requestContext: { connectionId } } as APIGatewayEvent;

    const result = await handler(event);

    expect(consoleSpy).toHaveBeenCalled();
    expect(result.statusCode).toBe(500);

    consoleSpy.mockRestore();
  });
});