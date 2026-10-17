const getSonarStatus = require('./sonar');
const fetch = require('node-fetch');
jest.mock('node-fetch', () => jest.fn())
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
    const {waitForSonarStatus} = getSonarStatus;
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
