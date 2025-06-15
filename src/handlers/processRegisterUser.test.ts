import { handler } from './processRegisterUser';
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from '@aws-sdk/lib-dynamodb';
import { SNSEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);
const item = {
  name: 'Bob',
  email: 'bob@example.com',
};

jest.mock('uuid', () => ({ v4: () => 'test-user-id' }));

describe('processRegisterUser', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it('should store user in DynamoDB', async () => {
    ddbMock.on(PutCommand).resolves({});

    const snsEvent = {
      Records: [
        {
          Sns: {
            Message: JSON.stringify(item),
          },
        },
      ],
    } as SNSEvent;

    await handler(snsEvent);

    expect(ddbMock.calls()).toHaveLength(1);

    const putCommandInput = ddbMock.calls()[0].args[0].input as PutCommandInput;

    expect(putCommandInput.Item).toMatchObject(item);
    expect(putCommandInput.Item).toHaveProperty('userId');
    expect(putCommandInput.Item!.userId).toBe('test-user-id');
  });

  it('should skip invalid message', async () => {
    const event = {
      Records: [{ Sns: { Message: '{}' } }],
    } as SNSEvent;

    await expect(handler(event)).resolves.not.toThrow();

    expect(ddbMock.calls()).toHaveLength(0);
  });
});