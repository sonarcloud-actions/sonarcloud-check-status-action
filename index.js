import * as core from '@actions/core';
import {context} from '@actions/github';
import {waitForSonarAnalysis, waitForSonarStatus} from './sonar.js';


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

    // SonarCloud records the PR head commit, not the merge commit GitHub checks out for pull_request events.
    const buildCommit = context.payload.pull_request?.head?.sha ?? context.sha;
    const checksThisBuild = !branchInput || branchInput === process.env.GITHUB_REF_NAME;
    const commit = core.getInput('commit', {required: false}) || (checksThisBuild ? buildCommit : undefined);
    if (commit) {
      const analyzedCommit = await waitForSonarAnalysis(sonarCloudUrl, org, repo, params, commit, options, waitOptions);
      if (analyzedCommit !== commit) {
        core.setFailed(`Timed out waiting for SonarCloud to analyze commit ${commit}.`);
        return;
      }
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
