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

    const result = await getSonarStatus('https://sonarcloud.io', 'test', 'test', 'main');
    expect(result.projectStatus.status).toBe('OK');
});
