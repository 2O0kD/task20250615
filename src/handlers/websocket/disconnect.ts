import { APIGatewayEvent } from 'aws-lambda';
import { deleteConnection } from '../storage';
import { HANDLER_RESULT_500 } from '../util';

export const handler = async (event: APIGatewayEvent) => {
  const connectionId = event.requestContext.connectionId!;

  try {
    await deleteConnection(connectionId);
    return { statusCode: 200 };
  } catch (err) {
    console.error('disconnect error:', err);
    return HANDLER_RESULT_500;
  }
};