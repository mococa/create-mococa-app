/* ---------- External ---------- */
import { ComponentResource, type ComponentResourceOptions } from '@pulumi/pulumi';

/* ---------- Resources ---------- */
import { DynamoResource } from '../resources/dynamo';
import { S3StorageResource } from '../resources/s3-storage';
import { ApigatewayResource } from '../resources/apigateway';
import { CognitoResource } from '../resources/cognito';
import { DNSResource } from '../resources/dns';

/* ---------- Constants ---------- */
import {
  DOMAIN_BASE,
  DYNAMODB_TABLES,
  S3_BUCKETS,
  COGNITO_USER_POOLS,
  COGNITO_USER_POOL_CLIENTS,
  type Environment
} from '@{{PROJECT_NAME}}/constants';

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

    /* ---------- Resource Names ---------- */
    const tableName = DYNAMODB_TABLES[environment as Environment];
    const bucketName = S3_BUCKETS[environment as Environment];
    const userpoolName = COGNITO_USER_POOLS[environment as Environment];
    const userpoolClientName = COGNITO_USER_POOL_CLIENTS[environment as Environment];

    /* ---------- DynamoDB ---------- */
    this.dynamo = new DynamoResource('dynamo', { environment, tableName }, { parent: this });

    /* ---------- S3 Storage ---------- */
    this.storage = new S3StorageResource('storage', { environment, bucketName }, { parent: this });

    /* ---------- Cognito ---------- */
    this.cognito = new CognitoResource('cognito', { environment, userpoolName, userpoolClientName }, { parent: this });

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

    /* ---------- API Gateway DNS ---------- */
    const apigwSubdomain = apigwDomain.replace(`.${DOMAIN_BASE}`, '');
    new DNSResource(
      `api-dns-${environment}`,
      {
        environment,
        subdomain: apigwSubdomain,
        name: 'api',
        cname: this.apigateway.domain.domainNameConfiguration.targetDomainName,
        type: 'CNAME',
        comment: 'API Gateway',
      },
      { parent: this, dependsOn: [this.apigateway.domain] },
    );
  }
}
