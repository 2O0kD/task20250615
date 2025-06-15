import { handler } from './listBoards';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

const docClientMock = mockClient(DynamoDBDocumentClient);

describe('listBoards handler', () => {
  const BOARDS_TABLE = process.env.BOARDS_TABLE;

  beforeEach(() => {
    docClientMock.reset();
  });

  it('should return list of boards with status 200', async () => {
    const mockItems = [
      { boardId: '1', name: 'Board 1', createdBy: 'user1' },
      { boardId: '2', name: 'Board 2', createdBy: 'user2' },
    ];

    docClientMock.on(ScanCommand, { TableName: BOARDS_TABLE }).resolves({
      Items: mockItems,
    });

    const response = await handler();

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(mockItems);
  });

  it('should return empty array if no boards', async () => {
    docClientMock.on(ScanCommand, { TableName: BOARDS_TABLE }).resolves({
      Items: undefined,
    });

    const response = await handler();

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual([]);
  });

  it('should return 500 on DynamoDB error', async () => {
    docClientMock.on(ScanCommand, { TableName: BOARDS_TABLE }).rejects(new Error('DynamoDB error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await handler();

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ error: 'Internal Server Error' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('listBoards error:'), expect.any(Error));

    consoleErrorSpy.mockRestore();
  });
});