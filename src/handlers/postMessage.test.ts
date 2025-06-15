import { handler } from './postMessage';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';

const snsMock = mockClient(SNSClient);

const eventSuccess = {
  pathParameters: { boardId: 'board1' },
  body: JSON.stringify({ content: 'Hello world', authorId: 'user1' }),
  requestContext: { domainName: 'test', stage: 'dev' },
} as unknown as APIGatewayProxyEvent;

describe('postMessage handler', () => {
  const OLD_ENV = process.env;

  beforeAll(() => {
    process.env = { ...OLD_ENV, POST_MESSAGE_TOPIC_ARN: 'test-topic-arn' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  beforeEach(() => {
    snsMock.reset();
  });

  it('should return 400 if boardId path parameter is missing', async () => {
    const event = {
      pathParameters: undefined,
      body: JSON.stringify({ content: 'Hello', authorId: 'user1' }),
      requestContext: { domainName: 'test', stage: 'dev' },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'Missing path parameter: boardId.' });
  });

  it('should return 400 if required body fields are missing', async () => {
    const event = {
      pathParameters: { boardId: 'board1' },
      body: JSON.stringify({ content: '' }),
      requestContext: { domainName: 'test', stage: 'dev' },
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'Missing required fields: content and authorId.' });
  });

  it('should publish message and return 202 on success', async () => {
    snsMock.on(PublishCommand).resolves({ MessageId: 'msg123' });

    const response = await handler(eventSuccess);

    expect(snsMock.calls()).toHaveLength(1);
    const publishCall = snsMock.calls()[0].args[0] as PublishCommand;
    expect(publishCall.input.TopicArn).toBe(process.env.POST_MESSAGE_TOPIC_ARN);
    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ message: 'Message post request accepted.' });
  });

  it('should return 500 on SNS client error', async () => {
    snsMock.on(PublishCommand).rejects(new Error('SNS error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await handler(eventSuccess);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ error: 'Internal Server Error' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('postMessage error:'), expect.any(Error));

    consoleErrorSpy.mockRestore();
  });
});