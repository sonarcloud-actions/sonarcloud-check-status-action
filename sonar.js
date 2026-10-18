import {readFile} from 'node:fs/promises';
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

// The scanner writes the id of the background task processing its report to report-task.txt.
const readCeTaskId = async (reportTaskFile) => {
    try {
        const contents = await readFile(reportTaskFile, 'utf8');
        return /^ceTaskId=(.+)$/m.exec(contents)?.[1].trim();
    } catch (error) {
        if (error.code === 'ENOENT') {
            return undefined;
        }
        throw error;
    }
}

const getSonarTask = async (endpoint, taskId, options) => {
    const url = `${endpoint}/api/ce/task?${new URLSearchParams({id: taskId})}`
    const response = await fetch(url, options).then(result => result.json())
    return response.task
}

// Until the task finishes, the quality gate still reports the previous analysis of the branch.
const waitForSonarTask = async (endpoint, taskId, options, waitOptions) => pollUntil(
    () => getSonarTask(endpoint, taskId, options),
    task => ['PENDING', 'IN_PROGRESS'].includes(task?.status),
    task => `Analysis task status is ${task.status}`,
    waitOptions
)

export default getSonarStatus
export {readCeTaskId, waitForSonarStatus, waitForSonarTask}
