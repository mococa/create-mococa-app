#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import prompts from 'prompts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default values when --skip is used
const defaultValues = {
  api: false,
  cognito: false,
  lambda: false,
  dynamo: false,
  s3: false,
  environments: false,
};

function showHelp() {
  console.log(chalk.bold.blue('\n🚀 Create Mococa App\n'));
  console.log(chalk.bold('Usage:'));
  console.log('  npx create-mococa-app [project-name] [flags]\n');

  console.log(chalk.bold('Arguments:'));
  console.log('  [project-name]              Optional. Name of your project (e.g., my-app)\n');

  console.log(chalk.bold('Flags:'));
  console.log('  --help, -h                  Show this help message');
  console.log('  --current, -c               Create project in current directory');
  console.log('  --domain <domain>           Specify custom domain (default: {project-name}.com)');
  console.log('  --skip                      Skip all prompts and use default values');
  console.log('  --full                      Skip prompts and include all features');
  console.log('  --except, -e <feature>      Exclude features when using --full (can be used multiple times)');
  console.log('                              Valid features: api, cognito, lambda, dynamo, s3, environments');
  console.log(`  --api                       Include Elysia API server (Bun-based, default: ${defaultValues.api})`);
  console.log(`  --cognito                   Include AWS Cognito authentication (default: ${defaultValues.cognito})`);
  console.log(`  --lambda                    Include AWS Lambda + API Gateway infrastructure (default: ${defaultValues.lambda})`);
  console.log(`  --dynamo                    Include DynamoDB infrastructure (default: ${defaultValues.dynamo})`);
  console.log(`  --s3                        Include S3 storage bucket infrastructure (default: ${defaultValues.s3})`);
  console.log(`  --environments              Configure multiple environments (default: ${defaultValues.environments})\n`);

  console.log(chalk.bold('Examples:'));
  console.log('  # Interactive prompts');
  console.log('  npx create-mococa-app\n');

  console.log('  # Quick start with project name');
  console.log('  npx create-mococa-app my-app\n');

  console.log('  # Create in current directory');
  console.log('  npx create-mococa-app my-app --current\n');

  console.log('  # Minimal project (skip prompts)');
  console.log('  npx create-mococa-app my-app --skip\n');

  console.log('  # Skip prompts but include specific features');
  console.log('  npx create-mococa-app my-app --skip --cognito --dynamo\n');

  console.log('  # Full setup with all features (no prompts)');
  console.log('  npx create-mococa-app my-app --full\n');

  console.log('  # Full setup except specific features');
  console.log('  npx create-mococa-app my-app --full --except=s3 --except=dynamo\n');

  console.log('  # Full setup except specific features (short flag)');
  console.log('  npx create-mococa-app my-app --full -e s3 -e dynamo\n');

  console.log('  # Full setup with manual feature selection');
  console.log('  npx create-mococa-app my-app --api --cognito --lambda --dynamo --s3 --environments\n');

  console.log(chalk.bold('Documentation:'));
  console.log('  https://github.com/mococa/create-mococa-app\n');
}

async function main() {
  // Check for flags and positional args
  const args = process.argv.slice(2);

  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  console.log(chalk.bold.blue('\n🚀 Create Mococa App\n'));

  const skipPrompts = args.includes('--skip');
  const fullSetup = args.includes('--full');

  // Helper function to parse multiple text flag values (e.g., --except=s3 --except=dynamo)
  const parseMultiTextFlag = (flagName) => {
    const values = [];
    args.forEach((arg, index) => {
      if (arg.startsWith(flagName)) {
        if (arg.includes('=')) {
          values.push(arg.split('=')[1]);
        } else if (args[index + 1] && !args[index + 1].startsWith('--')) {
          values.push(args[index + 1]);
        }
      }
    });
    return values;
  };

  const exceptFlags = parseMultiTextFlag('--except').concat(parseMultiTextFlag('-e'));

  // Helper function to parse boolean feature flags
  // Returns: true if flag is present OR --full is used (unless excepted), otherwise uses default/null
  const parseFlag = (flagName, defaultKey) => {
    // Check if this feature is in the except list
    if (exceptFlags.includes(defaultKey)) return false;

    if (args.includes(flagName)) return true;
    if (fullSetup) return true;
    if (skipPrompts) return defaultValues[defaultKey];
    return null;
  };

  // Helper function to parse text/value flags
  // Supports both --flag=value and --flag value formats
  const parseTextFlag = (flagName) => {
    const flagIndex = args.findIndex(arg => arg.startsWith(flagName));
    if (flagIndex === -1) return { value: null, valueIndex: -1 };

    const flagArg = args[flagIndex];
    if (flagArg.includes('=')) {
      return { value: flagArg.split('=')[1], valueIndex: -1 };
    }

    if (args[flagIndex + 1] && !args[flagIndex + 1].startsWith('--')) {
      return { value: args[flagIndex + 1], valueIndex: flagIndex + 1 };
    }

    return { value: null, valueIndex: -1 };
  };

  // Helper function to parse simple boolean flags (no prompting/defaults)
  const parseSimpleFlag = (...flagNames) => {
    return flagNames.some(flag => args.includes(flag));
  };

  const includeLambda = parseFlag('--lambda', 'lambda');
  const includeDynamo = parseFlag('--dynamo', 'dynamo');
  const includeS3 = parseFlag('--s3', 's3');
  const includeApi = parseFlag('--api', 'api');
  const includeCognito = parseFlag('--cognito', 'cognito');
  const includeEnvironments = parseFlag('--environments', 'environments');
  const useCurrentDir = parseSimpleFlag('--current', '-c');

  // Extract --domain flag value
  const { value: customDomain, valueIndex: domainValueIndex } = parseTextFlag('--domain');

  // First non-flag argument is the project name (excluding domain value)
  const customProjectName = args.find((arg, index) =>
    !arg.startsWith('--') &&
    !arg.startsWith('-') &&
    index !== domainValueIndex
  );

  const questions = [];

  // Ask for project name if not provided as positional argument
  if (!customProjectName) {
    questions.push({
      type: 'text',
      name: 'projectName',
      message: 'What is your project name?',
      initial: 'my-app',
      validate: (value) => {
        if (!value) return 'Project name is required';
        if (!/^[a-z0-9-]+$/.test(value)) {
          return 'Project name can only contain lowercase letters, numbers, and hyphens';
        }
        return true;
      },
    });
  }

  // Ask for domain if not provided via flag and not skipping prompts
  if (!customDomain && !skipPrompts && !fullSetup) {
    questions.push({
      type: 'text',
      name: 'domain',
      message: 'What is your domain?',
      initial: (prev, values) => {
        const name = customProjectName || prev || values.projectName;
        return `${name}.com`;
      },
      validate: (value) => {
        if (!value) return 'Domain is required';
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) {
          return 'Please enter a valid domain (e.g., example.com)';
        }
        return true;
      },
    });
  }

  // Ask for directory location if --current flag is not provided and not skipping prompts
  if (!useCurrentDir && !skipPrompts && !fullSetup) {
    questions.push({
      type: 'select',
      name: 'directoryChoice',
      message: 'Where should we create your project?',
      choices: [
        { title: 'Current directory', value: 'current' },
        { title: 'New folder', value: 'new' }
      ],
      initial: 1
    });
  }

  // Prompt for features if not provided via flags and --skip is not used
  const shouldPromptFeatures = !skipPrompts &&
    includeLambda === null &&
    includeDynamo === null &&
    includeS3 === null &&
    includeApi === null &&
    includeCognito === null &&
    includeEnvironments === null;

  if (shouldPromptFeatures) {
    questions.push(
      {
        type: 'confirm',
        name: 'wantApi',
        message: 'Include API server?',
        initial: false,
      },
      {
        type: (prev, values) => values.wantApi ? 'select' : null,
        name: 'apiType',
        message: 'Which API framework would you like to use?',
        choices: [
          { title: 'Elysia (Bun)', value: 'elysia' }
        ],
        initial: 0,
      },
      {
        type: 'confirm',
        name: 'wantCognito',
        message: 'Include AWS Cognito authentication (email/password)?',
        initial: false,
      },
      {
        type: 'confirm',
        name: 'wantLambda',
        message: 'Include AWS Lambda + API Gateway infrastructure?',
        initial: false,
      },
      {
        type: 'confirm',
        name: 'wantDynamo',
        message: 'Include DynamoDB infrastructure?',
        initial: false,
      },
      {
        type: 'confirm',
        name: 'wantS3',
        message: 'Include S3 storage bucket infrastructure?',
        initial: false,
      },
      {
        type: 'confirm',
        name: 'wantEnvironments',
        message: 'Configure multiple environments?',
        initial: false,
      }
    );
  }

  // If --environments flag explicitly passed (not from --full/--skip), ask for environment names
  const explicitEnvironmentsFlag = args.includes('--environments');
  if ((explicitEnvironmentsFlag || shouldPromptFeatures) && !skipPrompts && !fullSetup) {
    questions.push({
      type: (prev, values) => {
        // Only ask if explicit --environments flag OR user confirmed they want environments
        if (explicitEnvironmentsFlag || values.wantEnvironments) return 'text';
        return null;
      },
      name: 'environments',
      message: 'Enter environments (comma-separated, e.g., development,staging,production):',
      initial: 'development,staging,production',
      validate: (value) => {
        if (!value) return 'At least one environment is required';
        const envs = value.split(',').map(e => e.trim());
        if (envs.some(e => !/^[a-z0-9-]+$/.test(e))) {
          return 'Environment names can only contain lowercase letters, numbers, and hyphens';
        }
        return true;
      },
    });
  }

  const response = await prompts(questions);

  // Use custom project name or prompted project name
  const rawProjectName = customProjectName || response.projectName;

  if (!rawProjectName) {
    console.log(chalk.red('\n❌ Setup cancelled\n'));
    process.exit(1);
  }

  // Kebabify and lowercase the project name
  const projectName = rawProjectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const {
    domain: promptDomain,
    directoryChoice,
    environments: environmentsInput,
    wantApi,
    apiType,
    wantCognito,
    wantLambda,
    wantDynamo,
    wantS3,
    wantEnvironments
  } = response || {};

  // Determine target directory
  let targetDir;
  if (useCurrentDir || directoryChoice === 'current') {
    targetDir = '.';
  } else {
    targetDir = `./${projectName}`;
  }

  // Use custom domain from flag or prompt, or default to projectName.com
  const domain = customDomain || promptDomain || `${projectName}.com`;

  const targetPath = path.resolve(process.cwd(), targetDir);

  // Determine final feature flags
  // Priority: CLI flag > prompt response > default value (if --skip was used)
  const finalIncludeApi = includeApi !== null ? includeApi : (wantApi || false);
  const finalApiType = apiType || 'elysia'; // Default to elysia for now
  const finalIncludeCognito = includeCognito !== null ? includeCognito : (wantCognito || false);
  const finalIncludeLambda = includeLambda !== null ? includeLambda : (wantLambda || false);
  const finalIncludeDynamo = includeDynamo !== null ? includeDynamo : (wantDynamo || false);
  const finalIncludeS3 = includeS3 !== null ? includeS3 : (wantS3 || false);
  const finalIncludeEnvironments = includeEnvironments !== null ? includeEnvironments : (wantEnvironments || false);

  // Parse environments
  const environments = finalIncludeEnvironments && environmentsInput
    ? environmentsInput.split(',').map(e => e.trim())
    : ['production'];

  // Check if directory exists and is not empty
  if (fs.existsSync(targetPath) && targetDir !== '.') {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `Directory ${targetDir} already exists. Overwrite?`,
      initial: false,
    });

    if (!overwrite) {
      console.log(chalk.red('\n❌ Setup cancelled\n'));
      process.exit(1);
    }

    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  // For current directory, check if it has files (warn but don't delete)
  if (targetDir === '.' && fs.existsSync(targetPath)) {
    const files = fs.readdirSync(targetPath);
    if (files.length > 0) {
      const { proceed } = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: 'Current directory is not empty. Files may be overwritten. Continue?',
        initial: false,
      });

      if (!proceed) {
        console.log(chalk.red('\n❌ Setup cancelled\n'));
        process.exit(1);
      }
    }
  }

  console.log(chalk.cyan(`\n📁 Creating project in ${targetPath}...\n`));

  // Copy template
  const templateDir = path.resolve(__dirname, '../template');
  copyDirectory(templateDir, targetPath, projectName, domain, finalIncludeApi, finalApiType, finalIncludeLambda, finalIncludeDynamo, finalIncludeS3, finalIncludeCognito, environments);

  // Clone and configure API if needed
  if (finalIncludeApi && finalApiType === 'elysia') {
    console.log(chalk.cyan('\n📦 Setting up Elysia API server...\n'));
    await cloneAndConfigureElysiaApi(targetPath, projectName, environments, finalIncludeCognito);
  }

  const features = [];
  if (finalIncludeApi) features.push(`${finalApiType === 'elysia' ? 'Elysia' : 'API'} Server`);
  if (finalIncludeLambda) features.push('Lambda');
  if (finalIncludeDynamo) features.push('DynamoDB');
  if (finalIncludeS3) features.push('S3 Storage');
  if (finalIncludeCognito) features.push('Cognito');

  if (features.length > 0) {
    console.log(chalk.green(`✅ Project created successfully with ${features.join(' + ')} support!\n`));
  } else {
    console.log(chalk.green('✅ Project created successfully!\n'));
  }
  console.log(chalk.bold('Next steps:\n'));
  console.log(chalk.cyan(`  cd ${targetDir}`));
  console.log(chalk.cyan('  bun install'));
  console.log(chalk.cyan('  bun start\n'));
}

async function cloneAndConfigureElysiaApi(targetPath, projectName, environments, includeCognito) {
  const { execSync } = await import('child_process');
  const apiPath = path.join(targetPath, 'apps', 'api');

  try {
    // Clone bun-mococa repository
    console.log(chalk.cyan('  Cloning bun-mococa repository...'));
    execSync(`git clone git@github.com:mococa/bun-mococa.git "${apiPath}"`, { stdio: 'inherit' });

    // Remove .git directory
    console.log(chalk.cyan('  Removing git history...'));
    fs.rmSync(path.join(apiPath, '.git'), { recursive: true, force: true });

    // Update package.json
    console.log(chalk.cyan('  Updating package.json...'));
    const pkgPath = path.join(apiPath, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.name = `@${projectName}/api`;
    if (pkg.scripts && pkg.scripts.fmt) {
      delete pkg.scripts.fmt;
    }
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

    // Update main.ts with constants import and CORS configuration
    console.log(chalk.cyan('  Configuring CORS and constants...'));
    const mainPath = path.join(apiPath, 'src', 'main.ts');
    let mainContent = fs.readFileSync(mainPath, 'utf8');

    // Add constants import
    mainContent = mainContent.replace(
      "import { services } from './services';",
      `import { services } from './services';\nimport { DOMAINS, type Environment } from '@${projectName}/constants';`
    );

    // Update CORS configuration
    mainContent = mainContent.replace(
      /async function createApp\(\) \{\n  const app = new Elysia\(/,
      `async function createApp() {\n  const environment = (process.env.ENVIRONMENT || 'production') as Environment;\n  const allowedOrigins = ['http://localhost:3000', ...Object.values(DOMAINS).map(envDomains => \`https://\${envDomains[environment]}\`)];\n\n  const app = new Elysia(`
    );

    mainContent = mainContent.replace(
      /\.use\(cors\(\{\n      origin: \[.*?\],/s,
      `.use(cors({\n      origin: allowedOrigins,`
    );

    fs.writeFileSync(mainPath, mainContent);

    // Update .env.example
    console.log(chalk.cyan('  Updating environment configuration...'));
    const envExamplePath = path.join(apiPath, '.env.example');
    let envContent = fs.readFileSync(envExamplePath, 'utf8');
    envContent = envContent.replace(
      'ENV="development" # or "production"',
      'ENV="development" # or "production"\nENVIRONMENT="development" # development, staging, production'
    );
    fs.writeFileSync(envExamplePath, envContent);

    // Update docker-compose.yml
    console.log(chalk.cyan('  Updating docker-compose.yml...'));
    const dockerComposePath = path.join(apiPath, 'docker-compose.yml');
    if (fs.existsSync(dockerComposePath)) {
      let dockerContent = fs.readFileSync(dockerComposePath, 'utf8');
      dockerContent = dockerContent.replace(/bun_app/g, `${projectName}_api`);
      fs.writeFileSync(dockerComposePath, dockerContent);
    }

    // Update API README.md
    console.log(chalk.cyan('  Updating API README.md...'));
    const apiReadmePath = path.join(apiPath, 'README.md');
    if (fs.existsSync(apiReadmePath)) {
      let readmeContent = fs.readFileSync(apiReadmePath, 'utf8');
      readmeContent = readmeContent.replace(/bun_app/g, projectName);
      fs.writeFileSync(apiReadmePath, readmeContent);
    }

    // Remove Cognito-related auth endpoints if --cognito flag is not set
    if (!includeCognito) {
      console.log(chalk.cyan('  Removing Cognito authentication endpoints...'));
      const authHandlerPath = path.join(apiPath, 'src', 'handlers', 'public', 'auth.ts');
      let authContent = fs.readFileSync(authHandlerPath, 'utf8');

      // Remove login endpoint
      authContent = authContent.replace(
        /\/\*\* Login with email \+ password \*\/[\s\S]*?\.post\('\/login'[\s\S]*?\}, \{ body: schemas\.login \}\)\n/,
        ''
      );

      // Remove register endpoint
      authContent = authContent.replace(
        /\/\*\* Register with email \+ password \*\/[\s\S]*?\.post\('\/register'[\s\S]*?\}, \{ body: schemas\.register\}\)\n/,
        ''
      );

      // Remove confirm-email endpoint
      authContent = authContent.replace(
        /\/\*\* Confirm email with code[\s\S]*?\.post\('\/confirm-email'[\s\S]*?\}, \{ body: schemas\.confirmEmail \}\)\n/,
        ''
      );

      // Remove resend-confirmation-code endpoint
      authContent = authContent.replace(
        /\/\*\* Resend confirmation code[\s\S]*?\.post\('\/resend-confirmation-code'[\s\S]*?\}, \{ body: schemas\.resendConfirmationCode \}\)\n/,
        ''
      );

      // Remove forgot-password endpoint
      authContent = authContent.replace(
        /\/\*\* Initiate forgot password[\s\S]*?\.post\('\/forgot-password'[\s\S]*?\}, \{ body: schemas\.forgotPassword \}\)\n/,
        ''
      );

      // Remove reset-password endpoint
      authContent = authContent.replace(
        /\/\*\* Complete password reset[\s\S]*?\.post\('\/reset-password'[\s\S]*?\}, \{ body: schemas\.resetPassword \}\);/,
        ''
      );

      // Remove Cognito-related error classes
      authContent = authContent.replace(
        /class UserNotConfirmed[\s\S]*?\}\n\n/,
        ''
      );
      authContent = authContent.replace(
        /class CodeMismatch[\s\S]*?\}\n\n/,
        ''
      );
      authContent = authContent.replace(
        /class UserAlreadyExists[\s\S]*?\}\n\n/,
        ''
      );
      authContent = authContent.replace(
        /class RegistrationError[\s\S]*?\}\n\n/,
        ''
      );
      authContent = authContent.replace(
        /class LoginError[\s\S]*?\}\n\n/,
        ''
      );

      // Remove email-related schemas
      authContent = authContent.replace(
        /\/\*\*\n \* Email validation schema[\s\S]*?const emailSchema = t\.String\(\{format: 'email', error: 'Invalid email format' \}\);\n\n/,
        ''
      );
      authContent = authContent.replace(
        /\/\*\*\n \* Strong password validation schema[\s\S]*?const passwordSchema = t\.String\(\{minLength: 8[\s\S]*?\}\);\n\n/,
        ''
      );
      authContent = authContent.replace(
        /\/\*\*\n \* 6-digit numeric confirmation code[\s\S]*?const codeSchema = t\.String\(\{minLength: 6[\s\S]*?\}\);\n\n/,
        ''
      );

      // Remove schema definitions for email-based auth
      authContent = authContent.replace(
        /const schemas = \{[\s\S]*?login: t\.Object\(\{[\s\S]*?\}\),[\s\S]*?register: t\.Object\(\{[\s\S]*?\}\),[\s\S]*?confirmEmail:[\s\S]*?\}\),[\s\S]*?forgotPassword:[\s\S]*?\}\),[\s\S]*?resendConfirmationCode:[\s\S]*?\}\),[\s\S]*?resetPassword:[\s\S]*?\}\),[\s\S]*?\}/,
        ''
      );

      fs.writeFileSync(authHandlerPath, authContent);
    }

    console.log(chalk.green('  ✓ Elysia API server configured successfully\n'));
  } catch (error) {
    console.error(chalk.red(`  ✗ Failed to setup Elysia API: ${error.message}`));
    throw error;
  }
}

function copyDirectory(src, dest, projectName, domain, includeApi, apiType, includeLambda, includeDynamo, includeS3, includeCognito, environments, templateRoot = src) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    const relativePath = path.relative(templateRoot, srcPath);

    // Skip lambda-specific files if --lambda flag is not set
    if (!includeLambda) {
      if (
        relativePath.startsWith('packages/lambdas') ||
        relativePath.includes('infrastructure/src/resources/apigateway') ||
        relativePath.includes('infrastructure/src/resources/lambdas')
      ) {
        continue;
      }
    }

    // Process apigateway.ts to remove dynamo-specific code if --dynamo is not set
    if (includeLambda && !includeDynamo && entry.name === 'apigateway.ts' && srcPath.includes('infrastructure/src/resources')) {
      let content = fs.readFileSync(srcPath, 'utf8');
      // Remove DynamoResource import
      content = content.replace(/import type \{ DynamoResource \} from '\.\/dynamo';\n/g, '');
      // Remove dynamodb prop from Props interface (required prop)
      content = content.replace(/  dynamodb: DynamoResource;\n/g, '');
      fs.writeFileSync(destPath, content);
      continue;
    }

    // Skip dynamo-specific files if --dynamo flag is not set
    if (!includeDynamo) {
      if (relativePath.includes('infrastructure/src/resources/dynamo')) {
        continue;
      }
    }

    // Skip S3 storage-specific files if --s3 flag is not set
    if (!includeS3) {
      if (relativePath.includes('infrastructure/src/resources/s3-storage')) {
        continue;
      }
    }

    // Skip Cognito-specific files if --cognito flag is not set
    if (!includeCognito) {
      if (relativePath.includes('infrastructure/src/resources/cognito')) {
        continue;
      }
    }

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath, projectName, domain, includeApi, apiType, includeLambda, includeDynamo, includeS3, includeCognito, environments, templateRoot);
    } else {
      let content = fs.readFileSync(srcPath, 'utf8');

      // Replace template variables
      content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName);

      // Replace environments in constants/src/index.ts
      if (entry.name === 'index.ts' && srcPath.includes('packages/constants/src')) {
        content = generateConstantsFile(projectName, domain, environments, includeApi, includeLambda, includeDynamo, includeS3, includeCognito);
      }

      // Generate README based on included features
      if (entry.name === 'README.md' && srcPath === path.join(src, 'README.md')) {
        content = generateReadme(projectName, includeApi, includeLambda, includeDynamo, includeS3, includeCognito);
      }

      // Generate Pulumi config files for each environment
      if (entry.name === 'Pulumi.yaml' && srcPath.includes('infrastructure')) {
        // After writing Pulumi.yaml, create environment-specific configs
        fs.writeFileSync(destPath, content);
        environments.forEach(env => {
          const envConfig = generatePulumiEnvConfig(projectName, env);
          fs.writeFileSync(path.join(path.dirname(destPath), `Pulumi.${env}.yaml`), envConfig);
        });
        continue; // Skip the normal write since we already wrote it
      }

      // Replace conditional imports in infrastructure/src/index.ts
      if (entry.name === 'index.ts' && srcPath.includes('infrastructure/src') && !srcPath.includes('infrastructure/src/components') && !srcPath.includes('infrastructure/src/resources')) {
        // If no backend features are enabled, remove the entire backend component
        if (!includeLambda && !includeDynamo && !includeS3 && !includeCognito) {
          // Remove backend component import
          content = content.replace(/\/\* ---------- Components ---------- \*\/[\s\S]*?import \{ BackendComponent \}.*\n\n/g, '');
          // Remove backend component instantiation and DNS
          content = content.replace(/\/\* ---------- Backend ---------- \*\/[\s\S]*?(?=\/\* ---------- Exports)/g, '');
          // Remove backend-related exports
          content = content.replace(/export const apigwUrl = backend\.apigateway\.api\.apiEndpoint;\n/g, '');
          content = content.replace(/export const dynamoTableName = backend\.dynamo\.table\.name;\n/g, '');
          content = content.replace(/export const s3StorageBucketName = backend\.storage\.bucket\.bucket;\n/g, '');
          content = content.replace(/export const cognitoUserPoolId = backend\.cognito\.userpool\.id;\n/g, '');
          content = content.replace(/export const cognitoUserPoolClientId = backend\.cognito\.userpoolClient\.id;\n/g, '');
        } else {
          // Remove specific exports based on flags
          if (!includeLambda) {
            content = content.replace(/export const apigwUrl = backend\.apigateway\.api\.apiEndpoint;\n/g, '');
            // Remove certificateArn from backend props and dependsOn
            content = content.replace(
              /const backend = new BackendComponent\(\n  `backend-\$\{environment\}`,\n  \{\n    environment,\n    certificateArn: certificate\.acm\.arn,\n  \},\n  \{ dependsOn: \[certificate\.acm\] \},\n\);/g,
              'const backend = new BackendComponent(`backend-${environment}`, {\n  environment,\n});'
            );
          }
          if (!includeDynamo) {
            content = content.replace(/export const dynamoTableName = backend\.dynamo\.table\.name;\n/g, '');
          }
          if (!includeS3) {
            content = content.replace(/export const s3StorageBucketName = backend\.storage\.bucket\.bucket;\n/g, '');
          }
          if (!includeCognito) {
            content = content.replace(/export const cognitoUserPoolId = backend\.cognito\.userpool\.id;\n/g, '');
            content = content.replace(/export const cognitoUserPoolClientId = backend\.cognito\.userpoolClient\.id;\n/g, '');
          }
        }
      }

      // Update backend component to remove unused resources
      if (entry.name === 'backend.ts' && srcPath.includes('infrastructure/src/components')) {
        // Build the constants import based on what's included
        let constantsToRemove = [];
        if (!includeDynamo) constantsToRemove.push('DYNAMODB_TABLES');
        if (!includeS3) constantsToRemove.push('S3_BUCKETS');
        if (!includeCognito) constantsToRemove.push('COGNITO_USER_POOLS', 'COGNITO_USER_POOL_CLIENTS');

        // Update constants import to remove unused ones
        if (constantsToRemove.length > 0) {
          constantsToRemove.forEach(constant => {
            content = content.replace(new RegExp(`  ${constant},\\n`, 'g'), '');
            content = content.replace(new RegExp(`,\\n  ${constant}`, 'g'), '');
          });
        }

        // Remove DynamoDB if not included
        if (!includeDynamo) {
          content = content.replace(/import \{ DynamoResource \} from '\.\.\/resources\/dynamo';\n/g, '');
          content = content.replace(/  public readonly dynamo: DynamoResource;\n/g, '');
          content = content.replace(/    \/\* ---------- Resource Names ---------- \*\/\n    const tableName = DYNAMODB_TABLES\[environment as Environment\];\n/g, '    /* ---------- Resource Names ---------- */\n');
          content = content.replace(/    const tableName = DYNAMODB_TABLES\[environment as Environment\];\n/g, '');
          content = content.replace(/\n\n    \/\* ---------- DynamoDB ---------- \*\/[\s\S]*?(?=\n\n    \/\* ----------)/g, '');
        }

        // Remove S3 if not included
        if (!includeS3) {
          content = content.replace(/import \{ S3StorageResource \} from '\.\.\/resources\/s3-storage';\n/g, '');
          content = content.replace(/  public readonly storage: S3StorageResource;\n/g, '');
          content = content.replace(/    const bucketName = S3_BUCKETS\[environment as Environment\];\n/g, '');
          content = content.replace(/\n\n    \/\* ---------- S3 Storage ---------- \*\/[\s\S]*?(?=\n\n    \/\* ----------)/g, '');
        }

        // Remove Cognito if not included
        if (!includeCognito) {
          content = content.replace(/import \{ CognitoResource \} from '\.\.\/resources\/cognito';\n/g, '');
          content = content.replace(/  public readonly cognito: CognitoResource;\n/g, '');
          content = content.replace(/    const userpoolName = COGNITO_USER_POOLS\[environment as Environment\];\n/g, '');
          content = content.replace(/    const userpoolClientName = COGNITO_USER_POOL_CLIENTS\[environment as Environment\];\n/g, '');
          content = content.replace(/\n\n    \/\* ---------- Cognito ---------- \*\/[\s\S]*?(?=\n\n    \/\* ----------)/g, '');
        }

        // Remove API Gateway if not included
        if (!includeLambda) {
          content = content.replace(/import \{ ApigatewayResource \} from '\.\.\/resources\/apigateway';\n/g, '');
          content = content.replace(/import \{ DNSResource \} from '\.\.\/resources\/dns';\n/g, '');
          content = content.replace(/  DOMAIN_BASE,\n/g, '');
          content = content.replace(/  DOMAINS,\n/g, '');
          content = content.replace(/  public readonly apigateway: ApigatewayResource;\n/g, '');
          content = content.replace(/  \/\*\*\n   \* ACM certificate ARN for API Gateway custom domain\n   \*\/\n  certificateArn: string;\n/g, '');
          content = content.replace(/, certificateArn/g, '');
          content = content.replace(/    const apigwDomain = DOMAINS\.apigw\[environment as Environment\];\n/g, '');
          content = content.replace(/\n\n    \/\* ---------- API Gateway \+ Lambdas ---------- \*\/[\s\S]*?(?=\n  \})/g, '');
        } else if (!includeDynamo) {
          // If Lambda is included but DynamoDB is not, remove the dynamodb prop from apigateway
          content = content.replace(/        dynamodb: this\.dynamo,\n/g, '');
        }
      }

      // Replace conditional scripts in root package.json
      if (entry.name === 'package.json' && srcPath === path.join(src, 'package.json')) {
        const pkg = JSON.parse(content);
        if (!includeLambda && pkg.scripts) {
          // Remove Lambda build scripts
          if (pkg.scripts['build:lambdas']) {
            delete pkg.scripts['build:lambdas'];
          }
          if (pkg.scripts.build) {
            pkg.scripts.build = 'bun run build:website';
          }
        }
        content = JSON.stringify(pkg, null, 2) + '\n';
      }

      fs.writeFileSync(destPath, content);
    }
  }
}

function generatePulumiEnvConfig(projectName, environment) {
  return `config:
  aws:profile: ""
  aws:region: us-east-1
  aws:defaultTags:
    tags:
      project: ${projectName}
      environment: ${environment}
  ${projectName}:environment: ${environment}
`;
}

function generateReadme(projectName, includeApi, includeLambda, includeDynamo, includeS3, includeCognito) {
  const hasAnyBackend = includeLambda || includeDynamo || includeS3 || includeCognito;

  // Project Structure section
  let structureItems = ['- `apps/landing-page` - Nullstack landing page with Tailwind CSS'];
  if (includeApi) {
    structureItems.push('- `apps/api` - Elysia API server');
  }
  structureItems.push('- `packages/ui` - Shared UI components library');
  structureItems.push('- `packages/constants` - Project constants and environment configuration');
  if (includeLambda) {
    structureItems.push('- `packages/lambdas` - Lambda functions');
  }
  if (hasAnyBackend) {
    structureItems.push('- `infrastructure` - Pulumi infrastructure as code');
  }

  // Tech Stack section
  let techStack = [
    '- [Nullstack](https://nullstack.app/) - Full-stack JavaScript framework',
    '- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework',
    '- [Biome](https://biomejs.dev/) - Fast formatter and linter',
    '- [Bun](https://bun.sh/) - Fast JavaScript runtime and package manager with workspaces'
  ];
  if (includeApi) {
    techStack.push('- [Elysia](https://elysiajs.com/) - Fast Bun web framework');
  }
  if (hasAnyBackend) {
    techStack.push('- [Pulumi](https://www.pulumi.com/) - Infrastructure as Code');
  }

  // Backend Component section
  let backendSection = '';
  if (hasAnyBackend) {
    let backendResources = [];
    if (includeCognito) backendResources.push('- **Cognito** - User authentication with email/password + OAuth');
    if (includeDynamo) backendResources.push('- **DynamoDB** - NoSQL database with single-table design');
    if (includeS3) backendResources.push('- **S3 Storage** - Private bucket for file uploads');
    if (includeLambda) backendResources.push('- **API Gateway + Lambdas** - Serverless API endpoints');

    backendSection = `

## Infrastructure

This project uses Pulumi for infrastructure management with a component-based architecture:

### Backend Component

All AWS backend resources are organized in \`infrastructure/src/components/backend.ts\`:

${backendResources.join('\n')}

Deploy infrastructure:
\`\`\`bash
cd infrastructure
bun run deploy
\`\`\`

Preview changes:
\`\`\`bash
cd infrastructure
bun run preview
\`\`\`

Tear down resources:
\`\`\`bash
cd infrastructure
bun run destroy
\`\`\``;
  }

  return `# ${projectName}

A monorepo project built with Nullstack, featuring Biome for linting and formatting.

## Getting Started

### Install dependencies

\`\`\`bash
bun install
\`\`\`

### Development

Start the development server:

\`\`\`bash
bun start
\`\`\`

The landing page will be available at http://localhost:3000

### Build

Build the project:

\`\`\`bash
bun run build
\`\`\`

### Format Code

Format code with Biome:

\`\`\`bash
bun run fmt
\`\`\`

## Project Structure

${structureItems.join('\n')}

## Tech Stack

${techStack.join('\n')}${backendSection}
`;
}

function generateConstantsFile(projectName, domain, environments, includeApi, includeLambda, includeDynamo, includeS3, includeCognito) {
  const envsObject = environments.map(env => `  ${env}: '${env}'`).join(',\n');
  const envsType = environments.map(env => `'${env}'`).join(' | ');

  // Generate domain config for landing-page app
  const landingPageDomains = environments.map(env => {
    const isProduction = env === 'production';
    const domainValue = isProduction ? 'DOMAIN_BASE' : `\`${env}.\${DOMAIN_BASE}\``;
    return `    ${env}: ${domainValue}`;
  }).join(',\n');

  // Build domains object conditionally
  let domainsObject = `  'landing-page': {
${landingPageDomains},
  },`;

  if (includeApi) {
    const apiDomains = environments.map(env => {
      const isProduction = env === 'production';
      const domainValue = isProduction ? '`api.${DOMAIN_BASE}`' : `\`api-${env}.\${DOMAIN_BASE}\``;
      return `    ${env}: ${domainValue}`;
    }).join(',\n');
    domainsObject += `\n  api: {
${apiDomains},
  },`;
  }

  if (includeLambda) {
    const apigwDomains = environments.map(env => {
      const isProduction = env === 'production';
      const domainValue = isProduction ? '`apigw.${DOMAIN_BASE}`' : `\`apigw-${env}.\${DOMAIN_BASE}\``;
      return `    ${env}: ${domainValue}`;
    }).join(',\n');
    domainsObject += `\n  apigw: {
${apigwDomains},
  },`;
  }

  let additionalConstants = '';

  if (includeDynamo) {
    const dynamoTables = environments.map(env =>
      `  ${env}: \`\${PROJECT_NAME}-Table-${env}\``
    ).join(',\n');
    additionalConstants += `\n// DynamoDB table names per environment
export const DYNAMODB_TABLES: Record<Environment, string> = {
${dynamoTables},
};\n`;
  }

  if (includeS3) {
    const s3Buckets = environments.map(env =>
      `  ${env}: \`\${PROJECT_NAME}-storage-${env}\``
    ).join(',\n');
    additionalConstants += `\n// S3 bucket names per environment
export const S3_STORAGE_BUCKETS: Record<Environment, string> = {
${s3Buckets},
};\n`;
  }

  if (includeCognito) {
    const cognitoUserPools = environments.map(env =>
      `  ${env}: \`\${PROJECT_NAME}-userpool-${env}\``
    ).join(',\n');
    const cognitoUserPoolClients = environments.map(env =>
      `  ${env}: \`\${PROJECT_NAME}-userpool-client-${env}\``
    ).join(',\n');
    additionalConstants += `\n// Cognito User Pool names per environment
export const COGNITO_USER_POOLS: Record<Environment, string> = {
${cognitoUserPools},
};

// Cognito User Pool Client names per environment
export const COGNITO_USER_POOL_CLIENTS: Record<Environment, string> = {
${cognitoUserPoolClients},
};\n`;
  }

  return `// Project name
export const PROJECT_NAME = '${projectName}';

// Base domain (configure this for your project)
export const DOMAIN_BASE = '${domain}';

// Environment-specific configuration
export const ENVIRONMENTS = {
${envsObject},
} as const;

export type Environment = ${envsType};

// Domain configuration by app and environment
export const DOMAINS: Record<string, Record<Environment, string>> = {
${domainsObject}
};
${additionalConstants}
`;
}

main().catch((error) => {
  console.error(chalk.red('Error:', error));
  process.exit(1);
});
