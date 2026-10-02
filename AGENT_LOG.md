# WardVoice Deployment Proof Log (AWS "Zero to Shipped" Hackathon)

**Project:** WardVoice — Civic Grievance Triage & Resolution Platform  
**Target:** AWS Serverless (Lambda Function URL, DynamoDB on-demand, Amazon Bedrock, Amazon Translate)  
**Region:** us-east-1  
**Account:** 812642123167 (IAM user: surya)  
**Agent:** Antigravity AI Pair Programmer (DeepMind)  
**Timestamp:** 2026-10-02

---

## 1. AWS Identity & Connection Verification
- **Command:** `aws sts get-caller-identity`
- **Output:**
  ```json
  {
      "UserId": "AIDA32NJ6XWP3KKMPDJ5H",
      "Account": "812642123167",
      "Arn": "arn:aws:iam::812642123167:user/surya"
  }
  ```
- **Status:** Verified connection to AWS account `812642123167` in region `us-east-1`.

## 2. Organization SCP Discovery & Region Selection
- **Issue Discovered:** The AWS Organization policy (`arn:aws:organizations::970450051451:policy/o-tr1eujkat0/service_control_policy/p-tqy0xo0k`) placed an explicit deny on DynamoDB, Lambda, and Translate across all regions EXCEPT `ap-southeast-2` (Sydney).
- **Target Region:** Updated to `ap-southeast-2` (Sydney) for all services.
- **Service Verification in `ap-southeast-2`:**
  - `aws lambda list-functions --region ap-southeast-2` → OK (`[]`, 0 existing)
  - `aws dynamodb list-tables --region ap-southeast-2` → OK (`[]`, 0 existing)
  - `aws s3 ls` → OK
  - `aws translate translate-text` → Explicit Deny by SCP (Translate permanently blocked).

## 3. Architecture & Service Adaptation
- **Amazon Translate Replacement:** Per hackathon requirement, Amazon Translate was completely removed. Tamil grievance letters are now directly drafted and translated using Amazon Bedrock via a dedicated second LLM prompt returning pure Tamil script, with fallback to pre-crafted localized Tamil templates if LLM is unavailable.
- **Amazon Bedrock Model:** Verified and tested via AWS SDK in `ap-southeast-2`:
  - Selected inference profile: `apac.amazon.nova-lite-v1:0` (Active and responsive).
  - Verified Bedrock invocation for both complaint extraction and English-to-Tamil civic letter translation.
- **IAM Execution Role Created:**
  - Role Name: `wardvoice-lambda-role`
  - ARN: `arn:aws:iam::812642123167:role/wardvoice-lambda-role`
  - Attached Policies:
    - `arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`
    - `arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess`
    - `arn:aws:iam::aws:policy/AmazonBedrockFullAccess`

## 4. Lambda Bundle Build
- **Command:** `npm run build:lambda`
- **Frontend:** Vite SPA built to `dist/` (HTML, JS, CSS).
- **Backend:** `server.ts` bundled with esbuild into `lambda-bundle/server.cjs` (2.5 MB, includes AWS SDK clients).
- **Archive:** Compressed into `wardvoice-lambda.zip` (678 KB).

---
