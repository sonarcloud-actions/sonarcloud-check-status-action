import {jest, describe, test, expect, beforeEach} from '@jest/globals';
import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import getSonarStatus, {readCeTaskId, waitForSonarStatus, waitForSonarTask} from './sonar.js';

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

describe('readCeTaskId', () => {
    const writeReportTask = async (contents) => {
        const file = path.join(await mkdtemp(path.join(tmpdir(), 'report-task-')), 'report-task.txt');
        await writeFile(file, contents);
        return file;
    };

    test('reads the task id from the report task file', async () => {
        const file = await writeReportTask('projectKey=test\nceTaskId=AaFQ6c2dviVu1NYQqhIy\nceTaskUrl=https://sonarcloud.io/api/ce/task?id=AaFQ6c2dviVu1NYQqhIy\n');
        expect(await readCeTaskId(file)).toBe('AaFQ6c2dviVu1NYQqhIy');
    });

    test('returns undefined when the file has no task id', async () => {
        const file = await writeReportTask('projectKey=test\n');
        expect(await readCeTaskId(file)).toBeUndefined();
    });

    test('returns undefined when the file does not exist', async () => {
        expect(await readCeTaskId(path.join(tmpdir(), 'missing', 'report-task.txt'))).toBeUndefined();
    });

    test('rethrows other read errors', async () => {
        await expect(readCeTaskId(tmpdir())).rejects.toThrow();
    });
});

describe('waitForSonarTask', () => {
    const taskResponse = (status) => Promise.resolve({ok: true, json: () => ({task: {id: 'task', status}})});

    beforeEach(() => fetch.mockReset());

    test('polls until the task is no longer pending or in progress', async () => {
        fetch.mockImplementationOnce(() => taskResponse('PENDING'))
            .mockImplementationOnce(() => taskResponse('IN_PROGRESS'))
            .mockImplementation(() => taskResponse('SUCCESS'));
        const log = jest.fn();

        const task = await waitForSonarTask('https://sonarcloud.io', 'task', {}, {timeoutMs: 1000, intervalMs: 1, log});
        expect(task.status).toBe('SUCCESS');
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(fetch.mock.calls[0][0]).toBe('https://sonarcloud.io/api/ce/task?id=task');
        expect(log).toHaveBeenCalledWith('Analysis task status is PENDING, retrying in 0.001s');
    });

    test('returns the pending task once the timeout is reached', async () => {
        fetch.mockImplementation(() => taskResponse('IN_PROGRESS'));

        const task = await waitForSonarTask('https://sonarcloud.io', 'task', {}, {timeoutMs: 50, intervalMs: 10});
        expect(task.status).toBe('IN_PROGRESS');
        expect(fetch.mock.calls.length).toBeGreaterThan(1);
    });

    test('does not poll when the task cannot be read', async () => {
        fetch.mockImplementation(() => Promise.resolve({ok: false, json: () => ({errors: [{msg: 'Authentication is required'}]})}));

        const task = await waitForSonarTask('https://sonarcloud.io', 'task', {}, {timeoutMs: 1000, intervalMs: 1});
        expect(task).toBeUndefined();
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
