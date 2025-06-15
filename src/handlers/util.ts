import { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { CreateQueueCommand, SQSClient } from '@aws-sdk/client-sqs';
import { APIGatewayProxyResult } from 'aws-lambda';
import {
  ApiGatewayV2Client,
  GetApisCommand,
} from '@aws-sdk/client-apigatewayv2';

function isTest(): boolean {
  return process.env.AWS_ACCESS_KEY_ID === 'test';
}

function isOffline(): boolean {
  return process.env.AWS_ACCESS_KEY_ID === 'offline';
}

export function createSQSClient(): SQSClient {
  if (isOffline()) {
    return new SQSClient({
      region: 'elasticmq',
      endpoint: 'http://localhost:9324',
      credentials: { accessKeyId: 'x', secretAccessKey: 'x' }
    });
  } else {
    return new SQSClient({});  
  }
}

export async function getQueueUrl(client: SQSClient): Promise<string> {
  if (isOffline()) {
    const queueName = 'CreateBoardQueue';
    const { QueueUrl } = await client.send(new CreateQueueCommand({ QueueName: queueName }));
    return QueueUrl!;
  } else {
    return process.env.CREATE_BOARD_QUEUE_URL!;
  }
}

export function createDynamoDBClient(): DynamoDBClient {
  if (isOffline()) {
    return new DynamoDBClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000',
      credentials: {
        accessKeyId: 'MockAccessKeyId',
        secretAccessKey: 'MockSecretAccessKey'
      },
    });
  } else {
    return new DynamoDBClient({});
  }
}

export async function createApiGatewayManagementApiClient(): Promise<ApiGatewayManagementApiClient> {
  if (isOffline()) {
    return new ApiGatewayManagementApiClient({
      endpoint: 'http://localhost:3001',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'fake',
        secretAccessKey: 'fake',
      },
    });
  } else {
    return new ApiGatewayManagementApiClient({ endpoint: isTest() ? '' : await getWebSocketEndpoint('prod-cover-more-websockets') });
  }
}

async function getWebSocketEndpoint(apiName: string, region = process.env.AWS_REGION || 'us-east-1'): Promise<string> {
  const client = new ApiGatewayV2Client({});
  const list = await client.send(new GetApisCommand({}));

  const api = list.Items?.find((api) => api.Name === apiName && api.ProtocolType === 'WEBSOCKET');

  if (!api || !api.ApiId) {
    throw new Error(`WebSocket API "${apiName}" not found`);
  }

  return `https://${api.ApiId}.execute-api.${region}.amazonaws.com/prod`;
}

export function createSNSClient(): SNSClient {
  if (isOffline()) {
    process.env.POST_MESSAGE_TOPIC_ARN = 'arn:aws:sns:us-east-1:000000000000:PostMessageTopic';
    process.env.REGISTER_USER_TOPIC_ARN = 'arn:aws:sns:us-east-1:000000000000:RegisterUserTopic';
    return new SNSClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:4002',
      credentials: {
        accessKeyId: 'fake',
        secretAccessKey: 'fake',
      },
    });
  } else {
    return new SNSClient({});
  }
}

export const HANDLER_RESULT_500 = handlerResult(500, { error: 'Internal Server Error' });

export function handlerResult<T>(statusCode: number, body: T): APIGatewayProxyResult {
  return { statusCode, body: JSON.stringify(body) };
}