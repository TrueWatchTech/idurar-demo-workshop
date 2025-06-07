import { createRoot } from 'react-dom/client';

import RootApp from './RootApp';

// RUM initialization
import { datafluxRum } from '@cloudcare/browser-rum';
datafluxRum.init({
    applicationId: 'idurar',
    site: 'https://id1-rum-openway.truewatch.com',
    clientToken: '6668ea09d4fa40exxxxxxx',
    env: 'dev',
    version: '1.0.0',
    service: 'browser',
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    compressIntakeRequests: true,
    trackInteractions: true,
    traceType: 'ddtrace', // Not required, default to ddtrace. Currently, it supports 6 types: ddtrace, zipkin, skywalking_v3, jaeger, zipkin_single_header and w3c_traceparent.
    allowedTracingOrigins: [/http:\/\/.*\.elb\..*\.amazonaws\.com/],  // Not required; allow all requests to be injected into the header required by the trace collector. It can be the origin of the request or it can be regular.
});
datafluxRum.startSessionReplayRecording()

const root = createRoot(document.getElementById('root'));
root.render(<RootApp />);
