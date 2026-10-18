import * as core from '@actions/core';
import {context} from '@actions/github';
import {waitForSonarStatus} from './sonar.js';


// most @actions toolkit packages have async methods
async function run() {
  try {
    const sonarCloudUrlInput = core.getInput('url', {required: false});
    const sonarCloudUrl = (sonarCloudUrlInput) ? sonarCloudUrlInput : 'https://sonarcloud.io';

    const orgInput = core.getInput('org', {required: false});
    const org = (orgInput) ? orgInput : context.repo.owner;

    const repoInput = core.getInput('repo', {required: false});
    const repo = (repoInput) ? repoInput : context.repo.repo;



    const params = {}
    const branchInput = core.getInput('branch', {required: false});
    const githubEventNumber = context.issue.number;
    if (githubEventNumber && !branchInput) {
      params.pullRequest = githubEventNumber
    } else {
      params.branch = (branchInput) ? branchInput : process.env.GITHUB_REF_NAME;
    }

    const options = {}
    if (process.env.SONAR_TOKEN) {
      options.headers = {'Authorization': `Basic ${Buffer.from(process.env.SONAR_TOKEN + ":").toString('base64')}`}
    }


    const waitTimeoutInput = core.getInput('wait-timeout', {required: false});
    const waitTimeout = (waitTimeoutInput) ? Number(waitTimeoutInput) : 300;
    const pollIntervalInput = core.getInput('poll-interval', {required: false});
    const pollInterval = (pollIntervalInput) ? Number(pollIntervalInput) : 10;

    const response = await waitForSonarStatus(sonarCloudUrl, org, repo, params, options, {
      timeoutMs: waitTimeout * 1000,
      intervalMs: pollInterval * 1000,
      log: core.info
    });
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
