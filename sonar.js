import {setTimeout as sleep} from 'node:timers/promises';

const getSonarStatus = async (endpoint, org, project, params, options) => {
    const projectKey = `${org}_${project}`
    const url = `${endpoint}/api/qualitygates/project_status?${new URLSearchParams({
        projectKey: projectKey,
        ...params
    })}`
    return await fetch(url, options).then(result => result.json())
}

// Calls fetchResult until isPending is false or waiting another interval would pass the timeout.
const pollUntil = async (fetchResult, isPending, describe, {timeoutMs, intervalMs, log = () => {}}) => {
    const deadline = Date.now() + timeoutMs;
    const poll = async () => {
        const result = await fetchResult();
        if (!isPending(result) || Date.now() + intervalMs > deadline) {
            return result;
        }
        log(`${describe(result)}, retrying in ${intervalMs / 1000}s`);
        await sleep(intervalMs);
        return poll();
    };
    return poll();
}

// SonarCloud computes the quality gate asynchronously after a scan, reporting NONE until it is ready.
const waitForSonarStatus = async (endpoint, org, project, params, options, waitOptions) => pollUntil(
    () => getSonarStatus(endpoint, org, project, params, options),
    response => response.projectStatus?.status === 'NONE',
    () => 'Quality gate status is NONE',
    waitOptions
)

const getAnalyzedCommit = async (endpoint, org, project, params, options) => {
    const query = new URLSearchParams({project: `${org}_${project}`})
    if (params.pullRequest) {
        const response = await fetch(`${endpoint}/api/project_pull_requests/list?${query}`, options).then(result => result.json())
        return response.pullRequests?.find(pullRequest => pullRequest.key === String(params.pullRequest))?.commit?.sha
    }
    const response = await fetch(`${endpoint}/api/project_branches/list?${query}`, options).then(result => result.json())
    return response.branches?.find(branch => branch.name === params.branch)?.commit?.sha
}

// Until SonarCloud finishes processing the new report, the quality gate still reports the previous analysis.
const waitForSonarAnalysis = async (endpoint, org, project, params, commit, options, waitOptions) => pollUntil(
    () => getAnalyzedCommit(endpoint, org, project, params, options),
    analyzedCommit => analyzedCommit !== commit,
    analyzedCommit => `Last analyzed commit is ${analyzedCommit ?? 'none'}, waiting for ${commit}`,
    waitOptions
)

export default getSonarStatus
export {getAnalyzedCommit, waitForSonarAnalysis, waitForSonarStatus}
