/* ---------- External ---------- */
import { ComponentResource, type ComponentResourceOptions } from '@pulumi/pulumi';
import { dynamodb } from '@pulumi/aws';

/* ---------- Interfaces ---------- */
interface Props {
  /**
   * Application environment, such as development, staging, production...
   */
  environment: string;

  /**
   * DynamoDB table name
   */
  tableName: string;
}

export class DynamoResource extends ComponentResource {
  public readonly table: dynamodb.Table;

  public constructor(name: string, props: Props, opts?: ComponentResourceOptions) {
    super(`${name}:index:${props.environment}`, name, {}, opts);

    const { environment, tableName } = props;

    this.table = new dynamodb.Table(
      'table',
      {
        name: tableName,
        attributes: [
          { name: 'pk', type: 'S' },
          { name: 'sk', type: 'S' },
        ],
        billingMode: 'PAY_PER_REQUEST',
        hashKey: 'pk',
        rangeKey: 'sk',
        streamEnabled: true,
        streamViewType: 'NEW_AND_OLD_IMAGES',
        ttl: {
          attributeName: 'timetolive',
          enabled: true,
        },
        deletionProtectionEnabled: environment === 'production',
        globalSecondaryIndexes: [],
      },
      { parent: this },
    );
  }
}
