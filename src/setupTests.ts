import '@testing-library/jest-dom';

const globalForSetup = globalThis as typeof globalThis & {
  __uptimerobotJestConsoleSuppressInstalled?: boolean;
};

function shouldSuppressConsoleError(args: unknown[]): boolean {
  const first = args[0];
  if (typeof first === 'string') {
    return (
      first.includes('Could not parse CSS stylesheet') ||
      first.includes('findDOMNode is deprecated')
    );
  }
  if (first instanceof Error) {
    return (
      first.message === 'Could not parse CSS stylesheet' ||
      first.message.includes('findDOMNode is deprecated')
    );
  }
  return false;
}

function shouldSuppressConsoleWarn(args: unknown[]): boolean {
  const first = args[0];
  if (typeof first === 'string') {
    return first.includes('React Router Future Flag Warning');
  }
  return false;
}

/** setupFilesAfterEnv runs once per test file; patch only the first time in this worker. */
if (!globalForSetup.__uptimerobotJestConsoleSuppressInstalled) {
  globalForSetup.__uptimerobotJestConsoleSuppressInstalled = true;

  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);

  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (shouldSuppressConsoleError(args)) {
      return;
    }
    origError(...(args as Parameters<typeof console.error>));
  });

  jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    if (shouldSuppressConsoleWarn(args)) {
      return;
    }
    origWarn(...(args as Parameters<typeof console.warn>));
  });
}
