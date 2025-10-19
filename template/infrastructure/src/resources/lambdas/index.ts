/* ---------- External ---------- */
import { ComponentResource, type ComponentResourceOptions } from '@pulumi/pulumi';
import { type apigatewayv2, iam } from '@pulumi/aws';

/* ---------- Resources ---------- */
import { LambdaResource } from './lambda';

/* ---------- Lambdas  ---------- */
import { Example } from './example';

/* ---------- Types ---------- */
interface Props {
  api: apigatewayv2.Api;
  environment: string;
}

export class ApiLambdas extends ComponentResource {
  public readonly lambdas: {
    example: LambdaResource<typeof Example>;
  } = {} as typeof this.lambdas;

  public constructor(name: string, props: Props, opts?: ComponentResourceOptions) {
    super(`${name}:index:${props.environment}`, name, {}, opts);

    const { environment, api } = props;

    const defaultRole = new iam.Role(
      'role',
      {
        assumeRolePolicy: iam.assumeRolePolicyForPrincipal({
          Service: 'lambda.amazonaws.com',
        }),
        managedPolicyArns: [iam.ManagedPolicies.AWSLambdaBasicExecutionRole],
      },
      { parent: this },
    );

    this.lambdas.example = new LambdaResource(
      'example',
      {
        Resource: Example,
        api,
        environment,
        path: '/example',
        role: defaultRole,
      },
      { parent: this, dependsOn: [defaultRole] },
    );
  }
}
