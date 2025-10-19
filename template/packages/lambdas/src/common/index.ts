import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const safewrapper =
  (lambda: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      return await lambda(event);
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
