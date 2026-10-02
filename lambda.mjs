/**
 * lambda.mjs
 * Wraps the Express app in an AWS Lambda handler using @codegenie/serverless-express.
 * Built by esbuild into lambda-bundle/index.mjs at deploy time.
 */
import serverlessExpress from '@codegenie/serverless-express';
import app from './app.mjs';   // esbuild output – re-exports the Express `app`

export const handler = serverlessExpress({ app });
