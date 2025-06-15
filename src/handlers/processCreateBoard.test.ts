import 'aws-sdk-client-mock-jest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from './processCreateBoard';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('processCreateBoard handler', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.BOARDS_TABLE = 'test-boards-table';
    ddbMock.reset();
  });

  it('should put board to DynamoDB', async () => {

    ddbMock.on(PutCommand).resolves({});

    const board = {
      boardId: 'board-123',
      name: 'Test Board',
      createdBy: 'user-456',
    };

    const event = {
      Records: [
        {
          body: JSON.stringify(board),
        },
      ],
    } as any;

    await handler(event);

    expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
      TableName: 'test-boards-table',
      Item: board,
    });
  });
});
