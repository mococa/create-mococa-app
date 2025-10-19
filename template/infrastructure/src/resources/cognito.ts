/* ---------- External ---------- */
import { cognito } from '@pulumi/aws';
import { ComponentResource, type ComponentResourceOptions } from '@pulumi/pulumi';

/* ---------- Interfaces ---------- */
interface Props {
  /**
   * Application environment, such as development, staging, production...
   */
  environment: string;

  /**
   * Cognito User Pool name
   */
  userpoolName: string;

  /**
   * Cognito User Pool Client name
   */
  userpoolClientName: string;
}

export class CognitoResource extends ComponentResource {
  public readonly userpool: cognito.UserPool;
  public readonly userpoolClient: cognito.UserPoolClient;

  public constructor(name: string, props: Props, opts?: ComponentResourceOptions) {
    super(`${name}:index:${props.environment}`, name, {}, opts);

    const { environment, userpoolName, userpoolClientName } = props;

    this.userpool = new cognito.UserPool(
      'userpool',
      {
        name: userpoolName,
        autoVerifiedAttributes: ['email'],
        emailVerificationMessage: 'Your verification code is {####}',
        emailVerificationSubject: 'Verify your email for our app!',
        mfaConfiguration: 'OFF',
        passwordPolicy: {
          minimumLength: 8,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: true,
          requireUppercase: true,
          temporaryPasswordValidityDays: 7,
        },
        schemas: [
          {
            attributeDataType: 'Boolean',
            developerOnlyAttribute: false,
            mutable: true,
            name: 'email_verified',
            required: false,
          },
          {
            attributeDataType: 'String',
            mutable: true,
            name: 'email',
            required: true,
            stringAttributeConstraints: {
              maxLength: '2048',
              minLength: '0',
            },
          },
          {
            attributeDataType: 'String',
            developerOnlyAttribute: false,
            mutable: true,
            name: 'full_name',
            required: false,
            stringAttributeConstraints: {
              maxLength: '2048',
              minLength: '0',
            },
          },
          {
            attributeDataType: 'String',
            developerOnlyAttribute: false,
            mutable: true,
            name: 'phone',
            required: false,
            stringAttributeConstraints: {
              maxLength: '2048',
              minLength: '0',
            },
          },
          {
            attributeDataType: 'String',
            developerOnlyAttribute: false,
            mutable: true,
            name: 'profile_picture',
            required: false,
            stringAttributeConstraints: {
              maxLength: '2048',
              minLength: '0',
            },
          },
          {
            attributeDataType: 'String',
            developerOnlyAttribute: false,
            mutable: true,
            name: 'provider',
            required: false,
            stringAttributeConstraints: {
              maxLength: '2048',
              minLength: '0',
            },
          },
        ],
        smsAuthenticationMessage: 'Your authentication code is {####}',
        usernameAttributes: ['email'],
        verificationMessageTemplate: {
          defaultEmailOption: 'CONFIRM_WITH_CODE',
        },
      },
      { parent: this },
    );

    this.userpoolClient = new cognito.UserPoolClient(
      'userpool-client',
      {
        userPoolId: this.userpool.id,
        generateSecret: false,
        explicitAuthFlows: [
          'ALLOW_ADMIN_USER_PASSWORD_AUTH',
          'ALLOW_CUSTOM_AUTH',
          'ALLOW_REFRESH_TOKEN_AUTH',
          'ALLOW_USER_PASSWORD_AUTH',
          'ALLOW_USER_SRP_AUTH',
        ],
        name: userpoolClientName,
        refreshTokenValidity: 30,
        tokenValidityUnits: {
          accessToken: 'minutes',
          idToken: 'minutes',
          refreshToken: 'days',
        },
        accessTokenValidity: 15,
        idTokenValidity: 15,
        preventUserExistenceErrors: 'ENABLED',
        readAttributes: ['email', 'email_verified', 'custom:full_name', 'custom:phone', 'custom:provider'],
        writeAttributes: ['email', 'custom:full_name', 'custom:phone', 'custom:provider'],
      },
      { parent: this, dependsOn: [this.userpool] },
    );
  }
}
