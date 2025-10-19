/* ---------- External ---------- */
import type { apigatewayv2 } from '@pulumi/aws';
import type { Function as LambdaFunction } from '@pulumi/aws/lambda';
import { ComponentResource, type ComponentResourceOptions } from '@pulumi/pulumi';

/* ---------- Resources ---------- */
import { LambdaSetupResource } from './setup';

/* ---------- Types ---------- */
type LambdaProps<T> = ConstructProps<T> & {
  Resource: T;
  environment: string;
  path: string;
  api: apigatewayv2.Api;
};

/* ---------- Constants ---------- */
const METHODS = ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'] as const;

export class LambdaResource<T> extends ComponentResource<T> {
  public readonly functions: Functions;
  public readonly lambda: LambdaSetupResource;

  public constructor(name: string, props: LambdaProps<T>, opts?: ComponentResourceOptions) {
    super(`${name}:index:${props.environment}`, name, {}, opts);

    const { Resource: resource, path, api, ...properties } = props;

    const Resource = resource as unknown as Callable<Functions>;

    this.functions = new Resource(`functions`, properties, { parent: this });

    const functionsList = METHODS.filter((method) => Boolean(this.functions[method])).map(
      (method) => ({
        function: this.functions[method],
        method,
      }),
    );

    this.lambda = new LambdaSetupResource(
      `lambdas`,
      {
        api,
        environment: props.environment,
        functions: functionsList,
        path,
        lambdaName: name,
      },
      { parent: this },
    );
  }
}

/* ---------- Secondary Types ---------- */
type ConstructProps<T> = T extends new (
  arg1: string,
  arg2: infer U,
  opts?: ComponentResourceOptions,
) => unknown
  ? U
  : unknown;
type Callable<T> = new (name: string, props: any, opts?: ComponentResourceOptions) => T;
type Functions = Record<(typeof METHODS)[number], LambdaFunction>;
