/* ---------- External ---------- */
import { ComponentResource, type ComponentResourceOptions } from '@pulumi/pulumi';
import { dynamodb } from '@pulumi/aws';
import { DYNAMODB_TABLES, type Environment } from '@{{PROJECT_NAME}}/constants';

/* ---------- Interfaces ---------- */
interface Props {
  /**
   * Application environment, such as development, staging, production...
   */
  environment: string;
}

export class DynamoResource extends ComponentResource {
  public readonly table: dynamodb.Table;

  public constructor(name: string, props: Props, opts?: ComponentResourceOptions) {
    super(`${name}:index:${props.environment}`, name, {}, opts);

    const { environment } = props;
    const tableName = DYNAMODB_TABLES[environment as Environment];

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
