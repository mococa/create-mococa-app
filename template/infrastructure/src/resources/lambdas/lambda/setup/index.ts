/* ---------- External ---------- */
import { apigatewayv2, lambda } from '@pulumi/aws';
import { ComponentResource, type ComponentResourceOptions, interpolate } from '@pulumi/pulumi';

/* ---------- Types ---------- */
interface Function {
  function: lambda.Function;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

interface LambdaSetupResourceProps {
  api: apigatewayv2.Api;
  functions: Function[];
  path: string;
  environment: string;
  lambdaName: string;
}

export class LambdaSetupResource extends ComponentResource {
  public readonly integrations: {
    integration: apigatewayv2.Integration;
    permission: lambda.Permission;
    route: apigatewayv2.Route;
  }[] = [];

  constructor(name: string, props: LambdaSetupResourceProps, opts?: ComponentResourceOptions) {
    super(`${name}:index:${props.environment}`, name, {}, opts);

    const { api, functions, path, lambdaName } = props;

    for (const { function: fn, method } of functions) {
      const integration = new apigatewayv2.Integration(
        `integration-${method}`,
        {
          apiId: api.id,
          integrationType: 'AWS_PROXY',
          integrationUri: fn.arn,
          payloadFormatVersion: '2.0',
        },
        { parent: this },
      );

      const route = new apigatewayv2.Route(
        `route-${method}`,
        {
          apiId: api.id,
          routeKey: `${method} ${path}`,
          target: interpolate`integrations/${integration.id}`,
        },
        { parent: this, deleteBeforeReplace: true },
      );

      const permission = new lambda.Permission(
        `permission-${method}`,
        {
          action: 'lambda:InvokeFunction',
          function: fn.name,
          principal: 'apigateway.amazonaws.com',
          sourceArn: interpolate`${api.executionArn}/*/*`,
        },
        { parent: this },
      );

      this.integrations.push({
        integration: integration,
        route: route,
        permission: permission,
      });
    }
  }
}
