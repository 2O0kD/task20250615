import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUser } from './storage';
import { HANDLER_RESULT_500, handlerResult } from './util';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const email = event.queryStringParameters?.email;

    if (email === undefined) {
      return handlerResult(400, { error: 'Missing required parameter' });
    }

    const user = await getUser(email);

    if (user === undefined) {
      return handlerResult(404, { error: 'User not found.' });
    }

    return handlerResult(200, user);
  } catch (error) {
    console.error('getUser error:', error);
    return HANDLER_RESULT_500;
  }
};