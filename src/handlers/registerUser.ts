import { APIGatewayProxyEvent } from 'aws-lambda';
import { sendUserToSns } from './storage';
import { z } from 'zod';
import { HANDLER_RESULT_500, handlerResult } from './util';

export const RegisterUserInputSchema = z.object({
  name: z.string(),
  email: z.string(),
});

export type RegisterUserInput = z.infer<typeof RegisterUserInputSchema>;

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const body: RegisterUserInput = JSON.parse(event.body || '{}');

    if (!RegisterUserInputSchema.safeParse(body).success) {
      return handlerResult(400, { error: 'Name and email are required.' });
    }

    const user = { name: body.name, email: body.email };

    await sendUserToSns(user);

    return handlerResult(202, { message: 'User registration request accepted.' });
  } catch (error) {
    console.error('registerUser error:', error);
    return HANDLER_RESULT_500;
  }
};