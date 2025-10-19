/* ---------- External ---------- */
import { ComponentResource, type ComponentResourceOptions } from '@pulumi/pulumi';

/* ---------- Resources ---------- */
import { DynamoResource } from '../resources/dynamo';
import { S3StorageResource } from '../resources/s3-storage';
import { ApigatewayResource } from '../resources/apigateway';
import { CognitoResource } from '../resources/cognito';

/* ---------- Interfaces ---------- */
interface Props {
  /**
   * Application environment, such as development, staging, production...
   */
  environment: string;

  /**
   * ACM certificate ARN for API Gateway custom domain
   */
  certificateArn: string;

  /**
   * Custom domain for API Gateway
   */
  apigwDomain: string;
}

export class BackendComponent extends ComponentResource {
  public readonly dynamo: DynamoResource;
  public readonly storage: S3StorageResource;
  public readonly apigateway: ApigatewayResource;
  public readonly cognito: CognitoResource;

  public constructor(name: string, props: Props, opts?: ComponentResourceOptions) {
    super(`${name}:backend:${props.environment}`, name, {}, opts);

    const { environment, certificateArn, apigwDomain } = props;

    /* ---------- DynamoDB ---------- */
    this.dynamo = new DynamoResource('dynamo', { environment }, { parent: this });

    /* ---------- S3 Storage ---------- */
    this.storage = new S3StorageResource('storage', { environment }, { parent: this });

    /* ---------- Cognito ---------- */
    this.cognito = new CognitoResource('cognito', { environment }, { parent: this });

    /* ---------- API Gateway + Lambdas ---------- */
    this.apigateway = new ApigatewayResource(
      'api',
      {
        environment,
        certificate: certificateArn,
        domain: apigwDomain,
        dynamodb: this.dynamo,
      },
      { parent: this },
    );
  }
}
