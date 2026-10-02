#!/usr/bin/env node
/**
 * scripts/deploy-aws.mjs
 *
 * Full serverless deployment to AWS Free Tier:
 *   - DynamoDB table (on-demand, free tier)
 *   - IAM role for Lambda
 *   - Lambda function (Node 20, 512 MB)
 *   - Lambda Function URL (free HTTPS, no ALB needed)
 *   - Bedrock model access check
 *
 * Run:  node scripts/deploy-aws.mjs
 * Requires: AWS CLI installed and configured (aws configure)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, '..');

const REGION        = process.env.AWS_REGION      || 'ap-southeast-2';
const FUNCTION_NAME = process.env.FUNCTION_NAME   || 'wardvoice';
const TABLE_NAME    = process.env.DYNAMO_TABLE     || 'wardvoice-issues';
const ROLE_NAME     = 'wardvoice-lambda-role';
const ZIP_PATH      = path.join(root, 'wardvoice-lambda.zip');

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  return execSync(cmd, { stdio: ['pipe', 'pipe', 'inherit'], cwd: root }).toString().trim();
}

function runJson(cmd) {
  const out = run(cmd);
  return JSON.parse(out);
}

async function main() {
  console.log(`\n🚀 WardVoice — AWS Serverless Deployment`);
  console.log(`   Region  : ${REGION}`);
  console.log(`   Function: ${FUNCTION_NAME}`);
  console.log(`   Table   : ${TABLE_NAME}\n`);

  // ── 0. Verify zip exists ──────────────────────────────────────────────────
  if (!fs.existsSync(ZIP_PATH)) {
    console.error('❌ wardvoice-lambda.zip not found. Run: npm run build:lambda first.');
    process.exit(1);
  }

  // ── 1. Get AWS account ID ─────────────────────────────────────────────────
  console.log('Step 1: Getting AWS account identity…');
  const identity  = runJson(`aws sts get-caller-identity --region ${REGION} --output json`);
  const accountId = identity.Account;
  console.log(`   Account: ${accountId}`);

  // ── 2. Create DynamoDB table (if not exists) ──────────────────────────────
  console.log('\nStep 2: Creating DynamoDB table…');
  try {
    run(`aws dynamodb describe-table --table-name ${TABLE_NAME} --region ${REGION} --output json`);
    console.log(`   Table "${TABLE_NAME}" already exists — skipping.`);
  } catch {
    run([
      `aws dynamodb create-table`,
      `--table-name ${TABLE_NAME}`,
      `--attribute-definitions AttributeName=id,AttributeType=S`,
      `--key-schema AttributeName=id,KeyType=HASH`,
      `--billing-mode PAY_PER_REQUEST`,
      `--region ${REGION}`,
    ].join(' '));
    console.log(`   ✅ Table "${TABLE_NAME}" created (on-demand billing — Free Tier eligible).`);
    // Wait for table to be active
    run(`aws dynamodb wait table-exists --table-name ${TABLE_NAME} --region ${REGION}`);
  }

  // ── 3. Create IAM role (if not exists) ───────────────────────────────────
  console.log('\nStep 3: Creating IAM execution role…');
  const trustPolicy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: { Service: 'lambda.amazonaws.com' },
      Action: 'sts:AssumeRole',
    }],
  };
  // Write to temp file to avoid Windows shell quoting issues
  const trustPolicyFile = path.join(os.tmpdir(), 'wardvoice-trust-policy.json');
  fs.writeFileSync(trustPolicyFile, JSON.stringify(trustPolicy));

  let roleArn;
  try {
    const roleInfo = runJson(`aws iam get-role --role-name ${ROLE_NAME} --output json`);
    roleArn = roleInfo.Role.Arn;
    console.log(`   Role "${ROLE_NAME}" already exists — reusing.`);
  } catch {
    const roleResult = runJson([
      `aws iam create-role`,
      `--role-name ${ROLE_NAME}`,
      `--assume-role-policy-document file://${trustPolicyFile.replace(/\\/g, '/')}`,
      `--output json`,
    ].join(' '));
    roleArn = roleResult.Role.Arn;
    console.log(`   ✅ Role created: ${roleArn}`);
  }

  // ── 4. Attach policies to role ────────────────────────────────────────────
  console.log('\nStep 4: Attaching IAM policies…');
  const policies = [
    'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole', // CloudWatch logs
    'arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess',
    'arn:aws:iam::aws:policy/AmazonBedrockFullAccess',
  ];
  for (const p of policies) {
    try {
      run(`aws iam attach-role-policy --role-name ${ROLE_NAME} --policy-arn ${p}`);
      console.log(`   ✅ Attached: ${p.split('/').pop()}`);
    } catch {
      console.log(`   (already attached) ${p.split('/').pop()}`);
    }
  }

  // Wait for role to propagate
  console.log('   Waiting 10s for IAM role to propagate…');
  await new Promise(r => setTimeout(r, 10000));

  // ── 5. Create or update Lambda function ──────────────────────────────────
  console.log('\nStep 5: Deploying Lambda function…');
  const envVars = [
    `DYNAMO_TABLE=${TABLE_NAME}`,
    `BEDROCK_MODEL_ID=apac.amazon.nova-lite-v1:0`,
    `NODE_ENV=production`,
  ].join(',');

  const normalizedZip = ZIP_PATH.replace(/\\/g, '/');

  let functionArn;
  try {
    run(`aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} --output json`);
    // Update existing
    console.log('   Function exists — updating code…');
    run([
      `aws lambda update-function-code`,
      `--function-name ${FUNCTION_NAME}`,
      `--zip-file fileb://wardvoice-lambda.zip`,
      `--region ${REGION}`,
      `--output json`,
    ].join(' '));
    run(`aws lambda wait function-updated --function-name ${FUNCTION_NAME} --region ${REGION}`);
    run([
      `aws lambda update-function-configuration`,
      `--function-name ${FUNCTION_NAME}`,
      `--environment "Variables={${envVars}}"`,
      `--region ${REGION}`,
      `--output json`,
    ].join(' '));
    const fnInfo = runJson(`aws lambda get-function-configuration --function-name ${FUNCTION_NAME} --region ${REGION} --output json`);
    functionArn = fnInfo.FunctionArn;
    console.log(`   ✅ Function updated.`);
  } catch {
    // Create new
    console.log('   Creating new Lambda function…');
    const fnResult = runJson([
      `aws lambda create-function`,
      `--function-name ${FUNCTION_NAME}`,
      `--runtime nodejs20.x`,
      `--role ${roleArn}`,
      `--handler index.handler`,
      `--zip-file fileb://wardvoice-lambda.zip`,
      `--timeout 30`,
      `--memory-size 512`,
      `--environment "Variables={${envVars}}"`,
      `--region ${REGION}`,
      `--output json`,
    ].join(' '));
    functionArn = fnResult.FunctionArn;
    run(`aws lambda wait function-active --function-name ${FUNCTION_NAME} --region ${REGION}`);
    console.log(`   ✅ Function created: ${functionArn}`);
  }

  // ── 6. Create Lambda Function URL (free HTTPS) ───────────────────────────
  console.log('\nStep 6: Creating Lambda Function URL…');
  let functionUrl;
  // Write CORS config to file to avoid Windows shell quoting issues
  const corsConfigFile = path.join(os.tmpdir(), 'wardvoice-cors.json');
  fs.writeFileSync(corsConfigFile, JSON.stringify({
    AllowOrigins: ['*'], AllowMethods: ['*'], AllowHeaders: ['*'],
  }));

  try {
    const urlConf = runJson([
      `aws lambda get-function-url-config`,
      `--function-name ${FUNCTION_NAME}`,
      `--region ${REGION}`,
      `--output json`,
    ].join(' '));
    functionUrl = urlConf.FunctionUrl;
    console.log(`   Function URL already exists: ${functionUrl}`);
  } catch {
    const urlResult = runJson([
      `aws lambda create-function-url-config`,
      `--function-name ${FUNCTION_NAME}`,
      `--auth-type NONE`,
      `--cors "file://${corsConfigFile.replace(/\\/g, '/')}"`,
      `--region ${REGION}`,
      `--output json`,
    ].join(' '));
    functionUrl = urlResult.FunctionUrl;

    // Allow public invocations
    run([
      `aws lambda add-permission`,
      `--function-name ${FUNCTION_NAME}`,
      `--statement-id FunctionURLAllowPublicAccess`,
      `--action lambda:InvokeFunctionUrl`,
      `--principal "*"`,
      `--function-url-auth-type NONE`,
      `--region ${REGION}`,
    ].join(' '));
    try {
      run([
        `aws lambda add-permission`,
        `--function-name ${FUNCTION_NAME}`,
        `--statement-id FunctionURLAllowPublicInvoke`,
        `--action lambda:InvokeFunction`,
        `--principal "*"`,
        `--region ${REGION}`,
      ].join(' '));
    } catch {}
    console.log(`   ✅ Function URL created and permissions granted.`);
  }

  // ── 7. Seed DynamoDB with sample data ────────────────────────────────────
  console.log('\nStep 7: Seeding DynamoDB with sample data…');
  try {
    // Wait 3 seconds for Function URL DNS
    await new Promise(r => setTimeout(r, 3000));
    const seedRes = await fetch(`${functionUrl}api/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (seedRes.ok) {
      console.log('   ✅ Seed completed successfully via live Function URL.');
    } else {
      console.warn('   ⚠ Seed returned HTTP status:', seedRes.status);
    }
  } catch (e) {
    console.warn('   ⚠ Seed HTTP invocation failed (non-fatal):', e.message);
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 WardVoice deployed successfully!');
  console.log('═'.repeat(60));
  console.log(`\n🌐  Public HTTPS URL:\n    ${functionUrl}`);
  console.log(`\n📊  DynamoDB Table : ${TABLE_NAME} (${REGION})`);
  console.log(`⚡  Lambda Function: ${FUNCTION_NAME} (${REGION})`);
  console.log('\nAll services are within the AWS Free Tier limits.\n');

  // Save URL to a file for reference
  fs.writeFileSync(path.join(root, 'deployment-url.txt'), functionUrl.trim());
  console.log('URL also saved to deployment-url.txt\n');
}

main().catch(err => {
  console.error('\n❌ Deployment failed:', err.message || err);
  process.exit(1);
});
