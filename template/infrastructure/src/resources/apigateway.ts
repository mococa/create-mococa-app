/* ---------- External ---------- */
import { apigatewayv2 } from '@pulumi/aws';
import { ComponentResource, type ComponentResourceOptions, type Output } from '@pulumi/pulumi';

/* ---------- Resources ---------- */
import { ApiLambdas } from './lambdas';
import type { DynamoResource } from './dynamo';

/* ---------- Types ---------- */
interface Props {
  /**
   * Application environment, such as development, staging, production...
   */
  environment: string;
  certificate: string | Output<string>;
  domain: string;
  dynamodb?: DynamoResource;
}

export class ApigatewayResource extends ComponentResource {
  api: apigatewayv2.Api;
  domain: apigatewayv2.DomainName;
  lambdas: ApiLambdas;

  public constructor(name: string, props: Props, opts?: ComponentResourceOptions) {
    super(`${name}:index:${props.environment}`, name, {}, opts);

    const { certificate, environment } = props;

    this.api = new apigatewayv2.Api(
      `api`,
      {
        protocolType: 'HTTP',
        corsConfiguration: {
          allowOrigins: ['*'],
          allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE'],
          allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
          exposeHeaders: ['Content-Type'],
          maxAge: 300,
        },
      },
      { parent: this },
    );

    this.domain = new apigatewayv2.DomainName(
      `domain`,
      {
        domainName: props.domain,
        domainNameConfiguration: {
          certificateArn: certificate,
          endpointType: 'REGIONAL',
          securityPolicy: 'TLS_1_2',
        },
      },
      { parent: this },
    );

    this.lambdas = new ApiLambdas(
      `lambdas`,
      {
        environment,
        api: this.api,
      },
      { dependsOn: [this.api], parent: this },
    );

    const allLambdas = Object.entries(this.lambdas.lambdas).flatMap(([, { lambda }]) =>
      lambda.integrations.flatMap(({ integration, route, permission }) => [
        integration,
        route,
        permission,
      ])
    );

    const stage = new apigatewayv2.Stage(
      `stage`,
      {
        apiId: this.api.id,
        autoDeploy: true,
        name: '$default',
      },
      {
        parent: this,
        dependsOn: [...allLambdas], // ensures all lambdas are created. if there's a dynamo dependency, it should also be added in this dependency list
      },
    );

    new apigatewayv2.ApiMapping(
      `domain-mapping`,
      {
        apiId: this.api.id,
        stage: stage.id,
        domainName: this.domain.id,
      },
      { dependsOn: [this.domain, stage], parent: this },
    );
  }
}
