import type { APIGatewayEvent, Context } from 'aws-lambda';

export const safewrapper =
  (lambda: (event: APIGatewayEvent, context?: Context) => Promise<any>) =>
  async (event: APIGatewayEvent, context?: Context) => {
    try {
      return await lambda(event, context);
    } catch (error) {
      console.log({ error });
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Lambda runtime error',
          error: (error as Error).message,
        }),
      };
    }
  };

export * from './constants';
