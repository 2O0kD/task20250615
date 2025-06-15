import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { Board, Message, User } from './types';
import { createApiGatewayManagementApiClient, createDynamoDBClient, createSNSClient, createSQSClient, getQueueUrl } from './util';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { PublishCommand } from '@aws-sdk/client-sns';
import { PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

const sqsClient = createSQSClient();
const snsClient = createSNSClient();
const docClient = DynamoDBDocumentClient.from(createDynamoDBClient());

export async function sendUserToSqs(board: Board): Promise<void> {
  const queueUrl = await getQueueUrl(sqsClient);

  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(board),
  });

  await sqsClient.send(command);
}

export async function getUser(email: string): Promise<User | undefined> {
  const USERS_TABLE = process.env.USERS_TABLE!;

  const result = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { email },
    })
  );

  return result.Item as User | undefined;
}

export async function getBoards(): Promise<Board[]> {
  const BOARDS_TABLE = process.env.BOARDS_TABLE!;
  const result = await docClient.send(
    new ScanCommand({
      TableName: BOARDS_TABLE,
    })
  );

  return (result.Items || []) as Board[];
}

export async function sendMessageToSns(message: Message): Promise<void> {
  const snsClient = createSNSClient();
  const topicArn = process.env.POST_MESSAGE_TOPIC_ARN!;
  const command = new PublishCommand({
    TopicArn: topicArn,
    Message: JSON.stringify(message),
  });

  await snsClient.send(command);
}

export async function createBoard(board: Board): Promise<void> {
  const BOARDS_TABLE = process.env.BOARDS_TABLE!;
  await docClient.send(
    new PutCommand({
      TableName: BOARDS_TABLE,
      Item: board,
    })
  );
}

export async function saveMessage(message: Message): Promise<void> {
  const MESSAGES_TABLE = process.env.MESSAGES_TABLE!;
  await docClient.send(
    new PutCommand({
      TableName: MESSAGES_TABLE,
      Item: message,
    })
  );
}

export async function sendMessage(message: Message): Promise<void> {
  const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;
  const apiGatewayClient = await createApiGatewayManagementApiClient();

  const connectionsData = await docClient.send(
    new ScanCommand({ TableName: CONNECTIONS_TABLE })
  );

  const postCalls = connectionsData.Items?.map(async (item) => {
    const connectionId = item.connectionId;
    if (!connectionId) {
      return;
    }

    try {
      await apiGatewayClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(
            JSON.stringify({ type: 'newMessage', data: message })
          ),
        })
      );
    } catch (err: any) {
      if (err.$metadata?.httpStatusCode === 410) {
        console.log(`Stale connection, deleting ${connectionId}`);
        await docClient.send(
          new DeleteCommand({
            TableName: CONNECTIONS_TABLE,
            Key: { connectionId },
          })
        );
      } else {
        console.error('Failed to post to connection:', err);
      }
    }
  });

  await Promise.all(postCalls ?? []);
}

export async function saveUser(user: User): Promise<void> {
  const USERS_TABLE = process.env.USERS_TABLE!;

  await docClient.send(
    new PutCommand({
      TableName: USERS_TABLE,
      Item: user,
    })
  );
}

export async function sendUserToSns(user: Pick<User, 'name' | 'email'>): Promise<void> {
  const topicArn = process.env.REGISTER_USER_TOPIC_ARN!;
  await snsClient.send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(user),
    })
  );
}

export async function saveConnection(connectionId: string): Promise<void> {
  const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;
  await docClient.send(
    new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: { connectionId },
    })
  );
}

export async function deleteConnection(connectionId: string): Promise<void> {
  const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;
  await docClient.send(
    new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId },
    })
  );
}