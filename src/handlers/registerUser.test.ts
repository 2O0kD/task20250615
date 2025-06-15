import { handler } from './registerUser';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

const snsMock = mockClient(SNSClient);
const user = { name: 'Alice', email: 'alice@example.com' };

describe('registerUser', () => {
  beforeEach(() => {
    snsMock.reset();
  });

  it('should publish user registration to SNS', async () => {
    snsMock.on(PublishCommand).resolves({ MessageId: 'mock-message-id' });

    const event = {
      body: JSON.stringify(user),
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
      Message: JSON.stringify(user),
    });
    expect(result.statusCode).toBe(202);
  });

  it('should return 400 if input is invalid', async () => {
    const result = await handler({ body: '{}' } as APIGatewayProxyEvent);
    expect(result.statusCode).toBe(400);
  });
});