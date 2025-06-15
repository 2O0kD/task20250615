import { handler } from './getUser';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);
const item = {
  userId: '123',
  name: 'Alice',
  email: 'alice@example.com',
};

describe('getUser handler', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it('should return user by email', async () => {
    ddbMock.on(GetCommand).resolves({ Item: item });

    const event = {
      queryStringParameters: { email: item.email },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toHaveProperty('userId', '123');
    expect(JSON.parse(result.body)).toEqual(item);
  });

  it('should return 404 if user not found', async () => {
    ddbMock.on(GetCommand).resolves({});

    const event = {
      queryStringParameters: { email: 'notfound@example.com' },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
  });

  it('should return 400 if email is missing', async () => {
    const event = {
      queryStringParameters: {},
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty('error', 'Missing required parameter');
  });
});