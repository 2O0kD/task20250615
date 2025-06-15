import { handler } from './createBoard';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

const sqsMock = mockClient(SQSClient);
const createdBy = 'user-123';
const name = 'Test Board';

describe('createBoard handler', () => {
  beforeEach(() => {
    sqsMock.reset();
  });

  it('should send a message to SQS and return 202', async () => {
    sqsMock.on(SendMessageCommand).resolves({});

    const event = {
      body: JSON.stringify({ name, createdBy }),
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, {
      QueueUrl: process.env.CREATE_BOARD_QUEUE_URL,
      MessageBody: expect.stringContaining(name),
    });

    expect(result.statusCode).toBe(202);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Board creation request accepted.'
    });
  });

  it('should return 400 if name is missing', async () => {
    const event = {
      body: JSON.stringify({ createdBy })
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'Missing required fields'
    });
  });

  it('should return 400 if createdBy is missing', async () => {
    const event = {
      body: JSON.stringify({ name }),
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'Missing required fields'
    });
  });

  it('should return 500 on SQS send error', async () => {
    sqsMock.on(SendMessageCommand).rejects(new Error('SQS error'));

    const event = {
      body: JSON.stringify({ name, createdBy }),
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'Internal Server Error',
    });
  });
});