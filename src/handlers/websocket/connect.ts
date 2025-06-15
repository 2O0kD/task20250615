import { APIGatewayEvent } from 'aws-lambda';
import { saveConnection } from '../storage';
import { HANDLER_RESULT_500 } from '../util';

export const handler = async (event: APIGatewayEvent) => {
  const connectionId = event.requestContext.connectionId!;

  try {
    await saveConnection(connectionId);
    return { statusCode: 200 };
  } catch (err) {
    console.error('connect error:', err);
    return HANDLER_RESULT_500;
  }
};