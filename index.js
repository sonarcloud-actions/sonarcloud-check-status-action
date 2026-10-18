import * as core from '@actions/core';
import {context} from '@actions/github';
import {readCeTaskId, waitForSonarStatus, waitForSonarTask} from './sonar.js';


// most @actions toolkit packages have async methods
async function run() {
  try {
    const sonarCloudUrl = core.getInput('url', {required: false}) || 'https://sonarcloud.io';
    const org = core.getInput('org', {required: false}) || context.repo.owner;
    const repo = core.getInput('repo', {required: false}) || context.repo.repo;



    const params = {}
    const branchInput = core.getInput('branch', {required: false});
    const githubEventNumber = context.issue.number;
    if (githubEventNumber && !branchInput) {
      params.pullRequest = githubEventNumber
    } else {
      params.branch = branchInput || process.env.GITHUB_REF_NAME;
    }

    const options = {}
    if (process.env.SONAR_TOKEN) {
      options.headers = {'Authorization': `Basic ${Buffer.from(process.env.SONAR_TOKEN + ":").toString('base64')}`}
    }


    const waitTimeoutInput = core.getInput('wait-timeout', {required: false});
    const waitTimeout = (waitTimeoutInput) ? Number(waitTimeoutInput) : 300;
    const pollIntervalInput = core.getInput('poll-interval', {required: false});
    const pollInterval = (pollIntervalInput) ? Number(pollIntervalInput) : 10;

    const waitOptions = {timeoutMs: waitTimeout * 1000, intervalMs: pollInterval * 1000, log: core.info};

    // The quality gate keeps reporting the previous analysis until SonarCloud finishes processing the new report.
    const reportTaskFile = core.getInput('report-task-file', {required: false}) || '.scannerwork/report-task.txt';
    const taskId = await readCeTaskId(reportTaskFile);
    if (taskId) {
      const task = await waitForSonarTask(sonarCloudUrl, taskId, options, waitOptions);
      core.info(`analysis task ${taskId} status=${task?.status}`);
    }

    const response = await waitForSonarStatus(sonarCloudUrl, org, repo, params, options, waitOptions);
    core.info(`response=${JSON.stringify(response)}`);

    const status = response.projectStatus.status;
    core.info(`status=${status}`);

    if (status !== 'OK') {
      core.setFailed('Failed Sonar Check.');
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

await run();
