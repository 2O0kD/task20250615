import 'aws-sdk-client-mock-jest';
import { handler } from './processPostMessage';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';

const docClientMock = mockClient(DynamoDBDocumentClient);
const apiGwMock = mockClient(ApiGatewayManagementApiClient);

describe('processPostMessage handler', () => {
  beforeEach(() => {
    docClientMock.reset();
    apiGwMock.reset();

    process.env.MESSAGES_TABLE = 'test-messages-table';
    process.env.CONNECTIONS_TABLE = 'test-connections-table';
  });

  const validMessage = {
    messageId: 'msg-1',
    boardId: 'board-123',
    authorId: 'user-456',
    content: 'Hello world',
  };

  const snsEvent = {
    Records: [
      {
        Sns: {
          Message: JSON.stringify(validMessage),
        },
      },
    ],
  };

  test('should save message and broadcast to all connections', async () => {
    const snsEvent = {
      Records: [
        {
          Sns: {
            Message: JSON.stringify(validMessage),
          },
        },
      ],
    };

    docClientMock.on(PutCommand).resolves({});
    docClientMock.on(ScanCommand).resolves({
      Items: [{ connectionId: 'abc-123' }, { connectionId: 'def-456' }],
    });

    apiGwMock.on(PostToConnectionCommand).resolves({});

    await handler(snsEvent as any);

    expect(docClientMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: 'test-messages-table',
      Item: validMessage,
    });

    expect(docClientMock).toHaveReceivedCommandWith(ScanCommand, {
      TableName: 'test-connections-table',
    });

    expect(apiGwMock).toHaveReceivedCommandTimes(PostToConnectionCommand, 2);
  });

  test('should delete stale connections', async () => {
    const message = {
      messageId: 'msg-2',
      boardId: 'board-456',
      authorId: 'user-123',
      content: 'Stale connection test',
      createdAt: new Date().toISOString(),
    };

    const snsEvent = {
      Records: [
        {
          Sns: {
            Message: JSON.stringify(message),
          },
        },
      ],
    };

    docClientMock.on(PutCommand).resolves({});
    docClientMock.on(ScanCommand).resolves({
      Items: [{ connectionId: 'stale-conn' }],
    });

    apiGwMock.on(PostToConnectionCommand).rejects({
      $metadata: { httpStatusCode: 410 },
    });

    docClientMock.on(DeleteCommand).resolves({});

    await handler(snsEvent as any);

    expect(docClientMock).toHaveReceivedCommandWith(DeleteCommand, {
      TableName: 'test-connections-table',
      Key: { connectionId: 'stale-conn' },
    });
  });

  test('should handle invalid message format gracefully', async () => {
    const snsEvent = {
      Records: [
        {
          Sns: {
            Message: 'not a json string',
          },
        },
      ],
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await handler(snsEvent as any);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error processing posted message:'), expect.any(Error));

    consoleSpy.mockRestore();
  });

  test('should handle DynamoDB ScanCommand failure when getting connections', async () => {
    docClientMock.on(PutCommand).resolves({});
    docClientMock.on(ScanCommand).rejects(new Error('DynamoDB scan error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    await handler(snsEvent as any);

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  test('should handle DynamoDB PutCommand failure when saving message', async () => {
    docClientMock.on(PutCommand).rejects(new Error('DynamoDB put error'));
    docClientMock.on(ScanCommand).resolves({ Items: [] });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    await handler(snsEvent as any);

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  test('should handle message missing required fields gracefully', async () => {
    const incompleteMessage = {
      authorId: 'user-456',
      content: 'Hello world',
      createdAt: new Date().toISOString(),
    };

    const badSnsEvent = {
      Records: [
        {
          Sns: {
            Message: JSON.stringify(incompleteMessage),
          },
        },
      ],
    };

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    await handler(badSnsEvent as any);

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  test('should handle empty list of connections without errors', async () => {
    docClientMock.on(PutCommand).resolves({});
    docClientMock.on(ScanCommand).resolves({ Items: [] });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    await handler(snsEvent as any);

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('Error scanning connections:'), expect.any(Error));

    consoleErrorSpy.mockRestore();
  });
});