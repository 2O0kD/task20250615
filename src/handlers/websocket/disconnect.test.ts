import 'aws-sdk-client-mock-jest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from './disconnect';
import { APIGatewayEvent } from 'aws-lambda';

const ddbMock = mockClient(DynamoDBDocumentClient);
const table = 'test-connections-table';
const connectionId = 'xyz-789';

describe('websocket disconnect handler', () => {
  beforeEach(() => {
    process.env.CONNECTIONS_TABLE = table;
    ddbMock.reset();
  });

  it('should delete connectionId from DynamoDB and return 200', async () => {
    ddbMock.on(DeleteCommand).resolves({});

    const event = { requestContext: { connectionId } } as APIGatewayEvent;

    const result = await handler(event);

    expect(ddbMock).toHaveReceivedCommandWith(DeleteCommand, {
      TableName: table,
      Key: { connectionId },
    });

    expect(result).toEqual({ statusCode: 200 });
  });

  it('should return 500 if DynamoDB delete fails', async () => {
    ddbMock.on(DeleteCommand).rejects(new Error('Delete error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const event = { requestContext: { connectionId } } as APIGatewayEvent;

    const result = await handler(event);

    expect(consoleSpy).toHaveBeenCalled();
    expect(result.statusCode).toBe(500);

    consoleSpy.mockRestore();
  });
});