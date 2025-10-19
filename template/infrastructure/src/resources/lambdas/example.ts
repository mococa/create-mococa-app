/* ---------- External ---------- */
import { ComponentResource, type ComponentResourceOptions, asset } from '@pulumi/pulumi';
import type { Role } from '@pulumi/aws/iam';
import { Function as LambdaFunction } from '@pulumi/aws/lambda';

/* ---------- Interfaces ---------- */
interface Props {
  environment: string;
  role: Role;
}

export class Example extends ComponentResource {
  public readonly GET: LambdaFunction;
  public readonly POST: LambdaFunction;

  public constructor(name: string, props: Props, opts?: ComponentResourceOptions) {
    super(`${name}:index:${props.environment}`, name, {}, opts);

    const { environment, role } = props;

    // Use built lambda packages
    const getLambdaCode = new asset.AssetArchive({
      'index.js': new asset.FileAsset(require.resolve('@{{PROJECT_NAME}}/lambdas/example/get')),
    });

    const postLambdaCode = new asset.AssetArchive({
      'index.js': new asset.FileAsset(require.resolve('@{{PROJECT_NAME}}/lambdas/example/post')),
    });

    this.GET = new LambdaFunction(
      `GET`,
      {
        role: role.arn,
        code: getLambdaCode,
        handler: 'index.handler',
        runtime: 'nodejs20.x',
        timeout: 8,
        environment: {
          variables: {
            ENVIRONMENT: environment,
          },
        },
      },
      { parent: this },
    );

    this.POST = new LambdaFunction(
      `POST`,
      {
        role: role.arn,
        code: postLambdaCode,
        handler: 'index.handler',
        runtime: 'nodejs20.x',
        timeout: 8,
        environment: {
          variables: {
            ENVIRONMENT: environment,
          },
        },
      },
      { parent: this },
    );
  }
}
