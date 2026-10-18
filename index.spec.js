import {describe, it, expect, beforeAll, afterAll} from '@jest/globals';
import * as compose from 'docker-compose';
import path from 'path';
import {randomUUID} from 'crypto';
import cp from 'child_process';
import pWaitFor, {TimeoutError} from 'p-wait-for';
import pTimeout from 'p-timeout';

const __dirname = import.meta.dirname;

const cwd = __dirname;
const MINUTE = 60 * 1000;

// Jest buffers console output until a test file finishes, so write progress directly to see it live in CI.
function progress(message) {
    process.stdout.write(`[integration] ${new Date().toISOString()} ${message}\n`);
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {...options, signal: AbortSignal.timeout(10000)});
    return response.json();
}

// Polls check() until it reports done. Errors (e.g. connection refused while SonarQube starts) count as not ready.
async function waitFor(description, timeoutMs, check) {
    let attempt = 0;
    let lastState;
    await pWaitFor(async () => {
        try {
            const {done, state} = await check();
            lastState = state;
            if (done) return true;
        } catch (e) {
            lastState = e.message;
        }
        if (attempt++ % 15 === 0) progress(`${description}: waiting (${lastState})`);
        return false;
    }, {interval: 2000, timeout: timeoutMs}).catch(e => {
        throw e instanceof TimeoutError ? new Error(`Timed out waiting for ${description} (last state: ${lastState})`) : e;
    });
    progress(`${description}: ready`);
}

function dumpContainerLogs() {
    try {
        progress('container logs:\n' + cp.execSync('docker compose ps -a && docker compose logs --tail 150', {cwd}).toString());
    } catch (e) {
        progress(`could not read container logs: ${e.message}`);
    }
}

describe('sonar-check-status-action', () => {
    const adminAuth = {'Authorization': 'Basic YWRtaW46YWRtaW4='};
    let authToken;

    beforeAll(async () => {
        try {
            progress('starting sonar');
            await pTimeout(compose.upOne('sonar', {cwd, log: true}), {milliseconds: 5 * MINUTE, message: 'Timed out: docker compose up sonar'});
            await waitFor('SonarQube health', 10 * MINUTE, async () => {
                const {health} = await fetchJson('http://localhost:9000/api/system/health', {headers: adminAuth});
                return {done: health === 'GREEN', state: `health=${health}`};
            });

            const body = await fetchJson(`http://localhost:9000/api/user_tokens/generate?name=${randomUUID()}`, {
                method: 'POST',
                headers: adminAuth
            });
            authToken = body.token;
            if (!authToken) throw new Error(`Could not generate token: ${JSON.stringify(body)}`);

            progress('starting sonar-scan');
            await pTimeout(compose.upOne('sonar-scan', {cwd, log: true, env: {...process.env, SONAR_TOKEN: authToken}}), {milliseconds: 5 * MINUTE, message: 'Timed out: docker compose up sonar-scan'});
            await waitFor('project analysis', 15 * MINUTE, async () => {
                const r = await fetchJson('http://localhost:9000/api/qualitygates/project_status?projectKey=sonarcloud-actions_sonarcloud-check-status-action', {
                    headers: {'Authorization': `Basic ${Buffer.from(authToken + ":").toString('base64')}`}
                });
                const status = r.projectStatus ? r.projectStatus.status : JSON.stringify(r).slice(0, 200);
                return {done: status === 'OK', state: `status=${status}`};
            });
        } catch (e) {
            dumpContainerLogs();
            throw e;
        }
    }, 40 * MINUTE);

    afterAll(async () => {
        await pTimeout(compose.down({cwd, log: true}), {milliseconds: 2 * MINUTE, message: 'Timed out: docker compose down'});
    }, 3 * MINUTE);

    it('should check status', () => {
        process.env.SONAR_TOKEN = authToken;
        process.env.GITHUB_REPOSITORY = "sonarcloud-actions/sonarcloud-check-status-action"
        process.env.INPUT_URL='http://localhost:9000';

        process.env.INPUT_BRANCH = 'main';

        const ip = path.join(__dirname, 'index.js');
        const result = cp.execSync(`node ${ip}`, {env: process.env, timeout: 6 * MINUTE}).toString();

        console.log(result);
        expect(result).toContain('status=OK');
    }, 7 * MINUTE);
});
