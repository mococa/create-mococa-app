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

  /**
   * DynamoDB table name
   */
  dynamoTableName: string;

  /**
   * S3 storage bucket name
   */
  s3BucketName: string;

  /**
   * Cognito User Pool name
   */
  cognitoUserpoolName: string;

  /**
   * Cognito User Pool Client name
   */
  cognitoUserpoolClientName: string;
}

export class BackendComponent extends ComponentResource {
  public readonly dynamo: DynamoResource;
  public readonly storage: S3StorageResource;
  public readonly apigateway: ApigatewayResource;
  public readonly cognito: CognitoResource;

  public constructor(name: string, props: Props, opts?: ComponentResourceOptions) {
    super(`${name}:backend:${props.environment}`, name, {}, opts);

    const { environment, certificateArn, apigwDomain, dynamoTableName, s3BucketName, cognitoUserpoolName, cognitoUserpoolClientName } = props;

    /* ---------- DynamoDB ---------- */
    this.dynamo = new DynamoResource('dynamo', { environment, tableName: dynamoTableName }, { parent: this });

    /* ---------- S3 Storage ---------- */
    this.storage = new S3StorageResource('storage', { environment, bucketName: s3BucketName }, { parent: this });

    /* ---------- Cognito ---------- */
    this.cognito = new CognitoResource('cognito', { environment, userpoolName: cognitoUserpoolName, userpoolClientName: cognitoUserpoolClientName }, { parent: this });

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
