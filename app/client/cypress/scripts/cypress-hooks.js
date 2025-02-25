const { Client } = require("pg");
const os = require("os");
const AWS = require("aws-sdk");
const fs = require("fs");

exports.cypressHooks = cypressHooks;

// This function will helps to check and get env variables
function getEnvValue(varName, { required = true }) {
  if (required && process.env[varName] === undefined) {
    throw Error(
      `Please check some or all the following ENV variables are not set properly [ RUNID, ATTEMPT_NUMBER, REPOSITORY, COMMITTER, TAG, BRANCH, THIS_RUNNER, CYPRESS_DB_USER, CYPRESS_DB_HOST, CYPRESS_DB_NAME, CYPRESS_DB_PWD, CYPRESS_S3_ACCESS, CYPRESS_S3_SECRET ].`,
    );
  }
  const value =
    process.env[varName] === undefined ? "Cypress test" : process.env[varName];
  return value;
}

//This is to setup the db client
function configureDbClient() {
  const dbConfig = {
    user: getEnvValue("CYPRESS_DB_USER", { required: true }),
    host: getEnvValue("CYPRESS_DB_HOST", { required: true }),
    database: getEnvValue("CYPRESS_DB_NAME", { required: true }),
    password: getEnvValue("CYPRESS_DB_PWD", { required: true }),
    port: 5432,
    ssl: true,
    keepalives: 0,
  };

  const dbClient = new Client(dbConfig);
  dbClient.connect();

  return dbClient;
}

// This is to setup the AWS client
AWS.config.update({ region: "ap-south-1" });
const s3 = new AWS.S3({
  credentials: {
    accessKeyId: getEnvValue("CYPRESS_S3_ACCESS", { required: true }),
    secretAccessKey: getEnvValue("CYPRESS_S3_SECRET", { required: true }),
  },
});

// This is to upload files to s3 when required
function uploadToS3(filePath, key) {
  const fileContent = fs.readFileSync(filePath);

  const params = {
    Bucket: "appsmith-internal-cy-db",
    Key: key,
    Body: fileContent,
  };
  return s3.upload(params).promise();
}

async function cypressHooks(on, config) {
  const dbClient = configureDbClient();
  const runData = {
    commitMsg: getEnvValue("COMMIT_INFO_MESSAGE", { required: false }),
    workflowId: getEnvValue("RUNID", { required: true }),
    attempt: getEnvValue("ATTEMPT_NUMBER", { required: true }),
    os: os.type(),
    repo: getEnvValue("REPOSITORY", { required: true }),
    committer: getEnvValue("COMMITTER", { required: true }),
    type: getEnvValue("TAG", { required: true }),
    branch: getEnvValue("BRANCH", { required: true }),
  };
  const matrix = {
    matrixId: getEnvValue("THIS_RUNNER", { required: true }),
    matrixStatus: "started",
  };

  const specData = {};

  await on("before:run", async (runDetails) => {
    runData.browser = runDetails.browser.name;
    try {
      const runResponse = await dbClient.query(
        `INSERT INTO public.attempt ("workflowId", "attempt", "browser", "os", "repo", "committer", "type", "commitMsg", "branch")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT ("workflowId", attempt) DO NOTHING
            RETURNING id;`,
        [
          runData.workflowId,
          runData.attempt,
          runData.browser,
          runData.os,
          runData.repo,
          runData.committer,
          runData.type,
          runData.commitMsg,
          runData.branch,
        ],
      );

      if (runResponse.rows.length > 0) {
        runData.attemptId = runResponse.rows[0].id; // Save the inserted attempt ID for later updates
      } else {
        const res = await dbClient.query(
          `SELECT id FROM public.attempt WHERE "workflowId" = $1 AND attempt = $2`,
          [runData.workflowId, runData.attempt],
        );
        runData.attemptId = res.rows[0].id;
      }

      const matrixResponse = await dbClient.query(
        `INSERT INTO public.matrix ("workflowId", "matrixId", "status", "attemptId")
            VALUES ($1, $2, $3, $4)
            ON CONFLICT ("matrixId", "attemptId") DO NOTHING
            RETURNING id;`,
        [
          runData.workflowId,
          matrix.matrixId,
          matrix.matrixStatus,
          runData.attemptId,
        ],
      );
      matrix.id = matrixResponse.rows[0].id; // Save the inserted matrix ID for later updates
    } catch (err) {
      console.log(err);
    }
  });

  await on("before:spec", async (spec) => {
    specData.name = spec.relative;
    specData.matrixId = matrix.id;
    try {
      const specResponse = await dbClient.query(
        'INSERT INTO public.specs ("name", "matrixId") VALUES ($1, $2) RETURNING id',
        [specData.name, matrix.id],
      );
      specData.specId = specResponse.rows[0].id; // Save the inserted spec ID for later updates
    } catch (err) {
      console.log(err);
    }
  });

  await on("after:spec", async (spec, results) => {
    specData.testCount = results.stats.tests;
    specData.passes = results.stats.passes;
    specData.failed = results.stats.failures;
    specData.pending = results.stats.pending;
    specData.skipped = results.stats.skipped;
    specData.status = results.stats.failures > 0 ? "fail" : "pass";

    try {
      await dbClient.query(
        'UPDATE public.specs SET "testCount" = $1, "passes" = $2, "failed" = $3, "skipped" = $4, "pending" = $5, "status" = $6 WHERE id = $7',
        [
          results.stats.tests,
          results.stats.passes,
          results.stats.failures,
          results.stats.skipped,
          results.stats.pending,
          specData.status,
          specData.specId,
        ],
      );
      for (const test of results.tests) {
        const testResponse = await dbClient.query(
          `INSERT INTO public.tests ("name", "specId", "status", "retries", "retryData") VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [
            test.title[1],
            specData.specId,
            test.state,
            test.attempts.length,
            JSON.stringify(test.attempts),
          ],
        );
        if (
          test.attempts.some((attempt) => attempt.state === "failed") &&
          results.screenshots
        ) {
          const out = results.screenshots.filter(
            (scr) => scr.testId === test.testId,
          );
          console.log("Uploading screenshots...");
          for (const scr of out) {
            const key = `${testResponse.rows[0].id}_${specData.specId}_${
              scr.testAttemptIndex + 1
            }`;
            Promise.all([uploadToS3(scr.path, key)]).catch((error) => {
              console.log("Error in uploading screenshots:", error);
            });
          }
        }
      }

      if (
        results.tests.some((test) =>
          test.attempts.some((attempt) => attempt.state === "failed"),
        ) &&
        results.video
      ) {
        console.log("Uploading video...");
        const key = `${specData.specId}`;
        Promise.all([uploadToS3(results.video, key)]).catch((error) => {
          console.log("Error in uploading video:", error);
        });
      }
    } catch (err) {
      console.log(err);
    }
  });

  on("after:run", async (runDetails) => {
    try {
      await dbClient.query(
        `UPDATE public.matrix SET "status" = $1 WHERE id = $2`,
        ["done", matrix.id],
      );
      await dbClient.query(
        `UPDATE public.attempt SET "endTime" = $1 WHERE "id" = $2`,
        [new Date(), runData.attemptId],
      );
      await dbClient.end();
    } catch (err) {
      console.log(err);
    }
  });
}
