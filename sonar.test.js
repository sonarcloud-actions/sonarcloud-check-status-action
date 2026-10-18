import {jest, describe, test, expect, beforeEach} from '@jest/globals';
import getSonarStatus, {getAnalyzedCommit, waitForSonarAnalysis, waitForSonarStatus} from './sonar.js';

const fetch = jest.fn();
global.fetch = fetch;

test('status is returned from sonar', async () => {
    const response = Promise.resolve({
        ok: true,
        json: () => {
            return {
                projectStatus: {
                    status: 'OK'
                }
            }
        }
    });
    fetch.mockImplementation(() => response);

    const result = await getSonarStatus('https://sonarcloud.io', 'test', 'test');
    expect(result.projectStatus.status).toBe('OK');
});

describe('waitForSonarStatus', () => {
    const statusResponse = (status) => Promise.resolve({ok: true, json: () => ({projectStatus: {status}})});

    beforeEach(() => fetch.mockReset());

    test('polls until status is no longer NONE', async () => {
        fetch.mockImplementationOnce(() => statusResponse('NONE'))
            .mockImplementationOnce(() => statusResponse('NONE'))
            .mockImplementation(() => statusResponse('OK'));

        const result = await waitForSonarStatus('https://sonarcloud.io', 'test', 'test', {}, {}, {timeoutMs: 1000, intervalMs: 1});
        expect(result.projectStatus.status).toBe('OK');
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    test('does not poll when status is already final', async () => {
        fetch.mockImplementation(() => statusResponse('ERROR'));

        const result = await waitForSonarStatus('https://sonarcloud.io', 'test', 'test', {}, {}, {timeoutMs: 1000, intervalMs: 1});
        expect(result.projectStatus.status).toBe('ERROR');
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('returns NONE once the timeout is reached', async () => {
        fetch.mockImplementation(() => statusResponse('NONE'));

        const result = await waitForSonarStatus('https://sonarcloud.io', 'test', 'test', {}, {}, {timeoutMs: 50, intervalMs: 10});
        expect(result.projectStatus.status).toBe('NONE');
        expect(fetch.mock.calls.length).toBeGreaterThan(1);
    });
});

describe('getAnalyzedCommit', () => {
    const jsonResponse = (body) => Promise.resolve({ok: true, json: () => body});

    beforeEach(() => fetch.mockReset());

    test('returns the last analyzed commit of the branch', async () => {
        fetch.mockImplementation(() => jsonResponse({branches: [
            {name: 'master', commit: {sha: 'other'}},
            {name: 'main', commit: {sha: 'abc'}}
        ]}));

        expect(await getAnalyzedCommit('https://sonarcloud.io', 'org', 'repo', {branch: 'main'}, {})).toBe('abc');
        expect(fetch.mock.calls[0][0]).toBe('https://sonarcloud.io/api/project_branches/list?project=org_repo');
    });

    test('returns the last analyzed commit of the pull request', async () => {
        fetch.mockImplementation(() => jsonResponse({pullRequests: [
            {key: '79', commit: {sha: 'other'}},
            {key: '80', commit: {sha: 'abc'}}
        ]}));

        expect(await getAnalyzedCommit('https://sonarcloud.io', 'org', 'repo', {pullRequest: 80}, {})).toBe('abc');
        expect(fetch.mock.calls[0][0]).toBe('https://sonarcloud.io/api/project_pull_requests/list?project=org_repo');
    });

    test('falls back to the latest analysis revision when the branch lists no commit', async () => {
        fetch.mockImplementationOnce(() => jsonResponse({branches: [{name: 'main'}]}))
            .mockImplementation(() => jsonResponse({analyses: [{revision: 'abc'}]}));

        expect(await getAnalyzedCommit('https://sonarqube.example', 'org', 'repo', {branch: 'main'}, {})).toBe('abc');
        expect(fetch.mock.calls[1][0]).toBe('https://sonarqube.example/api/project_analyses/search?project=org_repo&branch=main&ps=1');
    });

    test('falls back to the latest analysis revision when the pull request lists no commit', async () => {
        fetch.mockImplementationOnce(() => jsonResponse({pullRequests: [{key: '80'}]}))
            .mockImplementation(() => jsonResponse({analyses: [{revision: 'abc'}]}));

        expect(await getAnalyzedCommit('https://sonarqube.example', 'org', 'repo', {pullRequest: 80}, {})).toBe('abc');
        expect(fetch.mock.calls[1][0]).toBe('https://sonarqube.example/api/project_analyses/search?project=org_repo&pullRequest=80&ps=1');
    });

    test('returns undefined when the branch has not been analyzed', async () => {
        fetch.mockImplementation(() => jsonResponse({branches: [{name: 'master', commit: {sha: 'abc'}}]}));

        expect(await getAnalyzedCommit('https://sonarcloud.io', 'org', 'repo', {branch: 'main'}, {})).toBeUndefined();
    });

    test('returns undefined when the project cannot be read', async () => {
        fetch.mockImplementation(() => jsonResponse({errors: [{msg: 'Insufficient privileges'}]}));

        expect(await getAnalyzedCommit('https://sonarcloud.io', 'org', 'repo', {pullRequest: 80}, {})).toBeUndefined();
    });
});

describe('waitForSonarAnalysis', () => {
    const branchesResponse = (sha) => Promise.resolve({ok: true, json: () => ({branches: [{name: 'main', commit: {sha}}]})});

    beforeEach(() => fetch.mockReset());

    test('polls until the commit has been analyzed', async () => {
        fetch.mockImplementationOnce(() => branchesResponse('previous'))
            .mockImplementation(() => branchesResponse('abc'));
        const log = jest.fn();

        const analyzedCommit = await waitForSonarAnalysis('https://sonarcloud.io', 'org', 'repo', {branch: 'main'}, 'abc', {}, {timeoutMs: 1000, intervalMs: 1, log});
        expect(analyzedCommit).toBe('abc');
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(log).toHaveBeenCalledWith('Last analyzed commit is previous, waiting for abc, retrying in 0.001s');
    });

    test('logs when the branch has no analysis yet', async () => {
        fetch.mockImplementationOnce(() => Promise.resolve({ok: true, json: () => ({branches: []})}))
            .mockImplementation(() => branchesResponse('abc'));
        const log = jest.fn();

        await waitForSonarAnalysis('https://sonarcloud.io', 'org', 'repo', {branch: 'main'}, 'abc', {}, {timeoutMs: 1000, intervalMs: 1, log});
        expect(log).toHaveBeenCalledWith('Last analyzed commit is none, waiting for abc, retrying in 0.001s');
    });

    test('returns the last analyzed commit once the timeout is reached', async () => {
        fetch.mockImplementation(() => branchesResponse('previous'));

        const analyzedCommit = await waitForSonarAnalysis('https://sonarcloud.io', 'org', 'repo', {branch: 'main'}, 'abc', {}, {timeoutMs: 50, intervalMs: 10});
        expect(analyzedCommit).toBe('previous');
        expect(fetch.mock.calls.length).toBeGreaterThan(1);
    });
});
