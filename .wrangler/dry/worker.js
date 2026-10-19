var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env3) {
    return 1;
  }
  hasColors(count3, env3) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// cloudflare/.build/worker.js
import nodeCrypto from "crypto";
import crypto2 from "node:crypto";
import crypto3 from "node:crypto";
var __create = Object.create;
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require2 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: /* @__PURE__ */ __name((a, b) => (typeof __require !== "undefined" ? __require : a)[b], "get")
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = /* @__PURE__ */ __name((fn, res, err) => /* @__PURE__ */ __name(function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
}, "__init"), "__esm");
var __commonJS = /* @__PURE__ */ __name((cb, mod) => /* @__PURE__ */ __name(function __require22() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
}, "__require2"), "__commonJS");
var __export = /* @__PURE__ */ __name((target, all) => {
  for (var name in all)
    __defProp2(target, name, { get: all[name], enumerable: true });
}, "__export");
var __copyProps = /* @__PURE__ */ __name((to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp2(to, key, { get: /* @__PURE__ */ __name(() => from[key], "get"), enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
}, "__copyProps");
var __toESM = /* @__PURE__ */ __name((mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
  mod
)), "__toESM");
var require_safe_buffer = __commonJS({
  "node_modules/safe-buffer/index.js"(exports, module) {
    var buffer = __require2("buffer");
    var Buffer2 = buffer.Buffer;
    function copyProps(src, dst) {
      for (var key in src) {
        dst[key] = src[key];
      }
    }
    __name(copyProps, "copyProps");
    if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
      module.exports = buffer;
    } else {
      copyProps(buffer, exports);
      exports.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer2(arg, encodingOrOffset, length);
    }
    __name(SafeBuffer, "SafeBuffer");
    SafeBuffer.prototype = Object.create(Buffer2.prototype);
    copyProps(Buffer2, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        throw new TypeError("Argument must not be a number");
      }
      return Buffer2(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      var buf = Buffer2(size);
      if (fill !== void 0) {
        if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return Buffer2(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return buffer.SlowBuffer(size);
    };
  }
});
var require_data_stream = __commonJS({
  "node_modules/jws/lib/data-stream.js"(exports, module) {
    var Buffer2 = require_safe_buffer().Buffer;
    var Stream2 = __require2("stream");
    var util = __require2("util");
    function DataStream(data) {
      this.buffer = null;
      this.writable = true;
      this.readable = true;
      if (!data) {
        this.buffer = Buffer2.alloc(0);
        return this;
      }
      if (typeof data.pipe === "function") {
        this.buffer = Buffer2.alloc(0);
        data.pipe(this);
        return this;
      }
      if (data.length || typeof data === "object") {
        this.buffer = data;
        this.writable = false;
        process.nextTick(function() {
          this.emit("end", data);
          this.readable = false;
          this.emit("close");
        }.bind(this));
        return this;
      }
      throw new TypeError("Unexpected data type (" + typeof data + ")");
    }
    __name(DataStream, "DataStream");
    util.inherits(DataStream, Stream2);
    DataStream.prototype.write = /* @__PURE__ */ __name(function write(data) {
      this.buffer = Buffer2.concat([this.buffer, Buffer2.from(data)]);
      this.emit("data", data);
    }, "write");
    DataStream.prototype.end = /* @__PURE__ */ __name(function end(data) {
      if (data)
        this.write(data);
      this.emit("end", data);
      this.emit("close");
      this.writable = false;
      this.readable = false;
    }, "end");
    module.exports = DataStream;
  }
});
var require_param_bytes_for_alg = __commonJS({
  "node_modules/ecdsa-sig-formatter/src/param-bytes-for-alg.js"(exports, module) {
    "use strict";
    function getParamSize(keySize) {
      var result = (keySize / 8 | 0) + (keySize % 8 === 0 ? 0 : 1);
      return result;
    }
    __name(getParamSize, "getParamSize");
    var paramBytesForAlg = {
      ES256: getParamSize(256),
      ES384: getParamSize(384),
      ES512: getParamSize(521)
    };
    function getParamBytesForAlg(alg) {
      var paramBytes = paramBytesForAlg[alg];
      if (paramBytes) {
        return paramBytes;
      }
      throw new Error('Unknown algorithm "' + alg + '"');
    }
    __name(getParamBytesForAlg, "getParamBytesForAlg");
    module.exports = getParamBytesForAlg;
  }
});
var require_ecdsa_sig_formatter = __commonJS({
  "node_modules/ecdsa-sig-formatter/src/ecdsa-sig-formatter.js"(exports, module) {
    "use strict";
    var Buffer2 = require_safe_buffer().Buffer;
    var getParamBytesForAlg = require_param_bytes_for_alg();
    var MAX_OCTET = 128;
    var CLASS_UNIVERSAL = 0;
    var PRIMITIVE_BIT = 32;
    var TAG_SEQ = 16;
    var TAG_INT = 2;
    var ENCODED_TAG_SEQ = TAG_SEQ | PRIMITIVE_BIT | CLASS_UNIVERSAL << 6;
    var ENCODED_TAG_INT = TAG_INT | CLASS_UNIVERSAL << 6;
    function base64Url(base64) {
      return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    __name(base64Url, "base64Url");
    function signatureAsBuffer(signature) {
      if (Buffer2.isBuffer(signature)) {
        return signature;
      } else if ("string" === typeof signature) {
        return Buffer2.from(signature, "base64");
      }
      throw new TypeError("ECDSA signature must be a Base64 string or a Buffer");
    }
    __name(signatureAsBuffer, "signatureAsBuffer");
    function derToJose(signature, alg) {
      signature = signatureAsBuffer(signature);
      var paramBytes = getParamBytesForAlg(alg);
      var maxEncodedParamLength = paramBytes + 1;
      var inputLength = signature.length;
      var offset = 0;
      if (signature[offset++] !== ENCODED_TAG_SEQ) {
        throw new Error('Could not find expected "seq"');
      }
      var seqLength = signature[offset++];
      if (seqLength === (MAX_OCTET | 1)) {
        seqLength = signature[offset++];
      }
      if (inputLength - offset < seqLength) {
        throw new Error('"seq" specified length of "' + seqLength + '", only "' + (inputLength - offset) + '" remaining');
      }
      if (signature[offset++] !== ENCODED_TAG_INT) {
        throw new Error('Could not find expected "int" for "r"');
      }
      var rLength = signature[offset++];
      if (inputLength - offset - 2 < rLength) {
        throw new Error('"r" specified length of "' + rLength + '", only "' + (inputLength - offset - 2) + '" available');
      }
      if (maxEncodedParamLength < rLength) {
        throw new Error('"r" specified length of "' + rLength + '", max of "' + maxEncodedParamLength + '" is acceptable');
      }
      var rOffset = offset;
      offset += rLength;
      if (signature[offset++] !== ENCODED_TAG_INT) {
        throw new Error('Could not find expected "int" for "s"');
      }
      var sLength = signature[offset++];
      if (inputLength - offset !== sLength) {
        throw new Error('"s" specified length of "' + sLength + '", expected "' + (inputLength - offset) + '"');
      }
      if (maxEncodedParamLength < sLength) {
        throw new Error('"s" specified length of "' + sLength + '", max of "' + maxEncodedParamLength + '" is acceptable');
      }
      var sOffset = offset;
      offset += sLength;
      if (offset !== inputLength) {
        throw new Error('Expected to consume entire buffer, but "' + (inputLength - offset) + '" bytes remain');
      }
      var rPadding = paramBytes - rLength, sPadding = paramBytes - sLength;
      var dst = Buffer2.allocUnsafe(rPadding + rLength + sPadding + sLength);
      for (offset = 0; offset < rPadding; ++offset) {
        dst[offset] = 0;
      }
      signature.copy(dst, offset, rOffset + Math.max(-rPadding, 0), rOffset + rLength);
      offset = paramBytes;
      for (var o = offset; offset < o + sPadding; ++offset) {
        dst[offset] = 0;
      }
      signature.copy(dst, offset, sOffset + Math.max(-sPadding, 0), sOffset + sLength);
      dst = dst.toString("base64");
      dst = base64Url(dst);
      return dst;
    }
    __name(derToJose, "derToJose");
    function countPadding(buf, start, stop) {
      var padding = 0;
      while (start + padding < stop && buf[start + padding] === 0) {
        ++padding;
      }
      var needsSign = buf[start + padding] >= MAX_OCTET;
      if (needsSign) {
        --padding;
      }
      return padding;
    }
    __name(countPadding, "countPadding");
    function joseToDer(signature, alg) {
      signature = signatureAsBuffer(signature);
      var paramBytes = getParamBytesForAlg(alg);
      var signatureBytes = signature.length;
      if (signatureBytes !== paramBytes * 2) {
        throw new TypeError('"' + alg + '" signatures must be "' + paramBytes * 2 + '" bytes, saw "' + signatureBytes + '"');
      }
      var rPadding = countPadding(signature, 0, paramBytes);
      var sPadding = countPadding(signature, paramBytes, signature.length);
      var rLength = paramBytes - rPadding;
      var sLength = paramBytes - sPadding;
      var rsBytes = 1 + 1 + rLength + 1 + 1 + sLength;
      var shortLength = rsBytes < MAX_OCTET;
      var dst = Buffer2.allocUnsafe((shortLength ? 2 : 3) + rsBytes);
      var offset = 0;
      dst[offset++] = ENCODED_TAG_SEQ;
      if (shortLength) {
        dst[offset++] = rsBytes;
      } else {
        dst[offset++] = MAX_OCTET | 1;
        dst[offset++] = rsBytes & 255;
      }
      dst[offset++] = ENCODED_TAG_INT;
      dst[offset++] = rLength;
      if (rPadding < 0) {
        dst[offset++] = 0;
        offset += signature.copy(dst, offset, 0, paramBytes);
      } else {
        offset += signature.copy(dst, offset, rPadding, paramBytes);
      }
      dst[offset++] = ENCODED_TAG_INT;
      dst[offset++] = sLength;
      if (sPadding < 0) {
        dst[offset++] = 0;
        signature.copy(dst, offset, paramBytes);
      } else {
        signature.copy(dst, offset, paramBytes + sPadding);
      }
      return dst;
    }
    __name(joseToDer, "joseToDer");
    module.exports = {
      derToJose,
      joseToDer
    };
  }
});
var require_buffer_equal_constant_time = __commonJS({
  "node_modules/buffer-equal-constant-time/index.js"(exports, module) {
    "use strict";
    var Buffer2 = __require2("buffer").Buffer;
    var SlowBuffer = __require2("buffer").SlowBuffer;
    module.exports = bufferEq;
    function bufferEq(a, b) {
      if (!Buffer2.isBuffer(a) || !Buffer2.isBuffer(b)) {
        return false;
      }
      if (a.length !== b.length) {
        return false;
      }
      var c = 0;
      for (var i = 0; i < a.length; i++) {
        c |= a[i] ^ b[i];
      }
      return c === 0;
    }
    __name(bufferEq, "bufferEq");
    bufferEq.install = function() {
      Buffer2.prototype.equal = SlowBuffer.prototype.equal = /* @__PURE__ */ __name(function equal(that) {
        return bufferEq(this, that);
      }, "equal");
    };
    var origBufEqual = Buffer2.prototype.equal;
    var origSlowBufEqual = SlowBuffer.prototype.equal;
    bufferEq.restore = function() {
      Buffer2.prototype.equal = origBufEqual;
      SlowBuffer.prototype.equal = origSlowBufEqual;
    };
  }
});
var require_jwa = __commonJS({
  "node_modules/jwa/index.js"(exports, module) {
    var Buffer2 = require_safe_buffer().Buffer;
    var crypto4 = __require2("crypto");
    var formatEcdsa = require_ecdsa_sig_formatter();
    var util = __require2("util");
    var MSG_INVALID_ALGORITHM = '"%s" is not a valid algorithm.\n  Supported algorithms are:\n  "HS256", "HS384", "HS512", "RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512" and "none".';
    var MSG_INVALID_SECRET = "secret must be a string or buffer";
    var MSG_INVALID_VERIFIER_KEY = "key must be a string or a buffer";
    var MSG_INVALID_SIGNER_KEY = "key must be a string, a buffer or an object";
    var supportsKeyObjects = typeof crypto4.createPublicKey === "function";
    if (supportsKeyObjects) {
      MSG_INVALID_VERIFIER_KEY += " or a KeyObject";
      MSG_INVALID_SECRET += "or a KeyObject";
    }
    function checkIsPublicKey(key) {
      if (Buffer2.isBuffer(key)) {
        return;
      }
      if (typeof key === "string") {
        return;
      }
      if (!supportsKeyObjects) {
        throw typeError2(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key !== "object") {
        throw typeError2(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key.type !== "string") {
        throw typeError2(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key.asymmetricKeyType !== "string") {
        throw typeError2(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key.export !== "function") {
        throw typeError2(MSG_INVALID_VERIFIER_KEY);
      }
    }
    __name(checkIsPublicKey, "checkIsPublicKey");
    function checkIsPrivateKey(key) {
      if (Buffer2.isBuffer(key)) {
        return;
      }
      if (typeof key === "string") {
        return;
      }
      if (typeof key === "object") {
        return;
      }
      throw typeError2(MSG_INVALID_SIGNER_KEY);
    }
    __name(checkIsPrivateKey, "checkIsPrivateKey");
    function checkIsSecretKey(key) {
      if (Buffer2.isBuffer(key)) {
        return;
      }
      if (typeof key === "string") {
        return key;
      }
      if (!supportsKeyObjects) {
        throw typeError2(MSG_INVALID_SECRET);
      }
      if (typeof key !== "object") {
        throw typeError2(MSG_INVALID_SECRET);
      }
      if (key.type !== "secret") {
        throw typeError2(MSG_INVALID_SECRET);
      }
      if (typeof key.export !== "function") {
        throw typeError2(MSG_INVALID_SECRET);
      }
    }
    __name(checkIsSecretKey, "checkIsSecretKey");
    function fromBase64(base64) {
      return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    __name(fromBase64, "fromBase64");
    function toBase64(base64url) {
      base64url = base64url.toString();
      var padding = 4 - base64url.length % 4;
      if (padding !== 4) {
        for (var i = 0; i < padding; ++i) {
          base64url += "=";
        }
      }
      return base64url.replace(/\-/g, "+").replace(/_/g, "/");
    }
    __name(toBase64, "toBase64");
    function typeError2(template) {
      var args = [].slice.call(arguments, 1);
      var errMsg = util.format.bind(util, template).apply(null, args);
      return new TypeError(errMsg);
    }
    __name(typeError2, "typeError2");
    function bufferOrString(obj) {
      return Buffer2.isBuffer(obj) || typeof obj === "string";
    }
    __name(bufferOrString, "bufferOrString");
    function normalizeInput(thing) {
      if (!bufferOrString(thing))
        thing = JSON.stringify(thing);
      return thing;
    }
    __name(normalizeInput, "normalizeInput");
    function createHmacSigner(bits) {
      return /* @__PURE__ */ __name(function sign(thing, secret) {
        checkIsSecretKey(secret);
        thing = normalizeInput(thing);
        var hmac = crypto4.createHmac("sha" + bits, secret);
        var sig = (hmac.update(thing), hmac.digest("base64"));
        return fromBase64(sig);
      }, "sign");
    }
    __name(createHmacSigner, "createHmacSigner");
    var bufferEqual;
    var timingSafeEqual = "timingSafeEqual" in crypto4 ? /* @__PURE__ */ __name(function timingSafeEqual2(a, b) {
      if (a.byteLength !== b.byteLength) {
        return false;
      }
      return crypto4.timingSafeEqual(a, b);
    }, "timingSafeEqual2") : /* @__PURE__ */ __name(function timingSafeEqual2(a, b) {
      if (!bufferEqual) {
        bufferEqual = require_buffer_equal_constant_time();
      }
      return bufferEqual(a, b);
    }, "timingSafeEqual2");
    function createHmacVerifier(bits) {
      return /* @__PURE__ */ __name(function verify(thing, signature, secret) {
        var computedSig = createHmacSigner(bits)(thing, secret);
        return timingSafeEqual(Buffer2.from(signature), Buffer2.from(computedSig));
      }, "verify");
    }
    __name(createHmacVerifier, "createHmacVerifier");
    function createKeySigner(bits) {
      return /* @__PURE__ */ __name(function sign(thing, privateKey) {
        checkIsPrivateKey(privateKey);
        thing = normalizeInput(thing);
        var signer = crypto4.createSign("RSA-SHA" + bits);
        var sig = (signer.update(thing), signer.sign(privateKey, "base64"));
        return fromBase64(sig);
      }, "sign");
    }
    __name(createKeySigner, "createKeySigner");
    function createKeyVerifier(bits) {
      return /* @__PURE__ */ __name(function verify(thing, signature, publicKey) {
        checkIsPublicKey(publicKey);
        thing = normalizeInput(thing);
        signature = toBase64(signature);
        var verifier = crypto4.createVerify("RSA-SHA" + bits);
        verifier.update(thing);
        return verifier.verify(publicKey, signature, "base64");
      }, "verify");
    }
    __name(createKeyVerifier, "createKeyVerifier");
    function createPSSKeySigner(bits) {
      return /* @__PURE__ */ __name(function sign(thing, privateKey) {
        checkIsPrivateKey(privateKey);
        thing = normalizeInput(thing);
        var signer = crypto4.createSign("RSA-SHA" + bits);
        var sig = (signer.update(thing), signer.sign({
          key: privateKey,
          padding: crypto4.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto4.constants.RSA_PSS_SALTLEN_DIGEST
        }, "base64"));
        return fromBase64(sig);
      }, "sign");
    }
    __name(createPSSKeySigner, "createPSSKeySigner");
    function createPSSKeyVerifier(bits) {
      return /* @__PURE__ */ __name(function verify(thing, signature, publicKey) {
        checkIsPublicKey(publicKey);
        thing = normalizeInput(thing);
        signature = toBase64(signature);
        var verifier = crypto4.createVerify("RSA-SHA" + bits);
        verifier.update(thing);
        return verifier.verify({
          key: publicKey,
          padding: crypto4.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto4.constants.RSA_PSS_SALTLEN_DIGEST
        }, signature, "base64");
      }, "verify");
    }
    __name(createPSSKeyVerifier, "createPSSKeyVerifier");
    function createECDSASigner(bits) {
      var inner = createKeySigner(bits);
      return /* @__PURE__ */ __name(function sign() {
        var signature = inner.apply(null, arguments);
        signature = formatEcdsa.derToJose(signature, "ES" + bits);
        return signature;
      }, "sign");
    }
    __name(createECDSASigner, "createECDSASigner");
    function createECDSAVerifer(bits) {
      var inner = createKeyVerifier(bits);
      return /* @__PURE__ */ __name(function verify(thing, signature, publicKey) {
        signature = formatEcdsa.joseToDer(signature, "ES" + bits).toString("base64");
        var result = inner(thing, signature, publicKey);
        return result;
      }, "verify");
    }
    __name(createECDSAVerifer, "createECDSAVerifer");
    function createNoneSigner() {
      return /* @__PURE__ */ __name(function sign() {
        return "";
      }, "sign");
    }
    __name(createNoneSigner, "createNoneSigner");
    function createNoneVerifier() {
      return /* @__PURE__ */ __name(function verify(thing, signature) {
        return signature === "";
      }, "verify");
    }
    __name(createNoneVerifier, "createNoneVerifier");
    module.exports = /* @__PURE__ */ __name(function jwa(algorithm) {
      var signerFactories = {
        hs: createHmacSigner,
        rs: createKeySigner,
        ps: createPSSKeySigner,
        es: createECDSASigner,
        none: createNoneSigner
      };
      var verifierFactories = {
        hs: createHmacVerifier,
        rs: createKeyVerifier,
        ps: createPSSKeyVerifier,
        es: createECDSAVerifer,
        none: createNoneVerifier
      };
      var match = algorithm.match(/^(RS|PS|ES|HS)(256|384|512)$|^(none)$/);
      if (!match)
        throw typeError2(MSG_INVALID_ALGORITHM, algorithm);
      var algo = (match[1] || match[3]).toLowerCase();
      var bits = match[2];
      return {
        sign: signerFactories[algo](bits),
        verify: verifierFactories[algo](bits)
      };
    }, "jwa");
  }
});
var require_tostring = __commonJS({
  "node_modules/jws/lib/tostring.js"(exports, module) {
    var Buffer2 = __require2("buffer").Buffer;
    module.exports = /* @__PURE__ */ __name(function toString(obj) {
      if (typeof obj === "string")
        return obj;
      if (typeof obj === "number" || Buffer2.isBuffer(obj))
        return obj.toString();
      return JSON.stringify(obj);
    }, "toString");
  }
});
var require_sign_stream = __commonJS({
  "node_modules/jws/lib/sign-stream.js"(exports, module) {
    var Buffer2 = require_safe_buffer().Buffer;
    var DataStream = require_data_stream();
    var jwa = require_jwa();
    var Stream2 = __require2("stream");
    var toString = require_tostring();
    var util = __require2("util");
    function base64url(string2, encoding) {
      return Buffer2.from(string2, encoding).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    __name(base64url, "base64url");
    function jwsSecuredInput(header, payload, encoding) {
      encoding = encoding || "utf8";
      var encodedHeader = base64url(toString(header), "binary");
      var encodedPayload = base64url(toString(payload), encoding);
      return util.format("%s.%s", encodedHeader, encodedPayload);
    }
    __name(jwsSecuredInput, "jwsSecuredInput");
    function jwsSign(opts) {
      var header = opts.header;
      var payload = opts.payload;
      var secretOrKey = opts.secret || opts.privateKey;
      var encoding = opts.encoding;
      var algo = jwa(header.alg);
      var securedInput = jwsSecuredInput(header, payload, encoding);
      var signature = algo.sign(securedInput, secretOrKey);
      return util.format("%s.%s", securedInput, signature);
    }
    __name(jwsSign, "jwsSign");
    function SignStream(opts) {
      var secret = opts.secret;
      secret = secret == null ? opts.privateKey : secret;
      secret = secret == null ? opts.key : secret;
      if (/^hs/i.test(opts.header.alg) === true && secret == null) {
        throw new TypeError("secret must be a string or buffer or a KeyObject");
      }
      var secretStream = new DataStream(secret);
      this.readable = true;
      this.header = opts.header;
      this.encoding = opts.encoding;
      this.secret = this.privateKey = this.key = secretStream;
      this.payload = new DataStream(opts.payload);
      this.secret.once("close", function() {
        if (!this.payload.writable && this.readable)
          this.sign();
      }.bind(this));
      this.payload.once("close", function() {
        if (!this.secret.writable && this.readable)
          this.sign();
      }.bind(this));
    }
    __name(SignStream, "SignStream");
    util.inherits(SignStream, Stream2);
    SignStream.prototype.sign = /* @__PURE__ */ __name(function sign() {
      try {
        var signature = jwsSign({
          header: this.header,
          payload: this.payload.buffer,
          secret: this.secret.buffer,
          encoding: this.encoding
        });
        this.emit("done", signature);
        this.emit("data", signature);
        this.emit("end");
        this.readable = false;
        return signature;
      } catch (e) {
        this.readable = false;
        this.emit("error", e);
        this.emit("close");
      }
    }, "sign");
    SignStream.sign = jwsSign;
    module.exports = SignStream;
  }
});
var require_verify_stream = __commonJS({
  "node_modules/jws/lib/verify-stream.js"(exports, module) {
    var Buffer2 = require_safe_buffer().Buffer;
    var DataStream = require_data_stream();
    var jwa = require_jwa();
    var Stream2 = __require2("stream");
    var toString = require_tostring();
    var util = __require2("util");
    var JWS_REGEX = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;
    function isObject(thing) {
      return Object.prototype.toString.call(thing) === "[object Object]";
    }
    __name(isObject, "isObject");
    function safeJsonParse(thing) {
      if (isObject(thing))
        return thing;
      try {
        return JSON.parse(thing);
      } catch (e) {
        return void 0;
      }
    }
    __name(safeJsonParse, "safeJsonParse");
    function headerFromJWS(jwsSig) {
      var encodedHeader = jwsSig.split(".", 1)[0];
      return safeJsonParse(Buffer2.from(encodedHeader, "base64").toString("binary"));
    }
    __name(headerFromJWS, "headerFromJWS");
    function securedInputFromJWS(jwsSig) {
      return jwsSig.split(".", 2).join(".");
    }
    __name(securedInputFromJWS, "securedInputFromJWS");
    function signatureFromJWS(jwsSig) {
      return jwsSig.split(".")[2];
    }
    __name(signatureFromJWS, "signatureFromJWS");
    function payloadFromJWS(jwsSig, encoding) {
      encoding = encoding || "utf8";
      var payload = jwsSig.split(".")[1];
      return Buffer2.from(payload, "base64").toString(encoding);
    }
    __name(payloadFromJWS, "payloadFromJWS");
    function isValidJws(string2) {
      return JWS_REGEX.test(string2) && !!headerFromJWS(string2);
    }
    __name(isValidJws, "isValidJws");
    function jwsVerify(jwsSig, algorithm, secretOrKey) {
      if (!algorithm) {
        var err = new Error("Missing algorithm parameter for jws.verify");
        err.code = "MISSING_ALGORITHM";
        throw err;
      }
      jwsSig = toString(jwsSig);
      var signature = signatureFromJWS(jwsSig);
      var securedInput = securedInputFromJWS(jwsSig);
      var algo = jwa(algorithm);
      return algo.verify(securedInput, signature, secretOrKey);
    }
    __name(jwsVerify, "jwsVerify");
    function jwsDecode(jwsSig, opts) {
      opts = opts || {};
      jwsSig = toString(jwsSig);
      if (!isValidJws(jwsSig))
        return null;
      var header = headerFromJWS(jwsSig);
      if (!header)
        return null;
      var payload = payloadFromJWS(jwsSig);
      if (header.typ === "JWT" || opts.json)
        payload = JSON.parse(payload, opts.encoding);
      return {
        header,
        payload,
        signature: signatureFromJWS(jwsSig)
      };
    }
    __name(jwsDecode, "jwsDecode");
    function VerifyStream(opts) {
      opts = opts || {};
      var secretOrKey = opts.secret;
      secretOrKey = secretOrKey == null ? opts.publicKey : secretOrKey;
      secretOrKey = secretOrKey == null ? opts.key : secretOrKey;
      if (/^hs/i.test(opts.algorithm) === true && secretOrKey == null) {
        throw new TypeError("secret must be a string or buffer or a KeyObject");
      }
      var secretStream = new DataStream(secretOrKey);
      this.readable = true;
      this.algorithm = opts.algorithm;
      this.encoding = opts.encoding;
      this.secret = this.publicKey = this.key = secretStream;
      this.signature = new DataStream(opts.signature);
      this.secret.once("close", function() {
        if (!this.signature.writable && this.readable)
          this.verify();
      }.bind(this));
      this.signature.once("close", function() {
        if (!this.secret.writable && this.readable)
          this.verify();
      }.bind(this));
    }
    __name(VerifyStream, "VerifyStream");
    util.inherits(VerifyStream, Stream2);
    VerifyStream.prototype.verify = /* @__PURE__ */ __name(function verify() {
      try {
        var valid = jwsVerify(this.signature.buffer, this.algorithm, this.key.buffer);
        var obj = jwsDecode(this.signature.buffer, this.encoding);
        this.emit("done", valid, obj);
        this.emit("data", valid);
        this.emit("end");
        this.readable = false;
        return valid;
      } catch (e) {
        this.readable = false;
        this.emit("error", e);
        this.emit("close");
      }
    }, "verify");
    VerifyStream.decode = jwsDecode;
    VerifyStream.isValid = isValidJws;
    VerifyStream.verify = jwsVerify;
    module.exports = VerifyStream;
  }
});
var require_jws = __commonJS({
  "node_modules/jws/index.js"(exports) {
    var SignStream = require_sign_stream();
    var VerifyStream = require_verify_stream();
    var ALGORITHMS = [
      "HS256",
      "HS384",
      "HS512",
      "RS256",
      "RS384",
      "RS512",
      "PS256",
      "PS384",
      "PS512",
      "ES256",
      "ES384",
      "ES512"
    ];
    exports.ALGORITHMS = ALGORITHMS;
    exports.sign = SignStream.sign;
    exports.verify = VerifyStream.verify;
    exports.decode = VerifyStream.decode;
    exports.isValid = VerifyStream.isValid;
    exports.createSign = /* @__PURE__ */ __name(function createSign(opts) {
      return new SignStream(opts);
    }, "createSign");
    exports.createVerify = /* @__PURE__ */ __name(function createVerify(opts) {
      return new VerifyStream(opts);
    }, "createVerify");
  }
});
var require_decode = __commonJS({
  "node_modules/jsonwebtoken/decode.js"(exports, module) {
    var jws = require_jws();
    module.exports = function(jwt7, options) {
      options = options || {};
      var decoded = jws.decode(jwt7, options);
      if (!decoded) {
        return null;
      }
      var payload = decoded.payload;
      if (typeof payload === "string") {
        try {
          var obj = JSON.parse(payload);
          if (obj !== null && typeof obj === "object") {
            payload = obj;
          }
        } catch (e) {
        }
      }
      if (options.complete === true) {
        return {
          header: decoded.header,
          payload,
          signature: decoded.signature
        };
      }
      return payload;
    };
  }
});
var require_JsonWebTokenError = __commonJS({
  "node_modules/jsonwebtoken/lib/JsonWebTokenError.js"(exports, module) {
    var JsonWebTokenError = /* @__PURE__ */ __name(function(message, error3) {
      Error.call(this, message);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
      this.name = "JsonWebTokenError";
      this.message = message;
      if (error3) this.inner = error3;
    }, "JsonWebTokenError");
    JsonWebTokenError.prototype = Object.create(Error.prototype);
    JsonWebTokenError.prototype.constructor = JsonWebTokenError;
    module.exports = JsonWebTokenError;
  }
});
var require_NotBeforeError = __commonJS({
  "node_modules/jsonwebtoken/lib/NotBeforeError.js"(exports, module) {
    var JsonWebTokenError = require_JsonWebTokenError();
    var NotBeforeError = /* @__PURE__ */ __name(function(message, date) {
      JsonWebTokenError.call(this, message);
      this.name = "NotBeforeError";
      this.date = date;
    }, "NotBeforeError");
    NotBeforeError.prototype = Object.create(JsonWebTokenError.prototype);
    NotBeforeError.prototype.constructor = NotBeforeError;
    module.exports = NotBeforeError;
  }
});
var require_TokenExpiredError = __commonJS({
  "node_modules/jsonwebtoken/lib/TokenExpiredError.js"(exports, module) {
    var JsonWebTokenError = require_JsonWebTokenError();
    var TokenExpiredError = /* @__PURE__ */ __name(function(message, expiredAt) {
      JsonWebTokenError.call(this, message);
      this.name = "TokenExpiredError";
      this.expiredAt = expiredAt;
    }, "TokenExpiredError");
    TokenExpiredError.prototype = Object.create(JsonWebTokenError.prototype);
    TokenExpiredError.prototype.constructor = TokenExpiredError;
    module.exports = TokenExpiredError;
  }
});
var require_ms = __commonJS({
  "node_modules/ms/index.js"(exports, module) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    __name(parse, "parse");
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    __name(fmtShort, "fmtShort");
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    __name(fmtLong, "fmtLong");
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
    __name(plural, "plural");
  }
});
var require_timespan = __commonJS({
  "node_modules/jsonwebtoken/lib/timespan.js"(exports, module) {
    var ms = require_ms();
    module.exports = function(time3, iat) {
      var timestamp = iat || Math.floor(Date.now() / 1e3);
      if (typeof time3 === "string") {
        var milliseconds = ms(time3);
        if (typeof milliseconds === "undefined") {
          return;
        }
        return Math.floor(timestamp + milliseconds / 1e3);
      } else if (typeof time3 === "number") {
        return timestamp + time3;
      } else {
        return;
      }
    };
  }
});
var require_constants = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/internal/constants.js"(exports, module) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});
var require_debug = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/internal/debug.js"(exports, module) {
    "use strict";
    var debug3 = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module.exports = debug3;
  }
});
var require_re = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/internal/re.js"(exports, module) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug3 = require_debug();
    exports = module.exports = {};
    var re = exports.re = [];
    var safeRe = exports.safeRe = [];
    var src = exports.src = [];
    var safeSrc = exports.safeSrc = [];
    var t = exports.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = /* @__PURE__ */ __name((value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    }, "makeSafeRegex");
    var createToken = /* @__PURE__ */ __name((name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug3(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    }, "createToken");
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});
var require_parse_options = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/internal/parse-options.js"(exports, module) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = /* @__PURE__ */ __name((options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    }, "parseOptions");
    module.exports = parseOptions;
  }
});
var require_identifiers = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/internal/identifiers.js"(exports, module) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = /* @__PURE__ */ __name((a, b) => {
      if (typeof a === "number" && typeof b === "number") {
        return a === b ? 0 : a < b ? -1 : 1;
      }
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    }, "compareIdentifiers");
    var rcompareIdentifiers = /* @__PURE__ */ __name((a, b) => compareIdentifiers(b, a), "rcompareIdentifiers");
    module.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});
var require_semver = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/classes/semver.js"(exports, module) {
    "use strict";
    var debug3 = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var isPrereleaseIdentifier = /* @__PURE__ */ __name((prerelease, identifier) => {
      const identifiers = identifier.split(".");
      if (identifiers.length > prerelease.length) {
        return false;
      }
      for (let i = 0; i < identifiers.length; i++) {
        if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) {
          return false;
        }
      }
      return true;
    }, "isPrereleaseIdentifier");
    var SemVer = class _SemVer {
      static {
        __name(this, "_SemVer");
      }
      constructor(version22, options) {
        options = parseOptions(options);
        if (version22 instanceof _SemVer) {
          if (version22.loose === !!options.loose && version22.includePrerelease === !!options.includePrerelease) {
            return version22;
          } else {
            version22 = version22.version;
          }
        } else if (typeof version22 !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version22}".`);
        }
        if (version22.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug3("SemVer", version22, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version22.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version22}`);
        }
        this.raw = version22;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug3("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug3("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug3("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release2, identifier, identifierBase) {
        if (release2.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release2) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (isPrereleaseIdentifier(this.prerelease, identifier)) {
                const prereleaseBase = this.prerelease[identifier.split(".").length];
                if (isNaN(prereleaseBase)) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release2}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module.exports = SemVer;
  }
});
var require_parse = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/parse.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var parse = /* @__PURE__ */ __name((version22, options, throwErrors = false) => {
      if (version22 instanceof SemVer) {
        return version22;
      }
      try {
        return new SemVer(version22, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    }, "parse");
    module.exports = parse;
  }
});
var require_valid = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/valid.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var valid = /* @__PURE__ */ __name((version22, options) => {
      const v = parse(version22, options);
      return v ? v.version : null;
    }, "valid");
    module.exports = valid;
  }
});
var require_clean = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/clean.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var clean = /* @__PURE__ */ __name((version22, options) => {
      const s = parse(version22.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    }, "clean");
    module.exports = clean;
  }
});
var require_inc = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/inc.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var inc = /* @__PURE__ */ __name((version22, release2, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version22 instanceof SemVer ? version22.version : version22,
          options
        ).inc(release2, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    }, "inc");
    module.exports = inc;
  }
});
var require_diff = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/diff.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var diff = /* @__PURE__ */ __name((version1, version22) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version22, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    }, "diff");
    module.exports = diff;
  }
});
var require_major = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/major.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var major = /* @__PURE__ */ __name((a, loose) => new SemVer(a, loose).major, "major");
    module.exports = major;
  }
});
var require_minor = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/minor.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var minor = /* @__PURE__ */ __name((a, loose) => new SemVer(a, loose).minor, "minor");
    module.exports = minor;
  }
});
var require_patch = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/patch.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var patch = /* @__PURE__ */ __name((a, loose) => new SemVer(a, loose).patch, "patch");
    module.exports = patch;
  }
});
var require_prerelease = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/prerelease.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var prerelease = /* @__PURE__ */ __name((version22, options) => {
      const parsed = parse(version22, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    }, "prerelease");
    module.exports = prerelease;
  }
});
var require_compare = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/compare.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var compare2 = /* @__PURE__ */ __name((a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose)), "compare2");
    module.exports = compare2;
  }
});
var require_rcompare = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/rcompare.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var rcompare = /* @__PURE__ */ __name((a, b, loose) => compare2(b, a, loose), "rcompare");
    module.exports = rcompare;
  }
});
var require_compare_loose = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/compare-loose.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var compareLoose = /* @__PURE__ */ __name((a, b) => compare2(a, b, true), "compareLoose");
    module.exports = compareLoose;
  }
});
var require_compare_build = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/compare-build.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = /* @__PURE__ */ __name((a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    }, "compareBuild");
    module.exports = compareBuild;
  }
});
var require_sort = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/sort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = /* @__PURE__ */ __name((list, loose) => list.sort((a, b) => compareBuild(a, b, loose)), "sort");
    module.exports = sort;
  }
});
var require_rsort = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/rsort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = /* @__PURE__ */ __name((list, loose) => list.sort((a, b) => compareBuild(b, a, loose)), "rsort");
    module.exports = rsort;
  }
});
var require_gt = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/gt.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var gt = /* @__PURE__ */ __name((a, b, loose) => compare2(a, b, loose) > 0, "gt");
    module.exports = gt;
  }
});
var require_lt = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/lt.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var lt = /* @__PURE__ */ __name((a, b, loose) => compare2(a, b, loose) < 0, "lt");
    module.exports = lt;
  }
});
var require_eq = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/eq.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var eq = /* @__PURE__ */ __name((a, b, loose) => compare2(a, b, loose) === 0, "eq");
    module.exports = eq;
  }
});
var require_neq = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/neq.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var neq = /* @__PURE__ */ __name((a, b, loose) => compare2(a, b, loose) !== 0, "neq");
    module.exports = neq;
  }
});
var require_gte = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/gte.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var gte = /* @__PURE__ */ __name((a, b, loose) => compare2(a, b, loose) >= 0, "gte");
    module.exports = gte;
  }
});
var require_lte = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/lte.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var lte = /* @__PURE__ */ __name((a, b, loose) => compare2(a, b, loose) <= 0, "lte");
    module.exports = lte;
  }
});
var require_cmp = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/cmp.js"(exports, module) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = /* @__PURE__ */ __name((a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    }, "cmp");
    module.exports = cmp;
  }
});
var require_coerce = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/coerce.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var parse = require_parse();
    var { safeRe: re, t } = require_re();
    var coerce = /* @__PURE__ */ __name((version22, options) => {
      if (version22 instanceof SemVer) {
        return version22;
      }
      if (typeof version22 === "number") {
        version22 = String(version22);
      }
      if (typeof version22 !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version22.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version22)) && (!match || match.index + match[0].length !== version22.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    }, "coerce");
    module.exports = coerce;
  }
});
var require_truncate = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/truncate.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var constants = require_constants();
    var SemVer = require_semver();
    var truncate = /* @__PURE__ */ __name((version22, truncation, options) => {
      if (!constants.RELEASE_TYPES.includes(truncation)) {
        return null;
      }
      const clonedVersion = cloneInputVersion(version22, options);
      return clonedVersion && doTruncation(clonedVersion, truncation);
    }, "truncate");
    var cloneInputVersion = /* @__PURE__ */ __name((version22, options) => {
      const versionStringToParse = version22 instanceof SemVer ? version22.version : version22;
      return parse(versionStringToParse, options);
    }, "cloneInputVersion");
    var doTruncation = /* @__PURE__ */ __name((version22, truncation) => {
      if (isPrerelease(truncation)) {
        return version22.version;
      }
      version22.prerelease = [];
      switch (truncation) {
        case "major":
          version22.minor = 0;
          version22.patch = 0;
          break;
        case "minor":
          version22.patch = 0;
          break;
      }
      return version22.format();
    }, "doTruncation");
    var isPrerelease = /* @__PURE__ */ __name((type) => {
      return type.startsWith("pre");
    }, "isPrerelease");
    module.exports = truncate;
  }
});
var require_lrucache = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/internal/lrucache.js"(exports, module) {
    "use strict";
    var LRUCache = class {
      static {
        __name(this, "LRUCache");
      }
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module.exports = LRUCache;
  }
});
var require_range = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/classes/range.js"(exports, module) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      static {
        __name(this, "_Range");
      }
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        range = range.replace(BUILDSTRIPRE, "");
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug3("hyphen replace", range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug3("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug3("tilde trim", range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug3("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug3("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug3("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version22) {
        if (!version22) {
          return false;
        }
        if (typeof version22 === "string") {
          try {
            version22 = new SemVer(version22, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version22, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug3 = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re,
      src,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
    var isNullSet = /* @__PURE__ */ __name((c) => c.value === "<0.0.0-0", "isNullSet");
    var isAny = /* @__PURE__ */ __name((c) => c.value === "", "isAny");
    var isSatisfiable = /* @__PURE__ */ __name((comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    }, "isSatisfiable");
    var parseComparator = /* @__PURE__ */ __name((comp, options) => {
      comp = comp.replace(re[t.BUILD], "");
      debug3("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug3("caret", comp);
      comp = replaceTildes(comp, options);
      debug3("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug3("xrange", comp);
      comp = replaceStars(comp, options);
      debug3("stars", comp);
      return comp;
    }, "parseComparator");
    var isX = /* @__PURE__ */ __name((id) => !id || id.toLowerCase() === "x" || id === "*", "isX");
    var invalidXRangeOrder = /* @__PURE__ */ __name((M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p), "invalidXRangeOrder");
    var replaceTildes = /* @__PURE__ */ __name((comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    }, "replaceTildes");
    var replaceTilde = /* @__PURE__ */ __name((comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug3("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug3("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug3("tilde return", ret);
        return ret;
      });
    }, "replaceTilde");
    var replaceCarets = /* @__PURE__ */ __name((comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    }, "replaceCarets");
    var replaceCaret = /* @__PURE__ */ __name((comp, options) => {
      debug3("caret", comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug3("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug3("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug3("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug3("caret return", ret);
        return ret;
      });
    }, "replaceCaret");
    var replaceXRanges = /* @__PURE__ */ __name((comp, options) => {
      debug3("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    }, "replaceXRanges");
    var replaceXRange = /* @__PURE__ */ __name((comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug3("xRange", comp, ret, gtlt, M, m, p, pr);
        if (invalidXRangeOrder(M, m, p)) {
          return comp;
        }
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug3("xRange return", ret);
        return ret;
      });
    }, "replaceXRange");
    var replaceStars = /* @__PURE__ */ __name((comp, options) => {
      debug3("replaceStars", comp, options);
      return comp.trim().replace(re[t.STAR], "");
    }, "replaceStars");
    var replaceGTE0 = /* @__PURE__ */ __name((comp, options) => {
      debug3("replaceGTE0", comp, options);
      return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    }, "replaceGTE0");
    var hyphenReplace = /* @__PURE__ */ __name((incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    }, "hyphenReplace");
    var testSet = /* @__PURE__ */ __name((set, version22, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version22)) {
          return false;
        }
      }
      if (version22.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug3(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version22.major && allowed.minor === version22.minor && allowed.patch === version22.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    }, "testSet");
  }
});
var require_comparator = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/classes/comparator.js"(exports, module) {
    "use strict";
    var ANY = /* @__PURE__ */ Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static {
        __name(this, "_Comparator");
      }
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug3("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug3("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version22) {
        debug3("Comparator.test", version22, this.options.loose);
        if (this.semver === ANY || version22 === ANY) {
          return true;
        }
        if (typeof version22 === "string") {
          try {
            version22 = new SemVer(version22, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version22, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug3 = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});
var require_satisfies = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/functions/satisfies.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var satisfies = /* @__PURE__ */ __name((version22, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version22);
    }, "satisfies");
    module.exports = satisfies;
  }
});
var require_to_comparators = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/ranges/to-comparators.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var toComparators = /* @__PURE__ */ __name((range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" ")), "toComparators");
    module.exports = toComparators;
  }
});
var require_max_satisfying = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/ranges/max-satisfying.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = /* @__PURE__ */ __name((versions2, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions2.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    }, "maxSatisfying");
    module.exports = maxSatisfying;
  }
});
var require_min_satisfying = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/ranges/min-satisfying.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = /* @__PURE__ */ __name((versions2, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions2.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    }, "minSatisfying");
    module.exports = minSatisfying;
  }
});
var require_min_version = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/ranges/min-version.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = /* @__PURE__ */ __name((range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    }, "minVersion");
    module.exports = minVersion;
  }
});
var require_valid2 = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/ranges/valid.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var validRange = /* @__PURE__ */ __name((range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    }, "validRange");
    module.exports = validRange;
  }
});
var require_outside = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/ranges/outside.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = /* @__PURE__ */ __name((version22, range, hilo, options) => {
      version22 = new SemVer(version22, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version22, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version22, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version22, low.semver)) {
          return false;
        }
      }
      return true;
    }, "outside");
    module.exports = outside;
  }
});
var require_gtr = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/ranges/gtr.js"(exports, module) {
    "use strict";
    var outside = require_outside();
    var gtr = /* @__PURE__ */ __name((version22, range, options) => outside(version22, range, ">", options), "gtr");
    module.exports = gtr;
  }
});
var require_ltr = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/ranges/ltr.js"(exports, module) {
    "use strict";
    var outside = require_outside();
    var ltr = /* @__PURE__ */ __name((version22, range, options) => outside(version22, range, "<", options), "ltr");
    module.exports = ltr;
  }
});
var require_intersects = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/ranges/intersects.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var intersects = /* @__PURE__ */ __name((r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    }, "intersects");
    module.exports = intersects;
  }
});
var require_simplify = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/ranges/simplify.js"(exports, module) {
    "use strict";
    var satisfies = require_satisfies();
    var compare2 = require_compare();
    module.exports = (versions2, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions2.sort((a, b) => compare2(a, b, options));
      for (const version22 of v) {
        const included = satisfies(version22, range, options);
        if (included) {
          prev = version22;
          if (!first) {
            first = version22;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});
var require_subset = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/ranges/subset.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare2 = require_compare();
    var subset = /* @__PURE__ */ __name((sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    }, "subset");
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = /* @__PURE__ */ __name((sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare2(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !c.test(gt.semver)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !c.test(lt.semver)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    }, "simpleSubset");
    var higherGT = /* @__PURE__ */ __name((a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare2(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    }, "higherGT");
    var lowerLT = /* @__PURE__ */ __name((a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare2(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    }, "lowerLT");
    module.exports = subset;
  }
});
var require_semver2 = __commonJS({
  "node_modules/jsonwebtoken/node_modules/semver/index.js"(exports, module) {
    "use strict";
    var internalRe = require_re();
    var constants = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare2 = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var truncate = require_truncate();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare: compare2,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      truncate,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});
var require_asymmetricKeyDetailsSupported = __commonJS({
  "node_modules/jsonwebtoken/lib/asymmetricKeyDetailsSupported.js"(exports, module) {
    var semver = require_semver2();
    module.exports = semver.satisfies(process.version, ">=15.7.0");
  }
});
var require_rsaPssKeyDetailsSupported = __commonJS({
  "node_modules/jsonwebtoken/lib/rsaPssKeyDetailsSupported.js"(exports, module) {
    var semver = require_semver2();
    module.exports = semver.satisfies(process.version, ">=16.9.0");
  }
});
var require_validateAsymmetricKey = __commonJS({
  "node_modules/jsonwebtoken/lib/validateAsymmetricKey.js"(exports, module) {
    var ASYMMETRIC_KEY_DETAILS_SUPPORTED = require_asymmetricKeyDetailsSupported();
    var RSA_PSS_KEY_DETAILS_SUPPORTED = require_rsaPssKeyDetailsSupported();
    var allowedAlgorithmsForKeys = {
      "ec": ["ES256", "ES384", "ES512"],
      "rsa": ["RS256", "PS256", "RS384", "PS384", "RS512", "PS512"],
      "rsa-pss": ["PS256", "PS384", "PS512"]
    };
    var allowedCurves = {
      ES256: "prime256v1",
      ES384: "secp384r1",
      ES512: "secp521r1"
    };
    module.exports = function(algorithm, key) {
      if (!algorithm || !key) return;
      const keyType = key.asymmetricKeyType;
      if (!keyType) return;
      const allowedAlgorithms = allowedAlgorithmsForKeys[keyType];
      if (!allowedAlgorithms) {
        throw new Error(`Unknown key type "${keyType}".`);
      }
      if (!allowedAlgorithms.includes(algorithm)) {
        throw new Error(`"alg" parameter for "${keyType}" key type must be one of: ${allowedAlgorithms.join(", ")}.`);
      }
      if (ASYMMETRIC_KEY_DETAILS_SUPPORTED) {
        switch (keyType) {
          case "ec":
            const keyCurve = key.asymmetricKeyDetails.namedCurve;
            const allowedCurve = allowedCurves[algorithm];
            if (keyCurve !== allowedCurve) {
              throw new Error(`"alg" parameter "${algorithm}" requires curve "${allowedCurve}".`);
            }
            break;
          case "rsa-pss":
            if (RSA_PSS_KEY_DETAILS_SUPPORTED) {
              const length = parseInt(algorithm.slice(-3), 10);
              const { hashAlgorithm, mgf1HashAlgorithm, saltLength } = key.asymmetricKeyDetails;
              if (hashAlgorithm !== `sha${length}` || mgf1HashAlgorithm !== hashAlgorithm) {
                throw new Error(`Invalid key for this operation, its RSA-PSS parameters do not meet the requirements of "alg" ${algorithm}.`);
              }
              if (saltLength !== void 0 && saltLength > length >> 3) {
                throw new Error(`Invalid key for this operation, its RSA-PSS parameter saltLength does not meet the requirements of "alg" ${algorithm}.`);
              }
            }
            break;
        }
      }
    };
  }
});
var require_psSupported = __commonJS({
  "node_modules/jsonwebtoken/lib/psSupported.js"(exports, module) {
    var semver = require_semver2();
    module.exports = semver.satisfies(process.version, "^6.12.0 || >=8.0.0");
  }
});
var require_verify = __commonJS({
  "node_modules/jsonwebtoken/verify.js"(exports, module) {
    var JsonWebTokenError = require_JsonWebTokenError();
    var NotBeforeError = require_NotBeforeError();
    var TokenExpiredError = require_TokenExpiredError();
    var decode3 = require_decode();
    var timespan = require_timespan();
    var validateAsymmetricKey = require_validateAsymmetricKey();
    var PS_SUPPORTED = require_psSupported();
    var jws = require_jws();
    var { KeyObject, createSecretKey, createPublicKey } = __require2("crypto");
    var PUB_KEY_ALGS = ["RS256", "RS384", "RS512"];
    var EC_KEY_ALGS = ["ES256", "ES384", "ES512"];
    var RSA_KEY_ALGS = ["RS256", "RS384", "RS512"];
    var HS_ALGS = ["HS256", "HS384", "HS512"];
    if (PS_SUPPORTED) {
      PUB_KEY_ALGS.splice(PUB_KEY_ALGS.length, 0, "PS256", "PS384", "PS512");
      RSA_KEY_ALGS.splice(RSA_KEY_ALGS.length, 0, "PS256", "PS384", "PS512");
    }
    module.exports = function(jwtString, secretOrPublicKey, options, callback) {
      if (typeof options === "function" && !callback) {
        callback = options;
        options = {};
      }
      if (!options) {
        options = {};
      }
      options = Object.assign({}, options);
      let done;
      if (callback) {
        done = callback;
      } else {
        done = /* @__PURE__ */ __name(function(err, data) {
          if (err) throw err;
          return data;
        }, "done");
      }
      if (options.clockTimestamp && typeof options.clockTimestamp !== "number") {
        return done(new JsonWebTokenError("clockTimestamp must be a number"));
      }
      if (options.nonce !== void 0 && (typeof options.nonce !== "string" || options.nonce.trim() === "")) {
        return done(new JsonWebTokenError("nonce must be a non-empty string"));
      }
      if (options.allowInvalidAsymmetricKeyTypes !== void 0 && typeof options.allowInvalidAsymmetricKeyTypes !== "boolean") {
        return done(new JsonWebTokenError("allowInvalidAsymmetricKeyTypes must be a boolean"));
      }
      const clockTimestamp = options.clockTimestamp || Math.floor(Date.now() / 1e3);
      if (!jwtString) {
        return done(new JsonWebTokenError("jwt must be provided"));
      }
      if (typeof jwtString !== "string") {
        return done(new JsonWebTokenError("jwt must be a string"));
      }
      const parts = jwtString.split(".");
      if (parts.length !== 3) {
        return done(new JsonWebTokenError("jwt malformed"));
      }
      let decodedToken;
      try {
        decodedToken = decode3(jwtString, { complete: true });
      } catch (err) {
        return done(err);
      }
      if (!decodedToken) {
        return done(new JsonWebTokenError("invalid token"));
      }
      const header = decodedToken.header;
      let getSecret2;
      if (typeof secretOrPublicKey === "function") {
        if (!callback) {
          return done(new JsonWebTokenError("verify must be called asynchronous if secret or public key is provided as a callback"));
        }
        getSecret2 = secretOrPublicKey;
      } else {
        getSecret2 = /* @__PURE__ */ __name(function(header2, secretCallback) {
          return secretCallback(null, secretOrPublicKey);
        }, "getSecret2");
      }
      return getSecret2(header, function(err, secretOrPublicKey2) {
        if (err) {
          return done(new JsonWebTokenError("error in secret or public key callback: " + err.message));
        }
        const hasSignature = parts[2].trim() !== "";
        if (!hasSignature && secretOrPublicKey2) {
          return done(new JsonWebTokenError("jwt signature is required"));
        }
        if (hasSignature && !secretOrPublicKey2) {
          return done(new JsonWebTokenError("secret or public key must be provided"));
        }
        if (!hasSignature && !options.algorithms) {
          return done(new JsonWebTokenError('please specify "none" in "algorithms" to verify unsigned tokens'));
        }
        if (secretOrPublicKey2 != null && !(secretOrPublicKey2 instanceof KeyObject)) {
          try {
            secretOrPublicKey2 = createPublicKey(secretOrPublicKey2);
          } catch (_) {
            try {
              secretOrPublicKey2 = createSecretKey(typeof secretOrPublicKey2 === "string" ? Buffer.from(secretOrPublicKey2) : secretOrPublicKey2);
            } catch (_2) {
              return done(new JsonWebTokenError("secretOrPublicKey is not valid key material"));
            }
          }
        }
        if (!options.algorithms) {
          if (secretOrPublicKey2.type === "secret") {
            options.algorithms = HS_ALGS;
          } else if (["rsa", "rsa-pss"].includes(secretOrPublicKey2.asymmetricKeyType)) {
            options.algorithms = RSA_KEY_ALGS;
          } else if (secretOrPublicKey2.asymmetricKeyType === "ec") {
            options.algorithms = EC_KEY_ALGS;
          } else {
            options.algorithms = PUB_KEY_ALGS;
          }
        }
        if (options.algorithms.indexOf(decodedToken.header.alg) === -1) {
          return done(new JsonWebTokenError("invalid algorithm"));
        }
        if (header.alg.startsWith("HS") && secretOrPublicKey2.type !== "secret") {
          return done(new JsonWebTokenError(`secretOrPublicKey must be a symmetric key when using ${header.alg}`));
        } else if (/^(?:RS|PS|ES)/.test(header.alg) && secretOrPublicKey2.type !== "public") {
          return done(new JsonWebTokenError(`secretOrPublicKey must be an asymmetric key when using ${header.alg}`));
        }
        if (!options.allowInvalidAsymmetricKeyTypes) {
          try {
            validateAsymmetricKey(header.alg, secretOrPublicKey2);
          } catch (e) {
            return done(e);
          }
        }
        let valid;
        try {
          valid = jws.verify(jwtString, decodedToken.header.alg, secretOrPublicKey2);
        } catch (e) {
          return done(e);
        }
        if (!valid) {
          return done(new JsonWebTokenError("invalid signature"));
        }
        const payload = decodedToken.payload;
        if (typeof payload.nbf !== "undefined" && !options.ignoreNotBefore) {
          if (typeof payload.nbf !== "number") {
            return done(new JsonWebTokenError("invalid nbf value"));
          }
          if (payload.nbf > clockTimestamp + (options.clockTolerance || 0)) {
            return done(new NotBeforeError("jwt not active", new Date(payload.nbf * 1e3)));
          }
        }
        if (typeof payload.exp !== "undefined" && !options.ignoreExpiration) {
          if (typeof payload.exp !== "number") {
            return done(new JsonWebTokenError("invalid exp value"));
          }
          if (clockTimestamp >= payload.exp + (options.clockTolerance || 0)) {
            return done(new TokenExpiredError("jwt expired", new Date(payload.exp * 1e3)));
          }
        }
        if (options.audience) {
          const audiences = Array.isArray(options.audience) ? options.audience : [options.audience];
          const target = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
          const match = target.some(function(targetAudience) {
            return audiences.some(function(audience) {
              return audience instanceof RegExp ? audience.test(targetAudience) : audience === targetAudience;
            });
          });
          if (!match) {
            return done(new JsonWebTokenError("jwt audience invalid. expected: " + audiences.join(" or ")));
          }
        }
        if (options.issuer) {
          const invalid_issuer = typeof options.issuer === "string" && payload.iss !== options.issuer || Array.isArray(options.issuer) && options.issuer.indexOf(payload.iss) === -1;
          if (invalid_issuer) {
            return done(new JsonWebTokenError("jwt issuer invalid. expected: " + options.issuer));
          }
        }
        if (options.subject) {
          if (payload.sub !== options.subject) {
            return done(new JsonWebTokenError("jwt subject invalid. expected: " + options.subject));
          }
        }
        if (options.jwtid) {
          if (payload.jti !== options.jwtid) {
            return done(new JsonWebTokenError("jwt jwtid invalid. expected: " + options.jwtid));
          }
        }
        if (options.nonce) {
          if (payload.nonce !== options.nonce) {
            return done(new JsonWebTokenError("jwt nonce invalid. expected: " + options.nonce));
          }
        }
        if (options.maxAge) {
          if (typeof payload.iat !== "number") {
            return done(new JsonWebTokenError("iat required when maxAge is specified"));
          }
          const maxAgeTimestamp = timespan(options.maxAge, payload.iat);
          if (typeof maxAgeTimestamp === "undefined") {
            return done(new JsonWebTokenError('"maxAge" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
          }
          if (clockTimestamp >= maxAgeTimestamp + (options.clockTolerance || 0)) {
            return done(new TokenExpiredError("maxAge exceeded", new Date(maxAgeTimestamp * 1e3)));
          }
        }
        if (options.complete === true) {
          const signature = decodedToken.signature;
          return done(null, {
            header,
            payload,
            signature
          });
        }
        return done(null, payload);
      });
    };
  }
});
var require_lodash = __commonJS({
  "node_modules/lodash.includes/index.js"(exports, module) {
    var INFINITY = 1 / 0;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var MAX_INTEGER = 17976931348623157e292;
    var NAN = 0 / 0;
    var argsTag = "[object Arguments]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var stringTag = "[object String]";
    var symbolTag = "[object Symbol]";
    var reTrim = /^\s+|\s+$/g;
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
    var reIsBinary = /^0b[01]+$/i;
    var reIsOctal = /^0o[0-7]+$/i;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var freeParseInt = parseInt;
    function arrayMap(array2, iteratee) {
      var index = -1, length = array2 ? array2.length : 0, result = Array(length);
      while (++index < length) {
        result[index] = iteratee(array2[index], index, array2);
      }
      return result;
    }
    __name(arrayMap, "arrayMap");
    function baseFindIndex(array2, predicate, fromIndex, fromRight) {
      var length = array2.length, index = fromIndex + (fromRight ? 1 : -1);
      while (fromRight ? index-- : ++index < length) {
        if (predicate(array2[index], index, array2)) {
          return index;
        }
      }
      return -1;
    }
    __name(baseFindIndex, "baseFindIndex");
    function baseIndexOf(array2, value, fromIndex) {
      if (value !== value) {
        return baseFindIndex(array2, baseIsNaN, fromIndex);
      }
      var index = fromIndex - 1, length = array2.length;
      while (++index < length) {
        if (array2[index] === value) {
          return index;
        }
      }
      return -1;
    }
    __name(baseIndexOf, "baseIndexOf");
    function baseIsNaN(value) {
      return value !== value;
    }
    __name(baseIsNaN, "baseIsNaN");
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    __name(baseTimes, "baseTimes");
    function baseValues(object2, props) {
      return arrayMap(props, function(key) {
        return object2[key];
      });
    }
    __name(baseValues, "baseValues");
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    __name(overArg, "overArg");
    var objectProto = Object.prototype;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var objectToString = objectProto.toString;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var nativeKeys = overArg(Object.keys, Object);
    var nativeMax = Math.max;
    function arrayLikeKeys(value, inherited) {
      var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
      var length = result.length, skipIndexes = !!length;
      for (var key in value) {
        if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    __name(arrayLikeKeys, "arrayLikeKeys");
    function baseKeys(object2) {
      if (!isPrototype(object2)) {
        return nativeKeys(object2);
      }
      var result = [];
      for (var key in Object(object2)) {
        if (hasOwnProperty.call(object2, key) && key != "constructor") {
          result.push(key);
        }
      }
      return result;
    }
    __name(baseKeys, "baseKeys");
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    __name(isIndex, "isIndex");
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    __name(isPrototype, "isPrototype");
    function includes(collection, value, fromIndex, guard) {
      collection = isArrayLike(collection) ? collection : values(collection);
      fromIndex = fromIndex && !guard ? toInteger(fromIndex) : 0;
      var length = collection.length;
      if (fromIndex < 0) {
        fromIndex = nativeMax(length + fromIndex, 0);
      }
      return isString(collection) ? fromIndex <= length && collection.indexOf(value, fromIndex) > -1 : !!length && baseIndexOf(collection, value, fromIndex) > -1;
    }
    __name(includes, "includes");
    function isArguments(value) {
      return isArrayLikeObject(value) && hasOwnProperty.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
    }
    __name(isArguments, "isArguments");
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    __name(isArrayLike, "isArrayLike");
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    __name(isArrayLikeObject, "isArrayLikeObject");
    function isFunction(value) {
      var tag = isObject(value) ? objectToString.call(value) : "";
      return tag == funcTag || tag == genTag;
    }
    __name(isFunction, "isFunction");
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    __name(isLength, "isLength");
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    __name(isObject, "isObject");
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    function isString(value) {
      return typeof value == "string" || !isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag;
    }
    __name(isString, "isString");
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    __name(isSymbol, "isSymbol");
    function toFinite(value) {
      if (!value) {
        return value === 0 ? value : 0;
      }
      value = toNumber(value);
      if (value === INFINITY || value === -INFINITY) {
        var sign = value < 0 ? -1 : 1;
        return sign * MAX_INTEGER;
      }
      return value === value ? value : 0;
    }
    __name(toFinite, "toFinite");
    function toInteger(value) {
      var result = toFinite(value), remainder = result % 1;
      return result === result ? remainder ? result - remainder : result : 0;
    }
    __name(toInteger, "toInteger");
    function toNumber(value) {
      if (typeof value == "number") {
        return value;
      }
      if (isSymbol(value)) {
        return NAN;
      }
      if (isObject(value)) {
        var other = typeof value.valueOf == "function" ? value.valueOf() : value;
        value = isObject(other) ? other + "" : other;
      }
      if (typeof value != "string") {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, "");
      var isBinary = reIsBinary.test(value);
      return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
    }
    __name(toNumber, "toNumber");
    function keys(object2) {
      return isArrayLike(object2) ? arrayLikeKeys(object2) : baseKeys(object2);
    }
    __name(keys, "keys");
    function values(object2) {
      return object2 ? baseValues(object2, keys(object2)) : [];
    }
    __name(values, "values");
    module.exports = includes;
  }
});
var require_lodash2 = __commonJS({
  "node_modules/lodash.isboolean/index.js"(exports, module) {
    var boolTag = "[object Boolean]";
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    function isBoolean(value) {
      return value === true || value === false || isObjectLike(value) && objectToString.call(value) == boolTag;
    }
    __name(isBoolean, "isBoolean");
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    module.exports = isBoolean;
  }
});
var require_lodash3 = __commonJS({
  "node_modules/lodash.isinteger/index.js"(exports, module) {
    var INFINITY = 1 / 0;
    var MAX_INTEGER = 17976931348623157e292;
    var NAN = 0 / 0;
    var symbolTag = "[object Symbol]";
    var reTrim = /^\s+|\s+$/g;
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
    var reIsBinary = /^0b[01]+$/i;
    var reIsOctal = /^0o[0-7]+$/i;
    var freeParseInt = parseInt;
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    function isInteger(value) {
      return typeof value == "number" && value == toInteger(value);
    }
    __name(isInteger, "isInteger");
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    __name(isObject, "isObject");
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    __name(isSymbol, "isSymbol");
    function toFinite(value) {
      if (!value) {
        return value === 0 ? value : 0;
      }
      value = toNumber(value);
      if (value === INFINITY || value === -INFINITY) {
        var sign = value < 0 ? -1 : 1;
        return sign * MAX_INTEGER;
      }
      return value === value ? value : 0;
    }
    __name(toFinite, "toFinite");
    function toInteger(value) {
      var result = toFinite(value), remainder = result % 1;
      return result === result ? remainder ? result - remainder : result : 0;
    }
    __name(toInteger, "toInteger");
    function toNumber(value) {
      if (typeof value == "number") {
        return value;
      }
      if (isSymbol(value)) {
        return NAN;
      }
      if (isObject(value)) {
        var other = typeof value.valueOf == "function" ? value.valueOf() : value;
        value = isObject(other) ? other + "" : other;
      }
      if (typeof value != "string") {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, "");
      var isBinary = reIsBinary.test(value);
      return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
    }
    __name(toNumber, "toNumber");
    module.exports = isInteger;
  }
});
var require_lodash4 = __commonJS({
  "node_modules/lodash.isnumber/index.js"(exports, module) {
    var numberTag = "[object Number]";
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    function isNumber(value) {
      return typeof value == "number" || isObjectLike(value) && objectToString.call(value) == numberTag;
    }
    __name(isNumber, "isNumber");
    module.exports = isNumber;
  }
});
var require_lodash5 = __commonJS({
  "node_modules/lodash.isplainobject/index.js"(exports, module) {
    var objectTag = "[object Object]";
    function isHostObject(value) {
      var result = false;
      if (value != null && typeof value.toString != "function") {
        try {
          result = !!(value + "");
        } catch (e) {
        }
      }
      return result;
    }
    __name(isHostObject, "isHostObject");
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    __name(overArg, "overArg");
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var funcToString = funcProto.toString;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var objectCtorString = funcToString.call(Object);
    var objectToString = objectProto.toString;
    var getPrototype = overArg(Object.getPrototypeOf, Object);
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    function isPlainObject(value) {
      if (!isObjectLike(value) || objectToString.call(value) != objectTag || isHostObject(value)) {
        return false;
      }
      var proto = getPrototype(value);
      if (proto === null) {
        return true;
      }
      var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
      return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
    }
    __name(isPlainObject, "isPlainObject");
    module.exports = isPlainObject;
  }
});
var require_lodash6 = __commonJS({
  "node_modules/lodash.isstring/index.js"(exports, module) {
    var stringTag = "[object String]";
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    var isArray = Array.isArray;
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    function isString(value) {
      return typeof value == "string" || !isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag;
    }
    __name(isString, "isString");
    module.exports = isString;
  }
});
var require_lodash7 = __commonJS({
  "node_modules/lodash.once/index.js"(exports, module) {
    var FUNC_ERROR_TEXT = "Expected a function";
    var INFINITY = 1 / 0;
    var MAX_INTEGER = 17976931348623157e292;
    var NAN = 0 / 0;
    var symbolTag = "[object Symbol]";
    var reTrim = /^\s+|\s+$/g;
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
    var reIsBinary = /^0b[01]+$/i;
    var reIsOctal = /^0o[0-7]+$/i;
    var freeParseInt = parseInt;
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    function before(n, func) {
      var result;
      if (typeof func != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      n = toInteger(n);
      return function() {
        if (--n > 0) {
          result = func.apply(this, arguments);
        }
        if (n <= 1) {
          func = void 0;
        }
        return result;
      };
    }
    __name(before, "before");
    function once2(func) {
      return before(2, func);
    }
    __name(once2, "once");
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    __name(isObject, "isObject");
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    __name(isObjectLike, "isObjectLike");
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    __name(isSymbol, "isSymbol");
    function toFinite(value) {
      if (!value) {
        return value === 0 ? value : 0;
      }
      value = toNumber(value);
      if (value === INFINITY || value === -INFINITY) {
        var sign = value < 0 ? -1 : 1;
        return sign * MAX_INTEGER;
      }
      return value === value ? value : 0;
    }
    __name(toFinite, "toFinite");
    function toInteger(value) {
      var result = toFinite(value), remainder = result % 1;
      return result === result ? remainder ? result - remainder : result : 0;
    }
    __name(toInteger, "toInteger");
    function toNumber(value) {
      if (typeof value == "number") {
        return value;
      }
      if (isSymbol(value)) {
        return NAN;
      }
      if (isObject(value)) {
        var other = typeof value.valueOf == "function" ? value.valueOf() : value;
        value = isObject(other) ? other + "" : other;
      }
      if (typeof value != "string") {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, "");
      var isBinary = reIsBinary.test(value);
      return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
    }
    __name(toNumber, "toNumber");
    module.exports = once2;
  }
});
var require_sign = __commonJS({
  "node_modules/jsonwebtoken/sign.js"(exports, module) {
    var timespan = require_timespan();
    var PS_SUPPORTED = require_psSupported();
    var validateAsymmetricKey = require_validateAsymmetricKey();
    var jws = require_jws();
    var includes = require_lodash();
    var isBoolean = require_lodash2();
    var isInteger = require_lodash3();
    var isNumber = require_lodash4();
    var isPlainObject = require_lodash5();
    var isString = require_lodash6();
    var once2 = require_lodash7();
    var { KeyObject, createSecretKey, createPrivateKey } = __require2("crypto");
    var SUPPORTED_ALGS = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "HS256", "HS384", "HS512", "none"];
    if (PS_SUPPORTED) {
      SUPPORTED_ALGS.splice(3, 0, "PS256", "PS384", "PS512");
    }
    var sign_options_schema = {
      expiresIn: { isValid: /* @__PURE__ */ __name(function(value) {
        return isInteger(value) || isString(value) && value;
      }, "isValid"), message: '"expiresIn" should be a number of seconds or string representing a timespan' },
      notBefore: { isValid: /* @__PURE__ */ __name(function(value) {
        return isInteger(value) || isString(value) && value;
      }, "isValid"), message: '"notBefore" should be a number of seconds or string representing a timespan' },
      audience: { isValid: /* @__PURE__ */ __name(function(value) {
        return isString(value) || Array.isArray(value);
      }, "isValid"), message: '"audience" must be a string or array' },
      algorithm: { isValid: includes.bind(null, SUPPORTED_ALGS), message: '"algorithm" must be a valid string enum value' },
      header: { isValid: isPlainObject, message: '"header" must be an object' },
      encoding: { isValid: isString, message: '"encoding" must be a string' },
      issuer: { isValid: isString, message: '"issuer" must be a string' },
      subject: { isValid: isString, message: '"subject" must be a string' },
      jwtid: { isValid: isString, message: '"jwtid" must be a string' },
      noTimestamp: { isValid: isBoolean, message: '"noTimestamp" must be a boolean' },
      keyid: { isValid: isString, message: '"keyid" must be a string' },
      mutatePayload: { isValid: isBoolean, message: '"mutatePayload" must be a boolean' },
      allowInsecureKeySizes: { isValid: isBoolean, message: '"allowInsecureKeySizes" must be a boolean' },
      allowInvalidAsymmetricKeyTypes: { isValid: isBoolean, message: '"allowInvalidAsymmetricKeyTypes" must be a boolean' }
    };
    var registered_claims_schema = {
      iat: { isValid: isNumber, message: '"iat" should be a number of seconds' },
      exp: { isValid: isNumber, message: '"exp" should be a number of seconds' },
      nbf: { isValid: isNumber, message: '"nbf" should be a number of seconds' }
    };
    function validate(schema, allowUnknown, object2, parameterName) {
      if (!isPlainObject(object2)) {
        throw new Error('Expected "' + parameterName + '" to be a plain object.');
      }
      Object.keys(object2).forEach(function(key) {
        const validator = schema[key];
        if (!validator) {
          if (!allowUnknown) {
            throw new Error('"' + key + '" is not allowed in "' + parameterName + '"');
          }
          return;
        }
        if (!validator.isValid(object2[key])) {
          throw new Error(validator.message);
        }
      });
    }
    __name(validate, "validate");
    function validateOptions(options) {
      return validate(sign_options_schema, false, options, "options");
    }
    __name(validateOptions, "validateOptions");
    function validatePayload(payload) {
      return validate(registered_claims_schema, true, payload, "payload");
    }
    __name(validatePayload, "validatePayload");
    var options_to_payload = {
      "audience": "aud",
      "issuer": "iss",
      "subject": "sub",
      "jwtid": "jti"
    };
    var options_for_objects = [
      "expiresIn",
      "notBefore",
      "noTimestamp",
      "audience",
      "issuer",
      "subject",
      "jwtid"
    ];
    module.exports = function(payload, secretOrPrivateKey, options, callback) {
      if (typeof options === "function") {
        callback = options;
        options = {};
      } else {
        options = options || {};
      }
      const isObjectPayload = typeof payload === "object" && !Buffer.isBuffer(payload);
      const header = Object.assign({
        alg: options.algorithm || "HS256",
        typ: isObjectPayload ? "JWT" : void 0,
        kid: options.keyid
      }, options.header);
      function failure(err) {
        if (callback) {
          return callback(err);
        }
        throw err;
      }
      __name(failure, "failure");
      if (!secretOrPrivateKey && options.algorithm !== "none") {
        return failure(new Error("secretOrPrivateKey must have a value"));
      }
      if (secretOrPrivateKey != null && !(secretOrPrivateKey instanceof KeyObject)) {
        try {
          secretOrPrivateKey = createPrivateKey(secretOrPrivateKey);
        } catch (_) {
          try {
            secretOrPrivateKey = createSecretKey(typeof secretOrPrivateKey === "string" ? Buffer.from(secretOrPrivateKey) : secretOrPrivateKey);
          } catch (_2) {
            return failure(new Error("secretOrPrivateKey is not valid key material"));
          }
        }
      }
      if (header.alg.startsWith("HS") && secretOrPrivateKey.type !== "secret") {
        return failure(new Error(`secretOrPrivateKey must be a symmetric key when using ${header.alg}`));
      } else if (/^(?:RS|PS|ES)/.test(header.alg)) {
        if (secretOrPrivateKey.type !== "private") {
          return failure(new Error(`secretOrPrivateKey must be an asymmetric key when using ${header.alg}`));
        }
        if (!options.allowInsecureKeySizes && !header.alg.startsWith("ES") && secretOrPrivateKey.asymmetricKeyDetails !== void 0 && //KeyObject.asymmetricKeyDetails is supported in Node 15+
        secretOrPrivateKey.asymmetricKeyDetails.modulusLength < 2048) {
          return failure(new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`));
        }
      }
      if (typeof payload === "undefined") {
        return failure(new Error("payload is required"));
      } else if (isObjectPayload) {
        try {
          validatePayload(payload);
        } catch (error3) {
          return failure(error3);
        }
        if (!options.mutatePayload) {
          payload = Object.assign({}, payload);
        }
      } else {
        const invalid_options = options_for_objects.filter(function(opt) {
          return typeof options[opt] !== "undefined";
        });
        if (invalid_options.length > 0) {
          return failure(new Error("invalid " + invalid_options.join(",") + " option for " + typeof payload + " payload"));
        }
      }
      if (typeof payload.exp !== "undefined" && typeof options.expiresIn !== "undefined") {
        return failure(new Error('Bad "options.expiresIn" option the payload already has an "exp" property.'));
      }
      if (typeof payload.nbf !== "undefined" && typeof options.notBefore !== "undefined") {
        return failure(new Error('Bad "options.notBefore" option the payload already has an "nbf" property.'));
      }
      try {
        validateOptions(options);
      } catch (error3) {
        return failure(error3);
      }
      if (!options.allowInvalidAsymmetricKeyTypes) {
        try {
          validateAsymmetricKey(header.alg, secretOrPrivateKey);
        } catch (error3) {
          return failure(error3);
        }
      }
      const timestamp = payload.iat || Math.floor(Date.now() / 1e3);
      if (options.noTimestamp) {
        delete payload.iat;
      } else if (isObjectPayload) {
        payload.iat = timestamp;
      }
      if (typeof options.notBefore !== "undefined") {
        try {
          payload.nbf = timespan(options.notBefore, timestamp);
        } catch (err) {
          return failure(err);
        }
        if (typeof payload.nbf === "undefined") {
          return failure(new Error('"notBefore" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
        }
      }
      if (typeof options.expiresIn !== "undefined" && typeof payload === "object") {
        try {
          payload.exp = timespan(options.expiresIn, timestamp);
        } catch (err) {
          return failure(err);
        }
        if (typeof payload.exp === "undefined") {
          return failure(new Error('"expiresIn" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
        }
      }
      Object.keys(options_to_payload).forEach(function(key) {
        const claim = options_to_payload[key];
        if (typeof options[key] !== "undefined") {
          if (typeof payload[claim] !== "undefined") {
            return failure(new Error('Bad "options.' + key + '" option. The payload already has an "' + claim + '" property.'));
          }
          payload[claim] = options[key];
        }
      });
      const encoding = options.encoding || "utf8";
      if (typeof callback === "function") {
        callback = callback && once2(callback);
        jws.createSign({
          header,
          privateKey: secretOrPrivateKey,
          payload,
          encoding
        }).once("error", callback).once("done", function(signature) {
          if (!options.allowInsecureKeySizes && /^(?:RS|PS)/.test(header.alg) && signature.length < 256) {
            return callback(new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`));
          }
          callback(null, signature);
        });
      } else {
        let signature = jws.sign({ header, payload, secret: secretOrPrivateKey, encoding });
        if (!options.allowInsecureKeySizes && /^(?:RS|PS)/.test(header.alg) && signature.length < 256) {
          throw new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`);
        }
        return signature;
      }
    };
  }
});
var require_jsonwebtoken = __commonJS({
  "node_modules/jsonwebtoken/index.js"(exports, module) {
    module.exports = {
      decode: require_decode(),
      verify: require_verify(),
      sign: require_sign(),
      JsonWebTokenError: require_JsonWebTokenError(),
      NotBeforeError: require_NotBeforeError(),
      TokenExpiredError: require_TokenExpiredError()
    };
  }
});
function fromProcess(name) {
  try {
    if (typeof process !== "undefined" && process && process.env) {
      return process.env[name];
    }
  } catch {
  }
  return void 0;
}
__name(fromProcess, "fromProcess");
function getEnv(name, fallback) {
  const scope = globalThis.__RP_ENV__;
  if (scope && scope[name] !== void 0) return scope[name];
  const value = fromProcess(name);
  return value === void 0 ? fallback : value;
}
__name(getEnv, "getEnv");
function getReqEnv(req, name, fallback) {
  if (name === "NODE_ENV" && getEnv("NODE_ENV") === "test") return "test";
  if (req && req.rpEnv && req.rpEnv[name] !== void 0) {
    return req.rpEnv[name];
  }
  return getEnv(name, fallback);
}
__name(getReqEnv, "getReqEnv");
function isTestEnv(req) {
  if (req && req.rpEnv && req.rpEnv.NODE_ENV === "test") return true;
  return getEnv("NODE_ENV") === "test";
}
__name(isTestEnv, "isTestEnv");
var init_env = __esm({
  "api/_core/env.js"() {
  }
});
var LibsqlError;
var init_api = __esm({
  "node_modules/@libsql/core/lib-esm/api.js"() {
    LibsqlError = class extends Error {
      static {
        __name(this, "LibsqlError");
      }
      /** Machine-readable error code. */
      code;
      /** Raw numeric error code */
      rawCode;
      constructor(message, code, rawCode, cause) {
        if (code !== void 0) {
          message = `${code}: ${message}`;
        }
        super(message, { cause });
        this.code = code;
        this.rawCode = rawCode;
        this.name = "LibsqlError";
      }
    };
  }
});
function parseUri(text) {
  const match = URI_RE.exec(text);
  if (match === null) {
    throw new LibsqlError(`The URL '${text}' is not in a valid format`, "URL_INVALID");
  }
  const groups = match.groups;
  const scheme = groups["scheme"];
  const authority = groups["authority"] !== void 0 ? parseAuthority(groups["authority"]) : void 0;
  const path = percentDecode(groups["path"]);
  const query = groups["query"] !== void 0 ? parseQuery(groups["query"]) : void 0;
  const fragment = groups["fragment"] !== void 0 ? percentDecode(groups["fragment"]) : void 0;
  return { scheme, authority, path, query, fragment };
}
__name(parseUri, "parseUri");
function parseAuthority(text) {
  const match = AUTHORITY_RE.exec(text);
  if (match === null) {
    throw new LibsqlError("The authority part of the URL is not in a valid format", "URL_INVALID");
  }
  const groups = match.groups;
  const host = percentDecode(groups["host_br"] ?? groups["host"]);
  const port = groups["port"] ? parseInt(groups["port"], 10) : void 0;
  const userinfo = groups["username"] !== void 0 ? {
    username: percentDecode(groups["username"]),
    password: groups["password"] !== void 0 ? percentDecode(groups["password"]) : void 0
  } : void 0;
  return { host, port, userinfo };
}
__name(parseAuthority, "parseAuthority");
function parseQuery(text) {
  const sequences = text.split("&");
  const pairs = [];
  for (const sequence of sequences) {
    if (sequence === "") {
      continue;
    }
    let key;
    let value;
    const splitIdx = sequence.indexOf("=");
    if (splitIdx < 0) {
      key = sequence;
      value = "";
    } else {
      key = sequence.substring(0, splitIdx);
      value = sequence.substring(splitIdx + 1);
    }
    pairs.push({
      key: percentDecode(key.replaceAll("+", " ")),
      value: percentDecode(value.replaceAll("+", " "))
    });
  }
  return { pairs };
}
__name(parseQuery, "parseQuery");
function percentDecode(text) {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    if (e instanceof URIError) {
      throw new LibsqlError(`URL component has invalid percent encoding: ${e}`, "URL_INVALID", void 0, e);
    }
    throw e;
  }
}
__name(percentDecode, "percentDecode");
function encodeBaseUrl(scheme, authority, path) {
  if (authority === void 0) {
    throw new LibsqlError(`URL with scheme ${JSON.stringify(scheme + ":")} requires authority (the "//" part)`, "URL_INVALID");
  }
  const schemeText = `${scheme}:`;
  const hostText = encodeHost(authority.host);
  const portText = encodePort(authority.port);
  const userinfoText = encodeUserinfo(authority.userinfo);
  const authorityText = `//${userinfoText}${hostText}${portText}`;
  let pathText = path.split("/").map(encodeURIComponent).join("/");
  if (pathText !== "" && !pathText.startsWith("/")) {
    pathText = "/" + pathText;
  }
  return new URL(`${schemeText}${authorityText}${pathText}`);
}
__name(encodeBaseUrl, "encodeBaseUrl");
function encodeHost(host) {
  return host.includes(":") ? `[${encodeURI(host)}]` : encodeURI(host);
}
__name(encodeHost, "encodeHost");
function encodePort(port) {
  return port !== void 0 ? `:${port}` : "";
}
__name(encodePort, "encodePort");
function encodeUserinfo(userinfo) {
  if (userinfo === void 0) {
    return "";
  }
  const usernameText = encodeURIComponent(userinfo.username);
  const passwordText = userinfo.password !== void 0 ? `:${encodeURIComponent(userinfo.password)}` : "";
  return `${usernameText}${passwordText}@`;
}
__name(encodeUserinfo, "encodeUserinfo");
var URI_RE;
var AUTHORITY_RE;
var init_uri = __esm({
  "node_modules/@libsql/core/lib-esm/uri.js"() {
    init_api();
    URI_RE = (() => {
      const SCHEME = "(?<scheme>[A-Za-z][A-Za-z.+-]*)";
      const AUTHORITY = "(?<authority>[^/?#]*)";
      const PATH = "(?<path>[^?#]*)";
      const QUERY = "(?<query>[^#]*)";
      const FRAGMENT = "(?<fragment>.*)";
      return new RegExp(`^${SCHEME}:(//${AUTHORITY})?${PATH}(\\?${QUERY})?(#${FRAGMENT})?$`, "su");
    })();
    AUTHORITY_RE = (() => {
      return new RegExp(`^((?<username>[^:]*)(:(?<password>.*))?@)?((?<host>[^:\\[\\]]*)|(\\[(?<host_br>[^\\[\\]]*)\\]))(:(?<port>[0-9]*))?$`, "su");
    })();
  }
});
var version2;
var VERSION;
var _TD;
var _TE;
var b64ch;
var b64chs;
var b64tab;
var b64re;
var _fromCC;
var _U8Afrom;
var _mkUriSafe;
var _tidyB64;
var btoaPolyfill;
var _btoa;
var _fromUint8Array;
var fromUint8Array;
var cb_utob;
var re_utob;
var utob;
var _encode;
var encode;
var encodeURI2;
var re_btou;
var cb_btou;
var btou;
var atobPolyfill;
var _atob;
var _toUint8Array;
var toUint8Array;
var _decode;
var _unURI;
var decode;
var isValid;
var _noEnum;
var extendString;
var extendUint8Array;
var extendBuiltins;
var gBase64;
var init_base64 = __esm({
  "node_modules/js-base64/base64.mjs"() {
    version2 = "3.9.4";
    VERSION = version2;
    _TD = typeof TextDecoder === "function" ? new TextDecoder("utf-8", { ignoreBOM: true }) : void 0;
    _TE = typeof TextEncoder === "function" ? new TextEncoder() : void 0;
    b64ch = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    b64chs = Array.prototype.slice.call(b64ch);
    b64tab = ((a) => {
      let tab = {};
      a.forEach((c, i) => tab[c] = i);
      return tab;
    })(b64chs);
    b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
    _fromCC = String.fromCharCode.bind(String);
    _U8Afrom = typeof Uint8Array.from === "function" ? Uint8Array.from.bind(Uint8Array) : (it) => new Uint8Array(Array.prototype.slice.call(it, 0));
    _mkUriSafe = /* @__PURE__ */ __name((src) => src.replace(/=/g, "").replace(/[+\/]/g, (m0) => m0 == "+" ? "-" : "_"), "_mkUriSafe");
    _tidyB64 = /* @__PURE__ */ __name((s) => s.replace(/[^A-Za-z0-9\+\/]/g, ""), "_tidyB64");
    btoaPolyfill = /* @__PURE__ */ __name((bin) => {
      let u32, c0, c1, c2, asc = "";
      const pad = bin.length % 3;
      for (let i = 0; i < bin.length; ) {
        if ((c0 = bin.charCodeAt(i++)) > 255 || (c1 = bin.charCodeAt(i++)) > 255 || (c2 = bin.charCodeAt(i++)) > 255)
          throw new TypeError("invalid character found");
        u32 = c0 << 16 | c1 << 8 | c2;
        asc += b64chs[u32 >> 18 & 63] + b64chs[u32 >> 12 & 63] + b64chs[u32 >> 6 & 63] + b64chs[u32 & 63];
      }
      return pad ? asc.slice(0, pad - 3) + "===".substring(pad) : asc;
    }, "btoaPolyfill");
    _btoa = typeof btoa === "function" ? (bin) => btoa(bin) : btoaPolyfill;
    _fromUint8Array = typeof Uint8Array.prototype.toBase64 === "function" ? (u8a) => u8a.toBase64() : (u8a) => {
      const maxargs = 4096;
      let strs = [];
      for (let i = 0, l = u8a.length; i < l; i += maxargs) {
        strs.push(_fromCC.apply(null, u8a.subarray(i, i + maxargs)));
      }
      return _btoa(strs.join(""));
    };
    fromUint8Array = /* @__PURE__ */ __name((u8a, urlsafe = false) => urlsafe ? _mkUriSafe(_fromUint8Array(u8a)) : _fromUint8Array(u8a), "fromUint8Array");
    cb_utob = /* @__PURE__ */ __name((c) => {
      if (c.length < 2) {
        var cc = c.charCodeAt(0);
        return cc < 128 ? c : cc < 2048 ? _fromCC(192 | cc >>> 6) + _fromCC(128 | cc & 63) : _fromCC(224 | cc >>> 12 & 15) + _fromCC(128 | cc >>> 6 & 63) + _fromCC(128 | cc & 63);
      } else {
        var cc = 65536 + (c.charCodeAt(0) - 55296) * 1024 + (c.charCodeAt(1) - 56320);
        return _fromCC(240 | cc >>> 18 & 7) + _fromCC(128 | cc >>> 12 & 63) + _fromCC(128 | cc >>> 6 & 63) + _fromCC(128 | cc & 63);
      }
    }, "cb_utob");
    re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\x00-\x7F]/g;
    utob = /* @__PURE__ */ __name((u) => u.replace(re_utob, cb_utob), "utob");
    _encode = _TE ? (s) => _fromUint8Array(_TE.encode(s)) : (s) => _btoa(utob(s));
    encode = /* @__PURE__ */ __name((src, urlsafe = false) => urlsafe ? _mkUriSafe(_encode(src)) : _encode(src), "encode");
    encodeURI2 = /* @__PURE__ */ __name((src) => encode(src, true), "encodeURI2");
    re_btou = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g;
    cb_btou = /* @__PURE__ */ __name((cccc) => {
      switch (cccc.length) {
        case 4:
          var cp = (7 & cccc.charCodeAt(0)) << 18 | (63 & cccc.charCodeAt(1)) << 12 | (63 & cccc.charCodeAt(2)) << 6 | 63 & cccc.charCodeAt(3), offset = cp - 65536;
          return _fromCC((offset >>> 10) + 55296) + _fromCC((offset & 1023) + 56320);
        case 3:
          return _fromCC((15 & cccc.charCodeAt(0)) << 12 | (63 & cccc.charCodeAt(1)) << 6 | 63 & cccc.charCodeAt(2));
        default:
          return _fromCC((31 & cccc.charCodeAt(0)) << 6 | 63 & cccc.charCodeAt(1));
      }
    }, "cb_btou");
    btou = /* @__PURE__ */ __name((b) => b.replace(re_btou, cb_btou), "btou");
    atobPolyfill = /* @__PURE__ */ __name((asc) => {
      asc = asc.replace(/\s+/g, "");
      if (!b64re.test(asc))
        throw new TypeError("malformed base64.");
      asc += "==".slice(2 - (asc.length & 3));
      let u24, r1, r2;
      let binArray = [];
      for (let i = 0; i < asc.length; ) {
        u24 = b64tab[asc.charAt(i++)] << 18 | b64tab[asc.charAt(i++)] << 12 | (r1 = b64tab[asc.charAt(i++)]) << 6 | (r2 = b64tab[asc.charAt(i++)]);
        if (r1 === 64) {
          binArray.push(_fromCC(u24 >> 16 & 255));
        } else if (r2 === 64) {
          binArray.push(_fromCC(u24 >> 16 & 255, u24 >> 8 & 255));
        } else {
          binArray.push(_fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255));
        }
      }
      return binArray.join("");
    }, "atobPolyfill");
    _atob = typeof atob === "function" ? (asc) => atob(_tidyB64(asc)) : atobPolyfill;
    _toUint8Array = typeof Uint8Array.fromBase64 === "function" ? (a) => Uint8Array.fromBase64(a) : (a) => _U8Afrom(_atob(a).split("").map((c) => c.charCodeAt(0)));
    toUint8Array = /* @__PURE__ */ __name((a) => _toUint8Array(_unURI(a)), "toUint8Array");
    _decode = _TD ? (a) => _TD.decode(_toUint8Array(a)) : (a) => btou(_atob(a));
    _unURI = /* @__PURE__ */ __name((a) => _tidyB64(a.replace(/[-_]/g, (m0) => m0 == "-" ? "+" : "/")), "_unURI");
    decode = /* @__PURE__ */ __name((src) => _decode(_unURI(src)), "decode");
    isValid = /* @__PURE__ */ __name((src) => {
      if (typeof src !== "string")
        return false;
      const s = src.replace(/\s+/g, "").replace(/={0,2}$/, "");
      return !/[^\s0-9a-zA-Z\+/]/.test(s) || !/[^\s0-9a-zA-Z\-_]/.test(s);
    }, "isValid");
    _noEnum = /* @__PURE__ */ __name((v) => {
      return {
        value: v,
        enumerable: false,
        writable: true,
        configurable: true
      };
    }, "_noEnum");
    extendString = /* @__PURE__ */ __name(function() {
      const _add = /* @__PURE__ */ __name((name, body) => Object.defineProperty(String.prototype, name, _noEnum(body)), "_add");
      _add("fromBase64", function() {
        return decode(this);
      });
      _add("toBase64", function(urlsafe) {
        return encode(this, urlsafe);
      });
      _add("toBase64URI", function() {
        return encode(this, true);
      });
      _add("toBase64URL", function() {
        return encode(this, true);
      });
      _add("toUint8Array", function() {
        return toUint8Array(this);
      });
    }, "extendString");
    extendUint8Array = /* @__PURE__ */ __name(function() {
      const _add = /* @__PURE__ */ __name((name, body) => Object.defineProperty(Uint8Array.prototype, name, _noEnum(body)), "_add");
      _add("toBase64", function(urlsafe) {
        return fromUint8Array(this, urlsafe);
      });
      _add("toBase64URI", function() {
        return fromUint8Array(this, true);
      });
      _add("toBase64URL", function() {
        return fromUint8Array(this, true);
      });
    }, "extendUint8Array");
    extendBuiltins = /* @__PURE__ */ __name(() => {
      extendString();
      extendUint8Array();
    }, "extendBuiltins");
    gBase64 = {
      version: version2,
      VERSION,
      atob: _atob,
      atobPolyfill,
      btoa: _btoa,
      btoaPolyfill,
      fromBase64: decode,
      toBase64: encode,
      encode,
      encodeURI: encodeURI2,
      encodeURL: encodeURI2,
      utob,
      btou,
      decode,
      isValid,
      fromUint8Array,
      toUint8Array,
      extendString,
      extendUint8Array,
      extendBuiltins
    };
  }
});
function transactionModeToBegin(mode) {
  if (mode === "write") {
    return "BEGIN IMMEDIATE";
  } else if (mode === "read") {
    return "BEGIN TRANSACTION READONLY";
  } else if (mode === "deferred") {
    return "BEGIN DEFERRED";
  } else {
    throw RangeError('Unknown transaction mode, supported values are "write", "read" and "deferred"');
  }
}
__name(transactionModeToBegin, "transactionModeToBegin");
function rowToJson(row) {
  return Array.prototype.map.call(row, valueToJson);
}
__name(rowToJson, "rowToJson");
function valueToJson(value) {
  if (typeof value === "bigint") {
    return "" + value;
  } else if (value instanceof ArrayBuffer) {
    return gBase64.fromUint8Array(new Uint8Array(value));
  } else {
    return value;
  }
}
__name(valueToJson, "valueToJson");
var supportedUrlLink;
var ResultSetImpl;
var init_util = __esm({
  "node_modules/@libsql/core/lib-esm/util.js"() {
    init_base64();
    supportedUrlLink = "https://github.com/libsql/libsql-client-ts#supported-urls";
    ResultSetImpl = class {
      static {
        __name(this, "ResultSetImpl");
      }
      columns;
      columnTypes;
      rows;
      rowsAffected;
      lastInsertRowid;
      constructor(columns, columnTypes, rows, rowsAffected, lastInsertRowid) {
        this.columns = columns;
        this.columnTypes = columnTypes;
        this.rows = rows;
        this.rowsAffected = rowsAffected;
        this.lastInsertRowid = lastInsertRowid;
      }
      toJSON() {
        return {
          columns: this.columns,
          columnTypes: this.columnTypes,
          rows: this.rows.map(rowToJson),
          rowsAffected: this.rowsAffected,
          lastInsertRowid: this.lastInsertRowid !== void 0 ? "" + this.lastInsertRowid : null
        };
      }
    };
  }
});
function expandConfig(config2, preferHttp) {
  if (typeof config2 !== "object") {
    throw new TypeError(`Expected client configuration as object, got ${typeof config2}`);
  }
  let { url, authToken, tls, intMode, concurrency } = config2;
  concurrency = Math.max(0, concurrency || 20);
  intMode ??= "number";
  let connectionQueryParams = [];
  if (url === inMemoryMode) {
    url = "file::memory:";
  }
  const uri = parseUri(url);
  const originalUriScheme = uri.scheme.toLowerCase();
  const isInMemoryMode = originalUriScheme === "file" && uri.path === inMemoryMode && uri.authority === void 0;
  let queryParamsDef;
  if (isInMemoryMode) {
    queryParamsDef = {
      cache: {
        values: ["shared", "private"],
        update: /* @__PURE__ */ __name((key, value) => connectionQueryParams.push(`${key}=${value}`), "update")
      }
    };
  } else {
    queryParamsDef = {
      tls: {
        values: ["0", "1"],
        update: /* @__PURE__ */ __name((_, value) => tls = value === "1", "update")
      },
      authToken: {
        update: /* @__PURE__ */ __name((_, value) => authToken = value, "update")
      }
    };
  }
  for (const { key, value } of uri.query?.pairs ?? []) {
    if (!Object.hasOwn(queryParamsDef, key)) {
      throw new LibsqlError(`Unsupported URL query parameter ${JSON.stringify(key)}`, "URL_PARAM_NOT_SUPPORTED");
    }
    const queryParamDef = queryParamsDef[key];
    if (queryParamDef.values !== void 0 && !queryParamDef.values.includes(value)) {
      throw new LibsqlError(`Unknown value for the "${key}" query argument: ${JSON.stringify(value)}. Supported values are: [${queryParamDef.values.map((x) => '"' + x + '"').join(", ")}]`, "URL_INVALID");
    }
    if (queryParamDef.update !== void 0) {
      queryParamDef?.update(key, value);
    }
  }
  const connectionQueryParamsString = connectionQueryParams.length === 0 ? "" : `?${connectionQueryParams.join("&")}`;
  const path = uri.path + connectionQueryParamsString;
  let scheme;
  if (originalUriScheme === "libsql") {
    if (tls === false) {
      if (uri.authority?.port === void 0) {
        throw new LibsqlError('A "libsql:" URL with ?tls=0 must specify an explicit port', "URL_INVALID");
      }
      scheme = preferHttp ? "http" : "ws";
    } else {
      scheme = preferHttp ? "https" : "wss";
    }
  } else {
    scheme = originalUriScheme;
  }
  if (scheme === "http" || scheme === "ws") {
    tls ??= false;
  } else {
    tls ??= true;
  }
  if (scheme !== "http" && scheme !== "ws" && scheme !== "https" && scheme !== "wss" && scheme !== "file") {
    throw new LibsqlError(`The client supports only "libsql:", "wss:", "ws:", "https:", "http:" and "file:" URLs, got ${JSON.stringify(uri.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
  if (intMode !== "number" && intMode !== "bigint" && intMode !== "string") {
    throw new TypeError(`Invalid value for intMode, expected "number", "bigint" or "string", got ${JSON.stringify(intMode)}`);
  }
  if (uri.fragment !== void 0) {
    throw new LibsqlError(`URL fragments are not supported: ${JSON.stringify("#" + uri.fragment)}`, "URL_INVALID");
  }
  if (isInMemoryMode) {
    return {
      scheme: "file",
      tls: false,
      path,
      intMode,
      concurrency,
      syncUrl: config2.syncUrl,
      syncInterval: config2.syncInterval,
      readYourWrites: config2.readYourWrites,
      offline: config2.offline,
      fetch: config2.fetch,
      authToken: void 0,
      encryptionKey: void 0,
      authority: void 0
    };
  }
  return {
    scheme,
    tls,
    authority: uri.authority,
    path,
    authToken,
    intMode,
    concurrency,
    encryptionKey: config2.encryptionKey,
    syncUrl: config2.syncUrl,
    syncInterval: config2.syncInterval,
    readYourWrites: config2.readYourWrites,
    offline: config2.offline,
    fetch: config2.fetch
  };
}
__name(expandConfig, "expandConfig");
var inMemoryMode;
var init_config = __esm({
  "node_modules/@libsql/core/lib-esm/config.js"() {
    init_api();
    init_uri();
    init_util();
    inMemoryMode = ":memory:";
  }
});
var _WebSocket;
var init_web = __esm({
  "node_modules/@libsql/isomorphic-ws/web.mjs"() {
    if (typeof WebSocket !== "undefined") {
      _WebSocket = WebSocket;
    } else if (typeof global !== "undefined") {
      _WebSocket = global.WebSocket;
    } else if (typeof window !== "undefined") {
      _WebSocket = window.WebSocket;
    } else if (typeof self !== "undefined") {
      _WebSocket = self.WebSocket;
    }
  }
});
var Client;
var init_client = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/client.js"() {
    Client = class {
      static {
        __name(this, "Client");
      }
      /** @private */
      constructor() {
        this.intMode = "number";
      }
      /** Representation of integers returned from the database. See {@link IntMode}.
       *
       * This value is inherited by {@link Stream} objects created with {@link openStream}, but you can
       * override the integer mode for every stream by setting {@link Stream.intMode} on the stream.
       */
      intMode;
    };
  }
});
var ClientError;
var ProtoError;
var ResponseError;
var ClosedError;
var WebSocketUnsupportedError;
var WebSocketError;
var HttpServerError;
var ProtocolVersionError;
var InternalError;
var MisuseError;
var init_errors = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/errors.js"() {
    ClientError = class extends Error {
      static {
        __name(this, "ClientError");
      }
      /** @private */
      constructor(message) {
        super(message);
        this.name = "ClientError";
      }
    };
    ProtoError = class extends ClientError {
      static {
        __name(this, "ProtoError");
      }
      /** @private */
      constructor(message) {
        super(message);
        this.name = "ProtoError";
      }
    };
    ResponseError = class extends ClientError {
      static {
        __name(this, "ResponseError");
      }
      code;
      /** @internal */
      proto;
      /** @private */
      constructor(message, protoError) {
        super(message);
        this.name = "ResponseError";
        this.code = protoError.code;
        this.proto = protoError;
        this.stack = void 0;
      }
    };
    ClosedError = class extends ClientError {
      static {
        __name(this, "ClosedError");
      }
      /** @private */
      constructor(message, cause) {
        if (cause !== void 0) {
          super(`${message}: ${cause}`);
          this.cause = cause;
        } else {
          super(message);
        }
        this.name = "ClosedError";
      }
    };
    WebSocketUnsupportedError = class extends ClientError {
      static {
        __name(this, "WebSocketUnsupportedError");
      }
      /** @private */
      constructor(message) {
        super(message);
        this.name = "WebSocketUnsupportedError";
      }
    };
    WebSocketError = class extends ClientError {
      static {
        __name(this, "WebSocketError");
      }
      /** @private */
      constructor(message) {
        super(message);
        this.name = "WebSocketError";
      }
    };
    HttpServerError = class extends ClientError {
      static {
        __name(this, "HttpServerError");
      }
      status;
      /** @private */
      constructor(message, status) {
        super(message);
        this.status = status;
        this.name = "HttpServerError";
      }
    };
    ProtocolVersionError = class extends ClientError {
      static {
        __name(this, "ProtocolVersionError");
      }
      /** @private */
      constructor(message) {
        super(message);
        this.name = "ProtocolVersionError";
      }
    };
    InternalError = class extends ClientError {
      static {
        __name(this, "InternalError");
      }
      /** @private */
      constructor(message) {
        super(message);
        this.name = "InternalError";
      }
    };
    MisuseError = class extends ClientError {
      static {
        __name(this, "MisuseError");
      }
      /** @private */
      constructor(message) {
        super(message);
        this.name = "MisuseError";
      }
    };
  }
});
function string(value) {
  if (typeof value === "string") {
    return value;
  }
  throw typeError(value, "string");
}
__name(string, "string");
function stringOpt(value) {
  if (value === null || value === void 0) {
    return void 0;
  } else if (typeof value === "string") {
    return value;
  }
  throw typeError(value, "string or null");
}
__name(stringOpt, "stringOpt");
function number(value) {
  if (typeof value === "number") {
    return value;
  }
  throw typeError(value, "number");
}
__name(number, "number");
function boolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  throw typeError(value, "boolean");
}
__name(boolean, "boolean");
function array(value) {
  if (Array.isArray(value)) {
    return value;
  }
  throw typeError(value, "array");
}
__name(array, "array");
function object(value) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  throw typeError(value, "object");
}
__name(object, "object");
function arrayObjectsMap(value, fun) {
  return array(value).map((elemValue) => fun(object(elemValue)));
}
__name(arrayObjectsMap, "arrayObjectsMap");
function typeError(value, expected) {
  if (value === void 0) {
    return new ProtoError(`Expected ${expected}, but the property was missing`);
  }
  let received = typeof value;
  if (value === null) {
    received = "null";
  } else if (Array.isArray(value)) {
    received = "array";
  }
  return new ProtoError(`Expected ${expected}, received ${received}`);
}
__name(typeError, "typeError");
function readJsonObject(value, fun) {
  return fun(object(value));
}
__name(readJsonObject, "readJsonObject");
var init_decode = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/encoding/json/decode.js"() {
    init_errors();
  }
});
function writeJsonObject(value, fun) {
  const output = [];
  const writer = new ObjectWriter(output);
  writer.begin();
  fun(writer, value);
  writer.end();
  return output.join("");
}
__name(writeJsonObject, "writeJsonObject");
var ObjectWriter;
var init_encode = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/encoding/json/encode.js"() {
    ObjectWriter = class {
      static {
        __name(this, "ObjectWriter");
      }
      #output;
      #isFirst;
      constructor(output) {
        this.#output = output;
        this.#isFirst = false;
      }
      begin() {
        this.#output.push("{");
        this.#isFirst = true;
      }
      end() {
        this.#output.push("}");
        this.#isFirst = false;
      }
      #key(name) {
        if (this.#isFirst) {
          this.#output.push('"');
          this.#isFirst = false;
        } else {
          this.#output.push(',"');
        }
        this.#output.push(name);
        this.#output.push('":');
      }
      string(name, value) {
        this.#key(name);
        this.#output.push(JSON.stringify(value));
      }
      stringRaw(name, value) {
        this.#key(name);
        this.#output.push('"');
        this.#output.push(value);
        this.#output.push('"');
      }
      number(name, value) {
        this.#key(name);
        this.#output.push("" + value);
      }
      boolean(name, value) {
        this.#key(name);
        this.#output.push(value ? "true" : "false");
      }
      object(name, value, valueFun) {
        this.#key(name);
        this.begin();
        valueFun(this, value);
        this.end();
      }
      arrayObjects(name, values, valueFun) {
        this.#key(name);
        this.#output.push("[");
        for (let i = 0; i < values.length; ++i) {
          if (i !== 0) {
            this.#output.push(",");
          }
          this.begin();
          valueFun(this, values[i]);
          this.end();
        }
        this.#output.push("]");
      }
    };
  }
});
var VARINT;
var FIXED_64;
var LENGTH_DELIMITED;
var FIXED_32;
var init_util2 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/util.js"() {
    VARINT = 0;
    FIXED_64 = 1;
    LENGTH_DELIMITED = 2;
    FIXED_32 = 5;
  }
});
function readProtobufMessage(data, def) {
  const msgReader = new MessageReader(data);
  const fieldReader = new FieldReader(msgReader);
  let value = def.default();
  while (!msgReader.eof()) {
    const key = msgReader.varint();
    const tag = key >> 3;
    const wireType = key & 7;
    fieldReader.setup(wireType);
    const tagFun = def[tag];
    if (tagFun !== void 0) {
      const returnedValue = tagFun(fieldReader, value);
      if (returnedValue !== void 0) {
        value = returnedValue;
      }
    }
    fieldReader.maybeSkip();
  }
  return value;
}
__name(readProtobufMessage, "readProtobufMessage");
var MessageReader;
var FieldReader;
var init_decode2 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/decode.js"() {
    init_errors();
    init_util2();
    MessageReader = class {
      static {
        __name(this, "MessageReader");
      }
      #array;
      #view;
      #pos;
      constructor(array2) {
        this.#array = array2;
        this.#view = new DataView(array2.buffer, array2.byteOffset, array2.byteLength);
        this.#pos = 0;
      }
      varint() {
        let value = 0;
        for (let shift = 0; ; shift += 7) {
          const byte = this.#array[this.#pos++];
          value |= (byte & 127) << shift;
          if (!(byte & 128)) {
            break;
          }
        }
        return value;
      }
      varintBig() {
        let value = 0n;
        for (let shift = 0n; ; shift += 7n) {
          const byte = this.#array[this.#pos++];
          value |= BigInt(byte & 127) << shift;
          if (!(byte & 128)) {
            break;
          }
        }
        return value;
      }
      bytes(length) {
        const array2 = new Uint8Array(this.#array.buffer, this.#array.byteOffset + this.#pos, length);
        this.#pos += length;
        return array2;
      }
      double() {
        const value = this.#view.getFloat64(this.#pos, true);
        this.#pos += 8;
        return value;
      }
      skipVarint() {
        for (; ; ) {
          const byte = this.#array[this.#pos++];
          if (!(byte & 128)) {
            break;
          }
        }
      }
      skip(count3) {
        this.#pos += count3;
      }
      eof() {
        return this.#pos >= this.#array.byteLength;
      }
    };
    FieldReader = class {
      static {
        __name(this, "FieldReader");
      }
      #reader;
      #wireType;
      constructor(reader) {
        this.#reader = reader;
        this.#wireType = -1;
      }
      setup(wireType) {
        this.#wireType = wireType;
      }
      #expect(expectedWireType) {
        if (this.#wireType !== expectedWireType) {
          throw new ProtoError(`Expected wire type ${expectedWireType}, got ${this.#wireType}`);
        }
        this.#wireType = -1;
      }
      bytes() {
        this.#expect(LENGTH_DELIMITED);
        const length = this.#reader.varint();
        return this.#reader.bytes(length);
      }
      string() {
        return new TextDecoder().decode(this.bytes());
      }
      message(def) {
        return readProtobufMessage(this.bytes(), def);
      }
      int32() {
        this.#expect(VARINT);
        return this.#reader.varint();
      }
      uint32() {
        return this.int32();
      }
      bool() {
        return this.int32() !== 0;
      }
      uint64() {
        this.#expect(VARINT);
        return this.#reader.varintBig();
      }
      sint64() {
        const value = this.uint64();
        return value >> 1n ^ -(value & 1n);
      }
      double() {
        this.#expect(FIXED_64);
        return this.#reader.double();
      }
      maybeSkip() {
        if (this.#wireType < 0) {
          return;
        } else if (this.#wireType === VARINT) {
          this.#reader.skipVarint();
        } else if (this.#wireType === FIXED_64) {
          this.#reader.skip(8);
        } else if (this.#wireType === LENGTH_DELIMITED) {
          const length = this.#reader.varint();
          this.#reader.skip(length);
        } else if (this.#wireType === FIXED_32) {
          this.#reader.skip(4);
        } else {
          throw new ProtoError(`Unexpected wire type ${this.#wireType}`);
        }
        this.#wireType = -1;
      }
    };
  }
});
function writeProtobufMessage(value, fun) {
  const w = new MessageWriter();
  fun(w, value);
  return w.data();
}
__name(writeProtobufMessage, "writeProtobufMessage");
var MessageWriter;
var init_encode2 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/encode.js"() {
    init_util2();
    MessageWriter = class _MessageWriter {
      static {
        __name(this, "_MessageWriter");
      }
      #buf;
      #array;
      #view;
      #pos;
      constructor() {
        this.#buf = new ArrayBuffer(256);
        this.#array = new Uint8Array(this.#buf);
        this.#view = new DataView(this.#buf);
        this.#pos = 0;
      }
      #ensure(extra) {
        if (this.#pos + extra <= this.#buf.byteLength) {
          return;
        }
        let newCap = this.#buf.byteLength;
        while (newCap < this.#pos + extra) {
          newCap *= 2;
        }
        const newBuf = new ArrayBuffer(newCap);
        const newArray = new Uint8Array(newBuf);
        const newView = new DataView(newBuf);
        newArray.set(new Uint8Array(this.#buf, 0, this.#pos));
        this.#buf = newBuf;
        this.#array = newArray;
        this.#view = newView;
      }
      #varint(value) {
        this.#ensure(5);
        value = 0 | value;
        do {
          let byte = value & 127;
          value >>>= 7;
          byte |= value ? 128 : 0;
          this.#array[this.#pos++] = byte;
        } while (value);
      }
      #varintBig(value) {
        this.#ensure(10);
        value = value & 0xffffffffffffffffn;
        do {
          let byte = Number(value & 0x7fn);
          value >>= 7n;
          byte |= value ? 128 : 0;
          this.#array[this.#pos++] = byte;
        } while (value);
      }
      #tag(tag, wireType) {
        this.#varint(tag << 3 | wireType);
      }
      bytes(tag, value) {
        this.#tag(tag, LENGTH_DELIMITED);
        this.#varint(value.byteLength);
        this.#ensure(value.byteLength);
        this.#array.set(value, this.#pos);
        this.#pos += value.byteLength;
      }
      string(tag, value) {
        this.bytes(tag, new TextEncoder().encode(value));
      }
      message(tag, value, fun) {
        const writer = new _MessageWriter();
        fun(writer, value);
        this.bytes(tag, writer.data());
      }
      int32(tag, value) {
        this.#tag(tag, VARINT);
        this.#varint(value);
      }
      uint32(tag, value) {
        this.int32(tag, value);
      }
      bool(tag, value) {
        this.int32(tag, value ? 1 : 0);
      }
      sint64(tag, value) {
        this.#tag(tag, VARINT);
        this.#varintBig(value << 1n ^ value >> 63n);
      }
      double(tag, value) {
        this.#tag(tag, FIXED_64);
        this.#ensure(8);
        this.#view.setFloat64(this.#pos, value, true);
        this.#pos += 8;
      }
      data() {
        return new Uint8Array(this.#buf, 0, this.#pos);
      }
    };
  }
});
var init_encoding = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/encoding/index.js"() {
    init_decode();
    init_encode();
    init_decode2();
    init_encode2();
  }
});
var IdAlloc;
var init_id_alloc = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/id_alloc.js"() {
    init_errors();
    IdAlloc = class {
      static {
        __name(this, "IdAlloc");
      }
      // Set of all allocated ids
      #usedIds;
      // Set of all free ids lower than `#usedIds.size`
      #freeIds;
      constructor() {
        this.#usedIds = /* @__PURE__ */ new Set();
        this.#freeIds = /* @__PURE__ */ new Set();
      }
      // Returns an id that was free, and marks it as used.
      alloc() {
        for (const freeId2 of this.#freeIds) {
          this.#freeIds.delete(freeId2);
          this.#usedIds.add(freeId2);
          if (!this.#usedIds.has(this.#usedIds.size - 1)) {
            this.#freeIds.add(this.#usedIds.size - 1);
          }
          return freeId2;
        }
        const freeId = this.#usedIds.size;
        this.#usedIds.add(freeId);
        return freeId;
      }
      free(id) {
        if (!this.#usedIds.delete(id)) {
          throw new InternalError("Freeing an id that is not allocated");
        }
        this.#freeIds.delete(this.#usedIds.size);
        if (id < this.#usedIds.size) {
          this.#freeIds.add(id);
        }
      }
    };
  }
});
function impossible(value, message) {
  throw new InternalError(message);
}
__name(impossible, "impossible");
var init_util3 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/util.js"() {
    init_errors();
  }
});
function valueToProto(value) {
  if (value === null) {
    return null;
  } else if (typeof value === "string") {
    return value;
  } else if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new RangeError("Only finite numbers (not Infinity or NaN) can be passed as arguments");
    }
    return value;
  } else if (typeof value === "bigint") {
    if (value < minInteger || value > maxInteger) {
      throw new RangeError("This bigint value is too large to be represented as a 64-bit integer and passed as argument");
    }
    return value;
  } else if (typeof value === "boolean") {
    return value ? 1n : 0n;
  } else if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  } else if (value instanceof Uint8Array) {
    return value;
  } else if (value instanceof Date) {
    return +value.valueOf();
  } else if (typeof value === "object") {
    return "" + value.toString();
  } else {
    throw new TypeError("Unsupported type of value");
  }
}
__name(valueToProto, "valueToProto");
function valueFromProto(value, intMode) {
  if (value === null) {
    return null;
  } else if (typeof value === "number") {
    return value;
  } else if (typeof value === "string") {
    return value;
  } else if (typeof value === "bigint") {
    if (intMode === "number") {
      const num = Number(value);
      if (!Number.isSafeInteger(num)) {
        throw new RangeError("Received integer which is too large to be safely represented as a JavaScript number");
      }
      return num;
    } else if (intMode === "bigint") {
      return value;
    } else if (intMode === "string") {
      return "" + value;
    } else {
      throw new MisuseError("Invalid value for IntMode");
    }
  } else if (value instanceof Uint8Array) {
    return value.slice().buffer;
  } else if (value === void 0) {
    throw new ProtoError("Received unrecognized type of Value");
  } else {
    throw impossible(value, "Impossible type of Value");
  }
}
__name(valueFromProto, "valueFromProto");
var minInteger;
var maxInteger;
var init_value = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/value.js"() {
    init_errors();
    init_util3();
    minInteger = -9223372036854775808n;
    maxInteger = 9223372036854775807n;
  }
});
function stmtResultFromProto(result) {
  return {
    affectedRowCount: result.affectedRowCount,
    lastInsertRowid: result.lastInsertRowid,
    columnNames: result.cols.map((col) => col.name),
    columnDecltypes: result.cols.map((col) => col.decltype)
  };
}
__name(stmtResultFromProto, "stmtResultFromProto");
function rowsResultFromProto(result, intMode) {
  const stmtResult = stmtResultFromProto(result);
  const rows = result.rows.map((row) => rowFromProto(stmtResult.columnNames, row, intMode));
  return { ...stmtResult, rows };
}
__name(rowsResultFromProto, "rowsResultFromProto");
function rowResultFromProto(result, intMode) {
  const stmtResult = stmtResultFromProto(result);
  let row;
  if (result.rows.length > 0) {
    row = rowFromProto(stmtResult.columnNames, result.rows[0], intMode);
  }
  return { ...stmtResult, row };
}
__name(rowResultFromProto, "rowResultFromProto");
function valueResultFromProto(result, intMode) {
  const stmtResult = stmtResultFromProto(result);
  let value;
  if (result.rows.length > 0 && stmtResult.columnNames.length > 0) {
    value = valueFromProto(result.rows[0][0], intMode);
  }
  return { ...stmtResult, value };
}
__name(valueResultFromProto, "valueResultFromProto");
function rowFromProto(colNames, values, intMode) {
  const row = {};
  Object.defineProperty(row, "length", { value: values.length });
  for (let i = 0; i < values.length; ++i) {
    const value = valueFromProto(values[i], intMode);
    Object.defineProperty(row, i, { value });
    const colName = colNames[i];
    if (colName !== void 0 && !Object.hasOwn(row, colName)) {
      Object.defineProperty(row, colName, { value, enumerable: true, configurable: true, writable: true });
    }
  }
  return row;
}
__name(rowFromProto, "rowFromProto");
function errorFromProto(error3) {
  return new ResponseError(error3.message, error3);
}
__name(errorFromProto, "errorFromProto");
var init_result = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/result.js"() {
    init_errors();
    init_value();
  }
});
function sqlToProto(owner, sql) {
  if (sql instanceof Sql) {
    return { sqlId: sql._getSqlId(owner) };
  } else {
    return { sql: "" + sql };
  }
}
__name(sqlToProto, "sqlToProto");
var Sql;
var init_sql = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/sql.js"() {
    init_errors();
    Sql = class {
      static {
        __name(this, "Sql");
      }
      #owner;
      #sqlId;
      #closed;
      /** @private */
      constructor(owner, sqlId) {
        this.#owner = owner;
        this.#sqlId = sqlId;
        this.#closed = void 0;
      }
      /** @private */
      _getSqlId(owner) {
        if (this.#owner !== owner) {
          throw new MisuseError("Attempted to use SQL text opened with other object");
        } else if (this.#closed !== void 0) {
          throw new ClosedError("SQL text is closed", this.#closed);
        }
        return this.#sqlId;
      }
      /** Remove the SQL text from the server, releasing resouces. */
      close() {
        this._setClosed(new ClientError("SQL text was manually closed"));
      }
      /** @private */
      _setClosed(error3) {
        if (this.#closed === void 0) {
          this.#closed = error3;
          this.#owner._closeSql(this.#sqlId);
        }
      }
      /** True if the SQL text is closed (removed from the server). */
      get closed() {
        return this.#closed !== void 0;
      }
    };
  }
});
var Queue;
var init_queue = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/queue.js"() {
    Queue = class {
      static {
        __name(this, "Queue");
      }
      #pushStack;
      #shiftStack;
      constructor() {
        this.#pushStack = [];
        this.#shiftStack = [];
      }
      get length() {
        return this.#pushStack.length + this.#shiftStack.length;
      }
      push(elem) {
        this.#pushStack.push(elem);
      }
      shift() {
        if (this.#shiftStack.length === 0 && this.#pushStack.length > 0) {
          this.#shiftStack = this.#pushStack.reverse();
          this.#pushStack = [];
        }
        return this.#shiftStack.pop();
      }
      first() {
        return this.#shiftStack.length !== 0 ? this.#shiftStack[this.#shiftStack.length - 1] : this.#pushStack[0];
      }
    };
  }
});
function stmtToProto(sqlOwner, stmt, wantRows) {
  let inSql;
  let args = [];
  let namedArgs = [];
  if (stmt instanceof Stmt) {
    inSql = stmt.sql;
    args = stmt._args;
    for (const [name, value] of stmt._namedArgs.entries()) {
      namedArgs.push({ name, value });
    }
  } else if (Array.isArray(stmt)) {
    inSql = stmt[0];
    if (Array.isArray(stmt[1])) {
      args = stmt[1].map((arg) => valueToProto(arg));
    } else {
      namedArgs = Object.entries(stmt[1]).map(([name, value]) => {
        return { name, value: valueToProto(value) };
      });
    }
  } else {
    inSql = stmt;
  }
  const { sql, sqlId } = sqlToProto(sqlOwner, inSql);
  return { sql, sqlId, args, namedArgs, wantRows };
}
__name(stmtToProto, "stmtToProto");
var Stmt;
var init_stmt = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/stmt.js"() {
    init_sql();
    init_value();
    Stmt = class {
      static {
        __name(this, "Stmt");
      }
      /** The SQL statement text. */
      sql;
      /** @private */
      _args;
      /** @private */
      _namedArgs;
      /** Initialize the statement with given SQL text. */
      constructor(sql) {
        this.sql = sql;
        this._args = [];
        this._namedArgs = /* @__PURE__ */ new Map();
      }
      /** Binds positional parameters from the given `values`. All previous positional bindings are cleared. */
      bindIndexes(values) {
        this._args.length = 0;
        for (const value of values) {
          this._args.push(valueToProto(value));
        }
        return this;
      }
      /** Binds a parameter by a 1-based index. */
      bindIndex(index, value) {
        if (index !== (index | 0) || index <= 0) {
          throw new RangeError("Index of a positional argument must be positive integer");
        }
        while (this._args.length < index) {
          this._args.push(null);
        }
        this._args[index - 1] = valueToProto(value);
        return this;
      }
      /** Binds a parameter by name. */
      bindName(name, value) {
        this._namedArgs.set(name, valueToProto(value));
        return this;
      }
      /** Clears all bindings. */
      unbindAll() {
        this._args.length = 0;
        this._namedArgs.clear();
        return this;
      }
    };
  }
});
function executeRegular(stream, steps, batch) {
  return stream._batch(batch).then((result) => {
    for (let step = 0; step < steps.length; ++step) {
      const stepResult = result.stepResults.get(step);
      const stepError = result.stepErrors.get(step);
      steps[step].callback(stepResult, stepError);
    }
  });
}
__name(executeRegular, "executeRegular");
async function executeCursor(stream, steps, batch) {
  const cursor = await stream._openCursor(batch);
  try {
    let nextStep = 0;
    let beginEntry = void 0;
    let rows = [];
    for (; ; ) {
      const entry = await cursor.next();
      if (entry === void 0) {
        break;
      }
      if (entry.type === "step_begin") {
        if (entry.step < nextStep || entry.step >= steps.length) {
          throw new ProtoError("Server produced StepBeginEntry for unexpected step");
        } else if (beginEntry !== void 0) {
          throw new ProtoError("Server produced StepBeginEntry before terminating previous step");
        }
        for (let step = nextStep; step < entry.step; ++step) {
          steps[step].callback(void 0, void 0);
        }
        nextStep = entry.step + 1;
        beginEntry = entry;
        rows = [];
      } else if (entry.type === "step_end") {
        if (beginEntry === void 0) {
          throw new ProtoError("Server produced StepEndEntry but no step is active");
        }
        const stmtResult = {
          cols: beginEntry.cols,
          rows,
          affectedRowCount: entry.affectedRowCount,
          lastInsertRowid: entry.lastInsertRowid
        };
        steps[beginEntry.step].callback(stmtResult, void 0);
        beginEntry = void 0;
        rows = [];
      } else if (entry.type === "step_error") {
        if (beginEntry === void 0) {
          if (entry.step >= steps.length) {
            throw new ProtoError("Server produced StepErrorEntry for unexpected step");
          }
          for (let step = nextStep; step < entry.step; ++step) {
            steps[step].callback(void 0, void 0);
          }
        } else {
          if (entry.step !== beginEntry.step) {
            throw new ProtoError("Server produced StepErrorEntry for unexpected step");
          }
          beginEntry = void 0;
          rows = [];
        }
        steps[entry.step].callback(void 0, entry.error);
        nextStep = entry.step + 1;
      } else if (entry.type === "row") {
        if (beginEntry === void 0) {
          throw new ProtoError("Server produced RowEntry but no step is active");
        }
        rows.push(entry.row);
      } else if (entry.type === "error") {
        throw errorFromProto(entry.error);
      } else if (entry.type === "none") {
        throw new ProtoError("Server produced unrecognized CursorEntry");
      } else {
        throw impossible(entry, "Impossible CursorEntry");
      }
    }
    if (beginEntry !== void 0) {
      throw new ProtoError("Server closed Cursor before terminating active step");
    }
    for (let step = nextStep; step < steps.length; ++step) {
      steps[step].callback(void 0, void 0);
    }
  } finally {
    cursor.close();
  }
}
__name(executeCursor, "executeCursor");
function stepIndex(step) {
  if (step._index === void 0) {
    throw new MisuseError("Cannot add a condition referencing a step that has not been added to the batch");
  }
  return step._index;
}
__name(stepIndex, "stepIndex");
function checkCondBatch(expectedBatch, cond) {
  if (cond._batch !== expectedBatch) {
    throw new MisuseError("Cannot mix BatchCond objects for different Batch objects");
  }
}
__name(checkCondBatch, "checkCondBatch");
var Batch;
var BatchStep;
var BatchCond;
var init_batch = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/batch.js"() {
    init_errors();
    init_result();
    init_stmt();
    init_util3();
    Batch = class {
      static {
        __name(this, "Batch");
      }
      /** @private */
      _stream;
      #useCursor;
      /** @private */
      _steps;
      #executed;
      /** @private */
      constructor(stream, useCursor) {
        this._stream = stream;
        this.#useCursor = useCursor;
        this._steps = [];
        this.#executed = false;
      }
      /** Return a builder for adding a step to the batch. */
      step() {
        return new BatchStep(this);
      }
      /** Execute the batch. */
      execute() {
        if (this.#executed) {
          throw new MisuseError("This batch has already been executed");
        }
        this.#executed = true;
        const batch = {
          steps: this._steps.map((step) => step.proto)
        };
        if (this.#useCursor) {
          return executeCursor(this._stream, this._steps, batch);
        } else {
          return executeRegular(this._stream, this._steps, batch);
        }
      }
    };
    BatchStep = class {
      static {
        __name(this, "BatchStep");
      }
      /** @private */
      _batch;
      #conds;
      /** @private */
      _index;
      /** @private */
      constructor(batch) {
        this._batch = batch;
        this.#conds = [];
        this._index = void 0;
      }
      /** Add the condition that needs to be satisfied to execute the statement. If you use this method multiple
       * times, we join the conditions with a logical AND. */
      condition(cond) {
        this.#conds.push(cond._proto);
        return this;
      }
      /** Add a statement that returns rows. */
      query(stmt) {
        return this.#add(stmt, true, rowsResultFromProto);
      }
      /** Add a statement that returns at most a single row. */
      queryRow(stmt) {
        return this.#add(stmt, true, rowResultFromProto);
      }
      /** Add a statement that returns at most a single value. */
      queryValue(stmt) {
        return this.#add(stmt, true, valueResultFromProto);
      }
      /** Add a statement without returning rows. */
      run(stmt) {
        return this.#add(stmt, false, stmtResultFromProto);
      }
      #add(inStmt, wantRows, fromProto) {
        if (this._index !== void 0) {
          throw new MisuseError("This BatchStep has already been added to the batch");
        }
        const stmt = stmtToProto(this._batch._stream._sqlOwner(), inStmt, wantRows);
        let condition;
        if (this.#conds.length === 0) {
          condition = void 0;
        } else if (this.#conds.length === 1) {
          condition = this.#conds[0];
        } else {
          condition = { type: "and", conds: this.#conds.slice() };
        }
        const proto = { stmt, condition };
        return new Promise((outputCallback, errorCallback) => {
          const callback = /* @__PURE__ */ __name((stepResult, stepError) => {
            if (stepResult !== void 0 && stepError !== void 0) {
              errorCallback(new ProtoError("Server returned both result and error"));
            } else if (stepError !== void 0) {
              errorCallback(errorFromProto(stepError));
            } else if (stepResult !== void 0) {
              outputCallback(fromProto(stepResult, this._batch._stream.intMode));
            } else {
              outputCallback(void 0);
            }
          }, "callback");
          this._index = this._batch._steps.length;
          this._batch._steps.push({ proto, callback });
        });
      }
    };
    BatchCond = class _BatchCond {
      static {
        __name(this, "_BatchCond");
      }
      /** @private */
      _batch;
      /** @private */
      _proto;
      /** @private */
      constructor(batch, proto) {
        this._batch = batch;
        this._proto = proto;
      }
      /** Create a condition that evaluates to true when the given step executes successfully.
       *
       * If the given step fails error or is skipped because its condition evaluated to false, this
       * condition evaluates to false.
       */
      static ok(step) {
        return new _BatchCond(step._batch, { type: "ok", step: stepIndex(step) });
      }
      /** Create a condition that evaluates to true when the given step fails.
       *
       * If the given step succeeds or is skipped because its condition evaluated to false, this condition
       * evaluates to false.
       */
      static error(step) {
        return new _BatchCond(step._batch, { type: "error", step: stepIndex(step) });
      }
      /** Create a condition that is a logical negation of another condition.
       */
      static not(cond) {
        return new _BatchCond(cond._batch, { type: "not", cond: cond._proto });
      }
      /** Create a condition that is a logical AND of other conditions.
       */
      static and(batch, conds) {
        for (const cond of conds) {
          checkCondBatch(batch, cond);
        }
        return new _BatchCond(batch, { type: "and", conds: conds.map((e) => e._proto) });
      }
      /** Create a condition that is a logical OR of other conditions.
       */
      static or(batch, conds) {
        for (const cond of conds) {
          checkCondBatch(batch, cond);
        }
        return new _BatchCond(batch, { type: "or", conds: conds.map((e) => e._proto) });
      }
      /** Create a condition that evaluates to true when the SQL connection is in autocommit mode (not inside an
       * explicit transaction). This requires protocol version 3 or higher.
       */
      static isAutocommit(batch) {
        batch._stream.client()._ensureVersion(3, "BatchCond.isAutocommit()");
        return new _BatchCond(batch, { type: "is_autocommit" });
      }
    };
  }
});
function describeResultFromProto(result) {
  return {
    paramNames: result.params.map((p) => p.name),
    columns: result.cols,
    isExplain: result.isExplain,
    isReadonly: result.isReadonly
  };
}
__name(describeResultFromProto, "describeResultFromProto");
var init_describe = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/describe.js"() {
  }
});
var Stream;
var init_stream = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/stream.js"() {
    init_batch();
    init_describe();
    init_result();
    init_sql();
    init_stmt();
    Stream = class {
      static {
        __name(this, "Stream");
      }
      /** @private */
      constructor(intMode) {
        this.intMode = intMode;
      }
      /** Execute a statement and return rows. */
      query(stmt) {
        return this.#execute(stmt, true, rowsResultFromProto);
      }
      /** Execute a statement and return at most a single row. */
      queryRow(stmt) {
        return this.#execute(stmt, true, rowResultFromProto);
      }
      /** Execute a statement and return at most a single value. */
      queryValue(stmt) {
        return this.#execute(stmt, true, valueResultFromProto);
      }
      /** Execute a statement without returning rows. */
      run(stmt) {
        return this.#execute(stmt, false, stmtResultFromProto);
      }
      #execute(inStmt, wantRows, fromProto) {
        const stmt = stmtToProto(this._sqlOwner(), inStmt, wantRows);
        return this._execute(stmt).then((r) => fromProto(r, this.intMode));
      }
      /** Return a builder for creating and executing a batch.
       *
       * If `useCursor` is true, the batch will be executed using a Hrana cursor, which will stream results from
       * the server to the client, which consumes less memory on the server. This requires protocol version 3 or
       * higher.
       */
      batch(useCursor = false) {
        return new Batch(this, useCursor);
      }
      /** Parse and analyze a statement. This requires protocol version 2 or higher. */
      describe(inSql) {
        const protoSql = sqlToProto(this._sqlOwner(), inSql);
        return this._describe(protoSql).then(describeResultFromProto);
      }
      /** Execute a sequence of statements separated by semicolons. This requires protocol version 2 or higher.
       * */
      sequence(inSql) {
        const protoSql = sqlToProto(this._sqlOwner(), inSql);
        return this._sequence(protoSql);
      }
      /** Representation of integers returned from the database. See {@link IntMode}.
       *
       * This value affects the results of all operations on this stream.
       */
      intMode;
    };
  }
});
var Cursor;
var init_cursor = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/cursor.js"() {
    Cursor = class {
      static {
        __name(this, "Cursor");
      }
    };
  }
});
var fetchChunkSize;
var fetchQueueSize;
var WsCursor;
var init_cursor2 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/ws/cursor.js"() {
    init_errors();
    init_cursor();
    init_queue();
    fetchChunkSize = 1e3;
    fetchQueueSize = 10;
    WsCursor = class extends Cursor {
      static {
        __name(this, "WsCursor");
      }
      #client;
      #stream;
      #cursorId;
      #entryQueue;
      #fetchQueue;
      #closed;
      #done;
      /** @private */
      constructor(client, stream, cursorId) {
        super();
        this.#client = client;
        this.#stream = stream;
        this.#cursorId = cursorId;
        this.#entryQueue = new Queue();
        this.#fetchQueue = new Queue();
        this.#closed = void 0;
        this.#done = false;
      }
      /** Fetch the next entry from the cursor. */
      async next() {
        for (; ; ) {
          if (this.#closed !== void 0) {
            throw new ClosedError("Cursor is closed", this.#closed);
          }
          while (!this.#done && this.#fetchQueue.length < fetchQueueSize) {
            this.#fetchQueue.push(this.#fetch());
          }
          const entry = this.#entryQueue.shift();
          if (this.#done || entry !== void 0) {
            return entry;
          }
          await this.#fetchQueue.shift().then((response) => {
            if (response === void 0) {
              return;
            }
            for (const entry2 of response.entries) {
              this.#entryQueue.push(entry2);
            }
            this.#done ||= response.done;
          });
        }
      }
      #fetch() {
        return this.#stream._sendCursorRequest(this, {
          type: "fetch_cursor",
          cursorId: this.#cursorId,
          maxCount: fetchChunkSize
        }).then((resp) => resp, (error3) => {
          this._setClosed(error3);
          return void 0;
        });
      }
      /** @private */
      _setClosed(error3) {
        if (this.#closed !== void 0) {
          return;
        }
        this.#closed = error3;
        this.#stream._sendCursorRequest(this, {
          type: "close_cursor",
          cursorId: this.#cursorId
        }).catch(() => void 0);
        this.#stream._cursorClosed(this);
      }
      /** Close the cursor. */
      close() {
        this._setClosed(new ClientError("Cursor was manually closed"));
      }
      /** True if the cursor is closed. */
      get closed() {
        return this.#closed !== void 0;
      }
    };
  }
});
var WsStream;
var init_stream2 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/ws/stream.js"() {
    init_errors();
    init_queue();
    init_stream();
    init_cursor2();
    WsStream = class _WsStream extends Stream {
      static {
        __name(this, "_WsStream");
      }
      #client;
      #streamId;
      #queue;
      #cursor;
      #closing;
      #closed;
      /** @private */
      static open(client) {
        const streamId = client._streamIdAlloc.alloc();
        const stream = new _WsStream(client, streamId);
        const responseCallback = /* @__PURE__ */ __name(() => void 0, "responseCallback");
        const errorCallback = /* @__PURE__ */ __name((e) => stream.#setClosed(e), "errorCallback");
        const request = { type: "open_stream", streamId };
        client._sendRequest(request, { responseCallback, errorCallback });
        return stream;
      }
      /** @private */
      constructor(client, streamId) {
        super(client.intMode);
        this.#client = client;
        this.#streamId = streamId;
        this.#queue = new Queue();
        this.#cursor = void 0;
        this.#closing = false;
        this.#closed = void 0;
      }
      /** Get the {@link WsClient} object that this stream belongs to. */
      client() {
        return this.#client;
      }
      /** @private */
      _sqlOwner() {
        return this.#client;
      }
      /** @private */
      _execute(stmt) {
        return this.#sendStreamRequest({
          type: "execute",
          streamId: this.#streamId,
          stmt
        }).then((response) => {
          return response.result;
        });
      }
      /** @private */
      _batch(batch) {
        return this.#sendStreamRequest({
          type: "batch",
          streamId: this.#streamId,
          batch
        }).then((response) => {
          return response.result;
        });
      }
      /** @private */
      _describe(protoSql) {
        this.#client._ensureVersion(2, "describe()");
        return this.#sendStreamRequest({
          type: "describe",
          streamId: this.#streamId,
          sql: protoSql.sql,
          sqlId: protoSql.sqlId
        }).then((response) => {
          return response.result;
        });
      }
      /** @private */
      _sequence(protoSql) {
        this.#client._ensureVersion(2, "sequence()");
        return this.#sendStreamRequest({
          type: "sequence",
          streamId: this.#streamId,
          sql: protoSql.sql,
          sqlId: protoSql.sqlId
        }).then((_response) => {
          return void 0;
        });
      }
      /** Check whether the SQL connection underlying this stream is in autocommit state (i.e., outside of an
       * explicit transaction). This requires protocol version 3 or higher.
       */
      getAutocommit() {
        this.#client._ensureVersion(3, "getAutocommit()");
        return this.#sendStreamRequest({
          type: "get_autocommit",
          streamId: this.#streamId
        }).then((response) => {
          return response.isAutocommit;
        });
      }
      #sendStreamRequest(request) {
        return new Promise((responseCallback, errorCallback) => {
          this.#pushToQueue({ type: "request", request, responseCallback, errorCallback });
        });
      }
      /** @private */
      _openCursor(batch) {
        this.#client._ensureVersion(3, "cursor");
        return new Promise((cursorCallback, errorCallback) => {
          this.#pushToQueue({ type: "cursor", batch, cursorCallback, errorCallback });
        });
      }
      /** @private */
      _sendCursorRequest(cursor, request) {
        if (cursor !== this.#cursor) {
          throw new InternalError("Cursor not associated with the stream attempted to execute a request");
        }
        return new Promise((responseCallback, errorCallback) => {
          if (this.#closed !== void 0) {
            errorCallback(new ClosedError("Stream is closed", this.#closed));
          } else {
            this.#client._sendRequest(request, { responseCallback, errorCallback });
          }
        });
      }
      /** @private */
      _cursorClosed(cursor) {
        if (cursor !== this.#cursor) {
          throw new InternalError("Cursor was closed, but it was not associated with the stream");
        }
        this.#cursor = void 0;
        this.#flushQueue();
      }
      #pushToQueue(entry) {
        if (this.#closed !== void 0) {
          entry.errorCallback(new ClosedError("Stream is closed", this.#closed));
        } else if (this.#closing) {
          entry.errorCallback(new ClosedError("Stream is closing", void 0));
        } else {
          this.#queue.push(entry);
          this.#flushQueue();
        }
      }
      #flushQueue() {
        for (; ; ) {
          const entry = this.#queue.first();
          if (entry === void 0 && this.#cursor === void 0 && this.#closing) {
            this.#setClosed(new ClientError("Stream was gracefully closed"));
            break;
          } else if (entry?.type === "request" && this.#cursor === void 0) {
            const { request, responseCallback, errorCallback } = entry;
            this.#queue.shift();
            this.#client._sendRequest(request, { responseCallback, errorCallback });
          } else if (entry?.type === "cursor" && this.#cursor === void 0) {
            const { batch, cursorCallback } = entry;
            this.#queue.shift();
            const cursorId = this.#client._cursorIdAlloc.alloc();
            const cursor = new WsCursor(this.#client, this, cursorId);
            const request = {
              type: "open_cursor",
              streamId: this.#streamId,
              cursorId,
              batch
            };
            const responseCallback = /* @__PURE__ */ __name(() => void 0, "responseCallback");
            const errorCallback = /* @__PURE__ */ __name((e) => cursor._setClosed(e), "errorCallback");
            this.#client._sendRequest(request, { responseCallback, errorCallback });
            this.#cursor = cursor;
            cursorCallback(cursor);
          } else {
            break;
          }
        }
      }
      #setClosed(error3) {
        if (this.#closed !== void 0) {
          return;
        }
        this.#closed = error3;
        if (this.#cursor !== void 0) {
          this.#cursor._setClosed(error3);
        }
        for (; ; ) {
          const entry = this.#queue.shift();
          if (entry !== void 0) {
            entry.errorCallback(error3);
          } else {
            break;
          }
        }
        const request = { type: "close_stream", streamId: this.#streamId };
        const responseCallback = /* @__PURE__ */ __name(() => this.#client._streamIdAlloc.free(this.#streamId), "responseCallback");
        const errorCallback = /* @__PURE__ */ __name(() => void 0, "errorCallback");
        this.#client._sendRequest(request, { responseCallback, errorCallback });
      }
      /** Immediately close the stream. */
      close() {
        this.#setClosed(new ClientError("Stream was manually closed"));
      }
      /** Gracefully close the stream. */
      closeGracefully() {
        this.#closing = true;
        this.#flushQueue();
      }
      /** True if the stream is closed or closing. */
      get closed() {
        return this.#closed !== void 0 || this.#closing;
      }
    };
  }
});
function Stmt2(w, msg) {
  if (msg.sql !== void 0) {
    w.string("sql", msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.number("sql_id", msg.sqlId);
  }
  w.arrayObjects("args", msg.args, Value);
  w.arrayObjects("named_args", msg.namedArgs, NamedArg);
  w.boolean("want_rows", msg.wantRows);
}
__name(Stmt2, "Stmt2");
function NamedArg(w, msg) {
  w.string("name", msg.name);
  w.object("value", msg.value, Value);
}
__name(NamedArg, "NamedArg");
function Batch2(w, msg) {
  w.arrayObjects("steps", msg.steps, BatchStep2);
}
__name(Batch2, "Batch2");
function BatchStep2(w, msg) {
  if (msg.condition !== void 0) {
    w.object("condition", msg.condition, BatchCond2);
  }
  w.object("stmt", msg.stmt, Stmt2);
}
__name(BatchStep2, "BatchStep2");
function BatchCond2(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "ok" || msg.type === "error") {
    w.number("step", msg.step);
  } else if (msg.type === "not") {
    w.object("cond", msg.cond, BatchCond2);
  } else if (msg.type === "and" || msg.type === "or") {
    w.arrayObjects("conds", msg.conds, BatchCond2);
  } else if (msg.type === "is_autocommit") {
  } else {
    throw impossible(msg, "Impossible type of BatchCond");
  }
}
__name(BatchCond2, "BatchCond2");
function Value(w, msg) {
  if (msg === null) {
    w.stringRaw("type", "null");
  } else if (typeof msg === "bigint") {
    w.stringRaw("type", "integer");
    w.stringRaw("value", "" + msg);
  } else if (typeof msg === "number") {
    w.stringRaw("type", "float");
    w.number("value", msg);
  } else if (typeof msg === "string") {
    w.stringRaw("type", "text");
    w.string("value", msg);
  } else if (msg instanceof Uint8Array) {
    w.stringRaw("type", "blob");
    w.stringRaw("base64", gBase64.fromUint8Array(msg));
  } else if (msg === void 0) {
  } else {
    throw impossible(msg, "Impossible type of Value");
  }
}
__name(Value, "Value");
var init_json_encode = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/shared/json_encode.js"() {
    init_base64();
    init_util3();
  }
});
function ClientMsg(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "hello") {
    if (msg.jwt !== void 0) {
      w.string("jwt", msg.jwt);
    }
  } else if (msg.type === "request") {
    w.number("request_id", msg.requestId);
    w.object("request", msg.request, Request2);
  } else {
    throw impossible(msg, "Impossible type of ClientMsg");
  }
}
__name(ClientMsg, "ClientMsg");
function Request2(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "open_stream") {
    w.number("stream_id", msg.streamId);
  } else if (msg.type === "close_stream") {
    w.number("stream_id", msg.streamId);
  } else if (msg.type === "execute") {
    w.number("stream_id", msg.streamId);
    w.object("stmt", msg.stmt, Stmt2);
  } else if (msg.type === "batch") {
    w.number("stream_id", msg.streamId);
    w.object("batch", msg.batch, Batch2);
  } else if (msg.type === "open_cursor") {
    w.number("stream_id", msg.streamId);
    w.number("cursor_id", msg.cursorId);
    w.object("batch", msg.batch, Batch2);
  } else if (msg.type === "close_cursor") {
    w.number("cursor_id", msg.cursorId);
  } else if (msg.type === "fetch_cursor") {
    w.number("cursor_id", msg.cursorId);
    w.number("max_count", msg.maxCount);
  } else if (msg.type === "sequence") {
    w.number("stream_id", msg.streamId);
    if (msg.sql !== void 0) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== void 0) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "describe") {
    w.number("stream_id", msg.streamId);
    if (msg.sql !== void 0) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== void 0) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "store_sql") {
    w.number("sql_id", msg.sqlId);
    w.string("sql", msg.sql);
  } else if (msg.type === "close_sql") {
    w.number("sql_id", msg.sqlId);
  } else if (msg.type === "get_autocommit") {
    w.number("stream_id", msg.streamId);
  } else {
    throw impossible(msg, "Impossible type of Request");
  }
}
__name(Request2, "Request2");
var init_json_encode2 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/ws/json_encode.js"() {
    init_json_encode();
    init_util3();
  }
});
function Stmt3(w, msg) {
  if (msg.sql !== void 0) {
    w.string(1, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(2, msg.sqlId);
  }
  for (const arg of msg.args) {
    w.message(3, arg, Value2);
  }
  for (const arg of msg.namedArgs) {
    w.message(4, arg, NamedArg2);
  }
  w.bool(5, msg.wantRows);
}
__name(Stmt3, "Stmt3");
function NamedArg2(w, msg) {
  w.string(1, msg.name);
  w.message(2, msg.value, Value2);
}
__name(NamedArg2, "NamedArg2");
function Batch3(w, msg) {
  for (const step of msg.steps) {
    w.message(1, step, BatchStep3);
  }
}
__name(Batch3, "Batch3");
function BatchStep3(w, msg) {
  if (msg.condition !== void 0) {
    w.message(1, msg.condition, BatchCond3);
  }
  w.message(2, msg.stmt, Stmt3);
}
__name(BatchStep3, "BatchStep3");
function BatchCond3(w, msg) {
  if (msg.type === "ok") {
    w.uint32(1, msg.step);
  } else if (msg.type === "error") {
    w.uint32(2, msg.step);
  } else if (msg.type === "not") {
    w.message(3, msg.cond, BatchCond3);
  } else if (msg.type === "and") {
    w.message(4, msg.conds, BatchCondList);
  } else if (msg.type === "or") {
    w.message(5, msg.conds, BatchCondList);
  } else if (msg.type === "is_autocommit") {
    w.message(6, void 0, Empty);
  } else {
    throw impossible(msg, "Impossible type of BatchCond");
  }
}
__name(BatchCond3, "BatchCond3");
function BatchCondList(w, msg) {
  for (const cond of msg) {
    w.message(1, cond, BatchCond3);
  }
}
__name(BatchCondList, "BatchCondList");
function Value2(w, msg) {
  if (msg === null) {
    w.message(1, void 0, Empty);
  } else if (typeof msg === "bigint") {
    w.sint64(2, msg);
  } else if (typeof msg === "number") {
    w.double(3, msg);
  } else if (typeof msg === "string") {
    w.string(4, msg);
  } else if (msg instanceof Uint8Array) {
    w.bytes(5, msg);
  } else if (msg === void 0) {
  } else {
    throw impossible(msg, "Impossible type of Value");
  }
}
__name(Value2, "Value2");
function Empty(_w, _msg) {
}
__name(Empty, "Empty");
var init_protobuf_encode = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/shared/protobuf_encode.js"() {
    init_util3();
  }
});
function ClientMsg2(w, msg) {
  if (msg.type === "hello") {
    w.message(1, msg, HelloMsg);
  } else if (msg.type === "request") {
    w.message(2, msg, RequestMsg);
  } else {
    throw impossible(msg, "Impossible type of ClientMsg");
  }
}
__name(ClientMsg2, "ClientMsg2");
function HelloMsg(w, msg) {
  if (msg.jwt !== void 0) {
    w.string(1, msg.jwt);
  }
}
__name(HelloMsg, "HelloMsg");
function RequestMsg(w, msg) {
  w.int32(1, msg.requestId);
  const request = msg.request;
  if (request.type === "open_stream") {
    w.message(2, request, OpenStreamReq);
  } else if (request.type === "close_stream") {
    w.message(3, request, CloseStreamReq);
  } else if (request.type === "execute") {
    w.message(4, request, ExecuteReq);
  } else if (request.type === "batch") {
    w.message(5, request, BatchReq);
  } else if (request.type === "open_cursor") {
    w.message(6, request, OpenCursorReq);
  } else if (request.type === "close_cursor") {
    w.message(7, request, CloseCursorReq);
  } else if (request.type === "fetch_cursor") {
    w.message(8, request, FetchCursorReq);
  } else if (request.type === "sequence") {
    w.message(9, request, SequenceReq);
  } else if (request.type === "describe") {
    w.message(10, request, DescribeReq);
  } else if (request.type === "store_sql") {
    w.message(11, request, StoreSqlReq);
  } else if (request.type === "close_sql") {
    w.message(12, request, CloseSqlReq);
  } else if (request.type === "get_autocommit") {
    w.message(13, request, GetAutocommitReq);
  } else {
    throw impossible(request, "Impossible type of Request");
  }
}
__name(RequestMsg, "RequestMsg");
function OpenStreamReq(w, msg) {
  w.int32(1, msg.streamId);
}
__name(OpenStreamReq, "OpenStreamReq");
function CloseStreamReq(w, msg) {
  w.int32(1, msg.streamId);
}
__name(CloseStreamReq, "CloseStreamReq");
function ExecuteReq(w, msg) {
  w.int32(1, msg.streamId);
  w.message(2, msg.stmt, Stmt3);
}
__name(ExecuteReq, "ExecuteReq");
function BatchReq(w, msg) {
  w.int32(1, msg.streamId);
  w.message(2, msg.batch, Batch3);
}
__name(BatchReq, "BatchReq");
function OpenCursorReq(w, msg) {
  w.int32(1, msg.streamId);
  w.int32(2, msg.cursorId);
  w.message(3, msg.batch, Batch3);
}
__name(OpenCursorReq, "OpenCursorReq");
function CloseCursorReq(w, msg) {
  w.int32(1, msg.cursorId);
}
__name(CloseCursorReq, "CloseCursorReq");
function FetchCursorReq(w, msg) {
  w.int32(1, msg.cursorId);
  w.uint32(2, msg.maxCount);
}
__name(FetchCursorReq, "FetchCursorReq");
function SequenceReq(w, msg) {
  w.int32(1, msg.streamId);
  if (msg.sql !== void 0) {
    w.string(2, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(3, msg.sqlId);
  }
}
__name(SequenceReq, "SequenceReq");
function DescribeReq(w, msg) {
  w.int32(1, msg.streamId);
  if (msg.sql !== void 0) {
    w.string(2, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(3, msg.sqlId);
  }
}
__name(DescribeReq, "DescribeReq");
function StoreSqlReq(w, msg) {
  w.int32(1, msg.sqlId);
  w.string(2, msg.sql);
}
__name(StoreSqlReq, "StoreSqlReq");
function CloseSqlReq(w, msg) {
  w.int32(1, msg.sqlId);
}
__name(CloseSqlReq, "CloseSqlReq");
function GetAutocommitReq(w, msg) {
  w.int32(1, msg.streamId);
}
__name(GetAutocommitReq, "GetAutocommitReq");
var init_protobuf_encode2 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/ws/protobuf_encode.js"() {
    init_protobuf_encode();
    init_util3();
  }
});
function Error2(obj) {
  const message = string(obj["message"]);
  const code = stringOpt(obj["code"]);
  return { message, code };
}
__name(Error2, "Error2");
function StmtResult(obj) {
  const cols = arrayObjectsMap(obj["cols"], Col);
  const rows = array(obj["rows"]).map((rowObj) => arrayObjectsMap(rowObj, Value3));
  const affectedRowCount = number(obj["affected_row_count"]);
  const lastInsertRowidStr = stringOpt(obj["last_insert_rowid"]);
  const lastInsertRowid = lastInsertRowidStr !== void 0 ? BigInt(lastInsertRowidStr) : void 0;
  return { cols, rows, affectedRowCount, lastInsertRowid };
}
__name(StmtResult, "StmtResult");
function Col(obj) {
  const name = stringOpt(obj["name"]);
  const decltype = stringOpt(obj["decltype"]);
  return { name, decltype };
}
__name(Col, "Col");
function BatchResult(obj) {
  const stepResults = /* @__PURE__ */ new Map();
  array(obj["step_results"]).forEach((value, i) => {
    if (value !== null) {
      stepResults.set(i, StmtResult(object(value)));
    }
  });
  const stepErrors = /* @__PURE__ */ new Map();
  array(obj["step_errors"]).forEach((value, i) => {
    if (value !== null) {
      stepErrors.set(i, Error2(object(value)));
    }
  });
  return { stepResults, stepErrors };
}
__name(BatchResult, "BatchResult");
function CursorEntry(obj) {
  const type = string(obj["type"]);
  if (type === "step_begin") {
    const step = number(obj["step"]);
    const cols = arrayObjectsMap(obj["cols"], Col);
    return { type: "step_begin", step, cols };
  } else if (type === "step_end") {
    const affectedRowCount = number(obj["affected_row_count"]);
    const lastInsertRowidStr = stringOpt(obj["last_insert_rowid"]);
    const lastInsertRowid = lastInsertRowidStr !== void 0 ? BigInt(lastInsertRowidStr) : void 0;
    return { type: "step_end", affectedRowCount, lastInsertRowid };
  } else if (type === "step_error") {
    const step = number(obj["step"]);
    const error3 = Error2(object(obj["error"]));
    return { type: "step_error", step, error: error3 };
  } else if (type === "row") {
    const row = arrayObjectsMap(obj["row"], Value3);
    return { type: "row", row };
  } else if (type === "error") {
    const error3 = Error2(object(obj["error"]));
    return { type: "error", error: error3 };
  } else {
    throw new ProtoError("Unexpected type of CursorEntry");
  }
}
__name(CursorEntry, "CursorEntry");
function DescribeResult(obj) {
  const params = arrayObjectsMap(obj["params"], DescribeParam);
  const cols = arrayObjectsMap(obj["cols"], DescribeCol);
  const isExplain = boolean(obj["is_explain"]);
  const isReadonly = boolean(obj["is_readonly"]);
  return { params, cols, isExplain, isReadonly };
}
__name(DescribeResult, "DescribeResult");
function DescribeParam(obj) {
  const name = stringOpt(obj["name"]);
  return { name };
}
__name(DescribeParam, "DescribeParam");
function DescribeCol(obj) {
  const name = string(obj["name"]);
  const decltype = stringOpt(obj["decltype"]);
  return { name, decltype };
}
__name(DescribeCol, "DescribeCol");
function Value3(obj) {
  const type = string(obj["type"]);
  if (type === "null") {
    return null;
  } else if (type === "integer") {
    const value = string(obj["value"]);
    return BigInt(value);
  } else if (type === "float") {
    return number(obj["value"]);
  } else if (type === "text") {
    return string(obj["value"]);
  } else if (type === "blob") {
    return gBase64.toUint8Array(string(obj["base64"]));
  } else {
    throw new ProtoError("Unexpected type of Value");
  }
}
__name(Value3, "Value3");
var init_json_decode = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/shared/json_decode.js"() {
    init_base64();
    init_errors();
    init_decode();
  }
});
function ServerMsg(obj) {
  const type = string(obj["type"]);
  if (type === "hello_ok") {
    return { type: "hello_ok" };
  } else if (type === "hello_error") {
    const error3 = Error2(object(obj["error"]));
    return { type: "hello_error", error: error3 };
  } else if (type === "response_ok") {
    const requestId = number(obj["request_id"]);
    const response = Response2(object(obj["response"]));
    return { type: "response_ok", requestId, response };
  } else if (type === "response_error") {
    const requestId = number(obj["request_id"]);
    const error3 = Error2(object(obj["error"]));
    return { type: "response_error", requestId, error: error3 };
  } else {
    throw new ProtoError("Unexpected type of ServerMsg");
  }
}
__name(ServerMsg, "ServerMsg");
function Response2(obj) {
  const type = string(obj["type"]);
  if (type === "open_stream") {
    return { type: "open_stream" };
  } else if (type === "close_stream") {
    return { type: "close_stream" };
  } else if (type === "execute") {
    const result = StmtResult(object(obj["result"]));
    return { type: "execute", result };
  } else if (type === "batch") {
    const result = BatchResult(object(obj["result"]));
    return { type: "batch", result };
  } else if (type === "open_cursor") {
    return { type: "open_cursor" };
  } else if (type === "close_cursor") {
    return { type: "close_cursor" };
  } else if (type === "fetch_cursor") {
    const entries = arrayObjectsMap(obj["entries"], CursorEntry);
    const done = boolean(obj["done"]);
    return { type: "fetch_cursor", entries, done };
  } else if (type === "sequence") {
    return { type: "sequence" };
  } else if (type === "describe") {
    const result = DescribeResult(object(obj["result"]));
    return { type: "describe", result };
  } else if (type === "store_sql") {
    return { type: "store_sql" };
  } else if (type === "close_sql") {
    return { type: "close_sql" };
  } else if (type === "get_autocommit") {
    const isAutocommit = boolean(obj["is_autocommit"]);
    return { type: "get_autocommit", isAutocommit };
  } else {
    throw new ProtoError("Unexpected type of Response");
  }
}
__name(Response2, "Response2");
var init_json_decode2 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/ws/json_decode.js"() {
    init_errors();
    init_decode();
    init_json_decode();
  }
});
var Error3;
var StmtResult2;
var Col2;
var Row;
var BatchResult2;
var BatchResultStepResult;
var BatchResultStepError;
var CursorEntry2;
var StepBeginEntry;
var StepEndEntry;
var StepErrorEntry;
var DescribeResult2;
var DescribeParam2;
var DescribeCol2;
var Value4;
var init_protobuf_decode = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/shared/protobuf_decode.js"() {
    Error3 = {
      default() {
        return { message: "", code: void 0 };
      },
      1(r, msg) {
        msg.message = r.string();
      },
      2(r, msg) {
        msg.code = r.string();
      }
    };
    StmtResult2 = {
      default() {
        return {
          cols: [],
          rows: [],
          affectedRowCount: 0,
          lastInsertRowid: void 0
        };
      },
      1(r, msg) {
        msg.cols.push(r.message(Col2));
      },
      2(r, msg) {
        msg.rows.push(r.message(Row));
      },
      3(r, msg) {
        msg.affectedRowCount = Number(r.uint64());
      },
      4(r, msg) {
        msg.lastInsertRowid = r.sint64();
      }
    };
    Col2 = {
      default() {
        return { name: void 0, decltype: void 0 };
      },
      1(r, msg) {
        msg.name = r.string();
      },
      2(r, msg) {
        msg.decltype = r.string();
      }
    };
    Row = {
      default() {
        return [];
      },
      1(r, msg) {
        msg.push(r.message(Value4));
      }
    };
    BatchResult2 = {
      default() {
        return { stepResults: /* @__PURE__ */ new Map(), stepErrors: /* @__PURE__ */ new Map() };
      },
      1(r, msg) {
        const [key, value] = r.message(BatchResultStepResult);
        msg.stepResults.set(key, value);
      },
      2(r, msg) {
        const [key, value] = r.message(BatchResultStepError);
        msg.stepErrors.set(key, value);
      }
    };
    BatchResultStepResult = {
      default() {
        return [0, StmtResult2.default()];
      },
      1(r, msg) {
        msg[0] = r.uint32();
      },
      2(r, msg) {
        msg[1] = r.message(StmtResult2);
      }
    };
    BatchResultStepError = {
      default() {
        return [0, Error3.default()];
      },
      1(r, msg) {
        msg[0] = r.uint32();
      },
      2(r, msg) {
        msg[1] = r.message(Error3);
      }
    };
    CursorEntry2 = {
      default() {
        return { type: "none" };
      },
      1(r) {
        return r.message(StepBeginEntry);
      },
      2(r) {
        return r.message(StepEndEntry);
      },
      3(r) {
        return r.message(StepErrorEntry);
      },
      4(r) {
        return { type: "row", row: r.message(Row) };
      },
      5(r) {
        return { type: "error", error: r.message(Error3) };
      }
    };
    StepBeginEntry = {
      default() {
        return { type: "step_begin", step: 0, cols: [] };
      },
      1(r, msg) {
        msg.step = r.uint32();
      },
      2(r, msg) {
        msg.cols.push(r.message(Col2));
      }
    };
    StepEndEntry = {
      default() {
        return {
          type: "step_end",
          affectedRowCount: 0,
          lastInsertRowid: void 0
        };
      },
      1(r, msg) {
        msg.affectedRowCount = r.uint32();
      },
      2(r, msg) {
        msg.lastInsertRowid = r.uint64();
      }
    };
    StepErrorEntry = {
      default() {
        return {
          type: "step_error",
          step: 0,
          error: Error3.default()
        };
      },
      1(r, msg) {
        msg.step = r.uint32();
      },
      2(r, msg) {
        msg.error = r.message(Error3);
      }
    };
    DescribeResult2 = {
      default() {
        return {
          params: [],
          cols: [],
          isExplain: false,
          isReadonly: false
        };
      },
      1(r, msg) {
        msg.params.push(r.message(DescribeParam2));
      },
      2(r, msg) {
        msg.cols.push(r.message(DescribeCol2));
      },
      3(r, msg) {
        msg.isExplain = r.bool();
      },
      4(r, msg) {
        msg.isReadonly = r.bool();
      }
    };
    DescribeParam2 = {
      default() {
        return { name: void 0 };
      },
      1(r, msg) {
        msg.name = r.string();
      }
    };
    DescribeCol2 = {
      default() {
        return { name: "", decltype: void 0 };
      },
      1(r, msg) {
        msg.name = r.string();
      },
      2(r, msg) {
        msg.decltype = r.string();
      }
    };
    Value4 = {
      default() {
        return void 0;
      },
      1(r) {
        return null;
      },
      2(r) {
        return r.sint64();
      },
      3(r) {
        return r.double();
      },
      4(r) {
        return r.string();
      },
      5(r) {
        return r.bytes();
      }
    };
  }
});
var ServerMsg2;
var HelloErrorMsg;
var ResponseErrorMsg;
var ResponseOkMsg;
var ExecuteResp;
var BatchResp;
var FetchCursorResp;
var DescribeResp;
var GetAutocommitResp;
var init_protobuf_decode2 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/ws/protobuf_decode.js"() {
    init_protobuf_decode();
    ServerMsg2 = {
      default() {
        return { type: "none" };
      },
      1(r) {
        return { type: "hello_ok" };
      },
      2(r) {
        return r.message(HelloErrorMsg);
      },
      3(r) {
        return r.message(ResponseOkMsg);
      },
      4(r) {
        return r.message(ResponseErrorMsg);
      }
    };
    HelloErrorMsg = {
      default() {
        return { type: "hello_error", error: Error3.default() };
      },
      1(r, msg) {
        msg.error = r.message(Error3);
      }
    };
    ResponseErrorMsg = {
      default() {
        return { type: "response_error", requestId: 0, error: Error3.default() };
      },
      1(r, msg) {
        msg.requestId = r.int32();
      },
      2(r, msg) {
        msg.error = r.message(Error3);
      }
    };
    ResponseOkMsg = {
      default() {
        return {
          type: "response_ok",
          requestId: 0,
          response: { type: "none" }
        };
      },
      1(r, msg) {
        msg.requestId = r.int32();
      },
      2(r, msg) {
        msg.response = { type: "open_stream" };
      },
      3(r, msg) {
        msg.response = { type: "close_stream" };
      },
      4(r, msg) {
        msg.response = r.message(ExecuteResp);
      },
      5(r, msg) {
        msg.response = r.message(BatchResp);
      },
      6(r, msg) {
        msg.response = { type: "open_cursor" };
      },
      7(r, msg) {
        msg.response = { type: "close_cursor" };
      },
      8(r, msg) {
        msg.response = r.message(FetchCursorResp);
      },
      9(r, msg) {
        msg.response = { type: "sequence" };
      },
      10(r, msg) {
        msg.response = r.message(DescribeResp);
      },
      11(r, msg) {
        msg.response = { type: "store_sql" };
      },
      12(r, msg) {
        msg.response = { type: "close_sql" };
      },
      13(r, msg) {
        msg.response = r.message(GetAutocommitResp);
      }
    };
    ExecuteResp = {
      default() {
        return { type: "execute", result: StmtResult2.default() };
      },
      1(r, msg) {
        msg.result = r.message(StmtResult2);
      }
    };
    BatchResp = {
      default() {
        return { type: "batch", result: BatchResult2.default() };
      },
      1(r, msg) {
        msg.result = r.message(BatchResult2);
      }
    };
    FetchCursorResp = {
      default() {
        return { type: "fetch_cursor", entries: [], done: false };
      },
      1(r, msg) {
        msg.entries.push(r.message(CursorEntry2));
      },
      2(r, msg) {
        msg.done = r.bool();
      }
    };
    DescribeResp = {
      default() {
        return { type: "describe", result: DescribeResult2.default() };
      },
      1(r, msg) {
        msg.result = r.message(DescribeResult2);
      }
    };
    GetAutocommitResp = {
      default() {
        return { type: "get_autocommit", isAutocommit: false };
      },
      1(r, msg) {
        msg.isAutocommit = r.bool();
      }
    };
  }
});
var subprotocolsV2;
var subprotocolsV3;
var WsClient;
var init_client2 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/ws/client.js"() {
    init_client();
    init_encoding();
    init_errors();
    init_id_alloc();
    init_result();
    init_sql();
    init_util3();
    init_stream2();
    init_json_encode2();
    init_protobuf_encode2();
    init_json_decode2();
    init_protobuf_decode2();
    subprotocolsV2 = /* @__PURE__ */ new Map([
      ["hrana2", { version: 2, encoding: "json" }],
      ["hrana1", { version: 1, encoding: "json" }]
    ]);
    subprotocolsV3 = /* @__PURE__ */ new Map([
      ["hrana3-protobuf", { version: 3, encoding: "protobuf" }],
      ["hrana3", { version: 3, encoding: "json" }],
      ["hrana2", { version: 2, encoding: "json" }],
      ["hrana1", { version: 1, encoding: "json" }]
    ]);
    WsClient = class extends Client {
      static {
        __name(this, "WsClient");
      }
      #socket;
      // List of callbacks that we queue until the socket transitions from the CONNECTING to the OPEN state.
      #openCallbacks;
      // Have we already transitioned from CONNECTING to OPEN and fired the callbacks in #openCallbacks?
      #opened;
      // Stores the error that caused us to close the client (and the socket). If we are not closed, this is
      // `undefined`.
      #closed;
      // Have we received a response to our "hello" from the server?
      #recvdHello;
      // Subprotocol negotiated with the server. It is only available after the socket transitions to the OPEN
      // state.
      #subprotocol;
      // Has the `getVersion()` function been called? This is only used to validate that the API is used
      // correctly.
      #getVersionCalled;
      // A map from request id to the responses that we expect to receive from the server.
      #responseMap;
      // An allocator of request ids.
      #requestIdAlloc;
      // An allocator of stream ids.
      /** @private */
      _streamIdAlloc;
      // An allocator of cursor ids.
      /** @private */
      _cursorIdAlloc;
      // An allocator of SQL text ids.
      #sqlIdAlloc;
      /** @private */
      constructor(socket, jwt7) {
        super();
        this.#socket = socket;
        this.#openCallbacks = [];
        this.#opened = false;
        this.#closed = void 0;
        this.#recvdHello = false;
        this.#subprotocol = void 0;
        this.#getVersionCalled = false;
        this.#responseMap = /* @__PURE__ */ new Map();
        this.#requestIdAlloc = new IdAlloc();
        this._streamIdAlloc = new IdAlloc();
        this._cursorIdAlloc = new IdAlloc();
        this.#sqlIdAlloc = new IdAlloc();
        this.#socket.binaryType = "arraybuffer";
        this.#socket.addEventListener("open", () => this.#onSocketOpen());
        this.#socket.addEventListener("close", (event) => this.#onSocketClose(event));
        this.#socket.addEventListener("error", (event) => this.#onSocketError(event));
        this.#socket.addEventListener("message", (event) => this.#onSocketMessage(event));
        this.#send({ type: "hello", jwt: jwt7 });
      }
      // Send (or enqueue to send) a message to the server.
      #send(msg) {
        if (this.#closed !== void 0) {
          throw new InternalError("Trying to send a message on a closed client");
        }
        if (this.#opened) {
          this.#sendToSocket(msg);
        } else {
          const openCallback = /* @__PURE__ */ __name(() => this.#sendToSocket(msg), "openCallback");
          const errorCallback = /* @__PURE__ */ __name(() => void 0, "errorCallback");
          this.#openCallbacks.push({ openCallback, errorCallback });
        }
      }
      // The socket transitioned from CONNECTING to OPEN
      #onSocketOpen() {
        const protocol = this.#socket.protocol;
        if (protocol === void 0) {
          this.#setClosed(new ClientError("The `WebSocket.protocol` property is undefined. This most likely means that the WebSocket implementation provided by the environment is broken. If you are using Miniflare 2, please update to Miniflare 3, which fixes this problem."));
          return;
        } else if (protocol === "") {
          this.#subprotocol = { version: 1, encoding: "json" };
        } else {
          this.#subprotocol = subprotocolsV3.get(protocol);
          if (this.#subprotocol === void 0) {
            this.#setClosed(new ProtoError(`Unrecognized WebSocket subprotocol: ${JSON.stringify(protocol)}`));
            return;
          }
        }
        for (const callbacks of this.#openCallbacks) {
          callbacks.openCallback();
        }
        this.#openCallbacks.length = 0;
        this.#opened = true;
      }
      #sendToSocket(msg) {
        const encoding = this.#subprotocol.encoding;
        if (encoding === "json") {
          const jsonMsg = writeJsonObject(msg, ClientMsg);
          this.#socket.send(jsonMsg);
        } else if (encoding === "protobuf") {
          const protobufMsg = writeProtobufMessage(msg, ClientMsg2);
          this.#socket.send(protobufMsg);
        } else {
          throw impossible(encoding, "Impossible encoding");
        }
      }
      /** Get the protocol version negotiated with the server, possibly waiting until the socket is open. */
      getVersion() {
        return new Promise((versionCallback, errorCallback) => {
          this.#getVersionCalled = true;
          if (this.#closed !== void 0) {
            errorCallback(this.#closed);
          } else if (!this.#opened) {
            const openCallback = /* @__PURE__ */ __name(() => versionCallback(this.#subprotocol.version), "openCallback");
            this.#openCallbacks.push({ openCallback, errorCallback });
          } else {
            versionCallback(this.#subprotocol.version);
          }
        });
      }
      // Make sure that the negotiated version is at least `minVersion`.
      /** @private */
      _ensureVersion(minVersion, feature) {
        if (this.#subprotocol === void 0 || !this.#getVersionCalled) {
          throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, but the version supported by the WebSocket server is not yet known. Use Client.getVersion() to wait until the version is available.`);
        } else if (this.#subprotocol.version < minVersion) {
          throw new ProtocolVersionError(`${feature} is supported on protocol version ${minVersion} and higher, but the WebSocket server only supports version ${this.#subprotocol.version}`);
        }
      }
      // Send a request to the server and invoke a callback when we get the response.
      /** @private */
      _sendRequest(request, callbacks) {
        if (this.#closed !== void 0) {
          callbacks.errorCallback(new ClosedError("Client is closed", this.#closed));
          return;
        }
        const requestId = this.#requestIdAlloc.alloc();
        this.#responseMap.set(requestId, { ...callbacks, type: request.type });
        this.#send({ type: "request", requestId, request });
      }
      // The socket encountered an error.
      #onSocketError(event) {
        const eventMessage = event.message;
        const message = eventMessage ?? "WebSocket was closed due to an error";
        this.#setClosed(new WebSocketError(message));
      }
      // The socket was closed.
      #onSocketClose(event) {
        let message = `WebSocket was closed with code ${event.code}`;
        if (event.reason) {
          message += `: ${event.reason}`;
        }
        this.#setClosed(new WebSocketError(message));
      }
      // Close the client with the given error.
      #setClosed(error3) {
        if (this.#closed !== void 0) {
          return;
        }
        this.#closed = error3;
        for (const callbacks of this.#openCallbacks) {
          callbacks.errorCallback(error3);
        }
        this.#openCallbacks.length = 0;
        for (const [requestId, responseState] of this.#responseMap.entries()) {
          responseState.errorCallback(error3);
          this.#requestIdAlloc.free(requestId);
        }
        this.#responseMap.clear();
        this.#socket.close();
      }
      // We received a message from the socket.
      #onSocketMessage(event) {
        if (this.#closed !== void 0) {
          return;
        }
        try {
          let msg;
          const encoding = this.#subprotocol.encoding;
          if (encoding === "json") {
            if (typeof event.data !== "string") {
              this.#socket.close(3003, "Only text messages are accepted with JSON encoding");
              this.#setClosed(new ProtoError("Received non-text message from server with JSON encoding"));
              return;
            }
            msg = readJsonObject(JSON.parse(event.data), ServerMsg);
          } else if (encoding === "protobuf") {
            if (!(event.data instanceof ArrayBuffer)) {
              this.#socket.close(3003, "Only binary messages are accepted with Protobuf encoding");
              this.#setClosed(new ProtoError("Received non-binary message from server with Protobuf encoding"));
              return;
            }
            msg = readProtobufMessage(new Uint8Array(event.data), ServerMsg2);
          } else {
            throw impossible(encoding, "Impossible encoding");
          }
          this.#handleMsg(msg);
        } catch (e) {
          this.#socket.close(3007, "Could not handle message");
          this.#setClosed(e);
        }
      }
      // Handle a message from the server.
      #handleMsg(msg) {
        if (msg.type === "none") {
          throw new ProtoError("Received an unrecognized ServerMsg");
        } else if (msg.type === "hello_ok" || msg.type === "hello_error") {
          if (this.#recvdHello) {
            throw new ProtoError("Received a duplicated hello response");
          }
          this.#recvdHello = true;
          if (msg.type === "hello_error") {
            throw errorFromProto(msg.error);
          }
          return;
        } else if (!this.#recvdHello) {
          throw new ProtoError("Received a non-hello message before a hello response");
        }
        if (msg.type === "response_ok") {
          const requestId = msg.requestId;
          const responseState = this.#responseMap.get(requestId);
          this.#responseMap.delete(requestId);
          if (responseState === void 0) {
            throw new ProtoError("Received unexpected OK response");
          }
          this.#requestIdAlloc.free(requestId);
          try {
            if (responseState.type !== msg.response.type) {
              console.dir({ responseState, msg });
              throw new ProtoError("Received unexpected type of response");
            }
            responseState.responseCallback(msg.response);
          } catch (e) {
            responseState.errorCallback(e);
            throw e;
          }
        } else if (msg.type === "response_error") {
          const requestId = msg.requestId;
          const responseState = this.#responseMap.get(requestId);
          this.#responseMap.delete(requestId);
          if (responseState === void 0) {
            throw new ProtoError("Received unexpected error response");
          }
          this.#requestIdAlloc.free(requestId);
          responseState.errorCallback(errorFromProto(msg.error));
        } else {
          throw impossible(msg, "Impossible ServerMsg type");
        }
      }
      /** Open a {@link WsStream}, a stream for executing SQL statements. */
      openStream() {
        return WsStream.open(this);
      }
      /** Cache a SQL text on the server. This requires protocol version 2 or higher. */
      storeSql(sql) {
        this._ensureVersion(2, "storeSql()");
        const sqlId = this.#sqlIdAlloc.alloc();
        const sqlObj = new Sql(this, sqlId);
        const responseCallback = /* @__PURE__ */ __name(() => void 0, "responseCallback");
        const errorCallback = /* @__PURE__ */ __name((e) => sqlObj._setClosed(e), "errorCallback");
        const request = { type: "store_sql", sqlId, sql };
        this._sendRequest(request, { responseCallback, errorCallback });
        return sqlObj;
      }
      /** @private */
      _closeSql(sqlId) {
        if (this.#closed !== void 0) {
          return;
        }
        const responseCallback = /* @__PURE__ */ __name(() => this.#sqlIdAlloc.free(sqlId), "responseCallback");
        const errorCallback = /* @__PURE__ */ __name((e) => this.#setClosed(e), "errorCallback");
        const request = { type: "close_sql", sqlId };
        this._sendRequest(request, { responseCallback, errorCallback });
      }
      /** Close the client and the WebSocket. */
      close() {
        this.#setClosed(new ClientError("Client was manually closed"));
      }
      /** True if the client is closed. */
      get closed() {
        return this.#closed !== void 0;
      }
    };
  }
});
var _fetch;
var _Request;
var _Headers;
var init_web2 = __esm({
  "node_modules/@libsql/isomorphic-fetch/web.js"() {
    _fetch = fetch;
    _Request = Request;
    _Headers = Headers;
  }
});
var _queueMicrotask;
var init_queue_microtask = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/queue_microtask.js"() {
    if (typeof queueMicrotask !== "undefined") {
      _queueMicrotask = queueMicrotask;
    } else {
      const resolved = Promise.resolve();
      _queueMicrotask = /* @__PURE__ */ __name((callback) => {
        resolved.then(callback);
      }, "_queueMicrotask");
    }
  }
});
var ByteQueue;
var init_byte_queue = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/byte_queue.js"() {
    ByteQueue = class {
      static {
        __name(this, "ByteQueue");
      }
      #array;
      #shiftPos;
      #pushPos;
      constructor(initialCap) {
        this.#array = new Uint8Array(new ArrayBuffer(initialCap));
        this.#shiftPos = 0;
        this.#pushPos = 0;
      }
      get length() {
        return this.#pushPos - this.#shiftPos;
      }
      data() {
        return this.#array.slice(this.#shiftPos, this.#pushPos);
      }
      push(chunk) {
        this.#ensurePush(chunk.byteLength);
        this.#array.set(chunk, this.#pushPos);
        this.#pushPos += chunk.byteLength;
      }
      #ensurePush(pushLength) {
        if (this.#pushPos + pushLength <= this.#array.byteLength) {
          return;
        }
        const filledLength = this.#pushPos - this.#shiftPos;
        if (filledLength + pushLength <= this.#array.byteLength && 2 * this.#pushPos >= this.#array.byteLength) {
          this.#array.copyWithin(0, this.#shiftPos, this.#pushPos);
        } else {
          let newCap = this.#array.byteLength;
          do {
            newCap *= 2;
          } while (filledLength + pushLength > newCap);
          const newArray = new Uint8Array(new ArrayBuffer(newCap));
          newArray.set(this.#array.slice(this.#shiftPos, this.#pushPos), 0);
          this.#array = newArray;
        }
        this.#pushPos = filledLength;
        this.#shiftPos = 0;
      }
      shift(length) {
        this.#shiftPos += length;
      }
    };
  }
});
function PipelineRespBody(obj) {
  const baton = stringOpt(obj["baton"]);
  const baseUrl = stringOpt(obj["base_url"]);
  const results = arrayObjectsMap(obj["results"], StreamResult);
  return { baton, baseUrl, results };
}
__name(PipelineRespBody, "PipelineRespBody");
function StreamResult(obj) {
  const type = string(obj["type"]);
  if (type === "ok") {
    const response = StreamResponse(object(obj["response"]));
    return { type: "ok", response };
  } else if (type === "error") {
    const error3 = Error2(object(obj["error"]));
    return { type: "error", error: error3 };
  } else {
    throw new ProtoError("Unexpected type of StreamResult");
  }
}
__name(StreamResult, "StreamResult");
function StreamResponse(obj) {
  const type = string(obj["type"]);
  if (type === "close") {
    return { type: "close" };
  } else if (type === "execute") {
    const result = StmtResult(object(obj["result"]));
    return { type: "execute", result };
  } else if (type === "batch") {
    const result = BatchResult(object(obj["result"]));
    return { type: "batch", result };
  } else if (type === "sequence") {
    return { type: "sequence" };
  } else if (type === "describe") {
    const result = DescribeResult(object(obj["result"]));
    return { type: "describe", result };
  } else if (type === "store_sql") {
    return { type: "store_sql" };
  } else if (type === "close_sql") {
    return { type: "close_sql" };
  } else if (type === "get_autocommit") {
    const isAutocommit = boolean(obj["is_autocommit"]);
    return { type: "get_autocommit", isAutocommit };
  } else {
    throw new ProtoError("Unexpected type of StreamResponse");
  }
}
__name(StreamResponse, "StreamResponse");
function CursorRespBody(obj) {
  const baton = stringOpt(obj["baton"]);
  const baseUrl = stringOpt(obj["base_url"]);
  return { baton, baseUrl };
}
__name(CursorRespBody, "CursorRespBody");
var init_json_decode3 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/http/json_decode.js"() {
    init_errors();
    init_decode();
    init_json_decode();
  }
});
var PipelineRespBody2;
var StreamResult2;
var StreamResponse2;
var ExecuteStreamResp;
var BatchStreamResp;
var DescribeStreamResp;
var GetAutocommitStreamResp;
var CursorRespBody2;
var init_protobuf_decode3 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/http/protobuf_decode.js"() {
    init_protobuf_decode();
    PipelineRespBody2 = {
      default() {
        return { baton: void 0, baseUrl: void 0, results: [] };
      },
      1(r, msg) {
        msg.baton = r.string();
      },
      2(r, msg) {
        msg.baseUrl = r.string();
      },
      3(r, msg) {
        msg.results.push(r.message(StreamResult2));
      }
    };
    StreamResult2 = {
      default() {
        return { type: "none" };
      },
      1(r) {
        return { type: "ok", response: r.message(StreamResponse2) };
      },
      2(r) {
        return { type: "error", error: r.message(Error3) };
      }
    };
    StreamResponse2 = {
      default() {
        return { type: "none" };
      },
      1(r) {
        return { type: "close" };
      },
      2(r) {
        return r.message(ExecuteStreamResp);
      },
      3(r) {
        return r.message(BatchStreamResp);
      },
      4(r) {
        return { type: "sequence" };
      },
      5(r) {
        return r.message(DescribeStreamResp);
      },
      6(r) {
        return { type: "store_sql" };
      },
      7(r) {
        return { type: "close_sql" };
      },
      8(r) {
        return r.message(GetAutocommitStreamResp);
      }
    };
    ExecuteStreamResp = {
      default() {
        return { type: "execute", result: StmtResult2.default() };
      },
      1(r, msg) {
        msg.result = r.message(StmtResult2);
      }
    };
    BatchStreamResp = {
      default() {
        return { type: "batch", result: BatchResult2.default() };
      },
      1(r, msg) {
        msg.result = r.message(BatchResult2);
      }
    };
    DescribeStreamResp = {
      default() {
        return { type: "describe", result: DescribeResult2.default() };
      },
      1(r, msg) {
        msg.result = r.message(DescribeResult2);
      }
    };
    GetAutocommitStreamResp = {
      default() {
        return { type: "get_autocommit", isAutocommit: false };
      },
      1(r, msg) {
        msg.isAutocommit = r.bool();
      }
    };
    CursorRespBody2 = {
      default() {
        return { baton: void 0, baseUrl: void 0 };
      },
      1(r, msg) {
        msg.baton = r.string();
      },
      2(r, msg) {
        msg.baseUrl = r.string();
      }
    };
  }
});
var HttpCursor;
var init_cursor3 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/http/cursor.js"() {
    init_byte_queue();
    init_cursor();
    init_decode();
    init_decode2();
    init_errors();
    init_util3();
    init_json_decode3();
    init_protobuf_decode3();
    init_json_decode();
    init_protobuf_decode();
    HttpCursor = class extends Cursor {
      static {
        __name(this, "HttpCursor");
      }
      #stream;
      #encoding;
      #reader;
      #queue;
      #closed;
      #done;
      /** @private */
      constructor(stream, encoding) {
        super();
        this.#stream = stream;
        this.#encoding = encoding;
        this.#reader = void 0;
        this.#queue = new ByteQueue(16 * 1024);
        this.#closed = void 0;
        this.#done = false;
      }
      async open(response) {
        if (response.body === null) {
          throw new ProtoError("No response body for cursor request");
        }
        this.#reader = response.body.getReader();
        const respBody = await this.#nextItem(CursorRespBody, CursorRespBody2);
        if (respBody === void 0) {
          throw new ProtoError("Empty response to cursor request");
        }
        return respBody;
      }
      /** Fetch the next entry from the cursor. */
      next() {
        return this.#nextItem(CursorEntry, CursorEntry2);
      }
      /** Close the cursor. */
      close() {
        this._setClosed(new ClientError("Cursor was manually closed"));
      }
      /** @private */
      _setClosed(error3) {
        if (this.#closed !== void 0) {
          return;
        }
        this.#closed = error3;
        this.#stream._cursorClosed(this);
        if (this.#reader !== void 0) {
          this.#reader.cancel();
        }
      }
      /** True if the cursor is closed. */
      get closed() {
        return this.#closed !== void 0;
      }
      async #nextItem(jsonFun, protobufDef) {
        for (; ; ) {
          if (this.#done) {
            return void 0;
          } else if (this.#closed !== void 0) {
            throw new ClosedError("Cursor is closed", this.#closed);
          }
          if (this.#encoding === "json") {
            const jsonData = this.#parseItemJson();
            if (jsonData !== void 0) {
              const jsonText = new TextDecoder().decode(jsonData);
              const jsonValue = JSON.parse(jsonText);
              return readJsonObject(jsonValue, jsonFun);
            }
          } else if (this.#encoding === "protobuf") {
            const protobufData = this.#parseItemProtobuf();
            if (protobufData !== void 0) {
              return readProtobufMessage(protobufData, protobufDef);
            }
          } else {
            throw impossible(this.#encoding, "Impossible encoding");
          }
          if (this.#reader === void 0) {
            throw new InternalError("Attempted to read from HTTP cursor before it was opened");
          }
          const { value, done } = await this.#reader.read();
          if (done && this.#queue.length === 0) {
            this.#done = true;
          } else if (done) {
            throw new ProtoError("Unexpected end of cursor stream");
          } else {
            this.#queue.push(value);
          }
        }
      }
      #parseItemJson() {
        const data = this.#queue.data();
        const newlineByte = 10;
        const newlinePos = data.indexOf(newlineByte);
        if (newlinePos < 0) {
          return void 0;
        }
        const jsonData = data.slice(0, newlinePos);
        this.#queue.shift(newlinePos + 1);
        return jsonData;
      }
      #parseItemProtobuf() {
        const data = this.#queue.data();
        let varintValue = 0;
        let varintLength = 0;
        for (; ; ) {
          if (varintLength >= data.byteLength) {
            return void 0;
          }
          const byte = data[varintLength];
          varintValue |= (byte & 127) << 7 * varintLength;
          varintLength += 1;
          if (!(byte & 128)) {
            break;
          }
        }
        if (data.byteLength < varintLength + varintValue) {
          return void 0;
        }
        const protobufData = data.slice(varintLength, varintLength + varintValue);
        this.#queue.shift(varintLength + varintValue);
        return protobufData;
      }
    };
  }
});
function PipelineReqBody(w, msg) {
  if (msg.baton !== void 0) {
    w.string("baton", msg.baton);
  }
  w.arrayObjects("requests", msg.requests, StreamRequest);
}
__name(PipelineReqBody, "PipelineReqBody");
function StreamRequest(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "close") {
  } else if (msg.type === "execute") {
    w.object("stmt", msg.stmt, Stmt2);
  } else if (msg.type === "batch") {
    w.object("batch", msg.batch, Batch2);
  } else if (msg.type === "sequence") {
    if (msg.sql !== void 0) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== void 0) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "describe") {
    if (msg.sql !== void 0) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== void 0) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "store_sql") {
    w.number("sql_id", msg.sqlId);
    w.string("sql", msg.sql);
  } else if (msg.type === "close_sql") {
    w.number("sql_id", msg.sqlId);
  } else if (msg.type === "get_autocommit") {
  } else {
    throw impossible(msg, "Impossible type of StreamRequest");
  }
}
__name(StreamRequest, "StreamRequest");
function CursorReqBody(w, msg) {
  if (msg.baton !== void 0) {
    w.string("baton", msg.baton);
  }
  w.object("batch", msg.batch, Batch2);
}
__name(CursorReqBody, "CursorReqBody");
var init_json_encode3 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/http/json_encode.js"() {
    init_json_encode();
    init_util3();
  }
});
function PipelineReqBody2(w, msg) {
  if (msg.baton !== void 0) {
    w.string(1, msg.baton);
  }
  for (const req of msg.requests) {
    w.message(2, req, StreamRequest2);
  }
}
__name(PipelineReqBody2, "PipelineReqBody2");
function StreamRequest2(w, msg) {
  if (msg.type === "close") {
    w.message(1, msg, CloseStreamReq2);
  } else if (msg.type === "execute") {
    w.message(2, msg, ExecuteStreamReq);
  } else if (msg.type === "batch") {
    w.message(3, msg, BatchStreamReq);
  } else if (msg.type === "sequence") {
    w.message(4, msg, SequenceStreamReq);
  } else if (msg.type === "describe") {
    w.message(5, msg, DescribeStreamReq);
  } else if (msg.type === "store_sql") {
    w.message(6, msg, StoreSqlStreamReq);
  } else if (msg.type === "close_sql") {
    w.message(7, msg, CloseSqlStreamReq);
  } else if (msg.type === "get_autocommit") {
    w.message(8, msg, GetAutocommitStreamReq);
  } else {
    throw impossible(msg, "Impossible type of StreamRequest");
  }
}
__name(StreamRequest2, "StreamRequest2");
function CloseStreamReq2(_w, _msg) {
}
__name(CloseStreamReq2, "CloseStreamReq2");
function ExecuteStreamReq(w, msg) {
  w.message(1, msg.stmt, Stmt3);
}
__name(ExecuteStreamReq, "ExecuteStreamReq");
function BatchStreamReq(w, msg) {
  w.message(1, msg.batch, Batch3);
}
__name(BatchStreamReq, "BatchStreamReq");
function SequenceStreamReq(w, msg) {
  if (msg.sql !== void 0) {
    w.string(1, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(2, msg.sqlId);
  }
}
__name(SequenceStreamReq, "SequenceStreamReq");
function DescribeStreamReq(w, msg) {
  if (msg.sql !== void 0) {
    w.string(1, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(2, msg.sqlId);
  }
}
__name(DescribeStreamReq, "DescribeStreamReq");
function StoreSqlStreamReq(w, msg) {
  w.int32(1, msg.sqlId);
  w.string(2, msg.sql);
}
__name(StoreSqlStreamReq, "StoreSqlStreamReq");
function CloseSqlStreamReq(w, msg) {
  w.int32(1, msg.sqlId);
}
__name(CloseSqlStreamReq, "CloseSqlStreamReq");
function GetAutocommitStreamReq(_w, _msg) {
}
__name(GetAutocommitStreamReq, "GetAutocommitStreamReq");
function CursorReqBody2(w, msg) {
  if (msg.baton !== void 0) {
    w.string(1, msg.baton);
  }
  w.message(2, msg.batch, Batch3);
}
__name(CursorReqBody2, "CursorReqBody2");
var init_protobuf_encode3 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/http/protobuf_encode.js"() {
    init_protobuf_encode();
    init_util3();
  }
});
function handlePipelineResponse(pipeline, respBody) {
  if (respBody.results.length !== pipeline.length) {
    throw new ProtoError("Server returned unexpected number of pipeline results");
  }
  for (let i = 0; i < pipeline.length; ++i) {
    const result = respBody.results[i];
    const entry = pipeline[i];
    if (result.type === "ok") {
      if (result.response.type !== entry.request.type) {
        throw new ProtoError("Received unexpected type of response");
      }
      entry.responseCallback(result.response);
    } else if (result.type === "error") {
      entry.errorCallback(errorFromProto(result.error));
    } else if (result.type === "none") {
      throw new ProtoError("Received unrecognized type of StreamResult");
    } else {
      throw impossible(result, "Received impossible type of StreamResult");
    }
  }
}
__name(handlePipelineResponse, "handlePipelineResponse");
async function decodePipelineResponse(resp, encoding) {
  if (encoding === "json") {
    const respJson = await resp.json();
    return readJsonObject(respJson, PipelineRespBody);
  }
  if (encoding === "protobuf") {
    const respData = await resp.arrayBuffer();
    return readProtobufMessage(new Uint8Array(respData), PipelineRespBody2);
  }
  await resp.body?.cancel();
  throw impossible(encoding, "Impossible encoding");
}
__name(decodePipelineResponse, "decodePipelineResponse");
async function errorFromResponse(resp) {
  const respType = resp.headers.get("content-type") ?? "text/plain";
  let message = `Server returned HTTP status ${resp.status}`;
  if (respType === "application/json") {
    const respBody = await resp.json();
    if ("message" in respBody) {
      return errorFromProto(respBody);
    }
    return new HttpServerError(message, resp.status);
  }
  if (respType === "text/plain") {
    const respBody = (await resp.text()).trim();
    if (respBody !== "") {
      message += `: ${respBody}`;
    }
    return new HttpServerError(message, resp.status);
  }
  await resp.body?.cancel();
  return new HttpServerError(message, resp.status);
}
__name(errorFromResponse, "errorFromResponse");
var HttpStream;
var init_stream3 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/http/stream.js"() {
    init_web2();
    init_errors();
    init_encoding();
    init_id_alloc();
    init_queue();
    init_queue_microtask();
    init_result();
    init_sql();
    init_stream();
    init_util3();
    init_cursor3();
    init_json_encode3();
    init_protobuf_encode3();
    init_json_encode3();
    init_protobuf_encode3();
    init_json_decode3();
    init_protobuf_decode3();
    HttpStream = class extends Stream {
      static {
        __name(this, "HttpStream");
      }
      #client;
      #baseUrl;
      #jwt;
      #fetch;
      #baton;
      #queue;
      #flushing;
      #cursor;
      #closing;
      #closeQueued;
      #closed;
      #sqlIdAlloc;
      /** @private */
      constructor(client, baseUrl, jwt7, customFetch) {
        super(client.intMode);
        this.#client = client;
        this.#baseUrl = baseUrl.toString();
        this.#jwt = jwt7;
        this.#fetch = customFetch;
        this.#baton = void 0;
        this.#queue = new Queue();
        this.#flushing = false;
        this.#closing = false;
        this.#closeQueued = false;
        this.#closed = void 0;
        this.#sqlIdAlloc = new IdAlloc();
      }
      /** Get the {@link HttpClient} object that this stream belongs to. */
      client() {
        return this.#client;
      }
      /** @private */
      _sqlOwner() {
        return this;
      }
      /** Cache a SQL text on the server. */
      storeSql(sql) {
        const sqlId = this.#sqlIdAlloc.alloc();
        this.#sendStreamRequest({ type: "store_sql", sqlId, sql }).then(() => void 0, (error3) => this._setClosed(error3));
        return new Sql(this, sqlId);
      }
      /** @private */
      _closeSql(sqlId) {
        if (this.#closed !== void 0) {
          return;
        }
        this.#sendStreamRequest({ type: "close_sql", sqlId }).then(() => this.#sqlIdAlloc.free(sqlId), (error3) => this._setClosed(error3));
      }
      /** @private */
      _execute(stmt) {
        return this.#sendStreamRequest({ type: "execute", stmt }).then((response) => {
          return response.result;
        });
      }
      /** @private */
      _batch(batch) {
        return this.#sendStreamRequest({ type: "batch", batch }).then((response) => {
          return response.result;
        });
      }
      /** @private */
      _describe(protoSql) {
        return this.#sendStreamRequest({
          type: "describe",
          sql: protoSql.sql,
          sqlId: protoSql.sqlId
        }).then((response) => {
          return response.result;
        });
      }
      /** @private */
      _sequence(protoSql) {
        return this.#sendStreamRequest({
          type: "sequence",
          sql: protoSql.sql,
          sqlId: protoSql.sqlId
        }).then((_response) => {
          return void 0;
        });
      }
      /** Check whether the SQL connection underlying this stream is in autocommit state (i.e., outside of an
       * explicit transaction). This requires protocol version 3 or higher.
       */
      getAutocommit() {
        this.#client._ensureVersion(3, "getAutocommit()");
        return this.#sendStreamRequest({
          type: "get_autocommit"
        }).then((response) => {
          return response.isAutocommit;
        });
      }
      #sendStreamRequest(request) {
        return new Promise((responseCallback, errorCallback) => {
          this.#pushToQueue({ type: "pipeline", request, responseCallback, errorCallback });
        });
      }
      /** @private */
      _openCursor(batch) {
        return new Promise((cursorCallback, errorCallback) => {
          this.#pushToQueue({ type: "cursor", batch, cursorCallback, errorCallback });
        });
      }
      /** @private */
      _cursorClosed(cursor) {
        if (cursor !== this.#cursor) {
          throw new InternalError("Cursor was closed, but it was not associated with the stream");
        }
        this.#cursor = void 0;
        _queueMicrotask(() => this.#flushQueue());
      }
      /** Immediately close the stream. */
      close() {
        this._setClosed(new ClientError("Stream was manually closed"));
      }
      /** Gracefully close the stream. */
      closeGracefully() {
        this.#closing = true;
        _queueMicrotask(() => this.#flushQueue());
      }
      /** True if the stream is closed. */
      get closed() {
        return this.#closed !== void 0 || this.#closing;
      }
      /** @private */
      _setClosed(error3) {
        if (this.#closed !== void 0) {
          return;
        }
        this.#closed = error3;
        if (this.#cursor !== void 0) {
          this.#cursor._setClosed(error3);
        }
        this.#client._streamClosed(this);
        for (; ; ) {
          const entry = this.#queue.shift();
          if (entry !== void 0) {
            entry.errorCallback(error3);
          } else {
            break;
          }
        }
        if ((this.#baton !== void 0 || this.#flushing) && !this.#closeQueued) {
          this.#queue.push({
            type: "pipeline",
            request: { type: "close" },
            responseCallback: /* @__PURE__ */ __name(() => void 0, "responseCallback"),
            errorCallback: /* @__PURE__ */ __name(() => void 0, "errorCallback")
          });
          this.#closeQueued = true;
          _queueMicrotask(() => this.#flushQueue());
        }
      }
      #pushToQueue(entry) {
        if (this.#closed !== void 0) {
          throw new ClosedError("Stream is closed", this.#closed);
        } else if (this.#closing) {
          throw new ClosedError("Stream is closing", void 0);
        } else {
          this.#queue.push(entry);
          _queueMicrotask(() => this.#flushQueue());
        }
      }
      #flushQueue() {
        if (this.#flushing || this.#cursor !== void 0) {
          return;
        }
        if (this.#closing && this.#queue.length === 0) {
          this._setClosed(new ClientError("Stream was gracefully closed"));
          return;
        }
        const endpoint = this.#client._endpoint;
        if (endpoint === void 0) {
          this.#client._endpointPromise.then(() => this.#flushQueue(), (error3) => this._setClosed(error3));
          return;
        }
        const firstEntry = this.#queue.shift();
        if (firstEntry === void 0) {
          return;
        } else if (firstEntry.type === "pipeline") {
          const pipeline = [firstEntry];
          for (; ; ) {
            const entry = this.#queue.first();
            if (entry !== void 0 && entry.type === "pipeline") {
              pipeline.push(entry);
              this.#queue.shift();
            } else if (entry === void 0 && this.#closing && !this.#closeQueued) {
              pipeline.push({
                type: "pipeline",
                request: { type: "close" },
                responseCallback: /* @__PURE__ */ __name(() => void 0, "responseCallback"),
                errorCallback: /* @__PURE__ */ __name(() => void 0, "errorCallback")
              });
              this.#closeQueued = true;
              break;
            } else {
              break;
            }
          }
          this.#flushPipeline(endpoint, pipeline);
        } else if (firstEntry.type === "cursor") {
          this.#flushCursor(endpoint, firstEntry);
        } else {
          throw impossible(firstEntry, "Impossible type of QueueEntry");
        }
      }
      #flushPipeline(endpoint, pipeline) {
        this.#flush(() => this.#createPipelineRequest(pipeline, endpoint), (resp) => decodePipelineResponse(resp, endpoint.encoding), (respBody) => respBody.baton, (respBody) => respBody.baseUrl, (respBody) => handlePipelineResponse(pipeline, respBody), (error3) => pipeline.forEach((entry) => entry.errorCallback(error3)));
      }
      #flushCursor(endpoint, entry) {
        const cursor = new HttpCursor(this, endpoint.encoding);
        this.#cursor = cursor;
        this.#flush(() => this.#createCursorRequest(entry, endpoint), (resp) => cursor.open(resp), (respBody) => respBody.baton, (respBody) => respBody.baseUrl, (_respBody) => entry.cursorCallback(cursor), (error3) => entry.errorCallback(error3));
      }
      #flush(createRequest, decodeResponse, getBaton, getBaseUrl, handleResponse, handleError) {
        let promise;
        try {
          const request = createRequest();
          const fetch2 = this.#fetch;
          promise = fetch2(request);
        } catch (error3) {
          promise = Promise.reject(error3);
        }
        this.#flushing = true;
        promise.then((resp) => {
          if (!resp.ok) {
            return errorFromResponse(resp).then((error3) => {
              throw error3;
            });
          }
          return decodeResponse(resp);
        }).then((r) => {
          this.#baton = getBaton(r);
          this.#baseUrl = getBaseUrl(r) ?? this.#baseUrl;
          handleResponse(r);
        }).catch((error3) => {
          this._setClosed(error3);
          handleError(error3);
        }).finally(() => {
          this.#flushing = false;
          this.#flushQueue();
        });
      }
      #createPipelineRequest(pipeline, endpoint) {
        return this.#createRequest(new URL(endpoint.pipelinePath, this.#baseUrl), {
          baton: this.#baton,
          requests: pipeline.map((entry) => entry.request)
        }, endpoint.encoding, PipelineReqBody, PipelineReqBody2);
      }
      #createCursorRequest(entry, endpoint) {
        if (endpoint.cursorPath === void 0) {
          throw new ProtocolVersionError(`Cursors are supported only on protocol version 3 and higher, but the HTTP server only supports version ${endpoint.version}.`);
        }
        return this.#createRequest(new URL(endpoint.cursorPath, this.#baseUrl), {
          baton: this.#baton,
          batch: entry.batch
        }, endpoint.encoding, CursorReqBody, CursorReqBody2);
      }
      #createRequest(url, reqBody, encoding, jsonFun, protobufFun) {
        let bodyData;
        let contentType;
        if (encoding === "json") {
          bodyData = writeJsonObject(reqBody, jsonFun);
          contentType = "application/json";
        } else if (encoding === "protobuf") {
          bodyData = writeProtobufMessage(reqBody, protobufFun);
          contentType = "application/x-protobuf";
        } else {
          throw impossible(encoding, "Impossible encoding");
        }
        const headers = new _Headers();
        headers.set("content-type", contentType);
        if (this.#jwt !== void 0) {
          headers.set("authorization", `Bearer ${this.#jwt}`);
        }
        return new _Request(url.toString(), { method: "POST", headers, body: bodyData });
      }
    };
  }
});
async function findEndpoint(customFetch, clientUrl) {
  const fetch2 = customFetch;
  for (const endpoint of checkEndpoints) {
    const url = new URL(endpoint.versionPath, clientUrl);
    const request = new _Request(url.toString(), { method: "GET" });
    const response = await fetch2(request);
    await response.arrayBuffer();
    if (response.ok) {
      return endpoint;
    }
  }
  return fallbackEndpoint;
}
__name(findEndpoint, "findEndpoint");
var checkEndpoints;
var fallbackEndpoint;
var HttpClient;
var init_client3 = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/http/client.js"() {
    init_web2();
    init_client();
    init_errors();
    init_stream3();
    checkEndpoints = [
      {
        versionPath: "v3-protobuf",
        pipelinePath: "v3-protobuf/pipeline",
        cursorPath: "v3-protobuf/cursor",
        version: 3,
        encoding: "protobuf"
      }
      /*
      {
          versionPath: "v3",
          pipelinePath: "v3/pipeline",
          cursorPath: "v3/cursor",
          version: 3,
          encoding: "json",
      },
      */
    ];
    fallbackEndpoint = {
      versionPath: "v2",
      pipelinePath: "v2/pipeline",
      cursorPath: void 0,
      version: 2,
      encoding: "json"
    };
    HttpClient = class extends Client {
      static {
        __name(this, "HttpClient");
      }
      #url;
      #jwt;
      #fetch;
      #closed;
      #streams;
      /** @private */
      _endpointPromise;
      /** @private */
      _endpoint;
      /** @private */
      constructor(url, jwt7, customFetch, protocolVersion = 2) {
        super();
        this.#url = url;
        this.#jwt = jwt7;
        this.#fetch = customFetch ?? _fetch;
        this.#closed = void 0;
        this.#streams = /* @__PURE__ */ new Set();
        if (protocolVersion == 3) {
          this._endpointPromise = findEndpoint(this.#fetch, this.#url);
          this._endpointPromise.then((endpoint) => this._endpoint = endpoint, (error3) => this.#setClosed(error3));
        } else {
          this._endpointPromise = Promise.resolve(fallbackEndpoint);
          this._endpointPromise.then((endpoint) => this._endpoint = endpoint, (error3) => this.#setClosed(error3));
        }
      }
      /** Get the protocol version supported by the server. */
      async getVersion() {
        if (this._endpoint !== void 0) {
          return this._endpoint.version;
        }
        return (await this._endpointPromise).version;
      }
      // Make sure that the negotiated version is at least `minVersion`.
      /** @private */
      _ensureVersion(minVersion, feature) {
        if (minVersion <= fallbackEndpoint.version) {
          return;
        } else if (this._endpoint === void 0) {
          throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, but the version supported by the HTTP server is not yet known. Use Client.getVersion() to wait until the version is available.`);
        } else if (this._endpoint.version < minVersion) {
          throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, but the HTTP server only supports version ${this._endpoint.version}.`);
        }
      }
      /** Open a {@link HttpStream}, a stream for executing SQL statements. */
      openStream() {
        if (this.#closed !== void 0) {
          throw new ClosedError("Client is closed", this.#closed);
        }
        const stream = new HttpStream(this, this.#url, this.#jwt, this.#fetch);
        this.#streams.add(stream);
        return stream;
      }
      /** @private */
      _streamClosed(stream) {
        this.#streams.delete(stream);
      }
      /** Close the client and all its streams. */
      close() {
        this.#setClosed(new ClientError("Client was manually closed"));
      }
      /** True if the client is closed. */
      get closed() {
        return this.#closed !== void 0;
      }
      #setClosed(error3) {
        if (this.#closed !== void 0) {
          return;
        }
        this.#closed = error3;
        for (const stream of Array.from(this.#streams)) {
          stream._setClosed(new ClosedError("Client was closed", error3));
        }
      }
    };
  }
});
var init_libsql_url = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/libsql_url.js"() {
    init_errors();
  }
});
function openWs(url, jwt7, protocolVersion = 2) {
  if (typeof _WebSocket === "undefined") {
    throw new WebSocketUnsupportedError("WebSockets are not supported in this environment");
  }
  var subprotocols = void 0;
  if (protocolVersion == 3) {
    subprotocols = Array.from(subprotocolsV3.keys());
  } else {
    subprotocols = Array.from(subprotocolsV2.keys());
  }
  const socket = new _WebSocket(url, subprotocols);
  return new WsClient(socket, jwt7);
}
__name(openWs, "openWs");
function openHttp(url, jwt7, customFetch, protocolVersion = 2) {
  return new HttpClient(url instanceof URL ? url : new URL(url), jwt7, customFetch, protocolVersion);
}
__name(openHttp, "openHttp");
var init_lib_esm = __esm({
  "node_modules/@libsql/hrana-client/lib-esm/index.js"() {
    init_web();
    init_client2();
    init_errors();
    init_client3();
    init_client2();
    init_web();
    init_web2();
    init_client();
    init_errors();
    init_batch();
    init_libsql_url();
    init_sql();
    init_stmt();
    init_stream();
    init_client3();
    init_stream3();
    init_client2();
    init_stream2();
  }
});
async function executeHranaBatch(mode, version22, batch, hranaStmts, disableForeignKeys = false) {
  if (disableForeignKeys) {
    batch.step().run("PRAGMA foreign_keys=off");
  }
  const beginStep = batch.step();
  const beginPromise = beginStep.run(transactionModeToBegin(mode));
  let lastStep = beginStep;
  const stmtPromises = hranaStmts.map((hranaStmt) => {
    const stmtStep = batch.step().condition(BatchCond.ok(lastStep));
    if (version22 >= 3) {
      stmtStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
    }
    const stmtPromise = stmtStep.query(hranaStmt);
    lastStep = stmtStep;
    return stmtPromise;
  });
  const commitStep = batch.step().condition(BatchCond.ok(lastStep));
  if (version22 >= 3) {
    commitStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
  }
  const commitPromise = commitStep.run("COMMIT");
  const rollbackStep = batch.step().condition(BatchCond.not(BatchCond.ok(commitStep)));
  rollbackStep.run("ROLLBACK").catch((_) => void 0);
  if (disableForeignKeys) {
    batch.step().run("PRAGMA foreign_keys=on");
  }
  await batch.execute();
  const resultSets = [];
  await beginPromise;
  for (const stmtPromise of stmtPromises) {
    const hranaRows = await stmtPromise;
    if (hranaRows === void 0) {
      throw new LibsqlError("Statement in a batch was not executed, probably because the transaction has been rolled back", "TRANSACTION_CLOSED");
    }
    resultSets.push(resultSetFromHrana(hranaRows));
  }
  await commitPromise;
  return resultSets;
}
__name(executeHranaBatch, "executeHranaBatch");
function stmtToHrana(stmt) {
  let sql;
  let args;
  if (Array.isArray(stmt)) {
    [sql, args] = stmt;
  } else if (typeof stmt === "string") {
    sql = stmt;
  } else {
    sql = stmt.sql;
    args = stmt.args;
  }
  const hranaStmt = new Stmt(sql);
  if (args) {
    if (Array.isArray(args)) {
      hranaStmt.bindIndexes(args);
    } else {
      for (const [key, value] of Object.entries(args)) {
        hranaStmt.bindName(key, value);
      }
    }
  }
  return hranaStmt;
}
__name(stmtToHrana, "stmtToHrana");
function resultSetFromHrana(hranaRows) {
  const columns = hranaRows.columnNames.map((c) => c ?? "");
  const columnTypes = hranaRows.columnDecltypes.map((c) => c ?? "");
  const rows = hranaRows.rows;
  const rowsAffected = hranaRows.affectedRowCount;
  const lastInsertRowid = hranaRows.lastInsertRowid !== void 0 ? hranaRows.lastInsertRowid : void 0;
  return new ResultSetImpl(columns, columnTypes, rows, rowsAffected, lastInsertRowid);
}
__name(resultSetFromHrana, "resultSetFromHrana");
function mapHranaError(e) {
  if (e instanceof ClientError) {
    const code = mapHranaErrorCode(e);
    return new LibsqlError(e.message, code, void 0, e);
  }
  return e;
}
__name(mapHranaError, "mapHranaError");
function mapHranaErrorCode(e) {
  if (e instanceof ResponseError && e.code !== void 0) {
    return e.code;
  } else if (e instanceof ProtoError) {
    return "HRANA_PROTO_ERROR";
  } else if (e instanceof ClosedError) {
    return e.cause instanceof ClientError ? mapHranaErrorCode(e.cause) : "HRANA_CLOSED_ERROR";
  } else if (e instanceof WebSocketError) {
    return "HRANA_WEBSOCKET_ERROR";
  } else if (e instanceof HttpServerError) {
    return "SERVER_ERROR";
  } else if (e instanceof ProtocolVersionError) {
    return "PROTOCOL_VERSION_ERROR";
  } else if (e instanceof InternalError) {
    return "INTERNAL_ERROR";
  } else {
    return "UNKNOWN";
  }
}
__name(mapHranaErrorCode, "mapHranaErrorCode");
var HranaTransaction;
var init_hrana = __esm({
  "node_modules/@libsql/client/lib-esm/hrana.js"() {
    init_lib_esm();
    init_api();
    init_util();
    HranaTransaction = class {
      static {
        __name(this, "HranaTransaction");
      }
      #mode;
      #version;
      // Promise that is resolved when the BEGIN statement completes, or `undefined` if we haven't executed the
      // BEGIN statement yet.
      #started;
      /** @private */
      constructor(mode, version22) {
        this.#mode = mode;
        this.#version = version22;
        this.#started = void 0;
      }
      execute(stmt) {
        return this.batch([stmt]).then((results) => results[0]);
      }
      async batch(stmts) {
        const stream = this._getStream();
        if (stream.closed) {
          throw new LibsqlError("Cannot execute statements because the transaction is closed", "TRANSACTION_CLOSED");
        }
        try {
          const hranaStmts = stmts.map(stmtToHrana);
          let rowsPromises;
          if (this.#started === void 0) {
            this._getSqlCache().apply(hranaStmts);
            const batch = stream.batch(this.#version >= 3);
            const beginStep = batch.step();
            const beginPromise = beginStep.run(transactionModeToBegin(this.#mode));
            let lastStep = beginStep;
            rowsPromises = hranaStmts.map((hranaStmt) => {
              const stmtStep = batch.step().condition(BatchCond.ok(lastStep));
              if (this.#version >= 3) {
                stmtStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
              }
              const rowsPromise = stmtStep.query(hranaStmt);
              rowsPromise.catch(() => void 0);
              lastStep = stmtStep;
              return rowsPromise;
            });
            this.#started = batch.execute().then(() => beginPromise).then(() => void 0);
            try {
              await this.#started;
            } catch (e) {
              this.close();
              throw e;
            }
          } else {
            if (this.#version < 3) {
              await this.#started;
            } else {
            }
            this._getSqlCache().apply(hranaStmts);
            const batch = stream.batch(this.#version >= 3);
            let lastStep = void 0;
            rowsPromises = hranaStmts.map((hranaStmt) => {
              const stmtStep = batch.step();
              if (lastStep !== void 0) {
                stmtStep.condition(BatchCond.ok(lastStep));
              }
              if (this.#version >= 3) {
                stmtStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
              }
              const rowsPromise = stmtStep.query(hranaStmt);
              rowsPromise.catch(() => void 0);
              lastStep = stmtStep;
              return rowsPromise;
            });
            await batch.execute();
          }
          const resultSets = [];
          for (const rowsPromise of rowsPromises) {
            const rows = await rowsPromise;
            if (rows === void 0) {
              throw new LibsqlError("Statement in a transaction was not executed, probably because the transaction has been rolled back", "TRANSACTION_CLOSED");
            }
            resultSets.push(resultSetFromHrana(rows));
          }
          return resultSets;
        } catch (e) {
          throw mapHranaError(e);
        }
      }
      async executeMultiple(sql) {
        const stream = this._getStream();
        if (stream.closed) {
          throw new LibsqlError("Cannot execute statements because the transaction is closed", "TRANSACTION_CLOSED");
        }
        try {
          if (this.#started === void 0) {
            this.#started = stream.run(transactionModeToBegin(this.#mode)).then(() => void 0);
            try {
              await this.#started;
            } catch (e) {
              this.close();
              throw e;
            }
          } else {
            await this.#started;
          }
          await stream.sequence(sql);
        } catch (e) {
          throw mapHranaError(e);
        }
      }
      async rollback() {
        try {
          const stream = this._getStream();
          if (stream.closed) {
            return;
          }
          if (this.#started !== void 0) {
          } else {
            return;
          }
          const promise = stream.run("ROLLBACK").catch((e) => {
            throw mapHranaError(e);
          });
          stream.closeGracefully();
          await promise;
        } catch (e) {
          throw mapHranaError(e);
        } finally {
          this.close();
        }
      }
      async commit() {
        try {
          const stream = this._getStream();
          if (stream.closed) {
            throw new LibsqlError("Cannot commit the transaction because it is already closed", "TRANSACTION_CLOSED");
          }
          if (this.#started !== void 0) {
            await this.#started;
          } else {
            return;
          }
          const promise = stream.run("COMMIT").catch((e) => {
            throw mapHranaError(e);
          });
          stream.closeGracefully();
          await promise;
        } catch (e) {
          throw mapHranaError(e);
        } finally {
          this.close();
        }
      }
    };
  }
});
var SqlCache;
var Lru;
var init_sql_cache = __esm({
  "node_modules/@libsql/client/lib-esm/sql_cache.js"() {
    SqlCache = class {
      static {
        __name(this, "SqlCache");
      }
      #owner;
      #sqls;
      capacity;
      constructor(owner, capacity) {
        this.#owner = owner;
        this.#sqls = new Lru();
        this.capacity = capacity;
      }
      // Replaces SQL strings with cached `hrana.Sql` objects in the statements in `hranaStmts`. After this
      // function returns, we guarantee that all `hranaStmts` refer to valid (not closed) `hrana.Sql` objects,
      // but _we may invalidate any other `hrana.Sql` objects_ (by closing them, thus removing them from the
      // server).
      //
      // In practice, this means that after calling this function, you can use the statements only up to the
      // first `await`, because concurrent code may also use the cache and invalidate those statements.
      apply(hranaStmts) {
        if (this.capacity <= 0) {
          return;
        }
        const usedSqlObjs = /* @__PURE__ */ new Set();
        for (const hranaStmt of hranaStmts) {
          if (typeof hranaStmt.sql !== "string") {
            continue;
          }
          const sqlText = hranaStmt.sql;
          if (sqlText.length >= 5e3) {
            continue;
          }
          let sqlObj = this.#sqls.get(sqlText);
          if (sqlObj === void 0) {
            while (this.#sqls.size + 1 > this.capacity) {
              const [evictSqlText, evictSqlObj] = this.#sqls.peekLru();
              if (usedSqlObjs.has(evictSqlObj)) {
                break;
              }
              evictSqlObj.close();
              this.#sqls.delete(evictSqlText);
            }
            if (this.#sqls.size + 1 <= this.capacity) {
              sqlObj = this.#owner.storeSql(sqlText);
              this.#sqls.set(sqlText, sqlObj);
            }
          }
          if (sqlObj !== void 0) {
            hranaStmt.sql = sqlObj;
            usedSqlObjs.add(sqlObj);
          }
        }
      }
    };
    Lru = class {
      static {
        __name(this, "Lru");
      }
      // This maps keys to the cache values. The entries are ordered by their last use (entires that were used
      // most recently are at the end).
      #cache;
      constructor() {
        this.#cache = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.#cache.get(key);
        if (value !== void 0) {
          this.#cache.delete(key);
          this.#cache.set(key, value);
        }
        return value;
      }
      set(key, value) {
        this.#cache.set(key, value);
      }
      peekLru() {
        for (const entry of this.#cache.entries()) {
          return entry;
        }
        return void 0;
      }
      delete(key) {
        this.#cache.delete(key);
      }
      get size() {
        return this.#cache.size;
      }
    };
  }
});
var require_promise_limit = __commonJS({
  "node_modules/promise-limit/index.js"(exports, module) {
    function limiter(count3) {
      var outstanding = 0;
      var jobs = [];
      function remove() {
        outstanding--;
        if (outstanding < count3) {
          dequeue();
        }
      }
      __name(remove, "remove");
      function dequeue() {
        var job = jobs.shift();
        semaphore.queue = jobs.length;
        if (job) {
          run(job.fn).then(job.resolve).catch(job.reject);
        }
      }
      __name(dequeue, "dequeue");
      function queue(fn) {
        return new Promise(function(resolve, reject) {
          jobs.push({ fn, resolve, reject });
          semaphore.queue = jobs.length;
        });
      }
      __name(queue, "queue");
      function run(fn) {
        outstanding++;
        try {
          return Promise.resolve(fn()).then(function(result) {
            remove();
            return result;
          }, function(error3) {
            remove();
            throw error3;
          });
        } catch (err) {
          remove();
          return Promise.reject(err);
        }
      }
      __name(run, "run");
      var semaphore = /* @__PURE__ */ __name(function(fn) {
        if (outstanding >= count3) {
          return queue(fn);
        } else {
          return run(fn);
        }
      }, "semaphore");
      return semaphore;
    }
    __name(limiter, "limiter");
    function map(items, mapper) {
      var failed = false;
      var limit = this;
      return Promise.all(items.map(function() {
        var args = arguments;
        return limit(function() {
          if (!failed) {
            return mapper.apply(void 0, args).catch(function(e) {
              failed = true;
              throw e;
            });
          }
        });
      }));
    }
    __name(map, "map");
    function addExtras(fn) {
      fn.queue = 0;
      fn.map = map;
      return fn;
    }
    __name(addExtras, "addExtras");
    module.exports = function(count3) {
      if (count3) {
        return addExtras(limiter(count3));
      } else {
        return addExtras(function(fn) {
          return fn();
        });
      }
    };
  }
});
function _createClient(config2) {
  if (config2.scheme !== "wss" && config2.scheme !== "ws") {
    throw new LibsqlError(`The WebSocket client supports only "libsql:", "wss:" and "ws:" URLs, got ${JSON.stringify(config2.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
  if (config2.encryptionKey !== void 0) {
    throw new LibsqlError("Encryption key is not supported by the remote client.", "ENCRYPTION_KEY_NOT_SUPPORTED");
  }
  if (config2.scheme === "ws" && config2.tls) {
    throw new LibsqlError(`A "ws:" URL cannot opt into TLS by using ?tls=1`, "URL_INVALID");
  } else if (config2.scheme === "wss" && !config2.tls) {
    throw new LibsqlError(`A "wss:" URL cannot opt out of TLS by using ?tls=0`, "URL_INVALID");
  }
  const url = encodeBaseUrl(config2.scheme, config2.authority, config2.path);
  let client;
  try {
    client = openWs(url, config2.authToken);
  } catch (e) {
    if (e instanceof WebSocketUnsupportedError) {
      const suggestedScheme = config2.scheme === "wss" ? "https" : "http";
      const suggestedUrl = encodeBaseUrl(suggestedScheme, config2.authority, config2.path);
      throw new LibsqlError(`This environment does not support WebSockets, please switch to the HTTP client by using a "${suggestedScheme}:" URL (${JSON.stringify(suggestedUrl)}). For more information, please read ${supportedUrlLink}`, "WEBSOCKETS_NOT_SUPPORTED");
    }
    throw mapHranaError(e);
  }
  return new WsClient2(client, url, config2.authToken, config2.intMode, config2.concurrency);
}
__name(_createClient, "_createClient");
var import_promise_limit;
var maxConnAgeMillis;
var sqlCacheCapacity;
var WsClient2;
var WsTransaction;
var init_ws = __esm({
  "node_modules/@libsql/client/lib-esm/ws.js"() {
    init_lib_esm();
    init_api();
    init_config();
    init_hrana();
    init_sql_cache();
    init_uri();
    init_util();
    import_promise_limit = __toESM(require_promise_limit(), 1);
    init_api();
    maxConnAgeMillis = 60 * 1e3;
    sqlCacheCapacity = 100;
    WsClient2 = class {
      static {
        __name(this, "WsClient2");
      }
      #url;
      #authToken;
      #intMode;
      // State of the current connection. The `hrana.WsClient` inside may be closed at any moment due to an
      // asynchronous error.
      #connState;
      // If defined, this is a connection that will be used in the future, once it is ready.
      #futureConnState;
      closed;
      protocol;
      #isSchemaDatabase;
      #promiseLimitFunction;
      /** @private */
      constructor(client, url, authToken, intMode, concurrency) {
        this.#url = url;
        this.#authToken = authToken;
        this.#intMode = intMode;
        this.#connState = this.#openConn(client);
        this.#futureConnState = void 0;
        this.closed = false;
        this.protocol = "ws";
        this.#promiseLimitFunction = (0, import_promise_limit.default)(concurrency);
      }
      async limit(fn) {
        return this.#promiseLimitFunction(fn);
      }
      async execute(stmtOrSql, args) {
        let stmt;
        if (typeof stmtOrSql === "string") {
          stmt = {
            sql: stmtOrSql,
            args: args || []
          };
        } else {
          stmt = stmtOrSql;
        }
        return this.limit(async () => {
          const streamState = await this.#openStream();
          try {
            const hranaStmt = stmtToHrana(stmt);
            streamState.conn.sqlCache.apply([hranaStmt]);
            const hranaRowsPromise = streamState.stream.query(hranaStmt);
            streamState.stream.closeGracefully();
            const hranaRowsResult = await hranaRowsPromise;
            return resultSetFromHrana(hranaRowsResult);
          } catch (e) {
            throw mapHranaError(e);
          } finally {
            this._closeStream(streamState);
          }
        });
      }
      async batch(stmts, mode = "deferred") {
        return this.limit(async () => {
          const streamState = await this.#openStream();
          try {
            const normalizedStmts = stmts.map((stmt) => {
              if (Array.isArray(stmt)) {
                return {
                  sql: stmt[0],
                  args: stmt[1] || []
                };
              }
              return stmt;
            });
            const hranaStmts = normalizedStmts.map(stmtToHrana);
            const version22 = await streamState.conn.client.getVersion();
            streamState.conn.sqlCache.apply(hranaStmts);
            const batch = streamState.stream.batch(version22 >= 3);
            const resultsPromise = executeHranaBatch(mode, version22, batch, hranaStmts);
            const results = await resultsPromise;
            return results;
          } catch (e) {
            throw mapHranaError(e);
          } finally {
            this._closeStream(streamState);
          }
        });
      }
      async migrate(stmts) {
        return this.limit(async () => {
          const streamState = await this.#openStream();
          try {
            const hranaStmts = stmts.map(stmtToHrana);
            const version22 = await streamState.conn.client.getVersion();
            const batch = streamState.stream.batch(version22 >= 3);
            const resultsPromise = executeHranaBatch("deferred", version22, batch, hranaStmts, true);
            const results = await resultsPromise;
            return results;
          } catch (e) {
            throw mapHranaError(e);
          } finally {
            this._closeStream(streamState);
          }
        });
      }
      async transaction(mode = "write") {
        return this.limit(async () => {
          const streamState = await this.#openStream();
          try {
            const version22 = await streamState.conn.client.getVersion();
            return new WsTransaction(this, streamState, mode, version22);
          } catch (e) {
            this._closeStream(streamState);
            throw mapHranaError(e);
          }
        });
      }
      async executeMultiple(sql) {
        return this.limit(async () => {
          const streamState = await this.#openStream();
          try {
            const promise = streamState.stream.sequence(sql);
            streamState.stream.closeGracefully();
            await promise;
          } catch (e) {
            throw mapHranaError(e);
          } finally {
            this._closeStream(streamState);
          }
        });
      }
      sync() {
        throw new LibsqlError("sync not supported in ws mode", "SYNC_NOT_SUPPORTED");
      }
      async #openStream() {
        if (this.closed) {
          throw new LibsqlError("The client is closed", "CLIENT_CLOSED");
        }
        const now = /* @__PURE__ */ new Date();
        const ageMillis = now.valueOf() - this.#connState.openTime.valueOf();
        if (ageMillis > maxConnAgeMillis && this.#futureConnState === void 0) {
          const futureConnState = this.#openConn();
          this.#futureConnState = futureConnState;
          futureConnState.client.getVersion().then((_version) => {
            if (this.#connState !== futureConnState) {
              if (this.#connState.streamStates.size === 0) {
                this.#connState.client.close();
              } else {
              }
            }
            this.#connState = futureConnState;
            this.#futureConnState = void 0;
          }, (_e) => {
            this.#futureConnState = void 0;
          });
        }
        if (this.#connState.client.closed) {
          try {
            if (this.#futureConnState !== void 0) {
              this.#connState = this.#futureConnState;
            } else {
              this.#connState = this.#openConn();
            }
          } catch (e) {
            throw mapHranaError(e);
          }
        }
        const connState = this.#connState;
        try {
          if (connState.useSqlCache === void 0) {
            connState.useSqlCache = await connState.client.getVersion() >= 2;
            if (connState.useSqlCache) {
              connState.sqlCache.capacity = sqlCacheCapacity;
            }
          }
          const stream = connState.client.openStream();
          stream.intMode = this.#intMode;
          const streamState = { conn: connState, stream };
          connState.streamStates.add(streamState);
          return streamState;
        } catch (e) {
          throw mapHranaError(e);
        }
      }
      #openConn(client) {
        try {
          client ??= openWs(this.#url, this.#authToken);
          return {
            client,
            useSqlCache: void 0,
            sqlCache: new SqlCache(client, 0),
            openTime: /* @__PURE__ */ new Date(),
            streamStates: /* @__PURE__ */ new Set()
          };
        } catch (e) {
          throw mapHranaError(e);
        }
      }
      async reconnect() {
        try {
          for (const st of Array.from(this.#connState.streamStates)) {
            try {
              st.stream.close();
            } catch {
            }
          }
          this.#connState.client.close();
        } catch {
        }
        if (this.#futureConnState) {
          try {
            this.#futureConnState.client.close();
          } catch {
          }
          this.#futureConnState = void 0;
        }
        const next = this.#openConn();
        const version22 = await next.client.getVersion();
        next.useSqlCache = version22 >= 2;
        if (next.useSqlCache) {
          next.sqlCache.capacity = sqlCacheCapacity;
        }
        this.#connState = next;
        this.closed = false;
      }
      _closeStream(streamState) {
        streamState.stream.close();
        const connState = streamState.conn;
        connState.streamStates.delete(streamState);
        if (connState.streamStates.size === 0 && connState !== this.#connState) {
          connState.client.close();
        }
      }
      close() {
        this.#connState.client.close();
        this.closed = true;
        if (this.#futureConnState) {
          try {
            this.#futureConnState.client.close();
          } catch {
          }
          this.#futureConnState = void 0;
        }
        this.closed = true;
      }
    };
    WsTransaction = class extends HranaTransaction {
      static {
        __name(this, "WsTransaction");
      }
      #client;
      #streamState;
      /** @private */
      constructor(client, state, mode, version22) {
        super(mode, version22);
        this.#client = client;
        this.#streamState = state;
      }
      /** @private */
      _getStream() {
        return this.#streamState.stream;
      }
      /** @private */
      _getSqlCache() {
        return this.#streamState.conn.sqlCache;
      }
      close() {
        this.#client._closeStream(this.#streamState);
      }
      get closed() {
        return this.#streamState.stream.closed;
      }
    };
  }
});
function _createClient2(config2) {
  if (config2.scheme !== "https" && config2.scheme !== "http") {
    throw new LibsqlError(`The HTTP client supports only "libsql:", "https:" and "http:" URLs, got ${JSON.stringify(config2.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
  if (config2.encryptionKey !== void 0) {
    throw new LibsqlError("Encryption key is not supported by the remote client.", "ENCRYPTION_KEY_NOT_SUPPORTED");
  }
  if (config2.scheme === "http" && config2.tls) {
    throw new LibsqlError(`A "http:" URL cannot opt into TLS by using ?tls=1`, "URL_INVALID");
  } else if (config2.scheme === "https" && !config2.tls) {
    throw new LibsqlError(`A "https:" URL cannot opt out of TLS by using ?tls=0`, "URL_INVALID");
  }
  const url = encodeBaseUrl(config2.scheme, config2.authority, config2.path);
  return new HttpClient2(url, config2.authToken, config2.intMode, config2.fetch, config2.concurrency);
}
__name(_createClient2, "_createClient2");
var import_promise_limit2;
var sqlCacheCapacity2;
var HttpClient2;
var HttpTransaction;
var init_http = __esm({
  "node_modules/@libsql/client/lib-esm/http.js"() {
    init_lib_esm();
    init_api();
    init_config();
    init_hrana();
    init_sql_cache();
    init_uri();
    init_util();
    import_promise_limit2 = __toESM(require_promise_limit(), 1);
    init_api();
    sqlCacheCapacity2 = 30;
    HttpClient2 = class {
      static {
        __name(this, "HttpClient2");
      }
      #client;
      protocol;
      #url;
      #intMode;
      #customFetch;
      #concurrency;
      #authToken;
      #promiseLimitFunction;
      /** @private */
      constructor(url, authToken, intMode, customFetch, concurrency) {
        this.#url = url;
        this.#authToken = authToken;
        this.#intMode = intMode;
        this.#customFetch = customFetch;
        this.#concurrency = concurrency;
        this.#client = openHttp(this.#url, this.#authToken, this.#customFetch);
        this.#client.intMode = this.#intMode;
        this.protocol = "http";
        this.#promiseLimitFunction = (0, import_promise_limit2.default)(this.#concurrency);
      }
      async limit(fn) {
        return this.#promiseLimitFunction(fn);
      }
      async execute(stmtOrSql, args) {
        let stmt;
        if (typeof stmtOrSql === "string") {
          stmt = {
            sql: stmtOrSql,
            args: args || []
          };
        } else {
          stmt = stmtOrSql;
        }
        return this.limit(async () => {
          try {
            const hranaStmt = stmtToHrana(stmt);
            let rowsPromise;
            const stream = this.#client.openStream();
            try {
              rowsPromise = stream.query(hranaStmt);
            } finally {
              stream.closeGracefully();
            }
            const rowsResult = await rowsPromise;
            return resultSetFromHrana(rowsResult);
          } catch (e) {
            throw mapHranaError(e);
          }
        });
      }
      async batch(stmts, mode = "deferred") {
        return this.limit(async () => {
          try {
            const normalizedStmts = stmts.map((stmt) => {
              if (Array.isArray(stmt)) {
                return {
                  sql: stmt[0],
                  args: stmt[1] || []
                };
              }
              return stmt;
            });
            const hranaStmts = normalizedStmts.map(stmtToHrana);
            const version22 = await this.#client.getVersion();
            let resultsPromise;
            const stream = this.#client.openStream();
            try {
              const sqlCache = new SqlCache(stream, sqlCacheCapacity2);
              sqlCache.apply(hranaStmts);
              const batch = stream.batch(false);
              resultsPromise = executeHranaBatch(mode, version22, batch, hranaStmts);
            } finally {
              stream.closeGracefully();
            }
            const results = await resultsPromise;
            return results;
          } catch (e) {
            throw mapHranaError(e);
          }
        });
      }
      async migrate(stmts) {
        return this.limit(async () => {
          try {
            const hranaStmts = stmts.map(stmtToHrana);
            const version22 = await this.#client.getVersion();
            let resultsPromise;
            const stream = this.#client.openStream();
            try {
              const batch = stream.batch(false);
              resultsPromise = executeHranaBatch("deferred", version22, batch, hranaStmts, true);
            } finally {
              stream.closeGracefully();
            }
            const results = await resultsPromise;
            return results;
          } catch (e) {
            throw mapHranaError(e);
          }
        });
      }
      async transaction(mode = "write") {
        return this.limit(async () => {
          try {
            const version22 = await this.#client.getVersion();
            return new HttpTransaction(this.#client.openStream(), mode, version22);
          } catch (e) {
            throw mapHranaError(e);
          }
        });
      }
      async executeMultiple(sql) {
        return this.limit(async () => {
          try {
            let promise;
            const stream = this.#client.openStream();
            try {
              promise = stream.sequence(sql);
            } finally {
              stream.closeGracefully();
            }
            await promise;
          } catch (e) {
            throw mapHranaError(e);
          }
        });
      }
      sync() {
        throw new LibsqlError("sync not supported in http mode", "SYNC_NOT_SUPPORTED");
      }
      close() {
        this.#client.close();
      }
      async reconnect() {
        try {
          if (!this.closed) {
            this.#client.close();
          }
        } finally {
          this.#client = openHttp(this.#url, this.#authToken, this.#customFetch);
          this.#client.intMode = this.#intMode;
        }
      }
      get closed() {
        return this.#client.closed;
      }
    };
    HttpTransaction = class extends HranaTransaction {
      static {
        __name(this, "HttpTransaction");
      }
      #stream;
      #sqlCache;
      /** @private */
      constructor(stream, mode, version22) {
        super(mode, version22);
        this.#stream = stream;
        this.#sqlCache = new SqlCache(stream, sqlCacheCapacity2);
      }
      /** @private */
      _getStream() {
        return this.#stream;
      }
      /** @private */
      _getSqlCache() {
        return this.#sqlCache;
      }
      close() {
        this.#stream.close();
      }
      get closed() {
        return this.#stream.closed;
      }
    };
  }
});
function createClient(config2) {
  return _createClient3(expandConfig(config2, true));
}
__name(createClient, "createClient");
function _createClient3(config2) {
  if (config2.scheme === "ws" || config2.scheme === "wss") {
    return _createClient(config2);
  } else if (config2.scheme === "http" || config2.scheme === "https") {
    return _createClient2(config2);
  } else {
    throw new LibsqlError(`The client that uses Web standard APIs supports only "libsql:", "wss:", "ws:", "https:" and "http:" URLs, got ${JSON.stringify(config2.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
}
__name(_createClient3, "_createClient3");
var init_web3 = __esm({
  "node_modules/@libsql/client/lib-esm/web.js"() {
    init_api();
    init_config();
    init_util();
    init_ws();
    init_http();
    init_api();
  }
});
var turso_exports = {};
__export(turso_exports, {
  __resetTursoClients: /* @__PURE__ */ __name(() => __resetTursoClients, "__resetTursoClients"),
  __setTursoWebClientFactory: /* @__PURE__ */ __name(() => __setTursoWebClientFactory, "__setTursoWebClientFactory"),
  getTursoClient: /* @__PURE__ */ __name(() => getTursoClient, "getTursoClient"),
  getTursoConfig: /* @__PURE__ */ __name(() => getTursoConfig, "getTursoConfig"),
  isTursoConfigured: /* @__PURE__ */ __name(() => isTursoConfigured, "isTursoConfigured")
});
function firstDefined(...values) {
  return values.find((value) => value !== void 0 && value !== null && value !== "");
}
__name(firstDefined, "firstDefined");
function resolveEnv(req, name) {
  return firstDefined(
    req ? getReqEnv(req, name) : void 0,
    req ? getReqEnv(req, `rz_${name}`) : void 0,
    req ? getReqEnv(req, `RZ_${name}`) : void 0
  );
}
__name(resolveEnv, "resolveEnv");
function createClientFor(url, authToken) {
  const factory = createClient || webClientFactory;
  return factory({ url, authToken });
}
__name(createClientFor, "createClientFor");
function getTursoConfig(req) {
  return {
    url: resolveEnv(req, "TURSO_DATABASE_URL"),
    authToken: resolveEnv(req, "TURSO_AUTH_TOKEN")
  };
}
__name(getTursoConfig, "getTursoConfig");
function isTursoConfigured(req) {
  const { url, authToken } = getTursoConfig(req);
  return Boolean(url && authToken);
}
__name(isTursoConfigured, "isTursoConfigured");
function getTursoClient(req) {
  if (isTestEnv(req)) {
    return {
      execute: /* @__PURE__ */ __name(async () => ({ rows: [], columns: [] }), "execute"),
      batch: /* @__PURE__ */ __name(async () => ({ results: [] }), "batch"),
      close: /* @__PURE__ */ __name(() => {
      }, "close")
    };
  }
  const { url, authToken } = getTursoConfig(req);
  if (!url) {
    throw new Error("Missing TURSO_DATABASE_URL environment variable (or rz_TURSO_DATABASE_URL)");
  }
  if (!authToken) {
    throw new Error("Missing TURSO_AUTH_TOKEN environment variable (or rz_TURSO_AUTH_TOKEN)");
  }
  const cacheKey = `${url}|${String(authToken).slice(-8)}`;
  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, { client: null });
  }
  const entry = clientCache.get(cacheKey);
  if (!entry.client) {
    entry.client = createClientFor(url, authToken);
  }
  return entry.client;
}
__name(getTursoClient, "getTursoClient");
function __setTursoWebClientFactory(factory) {
  webClientFactory = factory;
  clientCache = /* @__PURE__ */ new Map();
}
__name(__setTursoWebClientFactory, "__setTursoWebClientFactory");
function __resetTursoClients() {
  clientCache = /* @__PURE__ */ new Map();
}
__name(__resetTursoClients, "__resetTursoClients");
var webClientFactory;
var clientCache;
var init_turso = __esm({
  "api/_turso.js"() {
    init_env();
    init_web3();
    clientCache = /* @__PURE__ */ new Map();
  }
});
var nodemailer_stub_exports = {};
__export(nodemailer_stub_exports, {
  createTransport: /* @__PURE__ */ __name(() => createTransport, "createTransport"),
  default: /* @__PURE__ */ __name(() => nodemailer_stub_default, "default")
});
function createTransport() {
  return {
    sendMail() {
      return Promise.reject(
        new Error(
          "SMTP is not available on Cloudflare Workers. Set MAIL_PROVIDER=resend (RESEND_API_KEY) or MAIL_PROVIDER=postmark (POSTMARK_SERVER_TOKEN), or send mail from an external service."
        )
      );
    }
  };
}
__name(createTransport, "createTransport");
var nodemailer_stub_default;
var init_nodemailer_stub = __esm({
  "cloudflare/nodemailer-stub.js"() {
    nodemailer_stub_default = { createTransport, __rpStub: true };
  }
});
var require_utils = __commonJS({
  "node_modules/busboy/lib/utils.js"(exports, module) {
    "use strict";
    function parseContentType(str) {
      if (str.length === 0)
        return;
      const params = /* @__PURE__ */ Object.create(null);
      let i = 0;
      for (; i < str.length; ++i) {
        const code = str.charCodeAt(i);
        if (TOKEN[code] !== 1) {
          if (code !== 47 || i === 0)
            return;
          break;
        }
      }
      if (i === str.length)
        return;
      const type = str.slice(0, i).toLowerCase();
      const subtypeStart = ++i;
      for (; i < str.length; ++i) {
        const code = str.charCodeAt(i);
        if (TOKEN[code] !== 1) {
          if (i === subtypeStart)
            return;
          if (parseContentTypeParams(str, i, params) === void 0)
            return;
          break;
        }
      }
      if (i === subtypeStart)
        return;
      const subtype = str.slice(subtypeStart, i).toLowerCase();
      return { type, subtype, params };
    }
    __name(parseContentType, "parseContentType");
    function parseContentTypeParams(str, i, params) {
      while (i < str.length) {
        for (; i < str.length; ++i) {
          const code = str.charCodeAt(i);
          if (code !== 32 && code !== 9)
            break;
        }
        if (i === str.length)
          break;
        if (str.charCodeAt(i++) !== 59)
          return;
        for (; i < str.length; ++i) {
          const code = str.charCodeAt(i);
          if (code !== 32 && code !== 9)
            break;
        }
        if (i === str.length)
          return;
        let name;
        const nameStart = i;
        for (; i < str.length; ++i) {
          const code = str.charCodeAt(i);
          if (TOKEN[code] !== 1) {
            if (code !== 61)
              return;
            break;
          }
        }
        if (i === str.length)
          return;
        name = str.slice(nameStart, i);
        ++i;
        if (i === str.length)
          return;
        let value = "";
        let valueStart;
        if (str.charCodeAt(i) === 34) {
          valueStart = ++i;
          let escaping = false;
          for (; i < str.length; ++i) {
            const code = str.charCodeAt(i);
            if (code === 92) {
              if (escaping) {
                valueStart = i;
                escaping = false;
              } else {
                value += str.slice(valueStart, i);
                escaping = true;
              }
              continue;
            }
            if (code === 34) {
              if (escaping) {
                valueStart = i;
                escaping = false;
                continue;
              }
              value += str.slice(valueStart, i);
              break;
            }
            if (escaping) {
              valueStart = i - 1;
              escaping = false;
            }
            if (QDTEXT[code] !== 1)
              return;
          }
          if (i === str.length)
            return;
          ++i;
        } else {
          valueStart = i;
          for (; i < str.length; ++i) {
            const code = str.charCodeAt(i);
            if (TOKEN[code] !== 1) {
              if (i === valueStart)
                return;
              break;
            }
          }
          value = str.slice(valueStart, i);
        }
        name = name.toLowerCase();
        if (params[name] === void 0)
          params[name] = value;
      }
      return params;
    }
    __name(parseContentTypeParams, "parseContentTypeParams");
    function parseDisposition(str, defDecoder) {
      if (str.length === 0)
        return;
      const params = /* @__PURE__ */ Object.create(null);
      let i = 0;
      for (; i < str.length; ++i) {
        const code = str.charCodeAt(i);
        if (TOKEN[code] !== 1) {
          if (parseDispositionParams(str, i, params, defDecoder) === void 0)
            return;
          break;
        }
      }
      const type = str.slice(0, i).toLowerCase();
      return { type, params };
    }
    __name(parseDisposition, "parseDisposition");
    function parseDispositionParams(str, i, params, defDecoder) {
      while (i < str.length) {
        for (; i < str.length; ++i) {
          const code = str.charCodeAt(i);
          if (code !== 32 && code !== 9)
            break;
        }
        if (i === str.length)
          break;
        if (str.charCodeAt(i++) !== 59)
          return;
        for (; i < str.length; ++i) {
          const code = str.charCodeAt(i);
          if (code !== 32 && code !== 9)
            break;
        }
        if (i === str.length)
          return;
        let name;
        const nameStart = i;
        for (; i < str.length; ++i) {
          const code = str.charCodeAt(i);
          if (TOKEN[code] !== 1) {
            if (code === 61)
              break;
            return;
          }
        }
        if (i === str.length)
          return;
        let value = "";
        let valueStart;
        let charset;
        name = str.slice(nameStart, i);
        if (name.charCodeAt(name.length - 1) === 42) {
          const charsetStart = ++i;
          for (; i < str.length; ++i) {
            const code = str.charCodeAt(i);
            if (CHARSET[code] !== 1) {
              if (code !== 39)
                return;
              break;
            }
          }
          if (i === str.length)
            return;
          charset = str.slice(charsetStart, i);
          ++i;
          for (; i < str.length; ++i) {
            const code = str.charCodeAt(i);
            if (code === 39)
              break;
          }
          if (i === str.length)
            return;
          ++i;
          if (i === str.length)
            return;
          valueStart = i;
          let encode2 = 0;
          for (; i < str.length; ++i) {
            const code = str.charCodeAt(i);
            if (EXTENDED_VALUE[code] !== 1) {
              if (code === 37) {
                let hexUpper;
                let hexLower;
                if (i + 2 < str.length && (hexUpper = HEX_VALUES[str.charCodeAt(i + 1)]) !== -1 && (hexLower = HEX_VALUES[str.charCodeAt(i + 2)]) !== -1) {
                  const byteVal = (hexUpper << 4) + hexLower;
                  value += str.slice(valueStart, i);
                  value += String.fromCharCode(byteVal);
                  i += 2;
                  valueStart = i + 1;
                  if (byteVal >= 128)
                    encode2 = 2;
                  else if (encode2 === 0)
                    encode2 = 1;
                  continue;
                }
                return;
              }
              break;
            }
          }
          value += str.slice(valueStart, i);
          value = convertToUTF8(value, charset, encode2);
          if (value === void 0)
            return;
        } else {
          ++i;
          if (i === str.length)
            return;
          if (str.charCodeAt(i) === 34) {
            valueStart = ++i;
            let escaping = false;
            for (; i < str.length; ++i) {
              const code = str.charCodeAt(i);
              if (code === 92) {
                if (escaping) {
                  valueStart = i;
                  escaping = false;
                } else {
                  value += str.slice(valueStart, i);
                  escaping = true;
                }
                continue;
              }
              if (code === 34) {
                if (escaping) {
                  valueStart = i;
                  escaping = false;
                  continue;
                }
                value += str.slice(valueStart, i);
                break;
              }
              if (escaping) {
                valueStart = i - 1;
                escaping = false;
              }
              if (QDTEXT[code] !== 1)
                return;
            }
            if (i === str.length)
              return;
            ++i;
          } else {
            valueStart = i;
            for (; i < str.length; ++i) {
              const code = str.charCodeAt(i);
              if (TOKEN[code] !== 1) {
                if (i === valueStart)
                  return;
                break;
              }
            }
            value = str.slice(valueStart, i);
          }
          value = defDecoder(value, 2);
          if (value === void 0)
            return;
        }
        name = name.toLowerCase();
        if (params[name] === void 0)
          params[name] = value;
      }
      return params;
    }
    __name(parseDispositionParams, "parseDispositionParams");
    function getDecoder(charset) {
      let lc;
      while (true) {
        switch (charset) {
          case "utf-8":
          case "utf8":
            return decoders.utf8;
          case "latin1":
          case "ascii":
          // TODO: Make these a separate, strict decoder?
          case "us-ascii":
          case "iso-8859-1":
          case "iso8859-1":
          case "iso88591":
          case "iso_8859-1":
          case "windows-1252":
          case "iso_8859-1:1987":
          case "cp1252":
          case "x-cp1252":
            return decoders.latin1;
          case "utf16le":
          case "utf-16le":
          case "ucs2":
          case "ucs-2":
            return decoders.utf16le;
          case "base64":
            return decoders.base64;
          default:
            if (lc === void 0) {
              lc = true;
              charset = charset.toLowerCase();
              continue;
            }
            return decoders.other.bind(charset);
        }
      }
    }
    __name(getDecoder, "getDecoder");
    var decoders = {
      utf8: /* @__PURE__ */ __name((data, hint) => {
        if (data.length === 0)
          return "";
        if (typeof data === "string") {
          if (hint < 2)
            return data;
          data = Buffer.from(data, "latin1");
        }
        return data.utf8Slice(0, data.length);
      }, "utf8"),
      latin1: /* @__PURE__ */ __name((data, hint) => {
        if (data.length === 0)
          return "";
        if (typeof data === "string")
          return data;
        return data.latin1Slice(0, data.length);
      }, "latin1"),
      utf16le: /* @__PURE__ */ __name((data, hint) => {
        if (data.length === 0)
          return "";
        if (typeof data === "string")
          data = Buffer.from(data, "latin1");
        return data.ucs2Slice(0, data.length);
      }, "utf16le"),
      base64: /* @__PURE__ */ __name((data, hint) => {
        if (data.length === 0)
          return "";
        if (typeof data === "string")
          data = Buffer.from(data, "latin1");
        return data.base64Slice(0, data.length);
      }, "base64"),
      other: /* @__PURE__ */ __name((data, hint) => {
        if (data.length === 0)
          return "";
        if (typeof data === "string")
          data = Buffer.from(data, "latin1");
        try {
          const decoder = new TextDecoder(exports);
          return decoder.decode(data);
        } catch {
        }
      }, "other")
    };
    function convertToUTF8(data, charset, hint) {
      const decode3 = getDecoder(charset);
      if (decode3)
        return decode3(data, hint);
    }
    __name(convertToUTF8, "convertToUTF8");
    function basename(path) {
      if (typeof path !== "string")
        return "";
      for (let i = path.length - 1; i >= 0; --i) {
        switch (path.charCodeAt(i)) {
          case 47:
          // '/'
          case 92:
            path = path.slice(i + 1);
            return path === ".." || path === "." ? "" : path;
        }
      }
      return path === ".." || path === "." ? "" : path;
    }
    __name(basename, "basename");
    var TOKEN = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ];
    var QDTEXT = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ];
    var CHARSET = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ];
    var EXTENDED_VALUE = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      1,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ];
    var HEX_VALUES = [
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      10,
      11,
      12,
      13,
      14,
      15,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      10,
      11,
      12,
      13,
      14,
      15,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1
    ];
    module.exports = {
      basename,
      convertToUTF8,
      getDecoder,
      parseContentType,
      parseDisposition
    };
  }
});
var require_sbmh = __commonJS({
  "node_modules/streamsearch/lib/sbmh.js"(exports, module) {
    "use strict";
    function memcmp(buf1, pos1, buf2, pos2, num) {
      for (let i = 0; i < num; ++i) {
        if (buf1[pos1 + i] !== buf2[pos2 + i])
          return false;
      }
      return true;
    }
    __name(memcmp, "memcmp");
    var SBMH = class {
      static {
        __name(this, "SBMH");
      }
      constructor(needle, cb) {
        if (typeof cb !== "function")
          throw new Error("Missing match callback");
        if (typeof needle === "string")
          needle = Buffer.from(needle);
        else if (!Buffer.isBuffer(needle))
          throw new Error(`Expected Buffer for needle, got ${typeof needle}`);
        const needleLen = needle.length;
        this.maxMatches = Infinity;
        this.matches = 0;
        this._cb = cb;
        this._lookbehindSize = 0;
        this._needle = needle;
        this._bufPos = 0;
        this._lookbehind = Buffer.allocUnsafe(needleLen);
        this._occ = [
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen,
          needleLen
        ];
        if (needleLen > 1) {
          for (let i = 0; i < needleLen - 1; ++i)
            this._occ[needle[i]] = needleLen - 1 - i;
        }
      }
      reset() {
        this.matches = 0;
        this._lookbehindSize = 0;
        this._bufPos = 0;
      }
      push(chunk, pos) {
        let result;
        if (!Buffer.isBuffer(chunk))
          chunk = Buffer.from(chunk, "latin1");
        const chunkLen = chunk.length;
        this._bufPos = pos || 0;
        while (result !== chunkLen && this.matches < this.maxMatches)
          result = feed(this, chunk);
        return result;
      }
      destroy() {
        const lbSize = this._lookbehindSize;
        if (lbSize)
          this._cb(false, this._lookbehind, 0, lbSize, false);
        this.reset();
      }
    };
    function feed(self2, data) {
      const len = data.length;
      const needle = self2._needle;
      const needleLen = needle.length;
      let pos = -self2._lookbehindSize;
      const lastNeedleCharPos = needleLen - 1;
      const lastNeedleChar = needle[lastNeedleCharPos];
      const end = len - needleLen;
      const occ = self2._occ;
      const lookbehind = self2._lookbehind;
      if (pos < 0) {
        while (pos < 0 && pos <= end) {
          const nextPos = pos + lastNeedleCharPos;
          const ch = nextPos < 0 ? lookbehind[self2._lookbehindSize + nextPos] : data[nextPos];
          if (ch === lastNeedleChar && matchNeedle(self2, data, pos, lastNeedleCharPos)) {
            self2._lookbehindSize = 0;
            ++self2.matches;
            if (pos > -self2._lookbehindSize)
              self2._cb(true, lookbehind, 0, self2._lookbehindSize + pos, false);
            else
              self2._cb(true, void 0, 0, 0, true);
            return self2._bufPos = pos + needleLen;
          }
          pos += occ[ch];
        }
        while (pos < 0 && !matchNeedle(self2, data, pos, len - pos))
          ++pos;
        if (pos < 0) {
          const bytesToCutOff = self2._lookbehindSize + pos;
          if (bytesToCutOff > 0) {
            self2._cb(false, lookbehind, 0, bytesToCutOff, false);
          }
          self2._lookbehindSize -= bytesToCutOff;
          lookbehind.copy(lookbehind, 0, bytesToCutOff, self2._lookbehindSize);
          lookbehind.set(data, self2._lookbehindSize);
          self2._lookbehindSize += len;
          self2._bufPos = len;
          return len;
        }
        self2._cb(false, lookbehind, 0, self2._lookbehindSize, false);
        self2._lookbehindSize = 0;
      }
      pos += self2._bufPos;
      const firstNeedleChar = needle[0];
      while (pos <= end) {
        const ch = data[pos + lastNeedleCharPos];
        if (ch === lastNeedleChar && data[pos] === firstNeedleChar && memcmp(needle, 0, data, pos, lastNeedleCharPos)) {
          ++self2.matches;
          if (pos > 0)
            self2._cb(true, data, self2._bufPos, pos, true);
          else
            self2._cb(true, void 0, 0, 0, true);
          return self2._bufPos = pos + needleLen;
        }
        pos += occ[ch];
      }
      while (pos < len) {
        if (data[pos] !== firstNeedleChar || !memcmp(data, pos, needle, 0, len - pos)) {
          ++pos;
          continue;
        }
        data.copy(lookbehind, 0, pos, len);
        self2._lookbehindSize = len - pos;
        break;
      }
      if (pos > 0)
        self2._cb(false, data, self2._bufPos, pos < len ? pos : len, true);
      self2._bufPos = len;
      return len;
    }
    __name(feed, "feed");
    function matchNeedle(self2, data, pos, len) {
      const lb = self2._lookbehind;
      const lbSize = self2._lookbehindSize;
      const needle = self2._needle;
      for (let i = 0; i < len; ++i, ++pos) {
        const ch = pos < 0 ? lb[lbSize + pos] : data[pos];
        if (ch !== needle[i])
          return false;
      }
      return true;
    }
    __name(matchNeedle, "matchNeedle");
    module.exports = SBMH;
  }
});
var require_multipart = __commonJS({
  "node_modules/busboy/lib/types/multipart.js"(exports, module) {
    "use strict";
    var { Readable, Writable: Writable2 } = __require2("stream");
    var StreamSearch = require_sbmh();
    var {
      basename,
      convertToUTF8,
      getDecoder,
      parseContentType,
      parseDisposition
    } = require_utils();
    var BUF_CRLF = Buffer.from("\r\n");
    var BUF_CR = Buffer.from("\r");
    var BUF_DASH = Buffer.from("-");
    function noop() {
    }
    __name(noop, "noop");
    var MAX_HEADER_PAIRS = 2e3;
    var MAX_HEADER_SIZE = 16 * 1024;
    var HPARSER_NAME = 0;
    var HPARSER_PRE_OWS = 1;
    var HPARSER_VALUE = 2;
    var HeaderParser = class {
      static {
        __name(this, "HeaderParser");
      }
      constructor(cb) {
        this.header = /* @__PURE__ */ Object.create(null);
        this.pairCount = 0;
        this.byteCount = 0;
        this.state = HPARSER_NAME;
        this.name = "";
        this.value = "";
        this.crlf = 0;
        this.cb = cb;
      }
      reset() {
        this.header = /* @__PURE__ */ Object.create(null);
        this.pairCount = 0;
        this.byteCount = 0;
        this.state = HPARSER_NAME;
        this.name = "";
        this.value = "";
        this.crlf = 0;
      }
      push(chunk, pos, end) {
        let start = pos;
        while (pos < end) {
          switch (this.state) {
            case HPARSER_NAME: {
              let done = false;
              for (; pos < end; ++pos) {
                if (this.byteCount === MAX_HEADER_SIZE)
                  return -1;
                ++this.byteCount;
                const code = chunk[pos];
                if (TOKEN[code] !== 1) {
                  if (code !== 58)
                    return -1;
                  this.name += chunk.latin1Slice(start, pos);
                  if (this.name.length === 0)
                    return -1;
                  ++pos;
                  done = true;
                  this.state = HPARSER_PRE_OWS;
                  break;
                }
              }
              if (!done) {
                this.name += chunk.latin1Slice(start, pos);
                break;
              }
            }
            case HPARSER_PRE_OWS: {
              let done = false;
              for (; pos < end; ++pos) {
                if (this.byteCount === MAX_HEADER_SIZE)
                  return -1;
                ++this.byteCount;
                const code = chunk[pos];
                if (code !== 32 && code !== 9) {
                  start = pos;
                  done = true;
                  this.state = HPARSER_VALUE;
                  break;
                }
              }
              if (!done)
                break;
            }
            case HPARSER_VALUE:
              switch (this.crlf) {
                case 0:
                  for (; pos < end; ++pos) {
                    if (this.byteCount === MAX_HEADER_SIZE)
                      return -1;
                    ++this.byteCount;
                    const code = chunk[pos];
                    if (FIELD_VCHAR[code] !== 1) {
                      if (code !== 13)
                        return -1;
                      ++this.crlf;
                      break;
                    }
                  }
                  this.value += chunk.latin1Slice(start, pos++);
                  break;
                case 1:
                  if (this.byteCount === MAX_HEADER_SIZE)
                    return -1;
                  ++this.byteCount;
                  if (chunk[pos++] !== 10)
                    return -1;
                  ++this.crlf;
                  break;
                case 2: {
                  if (this.byteCount === MAX_HEADER_SIZE)
                    return -1;
                  ++this.byteCount;
                  const code = chunk[pos];
                  if (code === 32 || code === 9) {
                    start = pos;
                    this.crlf = 0;
                  } else {
                    if (++this.pairCount < MAX_HEADER_PAIRS) {
                      this.name = this.name.toLowerCase();
                      if (this.header[this.name] === void 0)
                        this.header[this.name] = [this.value];
                      else
                        this.header[this.name].push(this.value);
                    }
                    if (code === 13) {
                      ++this.crlf;
                      ++pos;
                    } else {
                      start = pos;
                      this.crlf = 0;
                      this.state = HPARSER_NAME;
                      this.name = "";
                      this.value = "";
                    }
                  }
                  break;
                }
                case 3: {
                  if (this.byteCount === MAX_HEADER_SIZE)
                    return -1;
                  ++this.byteCount;
                  if (chunk[pos++] !== 10)
                    return -1;
                  const header = this.header;
                  this.reset();
                  this.cb(header);
                  return pos;
                }
              }
              break;
          }
        }
        return pos;
      }
    };
    var FileStream = class extends Readable {
      static {
        __name(this, "FileStream");
      }
      constructor(opts, owner) {
        super(opts);
        this.truncated = false;
        this._readcb = null;
        this.once("end", () => {
          this._read();
          if (--owner._fileEndsLeft === 0 && owner._finalcb) {
            const cb = owner._finalcb;
            owner._finalcb = null;
            process.nextTick(cb);
          }
        });
      }
      _read(n) {
        const cb = this._readcb;
        if (cb) {
          this._readcb = null;
          cb();
        }
      }
    };
    var ignoreData = {
      push: /* @__PURE__ */ __name((chunk, pos) => {
      }, "push"),
      destroy: /* @__PURE__ */ __name(() => {
      }, "destroy")
    };
    function callAndUnsetCb(self2, err) {
      const cb = self2._writecb;
      self2._writecb = null;
      if (err)
        self2.destroy(err);
      else if (cb)
        cb();
    }
    __name(callAndUnsetCb, "callAndUnsetCb");
    function nullDecoder(val, hint) {
      return val;
    }
    __name(nullDecoder, "nullDecoder");
    var Multipart = class extends Writable2 {
      static {
        __name(this, "Multipart");
      }
      constructor(cfg) {
        const streamOpts = {
          autoDestroy: true,
          emitClose: true,
          highWaterMark: typeof cfg.highWaterMark === "number" ? cfg.highWaterMark : void 0
        };
        super(streamOpts);
        if (!cfg.conType.params || typeof cfg.conType.params.boundary !== "string")
          throw new Error("Multipart: Boundary not found");
        const boundary = cfg.conType.params.boundary;
        const paramDecoder = typeof cfg.defParamCharset === "string" && cfg.defParamCharset ? getDecoder(cfg.defParamCharset) : nullDecoder;
        const defCharset = cfg.defCharset || "utf8";
        const preservePath = cfg.preservePath;
        const fileOpts = {
          autoDestroy: true,
          emitClose: true,
          highWaterMark: typeof cfg.fileHwm === "number" ? cfg.fileHwm : void 0
        };
        const limits = cfg.limits;
        const fieldSizeLimit = limits && typeof limits.fieldSize === "number" ? limits.fieldSize : 1 * 1024 * 1024;
        const fileSizeLimit = limits && typeof limits.fileSize === "number" ? limits.fileSize : Infinity;
        const filesLimit = limits && typeof limits.files === "number" ? limits.files : Infinity;
        const fieldsLimit = limits && typeof limits.fields === "number" ? limits.fields : Infinity;
        const partsLimit = limits && typeof limits.parts === "number" ? limits.parts : Infinity;
        let parts = -1;
        let fields = 0;
        let files = 0;
        let skipPart = false;
        this._fileEndsLeft = 0;
        this._fileStream = void 0;
        this._complete = false;
        let fileSize = 0;
        let field;
        let fieldSize = 0;
        let partCharset;
        let partEncoding;
        let partType;
        let partName;
        let partTruncated = false;
        let hitFilesLimit = false;
        let hitFieldsLimit = false;
        this._hparser = null;
        const hparser = new HeaderParser((header) => {
          this._hparser = null;
          skipPart = false;
          partType = "text/plain";
          partCharset = defCharset;
          partEncoding = "7bit";
          partName = void 0;
          partTruncated = false;
          let filename;
          if (!header["content-disposition"]) {
            skipPart = true;
            return;
          }
          const disp = parseDisposition(
            header["content-disposition"][0],
            paramDecoder
          );
          if (!disp || disp.type !== "form-data") {
            skipPart = true;
            return;
          }
          if (disp.params) {
            if (disp.params.name)
              partName = disp.params.name;
            if (disp.params["filename*"])
              filename = disp.params["filename*"];
            else if (disp.params.filename)
              filename = disp.params.filename;
            if (filename !== void 0 && !preservePath)
              filename = basename(filename);
          }
          if (header["content-type"]) {
            const conType = parseContentType(header["content-type"][0]);
            if (conType) {
              partType = `${conType.type}/${conType.subtype}`;
              if (conType.params && typeof conType.params.charset === "string")
                partCharset = conType.params.charset.toLowerCase();
            }
          }
          if (header["content-transfer-encoding"])
            partEncoding = header["content-transfer-encoding"][0].toLowerCase();
          if (partType === "application/octet-stream" || filename !== void 0) {
            if (files === filesLimit) {
              if (!hitFilesLimit) {
                hitFilesLimit = true;
                this.emit("filesLimit");
              }
              skipPart = true;
              return;
            }
            ++files;
            if (this.listenerCount("file") === 0) {
              skipPart = true;
              return;
            }
            fileSize = 0;
            this._fileStream = new FileStream(fileOpts, this);
            ++this._fileEndsLeft;
            this.emit(
              "file",
              partName,
              this._fileStream,
              {
                filename,
                encoding: partEncoding,
                mimeType: partType
              }
            );
          } else {
            if (fields === fieldsLimit) {
              if (!hitFieldsLimit) {
                hitFieldsLimit = true;
                this.emit("fieldsLimit");
              }
              skipPart = true;
              return;
            }
            ++fields;
            if (this.listenerCount("field") === 0) {
              skipPart = true;
              return;
            }
            field = [];
            fieldSize = 0;
          }
        });
        let matchPostBoundary = 0;
        const ssCb = /* @__PURE__ */ __name((isMatch, data, start, end, isDataSafe) => {
          retrydata:
            while (data) {
              if (this._hparser !== null) {
                const ret = this._hparser.push(data, start, end);
                if (ret === -1) {
                  this._hparser = null;
                  hparser.reset();
                  this.emit("error", new Error("Malformed part header"));
                  break;
                }
                start = ret;
              }
              if (start === end)
                break;
              if (matchPostBoundary !== 0) {
                if (matchPostBoundary === 1) {
                  switch (data[start]) {
                    case 45:
                      matchPostBoundary = 2;
                      ++start;
                      break;
                    case 13:
                      matchPostBoundary = 3;
                      ++start;
                      break;
                    default:
                      matchPostBoundary = 0;
                  }
                  if (start === end)
                    return;
                }
                if (matchPostBoundary === 2) {
                  matchPostBoundary = 0;
                  if (data[start] === 45) {
                    this._complete = true;
                    this._bparser = ignoreData;
                    return;
                  }
                  const writecb = this._writecb;
                  this._writecb = noop;
                  ssCb(false, BUF_DASH, 0, 1, false);
                  this._writecb = writecb;
                } else if (matchPostBoundary === 3) {
                  matchPostBoundary = 0;
                  if (data[start] === 10) {
                    ++start;
                    if (parts >= partsLimit)
                      break;
                    this._hparser = hparser;
                    if (start === end)
                      break;
                    continue retrydata;
                  } else {
                    const writecb = this._writecb;
                    this._writecb = noop;
                    ssCb(false, BUF_CR, 0, 1, false);
                    this._writecb = writecb;
                  }
                }
              }
              if (!skipPart) {
                if (this._fileStream) {
                  let chunk;
                  const actualLen = Math.min(end - start, fileSizeLimit - fileSize);
                  if (!isDataSafe) {
                    chunk = Buffer.allocUnsafe(actualLen);
                    data.copy(chunk, 0, start, start + actualLen);
                  } else {
                    chunk = data.slice(start, start + actualLen);
                  }
                  fileSize += chunk.length;
                  if (fileSize === fileSizeLimit) {
                    if (chunk.length > 0)
                      this._fileStream.push(chunk);
                    this._fileStream.emit("limit");
                    this._fileStream.truncated = true;
                    skipPart = true;
                  } else if (!this._fileStream.push(chunk)) {
                    if (this._writecb)
                      this._fileStream._readcb = this._writecb;
                    this._writecb = null;
                  }
                } else if (field !== void 0) {
                  let chunk;
                  const actualLen = Math.min(
                    end - start,
                    fieldSizeLimit - fieldSize
                  );
                  if (!isDataSafe) {
                    chunk = Buffer.allocUnsafe(actualLen);
                    data.copy(chunk, 0, start, start + actualLen);
                  } else {
                    chunk = data.slice(start, start + actualLen);
                  }
                  fieldSize += actualLen;
                  field.push(chunk);
                  if (fieldSize === fieldSizeLimit) {
                    skipPart = true;
                    partTruncated = true;
                  }
                }
              }
              break;
            }
          if (isMatch) {
            matchPostBoundary = 1;
            if (this._fileStream) {
              this._fileStream.push(null);
              this._fileStream = null;
            } else if (field !== void 0) {
              let data2;
              switch (field.length) {
                case 0:
                  data2 = "";
                  break;
                case 1:
                  data2 = convertToUTF8(field[0], partCharset, 0);
                  break;
                default:
                  data2 = convertToUTF8(
                    Buffer.concat(field, fieldSize),
                    partCharset,
                    0
                  );
              }
              field = void 0;
              fieldSize = 0;
              this.emit(
                "field",
                partName,
                data2,
                {
                  nameTruncated: false,
                  valueTruncated: partTruncated,
                  encoding: partEncoding,
                  mimeType: partType
                }
              );
            }
            if (++parts === partsLimit)
              this.emit("partsLimit");
          }
        }, "ssCb");
        this._bparser = new StreamSearch(`\r
--${boundary}`, ssCb);
        this._writecb = null;
        this._finalcb = null;
        this.write(BUF_CRLF);
      }
      static detect(conType) {
        return conType.type === "multipart" && conType.subtype === "form-data";
      }
      _write(chunk, enc, cb) {
        this._writecb = cb;
        this._bparser.push(chunk, 0);
        if (this._writecb)
          callAndUnsetCb(this);
      }
      _destroy(err, cb) {
        this._hparser = null;
        this._bparser = ignoreData;
        if (!err)
          err = checkEndState(this);
        const fileStream = this._fileStream;
        if (fileStream) {
          this._fileStream = null;
          fileStream.destroy(err);
        }
        cb(err);
      }
      _final(cb) {
        this._bparser.destroy();
        if (!this._complete)
          return cb(new Error("Unexpected end of form"));
        if (this._fileEndsLeft)
          this._finalcb = finalcb.bind(null, this, cb);
        else
          finalcb(this, cb);
      }
    };
    function finalcb(self2, cb, err) {
      if (err)
        return cb(err);
      err = checkEndState(self2);
      cb(err);
    }
    __name(finalcb, "finalcb");
    function checkEndState(self2) {
      if (self2._hparser)
        return new Error("Malformed part header");
      const fileStream = self2._fileStream;
      if (fileStream) {
        self2._fileStream = null;
        fileStream.destroy(new Error("Unexpected end of file"));
      }
      if (!self2._complete)
        return new Error("Unexpected end of form");
    }
    __name(checkEndState, "checkEndState");
    var TOKEN = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ];
    var FIELD_VCHAR = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ];
    module.exports = Multipart;
  }
});
var require_urlencoded = __commonJS({
  "node_modules/busboy/lib/types/urlencoded.js"(exports, module) {
    "use strict";
    var { Writable: Writable2 } = __require2("stream");
    var { getDecoder } = require_utils();
    var URLEncoded = class extends Writable2 {
      static {
        __name(this, "URLEncoded");
      }
      constructor(cfg) {
        const streamOpts = {
          autoDestroy: true,
          emitClose: true,
          highWaterMark: typeof cfg.highWaterMark === "number" ? cfg.highWaterMark : void 0
        };
        super(streamOpts);
        let charset = cfg.defCharset || "utf8";
        if (cfg.conType.params && typeof cfg.conType.params.charset === "string")
          charset = cfg.conType.params.charset;
        this.charset = charset;
        const limits = cfg.limits;
        this.fieldSizeLimit = limits && typeof limits.fieldSize === "number" ? limits.fieldSize : 1 * 1024 * 1024;
        this.fieldsLimit = limits && typeof limits.fields === "number" ? limits.fields : Infinity;
        this.fieldNameSizeLimit = limits && typeof limits.fieldNameSize === "number" ? limits.fieldNameSize : 100;
        this._inKey = true;
        this._keyTrunc = false;
        this._valTrunc = false;
        this._bytesKey = 0;
        this._bytesVal = 0;
        this._fields = 0;
        this._key = "";
        this._val = "";
        this._byte = -2;
        this._lastPos = 0;
        this._encode = 0;
        this._decoder = getDecoder(charset);
      }
      static detect(conType) {
        return conType.type === "application" && conType.subtype === "x-www-form-urlencoded";
      }
      _write(chunk, enc, cb) {
        if (this._fields >= this.fieldsLimit)
          return cb();
        let i = 0;
        const len = chunk.length;
        this._lastPos = 0;
        if (this._byte !== -2) {
          i = readPctEnc(this, chunk, i, len);
          if (i === -1)
            return cb(new Error("Malformed urlencoded form"));
          if (i >= len)
            return cb();
          if (this._inKey)
            ++this._bytesKey;
          else
            ++this._bytesVal;
        }
        main:
          while (i < len) {
            if (this._inKey) {
              i = skipKeyBytes(this, chunk, i, len);
              while (i < len) {
                switch (chunk[i]) {
                  case 61:
                    if (this._lastPos < i)
                      this._key += chunk.latin1Slice(this._lastPos, i);
                    this._lastPos = ++i;
                    this._key = this._decoder(this._key, this._encode);
                    this._encode = 0;
                    this._inKey = false;
                    continue main;
                  case 38:
                    if (this._lastPos < i)
                      this._key += chunk.latin1Slice(this._lastPos, i);
                    this._lastPos = ++i;
                    this._key = this._decoder(this._key, this._encode);
                    this._encode = 0;
                    if (this._bytesKey > 0) {
                      this.emit(
                        "field",
                        this._key,
                        "",
                        {
                          nameTruncated: this._keyTrunc,
                          valueTruncated: false,
                          encoding: this.charset,
                          mimeType: "text/plain"
                        }
                      );
                    }
                    this._key = "";
                    this._val = "";
                    this._keyTrunc = false;
                    this._valTrunc = false;
                    this._bytesKey = 0;
                    this._bytesVal = 0;
                    if (++this._fields >= this.fieldsLimit) {
                      this.emit("fieldsLimit");
                      return cb();
                    }
                    continue;
                  case 43:
                    if (this._lastPos < i)
                      this._key += chunk.latin1Slice(this._lastPos, i);
                    this._key += " ";
                    this._lastPos = i + 1;
                    break;
                  case 37:
                    if (this._encode === 0)
                      this._encode = 1;
                    if (this._lastPos < i)
                      this._key += chunk.latin1Slice(this._lastPos, i);
                    this._lastPos = i + 1;
                    this._byte = -1;
                    i = readPctEnc(this, chunk, i + 1, len);
                    if (i === -1)
                      return cb(new Error("Malformed urlencoded form"));
                    if (i >= len)
                      return cb();
                    ++this._bytesKey;
                    i = skipKeyBytes(this, chunk, i, len);
                    continue;
                }
                ++i;
                ++this._bytesKey;
                i = skipKeyBytes(this, chunk, i, len);
              }
              if (this._lastPos < i)
                this._key += chunk.latin1Slice(this._lastPos, i);
            } else {
              i = skipValBytes(this, chunk, i, len);
              while (i < len) {
                switch (chunk[i]) {
                  case 38:
                    if (this._lastPos < i)
                      this._val += chunk.latin1Slice(this._lastPos, i);
                    this._lastPos = ++i;
                    this._inKey = true;
                    this._val = this._decoder(this._val, this._encode);
                    this._encode = 0;
                    if (this._bytesKey > 0 || this._bytesVal > 0) {
                      this.emit(
                        "field",
                        this._key,
                        this._val,
                        {
                          nameTruncated: this._keyTrunc,
                          valueTruncated: this._valTrunc,
                          encoding: this.charset,
                          mimeType: "text/plain"
                        }
                      );
                    }
                    this._key = "";
                    this._val = "";
                    this._keyTrunc = false;
                    this._valTrunc = false;
                    this._bytesKey = 0;
                    this._bytesVal = 0;
                    if (++this._fields >= this.fieldsLimit) {
                      this.emit("fieldsLimit");
                      return cb();
                    }
                    continue main;
                  case 43:
                    if (this._lastPos < i)
                      this._val += chunk.latin1Slice(this._lastPos, i);
                    this._val += " ";
                    this._lastPos = i + 1;
                    break;
                  case 37:
                    if (this._encode === 0)
                      this._encode = 1;
                    if (this._lastPos < i)
                      this._val += chunk.latin1Slice(this._lastPos, i);
                    this._lastPos = i + 1;
                    this._byte = -1;
                    i = readPctEnc(this, chunk, i + 1, len);
                    if (i === -1)
                      return cb(new Error("Malformed urlencoded form"));
                    if (i >= len)
                      return cb();
                    ++this._bytesVal;
                    i = skipValBytes(this, chunk, i, len);
                    continue;
                }
                ++i;
                ++this._bytesVal;
                i = skipValBytes(this, chunk, i, len);
              }
              if (this._lastPos < i)
                this._val += chunk.latin1Slice(this._lastPos, i);
            }
          }
        cb();
      }
      _final(cb) {
        if (this._byte !== -2)
          return cb(new Error("Malformed urlencoded form"));
        if (!this._inKey || this._bytesKey > 0 || this._bytesVal > 0) {
          if (this._inKey)
            this._key = this._decoder(this._key, this._encode);
          else
            this._val = this._decoder(this._val, this._encode);
          this.emit(
            "field",
            this._key,
            this._val,
            {
              nameTruncated: this._keyTrunc,
              valueTruncated: this._valTrunc,
              encoding: this.charset,
              mimeType: "text/plain"
            }
          );
        }
        cb();
      }
    };
    function readPctEnc(self2, chunk, pos, len) {
      if (pos >= len)
        return len;
      if (self2._byte === -1) {
        const hexUpper = HEX_VALUES[chunk[pos++]];
        if (hexUpper === -1)
          return -1;
        if (hexUpper >= 8)
          self2._encode = 2;
        if (pos < len) {
          const hexLower = HEX_VALUES[chunk[pos++]];
          if (hexLower === -1)
            return -1;
          if (self2._inKey)
            self2._key += String.fromCharCode((hexUpper << 4) + hexLower);
          else
            self2._val += String.fromCharCode((hexUpper << 4) + hexLower);
          self2._byte = -2;
          self2._lastPos = pos;
        } else {
          self2._byte = hexUpper;
        }
      } else {
        const hexLower = HEX_VALUES[chunk[pos++]];
        if (hexLower === -1)
          return -1;
        if (self2._inKey)
          self2._key += String.fromCharCode((self2._byte << 4) + hexLower);
        else
          self2._val += String.fromCharCode((self2._byte << 4) + hexLower);
        self2._byte = -2;
        self2._lastPos = pos;
      }
      return pos;
    }
    __name(readPctEnc, "readPctEnc");
    function skipKeyBytes(self2, chunk, pos, len) {
      if (self2._bytesKey > self2.fieldNameSizeLimit) {
        if (!self2._keyTrunc) {
          if (self2._lastPos < pos)
            self2._key += chunk.latin1Slice(self2._lastPos, pos - 1);
        }
        self2._keyTrunc = true;
        for (; pos < len; ++pos) {
          const code = chunk[pos];
          if (code === 61 || code === 38)
            break;
          ++self2._bytesKey;
        }
        self2._lastPos = pos;
      }
      return pos;
    }
    __name(skipKeyBytes, "skipKeyBytes");
    function skipValBytes(self2, chunk, pos, len) {
      if (self2._bytesVal > self2.fieldSizeLimit) {
        if (!self2._valTrunc) {
          if (self2._lastPos < pos)
            self2._val += chunk.latin1Slice(self2._lastPos, pos - 1);
        }
        self2._valTrunc = true;
        for (; pos < len; ++pos) {
          if (chunk[pos] === 38)
            break;
          ++self2._bytesVal;
        }
        self2._lastPos = pos;
      }
      return pos;
    }
    __name(skipValBytes, "skipValBytes");
    var HEX_VALUES = [
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      10,
      11,
      12,
      13,
      14,
      15,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      10,
      11,
      12,
      13,
      14,
      15,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1
    ];
    module.exports = URLEncoded;
  }
});
var require_lib = __commonJS({
  "node_modules/busboy/lib/index.js"(exports, module) {
    "use strict";
    var { parseContentType } = require_utils();
    function getInstance(cfg) {
      const headers = cfg.headers;
      const conType = parseContentType(headers["content-type"]);
      if (!conType)
        throw new Error("Malformed content type");
      for (const type of TYPES) {
        const matched = type.detect(conType);
        if (!matched)
          continue;
        const instanceCfg = {
          limits: cfg.limits,
          headers,
          conType,
          highWaterMark: void 0,
          fileHwm: void 0,
          defCharset: void 0,
          defParamCharset: void 0,
          preservePath: false
        };
        if (cfg.highWaterMark)
          instanceCfg.highWaterMark = cfg.highWaterMark;
        if (cfg.fileHwm)
          instanceCfg.fileHwm = cfg.fileHwm;
        instanceCfg.defCharset = cfg.defCharset;
        instanceCfg.defParamCharset = cfg.defParamCharset;
        instanceCfg.preservePath = cfg.preservePath;
        return new type(instanceCfg);
      }
      throw new Error(`Unsupported content type: ${headers["content-type"]}`);
    }
    __name(getInstance, "getInstance");
    var TYPES = [
      require_multipart(),
      require_urlencoded()
    ].filter(function(typemod) {
      return typeof typemod.detect === "function";
    });
    module.exports = (cfg) => {
      if (typeof cfg !== "object" || cfg === null)
        cfg = {};
      if (typeof cfg.headers !== "object" || cfg.headers === null || typeof cfg.headers["content-type"] !== "string") {
        throw new Error("Missing Content-Type");
      }
      return getInstance(cfg);
    };
  }
});
var dist_exports = {};
__export(dist_exports, {
  BlockReason: /* @__PURE__ */ __name(() => BlockReason, "BlockReason"),
  ChatSession: /* @__PURE__ */ __name(() => ChatSession, "ChatSession"),
  DynamicRetrievalMode: /* @__PURE__ */ __name(() => DynamicRetrievalMode, "DynamicRetrievalMode"),
  ExecutableCodeLanguage: /* @__PURE__ */ __name(() => ExecutableCodeLanguage, "ExecutableCodeLanguage"),
  FinishReason: /* @__PURE__ */ __name(() => FinishReason, "FinishReason"),
  FunctionCallingMode: /* @__PURE__ */ __name(() => FunctionCallingMode, "FunctionCallingMode"),
  GenerativeModel: /* @__PURE__ */ __name(() => GenerativeModel, "GenerativeModel"),
  GoogleGenerativeAI: /* @__PURE__ */ __name(() => GoogleGenerativeAI, "GoogleGenerativeAI"),
  GoogleGenerativeAIAbortError: /* @__PURE__ */ __name(() => GoogleGenerativeAIAbortError, "GoogleGenerativeAIAbortError"),
  GoogleGenerativeAIError: /* @__PURE__ */ __name(() => GoogleGenerativeAIError, "GoogleGenerativeAIError"),
  GoogleGenerativeAIFetchError: /* @__PURE__ */ __name(() => GoogleGenerativeAIFetchError, "GoogleGenerativeAIFetchError"),
  GoogleGenerativeAIRequestInputError: /* @__PURE__ */ __name(() => GoogleGenerativeAIRequestInputError, "GoogleGenerativeAIRequestInputError"),
  GoogleGenerativeAIResponseError: /* @__PURE__ */ __name(() => GoogleGenerativeAIResponseError, "GoogleGenerativeAIResponseError"),
  HarmBlockThreshold: /* @__PURE__ */ __name(() => HarmBlockThreshold, "HarmBlockThreshold"),
  HarmCategory: /* @__PURE__ */ __name(() => HarmCategory, "HarmCategory"),
  HarmProbability: /* @__PURE__ */ __name(() => HarmProbability, "HarmProbability"),
  Outcome: /* @__PURE__ */ __name(() => Outcome, "Outcome"),
  POSSIBLE_ROLES: /* @__PURE__ */ __name(() => POSSIBLE_ROLES, "POSSIBLE_ROLES"),
  SchemaType: /* @__PURE__ */ __name(() => SchemaType, "SchemaType"),
  TaskType: /* @__PURE__ */ __name(() => TaskType, "TaskType")
});
function getClientHeaders(requestOptions) {
  const clientHeaders = [];
  if (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.apiClient) {
    clientHeaders.push(requestOptions.apiClient);
  }
  clientHeaders.push(`${PACKAGE_LOG_HEADER}/${PACKAGE_VERSION}`);
  return clientHeaders.join(" ");
}
__name(getClientHeaders, "getClientHeaders");
async function getHeaders(url) {
  var _a;
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("x-goog-api-client", getClientHeaders(url.requestOptions));
  headers.append("x-goog-api-key", url.apiKey);
  let customHeaders = (_a = url.requestOptions) === null || _a === void 0 ? void 0 : _a.customHeaders;
  if (customHeaders) {
    if (!(customHeaders instanceof Headers)) {
      try {
        customHeaders = new Headers(customHeaders);
      } catch (e) {
        throw new GoogleGenerativeAIRequestInputError(`unable to convert customHeaders value ${JSON.stringify(customHeaders)} to Headers: ${e.message}`);
      }
    }
    for (const [headerName, headerValue] of customHeaders.entries()) {
      if (headerName === "x-goog-api-key") {
        throw new GoogleGenerativeAIRequestInputError(`Cannot set reserved header name ${headerName}`);
      } else if (headerName === "x-goog-api-client") {
        throw new GoogleGenerativeAIRequestInputError(`Header name ${headerName} can only be set using the apiClient field`);
      }
      headers.append(headerName, headerValue);
    }
  }
  return headers;
}
__name(getHeaders, "getHeaders");
async function constructModelRequest(model, task, apiKey, stream, body, requestOptions) {
  const url = new RequestUrl(model, task, apiKey, stream, requestOptions);
  return {
    url: url.toString(),
    fetchOptions: Object.assign(Object.assign({}, buildFetchOptions(requestOptions)), { method: "POST", headers: await getHeaders(url), body })
  };
}
__name(constructModelRequest, "constructModelRequest");
async function makeModelRequest(model, task, apiKey, stream, body, requestOptions = {}, fetchFn = fetch) {
  const { url, fetchOptions } = await constructModelRequest(model, task, apiKey, stream, body, requestOptions);
  return makeRequest(url, fetchOptions, fetchFn);
}
__name(makeModelRequest, "makeModelRequest");
async function makeRequest(url, fetchOptions, fetchFn = fetch) {
  let response;
  try {
    response = await fetchFn(url, fetchOptions);
  } catch (e) {
    handleResponseError(e, url);
  }
  if (!response.ok) {
    await handleResponseNotOk(response, url);
  }
  return response;
}
__name(makeRequest, "makeRequest");
function handleResponseError(e, url) {
  let err = e;
  if (err.name === "AbortError") {
    err = new GoogleGenerativeAIAbortError(`Request aborted when fetching ${url.toString()}: ${e.message}`);
    err.stack = e.stack;
  } else if (!(e instanceof GoogleGenerativeAIFetchError || e instanceof GoogleGenerativeAIRequestInputError)) {
    err = new GoogleGenerativeAIError(`Error fetching from ${url.toString()}: ${e.message}`);
    err.stack = e.stack;
  }
  throw err;
}
__name(handleResponseError, "handleResponseError");
async function handleResponseNotOk(response, url) {
  let message = "";
  let errorDetails;
  try {
    const json = await response.json();
    message = json.error.message;
    if (json.error.details) {
      message += ` ${JSON.stringify(json.error.details)}`;
      errorDetails = json.error.details;
    }
  } catch (e) {
  }
  throw new GoogleGenerativeAIFetchError(`Error fetching from ${url.toString()}: [${response.status} ${response.statusText}] ${message}`, response.status, response.statusText, errorDetails);
}
__name(handleResponseNotOk, "handleResponseNotOk");
function buildFetchOptions(requestOptions) {
  const fetchOptions = {};
  if ((requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.signal) !== void 0 || (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeout) >= 0) {
    const controller = new AbortController();
    if ((requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeout) >= 0) {
      setTimeout(() => controller.abort(), requestOptions.timeout);
    }
    if (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.signal) {
      requestOptions.signal.addEventListener("abort", () => {
        controller.abort();
      });
    }
    fetchOptions.signal = controller.signal;
  }
  return fetchOptions;
}
__name(buildFetchOptions, "buildFetchOptions");
function addHelpers(response) {
  response.text = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(`This response had ${response.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
      }
      return getText(response);
    } else if (response.promptFeedback) {
      throw new GoogleGenerativeAIResponseError(`Text not available. ${formatBlockErrorMessage(response)}`, response);
    }
    return "";
  };
  response.functionCall = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(`This response had ${response.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
      }
      console.warn(`response.functionCall() is deprecated. Use response.functionCalls() instead.`);
      return getFunctionCalls(response)[0];
    } else if (response.promptFeedback) {
      throw new GoogleGenerativeAIResponseError(`Function call not available. ${formatBlockErrorMessage(response)}`, response);
    }
    return void 0;
  };
  response.functionCalls = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(`This response had ${response.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
      }
      return getFunctionCalls(response);
    } else if (response.promptFeedback) {
      throw new GoogleGenerativeAIResponseError(`Function call not available. ${formatBlockErrorMessage(response)}`, response);
    }
    return void 0;
  };
  return response;
}
__name(addHelpers, "addHelpers");
function getText(response) {
  var _a, _b, _c, _d;
  const textStrings = [];
  if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
    for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts) {
      if (part.text) {
        textStrings.push(part.text);
      }
      if (part.executableCode) {
        textStrings.push("\n```" + part.executableCode.language + "\n" + part.executableCode.code + "\n```\n");
      }
      if (part.codeExecutionResult) {
        textStrings.push("\n```\n" + part.codeExecutionResult.output + "\n```\n");
      }
    }
  }
  if (textStrings.length > 0) {
    return textStrings.join("");
  } else {
    return "";
  }
}
__name(getText, "getText");
function getFunctionCalls(response) {
  var _a, _b, _c, _d;
  const functionCalls = [];
  if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
    for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts) {
      if (part.functionCall) {
        functionCalls.push(part.functionCall);
      }
    }
  }
  if (functionCalls.length > 0) {
    return functionCalls;
  } else {
    return void 0;
  }
}
__name(getFunctionCalls, "getFunctionCalls");
function hadBadFinishReason(candidate) {
  return !!candidate.finishReason && badFinishReasons.includes(candidate.finishReason);
}
__name(hadBadFinishReason, "hadBadFinishReason");
function formatBlockErrorMessage(response) {
  var _a, _b, _c;
  let message = "";
  if ((!response.candidates || response.candidates.length === 0) && response.promptFeedback) {
    message += "Response was blocked";
    if ((_a = response.promptFeedback) === null || _a === void 0 ? void 0 : _a.blockReason) {
      message += ` due to ${response.promptFeedback.blockReason}`;
    }
    if ((_b = response.promptFeedback) === null || _b === void 0 ? void 0 : _b.blockReasonMessage) {
      message += `: ${response.promptFeedback.blockReasonMessage}`;
    }
  } else if ((_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0]) {
    const firstCandidate = response.candidates[0];
    if (hadBadFinishReason(firstCandidate)) {
      message += `Candidate was blocked due to ${firstCandidate.finishReason}`;
      if (firstCandidate.finishMessage) {
        message += `: ${firstCandidate.finishMessage}`;
      }
    }
  }
  return message;
}
__name(formatBlockErrorMessage, "formatBlockErrorMessage");
function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}
__name(__await, "__await");
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i;
  function verb(n) {
    if (g[n]) i[n] = function(v) {
      return new Promise(function(a, b) {
        q.push([n, v, a, b]) > 1 || resume(n, v);
      });
    };
  }
  __name(verb, "verb");
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  __name(resume, "resume");
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  __name(step, "step");
  function fulfill(value) {
    resume("next", value);
  }
  __name(fulfill, "fulfill");
  function reject(value) {
    resume("throw", value);
  }
  __name(reject, "reject");
  function settle(f, v) {
    if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
  __name(settle, "settle");
}
__name(__asyncGenerator, "__asyncGenerator");
function processStream(response) {
  const inputStream = response.body.pipeThrough(new TextDecoderStream("utf8", { fatal: true }));
  const responseStream = getResponseStream(inputStream);
  const [stream1, stream2] = responseStream.tee();
  return {
    stream: generateResponseSequence(stream1),
    response: getResponsePromise(stream2)
  };
}
__name(processStream, "processStream");
async function getResponsePromise(stream) {
  const allResponses = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return addHelpers(aggregateResponses(allResponses));
    }
    allResponses.push(value);
  }
}
__name(getResponsePromise, "getResponsePromise");
function generateResponseSequence(stream) {
  return __asyncGenerator(this, arguments, /* @__PURE__ */ __name(function* generateResponseSequence_1() {
    const reader = stream.getReader();
    while (true) {
      const { value, done } = yield __await(reader.read());
      if (done) {
        break;
      }
      yield yield __await(addHelpers(value));
    }
  }, "generateResponseSequence_1"));
}
__name(generateResponseSequence, "generateResponseSequence");
function getResponseStream(inputStream) {
  const reader = inputStream.getReader();
  const stream = new ReadableStream({
    start(controller) {
      let currentText = "";
      return pump();
      function pump() {
        return reader.read().then(({ value, done }) => {
          if (done) {
            if (currentText.trim()) {
              controller.error(new GoogleGenerativeAIError("Failed to parse stream"));
              return;
            }
            controller.close();
            return;
          }
          currentText += value;
          let match = currentText.match(responseLineRE);
          let parsedResponse;
          while (match) {
            try {
              parsedResponse = JSON.parse(match[1]);
            } catch (e) {
              controller.error(new GoogleGenerativeAIError(`Error parsing JSON response: "${match[1]}"`));
              return;
            }
            controller.enqueue(parsedResponse);
            currentText = currentText.substring(match[0].length);
            match = currentText.match(responseLineRE);
          }
          return pump();
        }).catch((e) => {
          let err = e;
          err.stack = e.stack;
          if (err.name === "AbortError") {
            err = new GoogleGenerativeAIAbortError("Request aborted when reading from the stream");
          } else {
            err = new GoogleGenerativeAIError("Error reading from the stream");
          }
          throw err;
        });
      }
      __name(pump, "pump");
    }
  });
  return stream;
}
__name(getResponseStream, "getResponseStream");
function aggregateResponses(responses) {
  const lastResponse = responses[responses.length - 1];
  const aggregatedResponse = {
    promptFeedback: lastResponse === null || lastResponse === void 0 ? void 0 : lastResponse.promptFeedback
  };
  for (const response of responses) {
    if (response.candidates) {
      let candidateIndex = 0;
      for (const candidate of response.candidates) {
        if (!aggregatedResponse.candidates) {
          aggregatedResponse.candidates = [];
        }
        if (!aggregatedResponse.candidates[candidateIndex]) {
          aggregatedResponse.candidates[candidateIndex] = {
            index: candidateIndex
          };
        }
        aggregatedResponse.candidates[candidateIndex].citationMetadata = candidate.citationMetadata;
        aggregatedResponse.candidates[candidateIndex].groundingMetadata = candidate.groundingMetadata;
        aggregatedResponse.candidates[candidateIndex].finishReason = candidate.finishReason;
        aggregatedResponse.candidates[candidateIndex].finishMessage = candidate.finishMessage;
        aggregatedResponse.candidates[candidateIndex].safetyRatings = candidate.safetyRatings;
        if (candidate.content && candidate.content.parts) {
          if (!aggregatedResponse.candidates[candidateIndex].content) {
            aggregatedResponse.candidates[candidateIndex].content = {
              role: candidate.content.role || "user",
              parts: []
            };
          }
          const newPart = {};
          for (const part of candidate.content.parts) {
            if (part.text) {
              newPart.text = part.text;
            }
            if (part.functionCall) {
              newPart.functionCall = part.functionCall;
            }
            if (part.executableCode) {
              newPart.executableCode = part.executableCode;
            }
            if (part.codeExecutionResult) {
              newPart.codeExecutionResult = part.codeExecutionResult;
            }
            if (Object.keys(newPart).length === 0) {
              newPart.text = "";
            }
            aggregatedResponse.candidates[candidateIndex].content.parts.push(newPart);
          }
        }
      }
      candidateIndex++;
    }
    if (response.usageMetadata) {
      aggregatedResponse.usageMetadata = response.usageMetadata;
    }
  }
  return aggregatedResponse;
}
__name(aggregateResponses, "aggregateResponses");
async function generateContentStream(apiKey, model, params, requestOptions) {
  const response = await makeModelRequest(
    model,
    Task.STREAM_GENERATE_CONTENT,
    apiKey,
    /* stream */
    true,
    JSON.stringify(params),
    requestOptions
  );
  return processStream(response);
}
__name(generateContentStream, "generateContentStream");
async function generateContent(apiKey, model, params, requestOptions) {
  const response = await makeModelRequest(
    model,
    Task.GENERATE_CONTENT,
    apiKey,
    /* stream */
    false,
    JSON.stringify(params),
    requestOptions
  );
  const responseJson = await response.json();
  const enhancedResponse = addHelpers(responseJson);
  return {
    response: enhancedResponse
  };
}
__name(generateContent, "generateContent");
function formatSystemInstruction(input) {
  if (input == null) {
    return void 0;
  } else if (typeof input === "string") {
    return { role: "system", parts: [{ text: input }] };
  } else if (input.text) {
    return { role: "system", parts: [input] };
  } else if (input.parts) {
    if (!input.role) {
      return { role: "system", parts: input.parts };
    } else {
      return input;
    }
  }
}
__name(formatSystemInstruction, "formatSystemInstruction");
function formatNewContent(request) {
  let newParts = [];
  if (typeof request === "string") {
    newParts = [{ text: request }];
  } else {
    for (const partOrString of request) {
      if (typeof partOrString === "string") {
        newParts.push({ text: partOrString });
      } else {
        newParts.push(partOrString);
      }
    }
  }
  return assignRoleToPartsAndValidateSendMessageRequest(newParts);
}
__name(formatNewContent, "formatNewContent");
function assignRoleToPartsAndValidateSendMessageRequest(parts) {
  const userContent = { role: "user", parts: [] };
  const functionContent = { role: "function", parts: [] };
  let hasUserContent = false;
  let hasFunctionContent = false;
  for (const part of parts) {
    if ("functionResponse" in part) {
      functionContent.parts.push(part);
      hasFunctionContent = true;
    } else {
      userContent.parts.push(part);
      hasUserContent = true;
    }
  }
  if (hasUserContent && hasFunctionContent) {
    throw new GoogleGenerativeAIError("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");
  }
  if (!hasUserContent && !hasFunctionContent) {
    throw new GoogleGenerativeAIError("No content is provided for sending chat message.");
  }
  if (hasUserContent) {
    return userContent;
  }
  return functionContent;
}
__name(assignRoleToPartsAndValidateSendMessageRequest, "assignRoleToPartsAndValidateSendMessageRequest");
function formatCountTokensInput(params, modelParams) {
  var _a;
  let formattedGenerateContentRequest = {
    model: modelParams === null || modelParams === void 0 ? void 0 : modelParams.model,
    generationConfig: modelParams === null || modelParams === void 0 ? void 0 : modelParams.generationConfig,
    safetySettings: modelParams === null || modelParams === void 0 ? void 0 : modelParams.safetySettings,
    tools: modelParams === null || modelParams === void 0 ? void 0 : modelParams.tools,
    toolConfig: modelParams === null || modelParams === void 0 ? void 0 : modelParams.toolConfig,
    systemInstruction: modelParams === null || modelParams === void 0 ? void 0 : modelParams.systemInstruction,
    cachedContent: (_a = modelParams === null || modelParams === void 0 ? void 0 : modelParams.cachedContent) === null || _a === void 0 ? void 0 : _a.name,
    contents: []
  };
  const containsGenerateContentRequest = params.generateContentRequest != null;
  if (params.contents) {
    if (containsGenerateContentRequest) {
      throw new GoogleGenerativeAIRequestInputError("CountTokensRequest must have one of contents or generateContentRequest, not both.");
    }
    formattedGenerateContentRequest.contents = params.contents;
  } else if (containsGenerateContentRequest) {
    formattedGenerateContentRequest = Object.assign(Object.assign({}, formattedGenerateContentRequest), params.generateContentRequest);
  } else {
    const content = formatNewContent(params);
    formattedGenerateContentRequest.contents = [content];
  }
  return { generateContentRequest: formattedGenerateContentRequest };
}
__name(formatCountTokensInput, "formatCountTokensInput");
function formatGenerateContentInput(params) {
  let formattedRequest;
  if (params.contents) {
    formattedRequest = params;
  } else {
    const content = formatNewContent(params);
    formattedRequest = { contents: [content] };
  }
  if (params.systemInstruction) {
    formattedRequest.systemInstruction = formatSystemInstruction(params.systemInstruction);
  }
  return formattedRequest;
}
__name(formatGenerateContentInput, "formatGenerateContentInput");
function formatEmbedContentInput(params) {
  if (typeof params === "string" || Array.isArray(params)) {
    const content = formatNewContent(params);
    return { content };
  }
  return params;
}
__name(formatEmbedContentInput, "formatEmbedContentInput");
function validateChatHistory(history) {
  let prevContent = false;
  for (const currContent of history) {
    const { role, parts } = currContent;
    if (!prevContent && role !== "user") {
      throw new GoogleGenerativeAIError(`First content should be with role 'user', got ${role}`);
    }
    if (!POSSIBLE_ROLES.includes(role)) {
      throw new GoogleGenerativeAIError(`Each item should include role field. Got ${role} but valid roles are: ${JSON.stringify(POSSIBLE_ROLES)}`);
    }
    if (!Array.isArray(parts)) {
      throw new GoogleGenerativeAIError("Content should have 'parts' property with an array of Parts");
    }
    if (parts.length === 0) {
      throw new GoogleGenerativeAIError("Each Content should have at least one part");
    }
    const countFields = {
      text: 0,
      inlineData: 0,
      functionCall: 0,
      functionResponse: 0,
      fileData: 0,
      executableCode: 0,
      codeExecutionResult: 0
    };
    for (const part of parts) {
      for (const key of VALID_PART_FIELDS) {
        if (key in part) {
          countFields[key] += 1;
        }
      }
    }
    const validParts = VALID_PARTS_PER_ROLE[role];
    for (const key of VALID_PART_FIELDS) {
      if (!validParts.includes(key) && countFields[key] > 0) {
        throw new GoogleGenerativeAIError(`Content with role '${role}' can't contain '${key}' part`);
      }
    }
    prevContent = true;
  }
}
__name(validateChatHistory, "validateChatHistory");
function isValidResponse(response) {
  var _a;
  if (response.candidates === void 0 || response.candidates.length === 0) {
    return false;
  }
  const content = (_a = response.candidates[0]) === null || _a === void 0 ? void 0 : _a.content;
  if (content === void 0) {
    return false;
  }
  if (content.parts === void 0 || content.parts.length === 0) {
    return false;
  }
  for (const part of content.parts) {
    if (part === void 0 || Object.keys(part).length === 0) {
      return false;
    }
    if (part.text !== void 0 && part.text === "") {
      return false;
    }
  }
  return true;
}
__name(isValidResponse, "isValidResponse");
async function countTokens(apiKey, model, params, singleRequestOptions) {
  const response = await makeModelRequest(model, Task.COUNT_TOKENS, apiKey, false, JSON.stringify(params), singleRequestOptions);
  return response.json();
}
__name(countTokens, "countTokens");
async function embedContent(apiKey, model, params, requestOptions) {
  const response = await makeModelRequest(model, Task.EMBED_CONTENT, apiKey, false, JSON.stringify(params), requestOptions);
  return response.json();
}
__name(embedContent, "embedContent");
async function batchEmbedContents(apiKey, model, params, requestOptions) {
  const requestsWithModel = params.requests.map((request) => {
    return Object.assign(Object.assign({}, request), { model });
  });
  const response = await makeModelRequest(model, Task.BATCH_EMBED_CONTENTS, apiKey, false, JSON.stringify({ requests: requestsWithModel }), requestOptions);
  return response.json();
}
__name(batchEmbedContents, "batchEmbedContents");
var SchemaType;
var ExecutableCodeLanguage;
var Outcome;
var POSSIBLE_ROLES;
var HarmCategory;
var HarmBlockThreshold;
var HarmProbability;
var BlockReason;
var FinishReason;
var TaskType;
var FunctionCallingMode;
var DynamicRetrievalMode;
var GoogleGenerativeAIError;
var GoogleGenerativeAIResponseError;
var GoogleGenerativeAIFetchError;
var GoogleGenerativeAIRequestInputError;
var GoogleGenerativeAIAbortError;
var DEFAULT_BASE_URL;
var DEFAULT_API_VERSION;
var PACKAGE_VERSION;
var PACKAGE_LOG_HEADER;
var Task;
var RequestUrl;
var badFinishReasons;
var responseLineRE;
var VALID_PART_FIELDS;
var VALID_PARTS_PER_ROLE;
var SILENT_ERROR;
var ChatSession;
var GenerativeModel;
var GoogleGenerativeAI;
var init_dist = __esm({
  "node_modules/@google/generative-ai/dist/index.mjs"() {
    (function(SchemaType2) {
      SchemaType2["STRING"] = "string";
      SchemaType2["NUMBER"] = "number";
      SchemaType2["INTEGER"] = "integer";
      SchemaType2["BOOLEAN"] = "boolean";
      SchemaType2["ARRAY"] = "array";
      SchemaType2["OBJECT"] = "object";
    })(SchemaType || (SchemaType = {}));
    (function(ExecutableCodeLanguage2) {
      ExecutableCodeLanguage2["LANGUAGE_UNSPECIFIED"] = "language_unspecified";
      ExecutableCodeLanguage2["PYTHON"] = "python";
    })(ExecutableCodeLanguage || (ExecutableCodeLanguage = {}));
    (function(Outcome2) {
      Outcome2["OUTCOME_UNSPECIFIED"] = "outcome_unspecified";
      Outcome2["OUTCOME_OK"] = "outcome_ok";
      Outcome2["OUTCOME_FAILED"] = "outcome_failed";
      Outcome2["OUTCOME_DEADLINE_EXCEEDED"] = "outcome_deadline_exceeded";
    })(Outcome || (Outcome = {}));
    POSSIBLE_ROLES = ["user", "model", "function", "system"];
    (function(HarmCategory2) {
      HarmCategory2["HARM_CATEGORY_UNSPECIFIED"] = "HARM_CATEGORY_UNSPECIFIED";
      HarmCategory2["HARM_CATEGORY_HATE_SPEECH"] = "HARM_CATEGORY_HATE_SPEECH";
      HarmCategory2["HARM_CATEGORY_SEXUALLY_EXPLICIT"] = "HARM_CATEGORY_SEXUALLY_EXPLICIT";
      HarmCategory2["HARM_CATEGORY_HARASSMENT"] = "HARM_CATEGORY_HARASSMENT";
      HarmCategory2["HARM_CATEGORY_DANGEROUS_CONTENT"] = "HARM_CATEGORY_DANGEROUS_CONTENT";
      HarmCategory2["HARM_CATEGORY_CIVIC_INTEGRITY"] = "HARM_CATEGORY_CIVIC_INTEGRITY";
    })(HarmCategory || (HarmCategory = {}));
    (function(HarmBlockThreshold2) {
      HarmBlockThreshold2["HARM_BLOCK_THRESHOLD_UNSPECIFIED"] = "HARM_BLOCK_THRESHOLD_UNSPECIFIED";
      HarmBlockThreshold2["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
      HarmBlockThreshold2["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
      HarmBlockThreshold2["BLOCK_ONLY_HIGH"] = "BLOCK_ONLY_HIGH";
      HarmBlockThreshold2["BLOCK_NONE"] = "BLOCK_NONE";
    })(HarmBlockThreshold || (HarmBlockThreshold = {}));
    (function(HarmProbability2) {
      HarmProbability2["HARM_PROBABILITY_UNSPECIFIED"] = "HARM_PROBABILITY_UNSPECIFIED";
      HarmProbability2["NEGLIGIBLE"] = "NEGLIGIBLE";
      HarmProbability2["LOW"] = "LOW";
      HarmProbability2["MEDIUM"] = "MEDIUM";
      HarmProbability2["HIGH"] = "HIGH";
    })(HarmProbability || (HarmProbability = {}));
    (function(BlockReason2) {
      BlockReason2["BLOCKED_REASON_UNSPECIFIED"] = "BLOCKED_REASON_UNSPECIFIED";
      BlockReason2["SAFETY"] = "SAFETY";
      BlockReason2["OTHER"] = "OTHER";
    })(BlockReason || (BlockReason = {}));
    (function(FinishReason2) {
      FinishReason2["FINISH_REASON_UNSPECIFIED"] = "FINISH_REASON_UNSPECIFIED";
      FinishReason2["STOP"] = "STOP";
      FinishReason2["MAX_TOKENS"] = "MAX_TOKENS";
      FinishReason2["SAFETY"] = "SAFETY";
      FinishReason2["RECITATION"] = "RECITATION";
      FinishReason2["LANGUAGE"] = "LANGUAGE";
      FinishReason2["BLOCKLIST"] = "BLOCKLIST";
      FinishReason2["PROHIBITED_CONTENT"] = "PROHIBITED_CONTENT";
      FinishReason2["SPII"] = "SPII";
      FinishReason2["MALFORMED_FUNCTION_CALL"] = "MALFORMED_FUNCTION_CALL";
      FinishReason2["OTHER"] = "OTHER";
    })(FinishReason || (FinishReason = {}));
    (function(TaskType2) {
      TaskType2["TASK_TYPE_UNSPECIFIED"] = "TASK_TYPE_UNSPECIFIED";
      TaskType2["RETRIEVAL_QUERY"] = "RETRIEVAL_QUERY";
      TaskType2["RETRIEVAL_DOCUMENT"] = "RETRIEVAL_DOCUMENT";
      TaskType2["SEMANTIC_SIMILARITY"] = "SEMANTIC_SIMILARITY";
      TaskType2["CLASSIFICATION"] = "CLASSIFICATION";
      TaskType2["CLUSTERING"] = "CLUSTERING";
    })(TaskType || (TaskType = {}));
    (function(FunctionCallingMode2) {
      FunctionCallingMode2["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
      FunctionCallingMode2["AUTO"] = "AUTO";
      FunctionCallingMode2["ANY"] = "ANY";
      FunctionCallingMode2["NONE"] = "NONE";
    })(FunctionCallingMode || (FunctionCallingMode = {}));
    (function(DynamicRetrievalMode2) {
      DynamicRetrievalMode2["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
      DynamicRetrievalMode2["MODE_DYNAMIC"] = "MODE_DYNAMIC";
    })(DynamicRetrievalMode || (DynamicRetrievalMode = {}));
    GoogleGenerativeAIError = class extends Error {
      static {
        __name(this, "GoogleGenerativeAIError");
      }
      constructor(message) {
        super(`[GoogleGenerativeAI Error]: ${message}`);
      }
    };
    GoogleGenerativeAIResponseError = class extends GoogleGenerativeAIError {
      static {
        __name(this, "GoogleGenerativeAIResponseError");
      }
      constructor(message, response) {
        super(message);
        this.response = response;
      }
    };
    GoogleGenerativeAIFetchError = class extends GoogleGenerativeAIError {
      static {
        __name(this, "GoogleGenerativeAIFetchError");
      }
      constructor(message, status, statusText, errorDetails) {
        super(message);
        this.status = status;
        this.statusText = statusText;
        this.errorDetails = errorDetails;
      }
    };
    GoogleGenerativeAIRequestInputError = class extends GoogleGenerativeAIError {
      static {
        __name(this, "GoogleGenerativeAIRequestInputError");
      }
    };
    GoogleGenerativeAIAbortError = class extends GoogleGenerativeAIError {
      static {
        __name(this, "GoogleGenerativeAIAbortError");
      }
    };
    DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
    DEFAULT_API_VERSION = "v1beta";
    PACKAGE_VERSION = "0.24.1";
    PACKAGE_LOG_HEADER = "genai-js";
    (function(Task2) {
      Task2["GENERATE_CONTENT"] = "generateContent";
      Task2["STREAM_GENERATE_CONTENT"] = "streamGenerateContent";
      Task2["COUNT_TOKENS"] = "countTokens";
      Task2["EMBED_CONTENT"] = "embedContent";
      Task2["BATCH_EMBED_CONTENTS"] = "batchEmbedContents";
    })(Task || (Task = {}));
    RequestUrl = class {
      static {
        __name(this, "RequestUrl");
      }
      constructor(model, task, apiKey, stream, requestOptions) {
        this.model = model;
        this.task = task;
        this.apiKey = apiKey;
        this.stream = stream;
        this.requestOptions = requestOptions;
      }
      toString() {
        var _a, _b;
        const apiVersion = ((_a = this.requestOptions) === null || _a === void 0 ? void 0 : _a.apiVersion) || DEFAULT_API_VERSION;
        const baseUrl = ((_b = this.requestOptions) === null || _b === void 0 ? void 0 : _b.baseUrl) || DEFAULT_BASE_URL;
        let url = `${baseUrl}/${apiVersion}/${this.model}:${this.task}`;
        if (this.stream) {
          url += "?alt=sse";
        }
        return url;
      }
    };
    badFinishReasons = [
      FinishReason.RECITATION,
      FinishReason.SAFETY,
      FinishReason.LANGUAGE
    ];
    responseLineRE = /^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
    VALID_PART_FIELDS = [
      "text",
      "inlineData",
      "functionCall",
      "functionResponse",
      "executableCode",
      "codeExecutionResult"
    ];
    VALID_PARTS_PER_ROLE = {
      user: ["text", "inlineData"],
      function: ["functionResponse"],
      model: ["text", "functionCall", "executableCode", "codeExecutionResult"],
      // System instructions shouldn't be in history anyway.
      system: ["text"]
    };
    SILENT_ERROR = "SILENT_ERROR";
    ChatSession = class {
      static {
        __name(this, "ChatSession");
      }
      constructor(apiKey, model, params, _requestOptions = {}) {
        this.model = model;
        this.params = params;
        this._requestOptions = _requestOptions;
        this._history = [];
        this._sendPromise = Promise.resolve();
        this._apiKey = apiKey;
        if (params === null || params === void 0 ? void 0 : params.history) {
          validateChatHistory(params.history);
          this._history = params.history;
        }
      }
      /**
       * Gets the chat history so far. Blocked prompts are not added to history.
       * Blocked candidates are not added to history, nor are the prompts that
       * generated them.
       */
      async getHistory() {
        await this._sendPromise;
        return this._history;
      }
      /**
       * Sends a chat message and receives a non-streaming
       * {@link GenerateContentResult}.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async sendMessage(request, requestOptions = {}) {
        var _a, _b, _c, _d, _e, _f;
        await this._sendPromise;
        const newContent = formatNewContent(request);
        const generateContentRequest = {
          safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
          generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
          tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
          toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
          systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
          cachedContent: (_f = this.params) === null || _f === void 0 ? void 0 : _f.cachedContent,
          contents: [...this._history, newContent]
        };
        const chatSessionRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        let finalResult;
        this._sendPromise = this._sendPromise.then(() => generateContent(this._apiKey, this.model, generateContentRequest, chatSessionRequestOptions)).then((result) => {
          var _a2;
          if (isValidResponse(result.response)) {
            this._history.push(newContent);
            const responseContent = Object.assign({
              parts: [],
              // Response seems to come back without a role set.
              role: "model"
            }, (_a2 = result.response.candidates) === null || _a2 === void 0 ? void 0 : _a2[0].content);
            this._history.push(responseContent);
          } else {
            const blockErrorMessage = formatBlockErrorMessage(result.response);
            if (blockErrorMessage) {
              console.warn(`sendMessage() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
            }
          }
          finalResult = result;
        }).catch((e) => {
          this._sendPromise = Promise.resolve();
          throw e;
        });
        await this._sendPromise;
        return finalResult;
      }
      /**
       * Sends a chat message and receives the response as a
       * {@link GenerateContentStreamResult} containing an iterable stream
       * and a response promise.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async sendMessageStream(request, requestOptions = {}) {
        var _a, _b, _c, _d, _e, _f;
        await this._sendPromise;
        const newContent = formatNewContent(request);
        const generateContentRequest = {
          safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
          generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
          tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
          toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
          systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
          cachedContent: (_f = this.params) === null || _f === void 0 ? void 0 : _f.cachedContent,
          contents: [...this._history, newContent]
        };
        const chatSessionRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        const streamPromise = generateContentStream(this._apiKey, this.model, generateContentRequest, chatSessionRequestOptions);
        this._sendPromise = this._sendPromise.then(() => streamPromise).catch((_ignored) => {
          throw new Error(SILENT_ERROR);
        }).then((streamResult) => streamResult.response).then((response) => {
          if (isValidResponse(response)) {
            this._history.push(newContent);
            const responseContent = Object.assign({}, response.candidates[0].content);
            if (!responseContent.role) {
              responseContent.role = "model";
            }
            this._history.push(responseContent);
          } else {
            const blockErrorMessage = formatBlockErrorMessage(response);
            if (blockErrorMessage) {
              console.warn(`sendMessageStream() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
            }
          }
        }).catch((e) => {
          if (e.message !== SILENT_ERROR) {
            console.error(e);
          }
        });
        return streamPromise;
      }
    };
    GenerativeModel = class {
      static {
        __name(this, "GenerativeModel");
      }
      constructor(apiKey, modelParams, _requestOptions = {}) {
        this.apiKey = apiKey;
        this._requestOptions = _requestOptions;
        if (modelParams.model.includes("/")) {
          this.model = modelParams.model;
        } else {
          this.model = `models/${modelParams.model}`;
        }
        this.generationConfig = modelParams.generationConfig || {};
        this.safetySettings = modelParams.safetySettings || [];
        this.tools = modelParams.tools;
        this.toolConfig = modelParams.toolConfig;
        this.systemInstruction = formatSystemInstruction(modelParams.systemInstruction);
        this.cachedContent = modelParams.cachedContent;
      }
      /**
       * Makes a single non-streaming call to the model
       * and returns an object containing a single {@link GenerateContentResponse}.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async generateContent(request, requestOptions = {}) {
        var _a;
        const formattedParams = formatGenerateContentInput(request);
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return generateContent(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, formattedParams), generativeModelRequestOptions);
      }
      /**
       * Makes a single streaming call to the model and returns an object
       * containing an iterable stream that iterates over all chunks in the
       * streaming response as well as a promise that returns the final
       * aggregated response.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async generateContentStream(request, requestOptions = {}) {
        var _a;
        const formattedParams = formatGenerateContentInput(request);
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return generateContentStream(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, formattedParams), generativeModelRequestOptions);
      }
      /**
       * Gets a new {@link ChatSession} instance which can be used for
       * multi-turn chats.
       */
      startChat(startChatParams) {
        var _a;
        return new ChatSession(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, startChatParams), this._requestOptions);
      }
      /**
       * Counts the tokens in the provided request.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async countTokens(request, requestOptions = {}) {
        const formattedParams = formatCountTokensInput(request, {
          model: this.model,
          generationConfig: this.generationConfig,
          safetySettings: this.safetySettings,
          tools: this.tools,
          toolConfig: this.toolConfig,
          systemInstruction: this.systemInstruction,
          cachedContent: this.cachedContent
        });
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return countTokens(this.apiKey, this.model, formattedParams, generativeModelRequestOptions);
      }
      /**
       * Embeds the provided content.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async embedContent(request, requestOptions = {}) {
        const formattedParams = formatEmbedContentInput(request);
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return embedContent(this.apiKey, this.model, formattedParams, generativeModelRequestOptions);
      }
      /**
       * Embeds an array of {@link EmbedContentRequest}s.
       *
       * Fields set in the optional {@link SingleRequestOptions} parameter will
       * take precedence over the {@link RequestOptions} values provided to
       * {@link GoogleGenerativeAI.getGenerativeModel }.
       */
      async batchEmbedContents(batchEmbedContentRequest, requestOptions = {}) {
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return batchEmbedContents(this.apiKey, this.model, batchEmbedContentRequest, generativeModelRequestOptions);
      }
    };
    GoogleGenerativeAI = class {
      static {
        __name(this, "GoogleGenerativeAI");
      }
      constructor(apiKey) {
        this.apiKey = apiKey;
      }
      /**
       * Gets a {@link GenerativeModel} instance for the provided model name.
       */
      getGenerativeModel(modelParams, requestOptions) {
        if (!modelParams.model) {
          throw new GoogleGenerativeAIError(`Must provide a model name. Example: genai.getGenerativeModel({ model: 'my-model-name' })`);
        }
        return new GenerativeModel(this.apiKey, modelParams, requestOptions);
      }
      /**
       * Creates a {@link GenerativeModel} instance from provided content cache.
       */
      getGenerativeModelFromCachedContent(cachedContent, modelParams, requestOptions) {
        if (!cachedContent.name) {
          throw new GoogleGenerativeAIRequestInputError("Cached content must contain a `name` field.");
        }
        if (!cachedContent.model) {
          throw new GoogleGenerativeAIRequestInputError("Cached content must contain a `model` field.");
        }
        const disallowedDuplicates = ["model", "systemInstruction"];
        for (const key of disallowedDuplicates) {
          if ((modelParams === null || modelParams === void 0 ? void 0 : modelParams[key]) && cachedContent[key] && (modelParams === null || modelParams === void 0 ? void 0 : modelParams[key]) !== cachedContent[key]) {
            if (key === "model") {
              const modelParamsComp = modelParams.model.startsWith("models/") ? modelParams.model.replace("models/", "") : modelParams.model;
              const cachedContentComp = cachedContent.model.startsWith("models/") ? cachedContent.model.replace("models/", "") : cachedContent.model;
              if (modelParamsComp === cachedContentComp) {
                continue;
              }
            }
            throw new GoogleGenerativeAIRequestInputError(`Different value for "${key}" specified in modelParams (${modelParams[key]}) and cachedContent (${cachedContent[key]})`);
          }
        }
        const modelParamsFromCache = Object.assign(Object.assign({}, modelParams), { model: cachedContent.model, tools: cachedContent.tools, toolConfig: cachedContent.toolConfig, systemInstruction: cachedContent.systemInstruction, cachedContent });
        return new GenerativeModel(this.apiKey, modelParamsFromCache, requestOptions);
      }
    };
  }
});
var import_jsonwebtoken = __toESM(require_jsonwebtoken(), 1);
init_env();
var DEFAULT_SECRET = "your-secret-key-change-in-production";
function getSecret(req) {
  return req && getReqEnv(req, "JWT_SECRET") || DEFAULT_SECRET;
}
__name(getSecret, "getSecret");
function verifyToken(req, res) {
  if (isTestEnv(req)) {
    req.user = { id: "test-user", userId: "test-user", email: "test@example.com", role: "owner" };
    return true;
  }
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = typeof authHeader === "string" ? authHeader.replace("Bearer ", "") : null;
  if (!token) {
    res.status(401).json({ error: "No authorization token provided" });
    return false;
  }
  try {
    const decoded = import_jsonwebtoken.default.verify(token, getSecret(req));
    req.user = decoded;
    return true;
  } catch (error3) {
    res.status(401).json({ error: "Invalid or expired token" });
    return false;
  }
}
__name(verifyToken, "verifyToken");
init_turso();
function webCrypto() {
  const seen = globalThis.crypto;
  if (seen && typeof seen.getRandomValues === "function") return seen;
  return null;
}
__name(webCrypto, "webCrypto");
function randomBytesFallback(size) {
  const seen = webCrypto();
  if (seen) {
    const bytes2 = new Uint8Array(size);
    seen.getRandomValues(bytes2);
    return bytes2;
  }
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}
__name(randomBytesFallback, "randomBytesFallback");
function uuid() {
  try {
    const native = webCrypto();
    if (native && typeof native.randomUUID === "function") return native.randomUUID();
  } catch {
  }
  const bytes = randomBytesFallback(16);
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
__name(uuid, "uuid");
function randomHex(size = 32) {
  return Array.from(randomBytesFallback(size), (b) => b.toString(16).padStart(2, "0")).join("");
}
__name(randomHex, "randomHex");
function getParsedBody(req) {
  if (!req) return void 0;
  if (req.rpParsedBody !== void 0) return req.rpParsedBody;
  if (req.body === void 0 || req.body === null) return void 0;
  if (typeof req.body !== "object") return void 0;
  if (typeof req.body.arrayBuffer === "function") return void 0;
  if (req.body.byteLength !== void 0 && typeof req.body.get !== "function") return void 0;
  return req.body;
}
__name(getParsedBody, "getParsedBody");
async function readRawBody(req) {
  if (!req) return "";
  if (req.rpBodyText !== void 0 && req.rpBodyText !== null) return req.rpBodyText;
  if (typeof req.arrayBuffer === "function") {
    const buffer = await req.arrayBuffer();
    return new TextDecoder().decode(buffer);
  }
  if (req.rawBody) {
    return typeof req.rawBody === "string" ? req.rawBody : Buffer.from(req.rawBody).toString("utf8");
  }
  if (req.readableEnded) {
    if (req.rawBody) {
      return typeof req.rawBody === "string" ? req.rawBody : Buffer.from(req.rawBody).toString("utf8");
    }
    return "";
  }
  if (typeof req.on !== "function") return "";
  return await new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding?.("utf8");
    req.on("data", (chunk) => {
      data += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
__name(readRawBody, "readRawBody");
async function readJson(req) {
  const parsed = getParsedBody(req);
  if (parsed !== void 0) return parsed;
  const raw = await readRawBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
__name(readJson, "readJson");
init_env();
init_turso();
init_env();
var PERMISSIONS = {
  // Band permissions
  BAND_CREATE: "band:create",
  BAND_EDIT: "band:edit",
  BAND_DELETE: "band:delete",
  BAND_VIEW: "band:view",
  // Member permissions
  MEMBER_INVITE: "member:invite",
  MEMBER_REMOVE: "member:remove",
  MEMBER_CHANGE_ROLE: "member:change_role",
  MEMBER_VIEW: "member:view",
  // Song permissions
  SONG_CREATE: "song:create",
  SONG_EDIT: "song:edit",
  SONG_DELETE: "song:delete",
  SONG_VIEW: "song:view",
  // Setlist permissions
  SETLIST_CREATE: "setlist:create",
  SETLIST_EDIT: "setlist:edit",
  SETLIST_DELETE: "setlist:delete",
  SETLIST_VIEW: "setlist:view",
  // Gig permissions
  GIG_EDIT: "gig:edit",
  // Admin permissions
  ADMIN_MANAGE_ROLES: "admin:manage_roles"
};
var ROLE_PERMISSIONS = {
  owner: [
    // Band management
    PERMISSIONS.BAND_CREATE,
    PERMISSIONS.BAND_EDIT,
    PERMISSIONS.BAND_DELETE,
    PERMISSIONS.BAND_VIEW,
    // Member management
    PERMISSIONS.MEMBER_INVITE,
    PERMISSIONS.MEMBER_REMOVE,
    PERMISSIONS.MEMBER_CHANGE_ROLE,
    PERMISSIONS.MEMBER_VIEW,
    // Song management
    PERMISSIONS.SONG_CREATE,
    PERMISSIONS.SONG_EDIT,
    PERMISSIONS.SONG_DELETE,
    PERMISSIONS.SONG_VIEW,
    // Setlist management
    PERMISSIONS.SETLIST_CREATE,
    PERMISSIONS.SETLIST_EDIT,
    PERMISSIONS.SETLIST_DELETE,
    PERMISSIONS.SETLIST_VIEW,
    // Gig management
    PERMISSIONS.GIG_EDIT,
    // Admin
    PERMISSIONS.ADMIN_MANAGE_ROLES
  ],
  admin: [
    // Band management (no delete)
    PERMISSIONS.BAND_EDIT,
    PERMISSIONS.BAND_VIEW,
    // Member management
    PERMISSIONS.MEMBER_INVITE,
    PERMISSIONS.MEMBER_REMOVE,
    PERMISSIONS.MEMBER_CHANGE_ROLE,
    PERMISSIONS.MEMBER_VIEW,
    // Song management
    PERMISSIONS.SONG_CREATE,
    PERMISSIONS.SONG_EDIT,
    PERMISSIONS.SONG_DELETE,
    PERMISSIONS.SONG_VIEW,
    // Setlist management
    PERMISSIONS.SETLIST_CREATE,
    PERMISSIONS.SETLIST_EDIT,
    PERMISSIONS.SETLIST_DELETE,
    PERMISSIONS.SETLIST_VIEW,
    // Gig management
    PERMISSIONS.GIG_EDIT
  ],
  member: [
    // Band viewing
    PERMISSIONS.BAND_VIEW,
    // Member viewing
    PERMISSIONS.MEMBER_VIEW,
    // Song management (limited)
    PERMISSIONS.SONG_CREATE,
    PERMISSIONS.SONG_VIEW,
    // Setlist viewing
    PERMISSIONS.SETLIST_VIEW
  ]
};
function hasPermission(userRole, permission2) {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission2);
}
__name(hasPermission, "hasPermission");
var PERMISSION_NAMES = {
  [PERMISSIONS.BAND_CREATE]: "Create Band",
  [PERMISSIONS.BAND_EDIT]: "Edit Band",
  [PERMISSIONS.BAND_DELETE]: "Delete Band",
  [PERMISSIONS.BAND_VIEW]: "View Band",
  [PERMISSIONS.MEMBER_INVITE]: "Invite Members",
  [PERMISSIONS.MEMBER_REMOVE]: "Remove Members",
  [PERMISSIONS.MEMBER_CHANGE_ROLE]: "Change Member Roles",
  [PERMISSIONS.MEMBER_VIEW]: "View Members",
  [PERMISSIONS.SONG_CREATE]: "Create Songs",
  [PERMISSIONS.SONG_EDIT]: "Edit Songs",
  [PERMISSIONS.SONG_DELETE]: "Delete Songs",
  [PERMISSIONS.SONG_VIEW]: "View Songs",
  [PERMISSIONS.SETLIST_CREATE]: "Create Setlists",
  [PERMISSIONS.SETLIST_EDIT]: "Edit Setlists",
  [PERMISSIONS.SETLIST_DELETE]: "Delete Setlists",
  [PERMISSIONS.SETLIST_VIEW]: "View Setlists",
  [PERMISSIONS.ADMIN_MANAGE_ROLES]: "Manage Roles"
};
var _schemaEnsured = false;
var _schemaEnsurePromise = null;
async function ensureSongsColumns(client) {
  const columnsResult = await client.execute(`PRAGMA table_info(songs)`);
  const columns = (columnsResult.rows || []).map((row) => row.name);
  if (!columns.includes("bandId")) {
    await client.execute(`ALTER TABLE songs ADD COLUMN bandId TEXT`);
  }
  if (!columns.includes("time_signature")) {
    await client.execute(`ALTER TABLE songs ADD COLUMN time_signature TEXT`);
  }
}
__name(ensureSongsColumns, "ensureSongsColumns");
async function ensureSongMasteryTable(client) {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS song_user_mastery (
      id TEXT PRIMARY KEY,
      songId TEXT NOT NULL,
      userId TEXT NOT NULL,
      mastered INTEGER NOT NULL DEFAULT 1,
      masteredAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT,
      FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(songId, userId)
    )`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_song_user_mastery_songId ON song_user_mastery(songId)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_song_user_mastery_userId ON song_user_mastery(userId)`
  );
  const legacyTable = await client.execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'song_member_mastery' LIMIT 1`
  );
  if (legacyTable.rows?.length) {
    await client.execute(
      `INSERT OR IGNORE INTO song_user_mastery (id, songId, userId, mastered, masteredAt, createdAt, updatedAt)
       SELECT id, songId, userId, mastered, masteredAt, createdAt, updatedAt
       FROM song_member_mastery`
    );
  }
}
__name(ensureSongMasteryTable, "ensureSongMasteryTable");
async function getActiveBandMemberSet(client, bandId) {
  const members = await client.execute(
    `SELECT userId FROM band_members
     WHERE bandId = ?
       AND (
         status IS NULL
         OR lower(status) IN ('active', 'accepted', 'member')
       )`,
    [bandId]
  );
  return new Set((members.rows || []).map((row) => String(row.userId)));
}
__name(getActiveBandMemberSet, "getActiveBandMemberSet");
async function filterMasteryForViewer(client, songBandId, masteryList, viewerUserId) {
  const normalizedViewerId = String(viewerUserId || "");
  if (!normalizedViewerId) return [];
  if (!songBandId) {
    return masteryList.filter((entry) => String(entry.userId) === normalizedViewerId);
  }
  const bandMembers = await getActiveBandMemberSet(client, songBandId);
  const isViewerInBand = bandMembers.has(normalizedViewerId);
  if (!isViewerInBand) {
    return masteryList.filter((entry) => String(entry.userId) === normalizedViewerId);
  }
  return masteryList.filter((entry) => {
    const entryUserId = String(entry.userId || "");
    return bandMembers.has(entryUserId) || entryUserId === normalizedViewerId;
  });
}
__name(filterMasteryForViewer, "filterMasteryForViewer");
async function loadSongWithOwnership(client, idStr, res) {
  const songCheck = await client.execute(
    "SELECT userId, bandId FROM songs WHERE id = ?",
    [idStr]
  );
  if (!songCheck.rows || songCheck.rows.length === 0) {
    res.status(404).json({ error: "Song not found" });
    return null;
  }
  return songCheck.rows[0];
}
__name(loadSongWithOwnership, "loadSongWithOwnership");
async function handleGetSong(req, res, client, idStr) {
  const result = await client.execute(
    `SELECT s.id, s.title, s.artist, s.youtubeId, s.lyrics, s.key, s.tempo, s.genre,
            s.time_markers, s.arrangement_style, s.keyboard_patch, s.userId, s.bandId, s.createdAt, s.updatedAt,
          s.sheet_music_xml, s.time_signature, b.name as bandName, u.username as contributor
       FROM songs s
       LEFT JOIN bands b ON s.bandId = b.id
       LEFT JOIN users u ON s.userId = u.id
       WHERE s.id = ? LIMIT 1`,
    [idStr]
  );
  const row = result.rows?.[0] || null;
  if (!row) {
    res.status(404).json({ error: "Song not found" });
    return;
  }
  const userId = req.user?.userId;
  const masteredRows = await client.execute(
    `SELECT sm.userId, sm.mastered, sm.masteredAt, sm.updatedAt, sm.createdAt, u.username
     FROM song_user_mastery sm
     LEFT JOIN users u ON u.id = sm.userId
     WHERE sm.songId = ?
     ORDER BY datetime(COALESCE(sm.masteredAt, sm.updatedAt, sm.createdAt)) DESC`,
    [idStr]
  );
  const masteredBy = (masteredRows.rows || []).map((entry) => ({
    userId: entry.userId,
    username: entry.username || "-",
    masteredAt: entry.masteredAt || entry.updatedAt || entry.createdAt || null,
    status: Number(entry.mastered) === 1 ? "mastered" : "learning"
  }));
  const visibleMasteredBy = await filterMasteryForViewer(client, row.bandId || null, masteredBy, userId);
  const canMarkMastery = Boolean(userId);
  const ownMasteryEntry = masteredBy.find((entry) => String(entry.userId) === String(userId));
  res.status(200).json({
    ...row,
    time_markers: row.time_markers ? JSON.parse(row.time_markers) : [],
    arrangementStyle: row.arrangement_style || "",
    keyboardPatch: row.keyboard_patch || "",
    sheetMusicXml: row.sheet_music_xml || "",
    masteredBy: visibleMasteredBy,
    canMarkMastery,
    isMasteredByCurrentUser: ownMasteryEntry?.status === "mastered",
    currentUserStatus: ownMasteryEntry?.status || "none"
  });
}
__name(handleGetSong, "handleGetSong");
async function handleUpdateSong(req, res, client, idStr) {
  const body = await readJson(req);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const userId = req.user?.userId;
  const userRole = req.user?.role;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const song = await loadSongWithOwnership(client, idStr, res);
  if (!song) return;
  const isOwner = song.userId && song.userId === userId;
  const isBandSong = !!song.bandId;
  let isBandMember = false;
  if (isBandSong) {
    const memberCheck = await client.execute(
      `SELECT 1 FROM band_members WHERE bandId = ? AND userId = ? LIMIT 1`,
      [song.bandId, userId]
    );
    isBandMember = memberCheck.rows && memberCheck.rows.length > 0;
  }
  if (!isOwner) {
    if (!hasPermission(userRole, PERMISSIONS.SONG_EDIT)) {
      res.status(403).json({ error: "You do not have permission to edit songs" });
      return;
    }
    if (isBandSong && !isBandMember) {
      res.status(403).json({ error: "You can only edit band songs if you are a band member" });
      return;
    }
  }
  const updateSql = `UPDATE songs SET
    title = COALESCE(?, title),
    artist = COALESCE(?, artist),
    youtubeId = COALESCE(?, youtubeId),
    lyrics = COALESCE(?, lyrics),
    key = COALESCE(?, key),
    tempo = COALESCE(?, tempo),
    genre = COALESCE(?, genre),
    time_markers = COALESCE(?, time_markers),
    time_signature = COALESCE(?, time_signature),
    arrangement_style = COALESCE(?, arrangement_style),
    keyboard_patch = COALESCE(?, keyboard_patch),
    sheet_music_xml = COALESCE(?, sheet_music_xml),
    bandId = COALESCE(?, bandId),
    updatedAt = ? WHERE id = ?`;
  let tempoStr = null;
  if (body.tempo !== void 0 && body.tempo !== null && body.tempo !== "") {
    const tempoInt = parseInt(String(body.tempo).replace(/,/g, "."), 10);
    if (!isNaN(tempoInt)) tempoStr = tempoInt.toString();
  }
  const updateParams = [
    body.title ?? null,
    body.artist ?? null,
    body.youtubeId ?? null,
    body.lyrics ?? null,
    body.key ?? null,
    tempoStr,
    body.genre ?? null,
    Array.isArray(body.time_markers) ? JSON.stringify(body.time_markers) : body.time_markers ?? null,
    body.time_signature ?? null,
    body.arrangementStyle ?? null,
    body.keyboardPatch ?? null,
    body.sheetMusicXml ?? null,
    body.bandId ?? null,
    now,
    idStr
  ];
  await client.execute(updateSql, updateParams);
  res.status(200).json({ id: idStr });
}
__name(handleUpdateSong, "handleUpdateSong");
async function handleDeleteSong(req, res, client, idStr) {
  const userId = req.user?.userId;
  const song = await loadSongWithOwnership(client, idStr, res);
  if (!song) return;
  const isOwner = song.userId && song.userId === userId;
  if (!isOwner) {
    let canDelete = false;
    if (song.bandId && userId) {
      const memberCheck = await client.execute(
        `SELECT role FROM band_members
         WHERE bandId = ? AND userId = ?
           AND (status IS NULL OR lower(status) IN ('active', 'accepted', 'member'))
         LIMIT 1`,
        [song.bandId, userId]
      );
      const memberRole = memberCheck.rows?.[0]?.role || req.user?.role || "member";
      canDelete = hasPermission(memberRole, PERMISSIONS.SONG_EDIT);
    }
    if (!canDelete) {
      res.status(403).json({ error: "Anda hanya bisa menghapus lagu milik sendiri, atau lagu band dengan izin edit" });
      return;
    }
  }
  await client.execute(`DELETE FROM songs WHERE id = ?`, [idStr]);
  res.status(204).end();
}
__name(handleDeleteSong, "handleDeleteSong");
async function handler(req, res) {
  let id = req.query && req.query.id || req.params && req.params.id || "";
  if (Array.isArray(id)) id = id[0];
  const idStr = id ? String(id).trim() : "";
  if (!idStr) {
    res.status(400).json({ error: "Missing song id" });
    return;
  }
  try {
    if (!verifyToken(req, res)) {
      return;
    }
    let client;
    try {
      client = getTursoClient();
      if (!_schemaEnsured) {
        if (!_schemaEnsurePromise) {
          _schemaEnsurePromise = (async () => {
            await ensureSongsColumns(client);
            await ensureSongMasteryTable(client);
            _schemaEnsured = true;
          })();
        }
        await _schemaEnsurePromise;
      }
    } catch (clientErr) {
      console.error(`[songs/[id]] Failed to get Turso client:`, clientErr.message);
      res.status(500).json({ error: "Database connection error", details: clientErr.message });
      return;
    }
    if (req.method === "GET") {
      await handleGetSong(req, res, client, idStr);
      return;
    }
    if (req.method === "PUT" || req.method === "PATCH") {
      await handleUpdateSong(req, res, client, idStr);
      return;
    }
    if (req.method === "DELETE") {
      await handleDeleteSong(req, res, client, idStr);
      return;
    }
    res.setHeader("Allow", "GET, PUT, PATCH, DELETE");
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("API /api/songs/[id] error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message, details: getReqEnv(req, "NODE_ENV") === "development" ? err.stack : void 0 });
  }
}
__name(handler, "handler");
var _schemaEnsured2 = false;
var _schemaEnsurePromise2 = null;
async function ensureSchema(client) {
  if (_schemaEnsured2) return;
  if (!_schemaEnsurePromise2) {
    _schemaEnsurePromise2 = (async () => {
      await ensureSongsColumns2(client);
      await ensureSongMasteryTable2(client);
      await ensureBandSongPracticeStatsTable(client);
      _schemaEnsured2 = true;
    })();
  }
  await _schemaEnsurePromise2;
}
__name(ensureSchema, "ensureSchema");
async function ensureSongsColumns2(client) {
  const columnsResult = await client.execute(`PRAGMA table_info(songs)`);
  const columns = (columnsResult.rows || []).map((row) => row.name);
  if (!columns.includes("userId")) {
    await client.execute(`ALTER TABLE songs ADD COLUMN userId TEXT`);
  }
  if (!columns.includes("bandId")) {
    await client.execute(`ALTER TABLE songs ADD COLUMN bandId TEXT`);
  }
  if (!columns.includes("time_signature")) {
    await client.execute(`ALTER TABLE songs ADD COLUMN time_signature TEXT`);
  }
}
__name(ensureSongsColumns2, "ensureSongsColumns2");
async function ensureSongMasteryTable2(client) {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS song_user_mastery (
      id TEXT PRIMARY KEY,
      songId TEXT NOT NULL,
      userId TEXT NOT NULL,
      mastered INTEGER NOT NULL DEFAULT 1,
      masteredAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT,
      FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(songId, userId)
    )`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_song_user_mastery_songId ON song_user_mastery(songId)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_song_user_mastery_userId ON song_user_mastery(userId)`
  );
  const legacyTable = await client.execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'song_member_mastery' LIMIT 1`
  );
  if (legacyTable.rows?.length) {
    await client.execute(
      `INSERT OR IGNORE INTO song_user_mastery (id, songId, userId, mastered, masteredAt, createdAt, updatedAt)
       SELECT id, songId, userId, mastered, masteredAt, createdAt, updatedAt
       FROM song_member_mastery`
    );
  }
}
__name(ensureSongMasteryTable2, "ensureSongMasteryTable2");
function toMasteryRows(rows) {
  return (rows?.rows || []).map((row) => ({
    userId: row.userId,
    username: row.username || "-",
    masteredAt: row.masteredAt || row.updatedAt || row.createdAt || null,
    status: Number(row.mastered) === 1 ? "mastered" : "learning"
  }));
}
__name(toMasteryRows, "toMasteryRows");
async function getSongMasteryList(client, songId) {
  const rows = await client.execute(
    `SELECT sm.userId, sm.mastered, sm.masteredAt, sm.updatedAt, sm.createdAt, u.username
     FROM song_user_mastery sm
     LEFT JOIN users u ON u.id = sm.userId
     WHERE sm.songId = ?
     ORDER BY datetime(COALESCE(sm.masteredAt, sm.updatedAt, sm.createdAt)) DESC`,
    [songId]
  );
  return toMasteryRows(rows);
}
__name(getSongMasteryList, "getSongMasteryList");
async function getActiveBandMemberSet2(client, bandId) {
  const members = await client.execute(
    `SELECT userId FROM band_members
     WHERE bandId = ?
       AND (
         status IS NULL
         OR lower(status) IN ('active', 'accepted', 'member')
       )`,
    [bandId]
  );
  return new Set((members.rows || []).map((row) => String(row.userId)));
}
__name(getActiveBandMemberSet2, "getActiveBandMemberSet2");
async function filterMasteryForViewer2(client, songBandId, masteryList, viewerUserId) {
  const normalizedViewerId = String(viewerUserId || "");
  if (!normalizedViewerId) return [];
  if (!songBandId) {
    return masteryList.filter((entry) => String(entry.userId) === normalizedViewerId);
  }
  const bandMembers = await getActiveBandMemberSet2(client, songBandId);
  const isViewerInBand = bandMembers.has(normalizedViewerId);
  if (!isViewerInBand) {
    return masteryList.filter((entry) => String(entry.userId) === normalizedViewerId);
  }
  return masteryList.filter((entry) => {
    const entryUserId = String(entry.userId || "");
    return bandMembers.has(entryUserId) || entryUserId === normalizedViewerId;
  });
}
__name(filterMasteryForViewer2, "filterMasteryForViewer2");
async function fetchYouTubeTrending(req) {
  const apiKey = getReqEnv(req, "VITE_YOUTUBE_API_KEY") || getReqEnv(req, "YOUTUBE_API_KEY");
  if (!apiKey) {
    return null;
  }
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("chart", "mostPopular");
    url.searchParams.set("maxResults", "12");
    url.searchParams.set("videoCategoryId", "10");
    url.searchParams.set("regionCode", "ID");
    url.searchParams.set("key", apiKey);
    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || response.statusText);
    }
    const data = await response.json();
    return (data.items || []).map((item) => {
      const snippet = item.snippet || {};
      const thumbnails = snippet.thumbnails || {};
      const thumbnail = thumbnails.high || thumbnails.medium || thumbnails.default || {};
      return {
        videoId: item.id,
        title: snippet.title || "",
        channelTitle: snippet.channelTitle || "",
        publishedAt: snippet.publishedAt || "",
        viewCount: item.statistics?.viewCount || null,
        thumbnailUrl: thumbnail.url || "",
        description: snippet.description || ""
      };
    });
  } catch (error3) {
    console.error("YouTube trending error:", error3);
    return null;
  }
}
__name(fetchYouTubeTrending, "fetchYouTubeTrending");
async function handleSongMastery(req, res, client, songId) {
  const userId = req.user?.userId || req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const songResult = await client.execute(
    `SELECT id, bandId FROM songs WHERE id = ? LIMIT 1`,
    [songId]
  );
  const song = songResult.rows?.[0];
  if (!song) {
    res.status(404).json({ error: "Song not found" });
    return;
  }
  if (song.bandId) {
    const bandMembers = await getActiveBandMemberSet2(client, song.bandId);
    if (!bandMembers.has(String(userId))) {
      res.status(403).json({ error: "Hanya anggota band yang bisa menandai status penguasaan" });
      return;
    }
  } else {
    const ownerRow = await client.execute(
      `SELECT userId FROM songs WHERE id = ? LIMIT 1`,
      [songId]
    );
    const ownerId = ownerRow.rows?.[0]?.userId;
    if (ownerId && String(ownerId) !== String(userId)) {
      res.status(403).json({ error: "Hanya pemilik lagu yang bisa menandai status penguasaan" });
      return;
    }
  }
  if (req.method === "GET") {
    const masteryAll = await getSongMasteryList(client, songId);
    const masteredBy = await filterMasteryForViewer2(client, song.bandId || null, masteryAll, userId);
    const ownEntry = masteryAll.find((entry) => String(entry.userId) === String(userId));
    res.status(200).json({
      songId,
      masteredBy,
      isMasteredByCurrentUser: ownEntry?.status === "mastered",
      currentUserStatus: ownEntry?.status || "none"
    });
    return;
  }
  if (req.method === "PUT" || req.method === "PATCH") {
    const body = await readJson(req);
    const requestedStatus = String(body?.status || "").toLowerCase();
    const masteredValue = requestedStatus === "learning" ? 0 : 1;
    const mastered = masteredValue === 1;
    if (requestedStatus !== "none") {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await client.execute(
        `INSERT INTO song_user_mastery (id, songId, userId, mastered, masteredAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(songId, userId) DO UPDATE SET
           mastered = excluded.mastered,
           masteredAt = excluded.masteredAt,
           updatedAt = excluded.updatedAt`,
        [
          uuid(),
          songId,
          userId,
          masteredValue,
          requestedStatus === "learning" ? null : now,
          now,
          now
        ]
      );
    } else {
      await client.execute(
        `DELETE FROM song_user_mastery WHERE songId = ? AND userId = ?`,
        [songId, userId]
      );
    }
    const masteryAll = await getSongMasteryList(client, songId);
    const masteredBy = await filterMasteryForViewer2(client, song.bandId || null, masteryAll, userId);
    const ownEntry = masteryAll.find((entry) => String(entry.userId) === String(userId));
    res.status(200).json({
      songId,
      mastered,
      status: ownEntry?.status || "none",
      masteredBy,
      isMasteredByCurrentUser: ownEntry?.status === "mastered",
      currentUserStatus: ownEntry?.status || "none"
    });
    return;
  }
  res.setHeader("Allow", "GET, PUT, PATCH");
  res.status(405).json({ error: "Method not allowed" });
}
__name(handleSongMastery, "handleSongMastery");
async function handler2(req, res) {
  try {
    if (!verifyToken(req, res)) {
      return;
    }
    const path = req.path || req.url.split("?")[0];
    const relativePath = path.replace(/^\/api\/songs\/?/, "").replace(/^\//, "");
    const pathSegments = relativePath ? relativePath.split("/").filter(Boolean) : [];
    const rewrittenMasterySongId = req.query?.id || req.query?.songId;
    const rewrittenPathMarker = req.query?.path || req.query?.endpoint;
    if (pathSegments.length === 2 && pathSegments[1] === "mastery") {
      const client2 = getTursoClient();
      await ensureSchema(client2);
      return handleSongMastery(req, res, client2, pathSegments[0]);
    }
    if (rewrittenMasterySongId && rewrittenPathMarker === "mastery") {
      const client2 = getTursoClient();
      await ensureSchema(client2);
      return handleSongMastery(req, res, client2, rewrittenMasterySongId);
    }
    if (relativePath && (req.method === "GET" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE")) {
      if (req.query && Object.prototype.hasOwnProperty.call(req.query, "id")) {
        req.query = { ...req.query };
        delete req.query.id;
      }
      req.params = { ...req.params, id: relativePath };
      req.query = { ...req.query, id: relativePath };
      return handler(req, res);
    }
    const client = getTursoClient();
    await client.execute(
      `CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT,
        youtubeId TEXT,
        lyrics TEXT,
        key TEXT,
        tempo TEXT,
        genre TEXT,
        time_markers TEXT,
        time_signature TEXT,
        userId TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT
      )`
    );
    await ensureSchema(client);
    if (req.method === "GET") {
      const userId = req.user?.userId || req.user?.id;
      const viewerId = String(userId || "");
      const requestedBandId = req.query?.bandId ? String(req.query.bandId) : null;
      const includeTrending = String(req.query?.include || "").split(",").map((value) => value.trim()).filter(Boolean).includes("trending");
      if (requestedBandId) {
        const membership = await client.execute(
          `SELECT 1 FROM band_members
           WHERE bandId = ? AND userId = ?
             AND (status IS NULL OR lower(status) IN ('active', 'accepted', 'member'))
           LIMIT 1`,
          [requestedBandId, viewerId]
        );
        if (!membership.rows?.length) {
          res.status(403).json({ error: "Forbidden - band access required" });
          return;
        }
      }
      let songsQuery = `SELECT songs.id,
                songs.title,
                songs.artist,
                songs.youtubeId,
                songs.lyrics,
                songs.key,
                songs.tempo,
                songs.genre,
                songs.time_markers,
                songs.time_signature,
                songs.arrangement_style,
                songs.keyboard_patch,
                songs.userId,
                songs.bandId,
                songs.createdAt,
                songs.updatedAt,
                songs.sheet_music_xml,
                users.username AS contributorUsername,
                  bands.name AS bandName,
                bps.sessionCount AS practiceSessionCount,
                bps.practicedCount AS practiceMarkedCount,
                bps.ratingAvg AS practiceRatingAvg,
                bps.lastPracticedAt AS lastPracticedAt,
                bps.lastRating AS lastPracticeRating
         FROM songs
         LEFT JOIN users ON users.id = songs.userId
                LEFT JOIN bands ON bands.id = songs.bandId
         LEFT JOIN band_song_practice_stats bps
           ON bps.songId = songs.id
          AND bps.bandId = songs.bandId`;
      const songQueryParams = [];
      if (requestedBandId) {
        songsQuery += ` WHERE songs.bandId = ?`;
        songQueryParams.push(requestedBandId);
      }
      songsQuery += ` ORDER BY (songs.updatedAt IS NULL) ASC, datetime(songs.updatedAt) DESC, datetime(songs.createdAt) DESC`;
      const rows = await client.execute(songsQuery, songQueryParams);
      const masteryRows = await client.execute(
        `SELECT sm.songId, sm.userId, sm.mastered, sm.masteredAt, sm.updatedAt, sm.createdAt, u.username
        FROM song_user_mastery sm
         LEFT JOIN users u ON u.id = sm.userId`
      );
      const masteryMap = {};
      for (const row of masteryRows.rows || []) {
        if (!masteryMap[row.songId]) masteryMap[row.songId] = [];
        masteryMap[row.songId].push({
          userId: row.userId,
          username: row.username || "-",
          masteredAt: row.masteredAt || row.updatedAt || row.createdAt || null,
          status: Number(row.mastered) === 1 ? "mastered" : "learning"
        });
      }
      const songBandIds = Array.from(new Set(
        (rows.rows || []).map((row) => row.bandId).filter((bandId) => bandId).map((bandId) => String(bandId))
      ));
      const viewerBandsRows = await client.execute(
        `SELECT bandId FROM band_members
         WHERE userId = ?
           AND (
             status IS NULL
             OR lower(status) IN ('active', 'accepted', 'member')
           )`,
        [viewerId]
      );
      const viewerBandSet = new Set((viewerBandsRows.rows || []).map((row) => String(row.bandId)));
      const bandMemberMap = {};
      if (songBandIds.length > 0) {
        const placeholders = songBandIds.map(() => "?").join(", ");
        const membersRows = await client.execute(
          `SELECT bandId, userId FROM band_members
           WHERE bandId IN (${placeholders})
             AND (
               status IS NULL
               OR lower(status) IN ('active', 'accepted', 'member')
             )`,
          songBandIds
        );
        for (const member of membersRows.rows || []) {
          const bandKey = String(member.bandId);
          if (!bandMemberMap[bandKey]) bandMemberMap[bandKey] = /* @__PURE__ */ new Set();
          bandMemberMap[bandKey].add(String(member.userId));
        }
      }
      const list = (rows.rows ?? []).map((row) => ({
        ...(() => {
          const rawMasteredBy = masteryMap[row.id] || [];
          const rowBandId = row.bandId ? String(row.bandId) : null;
          let visibleMasteredBy = [];
          if (!rowBandId) {
            visibleMasteredBy = rawMasteredBy.filter((entry) => String(entry.userId) === viewerId);
          } else if (viewerBandSet.has(rowBandId)) {
            const allowedUsers = bandMemberMap[rowBandId] || /* @__PURE__ */ new Set();
            visibleMasteredBy = rawMasteredBy.filter((entry) => {
              const entryUserId = String(entry.userId || "");
              return allowedUsers.has(entryUserId) || entryUserId === viewerId;
            });
          } else {
            visibleMasteredBy = rawMasteredBy.filter((entry) => String(entry.userId) === viewerId);
          }
          return {
            masteredBy: visibleMasteredBy,
            isMasteredByCurrentUser: visibleMasteredBy.some((entry) => String(entry.userId) === viewerId && entry.status === "mastered"),
            currentUserStatus: visibleMasteredBy.find((entry) => String(entry.userId) === viewerId)?.status || "none"
          };
        })(),
        ...row,
        contributorName: row.contributorUsername,
        // alias agar frontend tetap pakai contributorName
        time_markers: row.time_markers ? JSON.parse(row.time_markers) : [],
        sheetMusicXml: row.sheet_music_xml || "",
        // The editor reads camelCase. Without these the fields came back
        // undefined, so reopening a song showed them empty and the next save
        // wrote that emptiness back over the stored value — a silent, permanent
        // loss of aransemen and keyboard patch.
        arrangementStyle: row.arrangement_style || "",
        keyboardPatch: row.keyboard_patch || "",
        canMarkMastery: true,
        practiceStats: {
          sessionCount: Number(row.practiceSessionCount || 0),
          markedCount: Number(row.practiceMarkedCount || 0),
          ratingAvg: row.practiceRatingAvg == null ? null : Number(row.practiceRatingAvg),
          lastPracticedAt: row.lastPracticedAt || null,
          lastRating: row.lastPracticeRating == null ? null : Number(row.lastPracticeRating)
        }
      }));
      if (includeTrending) {
        const trending = await fetchYouTubeTrending(req);
        res.status(200).json({ songs: list, trending: trending || [] });
        return;
      }
      res.status(200).json(list);
      return;
    }
    if (req.method === "POST") {
      let sanitize = /* @__PURE__ */ __name(function(str, maxLen = 100) {
        if (typeof str !== "string") return "";
        return str.replace(/[<>"'`]/g, "").slice(0, maxLen);
      }, "sanitize");
      const body = await readJson(req);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const userId = req.user?.userId;
      const upsertOne = /* @__PURE__ */ __name(async (item) => {
        const title2 = sanitize(item.title, 100);
        if (!title2 || title2.length < 1) {
          throw new Error("Judul lagu wajib diisi");
        }
        const artist = sanitize(item.artist, 100);
        const genre = sanitize(item.genre, 50);
        const key = sanitize(item.key, 20);
        const youtubeId = sanitize(item.youtubeId, 30);
        let tempoStr = null;
        if (item.tempo !== void 0 && item.tempo !== null && item.tempo !== "") {
          const tempoInt = parseInt(String(item.tempo).replace(/,/g, "."), 10);
          if (!isNaN(tempoInt)) tempoStr = tempoInt.toString();
        }
        const id = item.id?.toString() || uuid();
        await client.execute(
          `INSERT INTO songs (id, title, artist, youtubeId, lyrics, key, tempo, genre, time_markers, time_signature, arrangement_style, keyboard_patch, sheet_music_xml, userId, bandId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             artist = excluded.artist,
             youtubeId = excluded.youtubeId,
             lyrics = excluded.lyrics,
             key = excluded.key,
             tempo = excluded.tempo,
             genre = excluded.genre,
             time_markers = excluded.time_markers,
             time_signature = excluded.time_signature,
             arrangement_style = excluded.arrangement_style,
             keyboard_patch = excluded.keyboard_patch,
             sheet_music_xml = excluded.sheet_music_xml,
             bandId = excluded.bandId,
             updatedAt = excluded.updatedAt`,
          [
            id,
            title2,
            artist || null,
            youtubeId || null,
            item.lyrics || null,
            key || null,
            tempoStr,
            genre || null,
            // The client sends `time_markers` (the same key the PUT handler reads).
            // Reading `item.timestamps` here silently wrote null on every create,
            // so time markers were lost whenever a song was added rather than edited.
            Array.isArray(item.time_markers) ? JSON.stringify(item.time_markers) : item.time_markers || null,
            item.time_signature || "4/4",
            item.arrangementStyle || null,
            item.keyboardPatch || null,
            item.sheetMusicXml || null,
            userId,
            item.bandId || null,
            item.createdAt || now,
            now
          ]
        );
        return id;
      }, "upsertOne");
      try {
        if (Array.isArray(body)) {
          const ids = [];
          for (const item of body) {
            const id = await upsertOne(item);
            ids.push(id);
          }
          res.status(200).json({ ids });
        } else {
          const id = await upsertOne(body);
          res.status(201).json({ id });
        }
      } catch (err) {
        res.status(400).json({ error: err.message || "Input tidak valid" });
      }
      return;
    }
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("API /api/songs error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message, details: getReqEnv(req, "NODE_ENV") === "development" ? err.stack : void 0 });
  }
}
__name(handler2, "handler2");
async function ensureBandSongPracticeStatsTable(client) {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS band_song_practice_stats (
      id TEXT PRIMARY KEY,
      bandId TEXT NOT NULL,
      songId TEXT NOT NULL,
      sessionCount INTEGER NOT NULL DEFAULT 0,
      practicedCount INTEGER NOT NULL DEFAULT 0,
      ratingAvg REAL,
      lastPracticedAt TEXT,
      lastRating INTEGER,
      updatedAt TEXT,
      FOREIGN KEY (bandId) REFERENCES bands(id) ON DELETE CASCADE,
      FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE,
      UNIQUE(bandId, songId)
    )`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_band_song_practice_stats_band_song
     ON band_song_practice_stats(bandId, songId)`
  );
}
__name(ensureBandSongPracticeStatsTable, "ensureBandSongPracticeStatsTable");
init_turso();
function normalizeSongId(songId) {
  if (songId === null || songId === void 0) return "";
  return String(songId).trim();
}
__name(normalizeSongId, "normalizeSongId");
function dedupeSongIds(songIds = []) {
  const seenSongIds = /* @__PURE__ */ new Set();
  const dedupedSongs = [];
  for (const songId of songIds) {
    const normalizedSongId = normalizeSongId(songId);
    if (!normalizedSongId || normalizedSongId === "null" || normalizedSongId === "undefined") {
      continue;
    }
    if (!seenSongIds.has(normalizedSongId)) {
      seenSongIds.add(normalizedSongId);
      dedupedSongs.push(normalizedSongId);
    }
  }
  return dedupedSongs;
}
__name(dedupeSongIds, "dedupeSongIds");
function normalizeSongMeta(metaObj) {
  if (!metaObj || typeof metaObj !== "object" || Array.isArray(metaObj)) {
    return {};
  }
  return { ...metaObj };
}
__name(normalizeSongMeta, "normalizeSongMeta");
async function getUserBandRole(client, bandId, userId) {
  if (!client || !bandId || !userId) return null;
  const result = await client.execute(
    `SELECT role FROM band_members WHERE bandId = ? AND userId = ? LIMIT 1`,
    [bandId, userId]
  );
  return result.rows?.[0]?.role || null;
}
__name(getUserBandRole, "getUserBandRole");
async function ensureSetlistPermission(client, userId, bandId, requiredPermission, setlistOwnerUserId = null) {
  if (!userId) return { allowed: false, reason: "Unauthenticated" };
  if (!bandId) {
    return {
      allowed: String(setlistOwnerUserId || "") === String(userId),
      reason: "Personal setlist requires owner access"
    };
  }
  const role = await getUserBandRole(client, bandId, userId);
  if (!role) {
    return { allowed: false, reason: "User is not a member of this band" };
  }
  return {
    allowed: hasPermission(role, requiredPermission),
    reason: "Insufficient permissions for this band setlist",
    role
  };
}
__name(ensureSetlistPermission, "ensureSetlistPermission");
function applyBandPreferredKey(metaObj, preferredKey) {
  const normalizedMeta = normalizeSongMeta(metaObj);
  if (!normalizedMeta.key && preferredKey) {
    normalizedMeta.key = preferredKey;
  }
  return normalizedMeta;
}
__name(applyBandPreferredKey, "applyBandPreferredKey");
async function getBandPreferredKeyMap(client, bandId, songIds = []) {
  const map = /* @__PURE__ */ new Map();
  if (!bandId || !Array.isArray(songIds) || songIds.length === 0) {
    return map;
  }
  const placeholders = songIds.map(() => "?").join(", ");
  const rows = await client.execute(
    `SELECT songId, preferredKey
     FROM band_song_preferences
     WHERE bandId = ? AND songId IN (${placeholders})`,
    [bandId, ...songIds]
  );
  for (const row of rows.rows || []) {
    if (row.songId && row.preferredKey) {
      map.set(row.songId, row.preferredKey);
    }
  }
  return map;
}
__name(getBandPreferredKeyMap, "getBandPreferredKeyMap");
async function upsertBandPreferredKeys(client, bandId, setlistSongMeta, allowedSongIds = [], nowIso) {
  if (!bandId || !setlistSongMeta || typeof setlistSongMeta !== "object" || Array.isArray(setlistSongMeta)) {
    return;
  }
  const allowed = new Set(Array.isArray(allowedSongIds) ? allowedSongIds : []);
  const rows = Object.entries(setlistSongMeta).filter(([songId]) => allowed.size === 0 ? true : allowed.has(songId)).map(([songId, metaObj]) => {
    const preferredKey = typeof metaObj?.key === "string" ? metaObj.key.trim() : "";
    return { songId, preferredKey };
  }).filter(({ songId, preferredKey }) => songId && preferredKey);
  for (const row of rows) {
    await client.execute(
      `INSERT INTO band_song_preferences (id, bandId, songId, preferredKey, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(bandId, songId)
       DO UPDATE SET preferredKey = excluded.preferredKey, updatedAt = excluded.updatedAt`,
      [uuid(), bandId, row.songId, row.preferredKey, nowIso, nowIso]
    );
  }
}
__name(upsertBandPreferredKeys, "upsertBandPreferredKeys");
async function handler3(req, res) {
  try {
    if (!verifyToken(req, res)) {
      return;
    }
    const path = req.path || req.url.split("?")[0];
    const relativePath = path.replace(/^\/api\/setlists\/?/, "").replace(/^\//, "");
    const isIdRoute = relativePath && relativePath !== "";
    const id = isIdRoute ? relativePath : null;
    if (isIdRoute && (req.method === "GET" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE")) {
      const idStr = id ? String(id).trim() : "";
      if (!idStr) {
        res.status(400).json({ error: "Missing setlist id" });
        return;
      }
      let client2;
      const userId2 = req.user?.userId;
      try {
        client2 = getTursoClient();
      } catch (clientErr) {
        console.error(`[setlists/[id]] Failed to get Turso client:`, clientErr.message);
        res.status(500).json({ error: "Database connection error", details: clientErr.message });
        return;
      }
      if (req.method === "GET") {
        try {
          const result = await client2.execute(
            `SELECT s.id, s.name, s.description, s.bandId, s.completedSongs, s.createdAt, s.updatedAt, b.name as bandName
             FROM setlists s
             LEFT JOIN bands b ON s.bandId = b.id
             WHERE s.id = ?
             AND (s.bandId IS NULL OR EXISTS (
               SELECT 1 FROM band_members WHERE bandId = s.bandId AND userId = ?
             ))
             LIMIT 1`,
            [idStr, userId2]
          );
          const row = result.rows?.[0] || null;
          if (!row) {
            res.status(404).json({ error: "Setlist not found" });
            return;
          }
          const songRows = await client2.execute(
            `SELECT song_id, position, meta FROM setlist_songs WHERE setlist_id = ? ORDER BY position ASC`,
            [idStr]
          );
          const songs = (songRows.rows?.map((r) => normalizeSongId(r.song_id)) || []).filter(Boolean);
          const preferredKeyMap = await getBandPreferredKeyMap(client2, row.bandId, songs);
          const songKeys = {};
          (songRows.rows || []).forEach((r) => {
            try {
              const parsedMeta = r.meta ? JSON.parse(r.meta) : {};
              songKeys[r.song_id] = applyBandPreferredKey(parsedMeta, preferredKeyMap.get(r.song_id));
            } catch {
              songKeys[r.song_id] = applyBandPreferredKey({}, preferredKeyMap.get(r.song_id));
            }
          });
          res.status(200).json({
            id: row.id,
            name: row.name,
            description: row.description || "",
            bandId: row.bandId,
            bandName: row.bandName,
            songs,
            songKeys,
            // Alias agar konsumen (SongChordsPage offline/direct-link) dapat
            // membaca meta override key dengan field yang sama seperti endpoint
            // daftar setlist.
            setlistSongMeta: songKeys,
            completedSongs: (() => {
              try {
                return row.completedSongs ? JSON.parse(row.completedSongs) : {};
              } catch (e) {
                return {};
              }
            })(),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          });
          return;
        } catch (queryErr) {
          throw queryErr;
        }
      }
      if (req.method === "PUT" || req.method === "PATCH") {
        const body = await readJson(req);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const normalizedMetaPatch = body?.setlistSongMetaPatch && typeof body.setlistSongMetaPatch === "object" && !Array.isArray(body.setlistSongMetaPatch) ? body.setlistSongMetaPatch : null;
        const setlistRowResult = await client2.execute(
          `SELECT bandId FROM setlists WHERE id = ? LIMIT 1`,
          [idStr]
        );
        const existingSetlistRow = setlistRowResult.rows?.[0] || null;
        if (!existingSetlistRow) {
          res.status(404).json({ error: "Setlist not found" });
          return;
        }
        const effectiveBandId = body.bandId !== void 0 ? body.bandId : existingSetlistRow.bandId;
        const dedupedSongs = Array.isArray(body.songs) ? dedupeSongIds(body.songs) : [];
        const permissionCheck = await ensureSetlistPermission(
          client2,
          userId2,
          effectiveBandId,
          PERMISSIONS.SETLIST_EDIT,
          existingSetlistRow.userId
        );
        if (!permissionCheck.allowed) {
          res.status(403).json({ error: permissionCheck.reason });
          return;
        }
        await client2.execute(
          `UPDATE setlists SET
             name = COALESCE(?, name),
             description = COALESCE(?, description),
             bandId = COALESCE(?, bandId),
             completedSongs = COALESCE(?, completedSongs),
             updatedAt = ?
           WHERE id = ?`,
          [
            body.name ?? null,
            body.description ?? null,
            body.bandId !== void 0 ? body.bandId : null,
            body.completedSongs ? JSON.stringify(body.completedSongs) : null,
            now,
            idStr
          ]
        );
        if (Array.isArray(body.songs)) {
          await client2.execute(`DELETE FROM setlist_songs WHERE setlist_id = ?`, [idStr]);
          const preferredKeyMap = await getBandPreferredKeyMap(client2, effectiveBandId, dedupedSongs);
          for (let i = 0; i < dedupedSongs.length; i++) {
            const songId = dedupedSongs[i];
            const rawMetaObj = body.setlistSongMeta && body.setlistSongMeta[songId] ? body.setlistSongMeta[songId] : {};
            const metaObj = applyBandPreferredKey(rawMetaObj, preferredKeyMap.get(songId));
            await client2.execute(
              `INSERT INTO setlist_songs (setlist_id, song_id, position, meta, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(setlist_id, song_id)
               DO UPDATE SET position = excluded.position, meta = excluded.meta, updatedAt = excluded.updatedAt`,
              [idStr, songId, i, JSON.stringify(metaObj), now, now]
            );
          }
          await upsertBandPreferredKeys(client2, effectiveBandId, body.setlistSongMeta, dedupedSongs, now);
        } else if (normalizedMetaPatch) {
          const patchSongIds = dedupeSongIds(Object.keys(normalizedMetaPatch));
          const preferredKeyMap = await getBandPreferredKeyMap(client2, effectiveBandId, patchSongIds);
          for (const songId of patchSongIds) {
            const patchMetaObj = normalizeSongMeta(normalizedMetaPatch[songId]);
            const existingSongRow = await client2.execute(
              `SELECT meta FROM setlist_songs WHERE setlist_id = ? AND song_id = ? LIMIT 1`,
              [idStr, songId]
            );
            const existingMetaRaw = existingSongRow.rows?.[0]?.meta;
            let existingMetaObj = {};
            try {
              existingMetaObj = existingMetaRaw ? JSON.parse(existingMetaRaw) : {};
            } catch {
              existingMetaObj = {};
            }
            const mergedMeta = applyBandPreferredKey(
              { ...normalizeSongMeta(existingMetaObj), ...patchMetaObj },
              preferredKeyMap.get(songId)
            );
            await client2.execute(
              `UPDATE setlist_songs
               SET meta = ?, updatedAt = ?
               WHERE setlist_id = ? AND song_id = ?`,
              [JSON.stringify(mergedMeta), now, idStr, songId]
            );
          }
          await upsertBandPreferredKeys(client2, effectiveBandId, normalizedMetaPatch, patchSongIds, now);
        } else {
          await upsertBandPreferredKeys(client2, effectiveBandId, body.setlistSongMeta, Object.keys(body.setlistSongMeta || {}), now);
        }
        res.status(200).json({ id: idStr });
        return;
      }
      if (req.method === "DELETE") {
        const setlistLookup = await client2.execute(
          `SELECT s.id, s.bandId, s.userId FROM setlists s WHERE s.id = ? LIMIT 1`,
          [idStr]
        );
        const targetSetlist = setlistLookup.rows?.[0] || null;
        if (!targetSetlist) {
          res.status(404).json({ error: "Setlist not found" });
          return;
        }
        const permissionCheck = await ensureSetlistPermission(
          client2,
          userId2,
          targetSetlist.bandId,
          PERMISSIONS.SETLIST_DELETE,
          targetSetlist.userId
        );
        if (!permissionCheck.allowed) {
          res.status(403).json({ error: permissionCheck.reason });
          return;
        }
        await client2.execute(`DELETE FROM setlists WHERE id = ?`, [idStr]);
        res.status(204).end();
        return;
      }
      res.setHeader("Allow", "GET, PUT, PATCH, DELETE");
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const client = getTursoClient();
    const userId = req.user?.userId;
    const summaryParam = req.query?.summary || new URL(req.url, "http://localhost").searchParams.get("summary");
    const isSummaryRequest = ["1", "true", "yes"].includes(String(summaryParam || "").toLowerCase());
    if (req.method === "GET") {
      if (isSummaryRequest) {
        const summaryRows = await client.execute(
          `SELECT s.id, s.name, s.description, s.bandId, s.createdAt, s.updatedAt,
                  b.name as bandName, u.username as userName, s.userId,
                  COALESCE(ss.song_count, 0) as songCount
           FROM setlists s
           LEFT JOIN bands b ON s.bandId = b.id
           LEFT JOIN users u ON s.userId = u.id
           LEFT JOIN (
             SELECT setlist_id, COUNT(*) as song_count
             FROM setlist_songs
             GROUP BY setlist_id
           ) ss ON ss.setlist_id = s.id
           WHERE (s.userId = ?)
              OR (s.bandId IS NOT NULL AND EXISTS (
                SELECT 1 FROM band_members WHERE bandId = s.bandId AND userId = ?
              ))
           ORDER BY datetime(s.createdAt) DESC, datetime(s.updatedAt) DESC`,
          [userId, userId]
        );
        const summarySetlists = (summaryRows.rows || []).map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description || "",
          bandId: row.bandId,
          bandName: row.bandName,
          userId: row.userId,
          userName: row.userName || "",
          songCount: Number(row.songCount || 0),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        }));
        res.status(200).json(summarySetlists);
        return;
      }
      const rows = await client.execute(
        `SELECT s.id, s.name, s.description, s.bandId, s.completedSongs, s.createdAt, s.updatedAt,
                b.name as bandName, u.username as userName, s.userId
         FROM setlists s
         LEFT JOIN bands b ON s.bandId = b.id
         LEFT JOIN users u ON s.userId = u.id
         WHERE (s.userId = ?)
            OR (s.bandId IS NOT NULL AND EXISTS (
              SELECT 1 FROM band_members WHERE bandId = s.bandId AND userId = ?
            ))
         ORDER BY datetime(s.createdAt) DESC, datetime(s.updatedAt) DESC`,
        [userId, userId]
      );
      const baseRows = rows.rows ?? [];
      const setlistIds = baseRows.map((row) => row.id).filter(Boolean);
      const bandIds = [...new Set(baseRows.map((row) => row.bandId).filter(Boolean))];
      const songRowsBySetlistId = /* @__PURE__ */ new Map();
      if (setlistIds.length > 0) {
        const chunkSize = 200;
        for (let i = 0; i < setlistIds.length; i += chunkSize) {
          const chunk = setlistIds.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => "?").join(", ");
          const songRows = await client.execute(
            `SELECT setlist_id, song_id, position, meta
             FROM setlist_songs
             WHERE setlist_id IN (${placeholders})
             ORDER BY setlist_id ASC, position ASC`,
            chunk
          );
          for (const songRow of songRows.rows || []) {
            const list = songRowsBySetlistId.get(songRow.setlist_id) || [];
            list.push(songRow);
            songRowsBySetlistId.set(songRow.setlist_id, list);
          }
        }
      }
      const allSongIds = /* @__PURE__ */ new Set();
      for (const groupedRows of songRowsBySetlistId.values()) {
        for (const songRow of groupedRows) {
          if (songRow.song_id) {
            allSongIds.add(songRow.song_id);
          }
        }
      }
      const preferredKeyByBandSong = /* @__PURE__ */ new Map();
      if (bandIds.length > 0 && allSongIds.size > 0) {
        const bandPlaceholders = bandIds.map(() => "?").join(", ");
        const songPlaceholders = [...allSongIds].map(() => "?").join(", ");
        const preferredRows = await client.execute(
          `SELECT bandId, songId, preferredKey
           FROM band_song_preferences
           WHERE bandId IN (${bandPlaceholders})
             AND songId IN (${songPlaceholders})`,
          [...bandIds, ...allSongIds]
        );
        for (const preferredRow of preferredRows.rows || []) {
          if (preferredRow.bandId && preferredRow.songId && preferredRow.preferredKey) {
            preferredKeyByBandSong.set(`${preferredRow.bandId}::${preferredRow.songId}`, preferredRow.preferredKey);
          }
        }
      }
      const setlists = baseRows.map((row) => {
        const groupedSongRows = songRowsBySetlistId.get(row.id) || [];
        const songs = groupedSongRows.map((r) => r.song_id);
        const setlistSongMeta = {};
        for (const songRow of groupedSongRows) {
          const preferredKey = row.bandId ? preferredKeyByBandSong.get(`${row.bandId}::${songRow.song_id}`) : null;
          try {
            const parsedMeta = songRow.meta ? JSON.parse(songRow.meta) : {};
            setlistSongMeta[songRow.song_id] = applyBandPreferredKey(parsedMeta, preferredKey);
          } catch {
            setlistSongMeta[songRow.song_id] = applyBandPreferredKey({}, preferredKey);
          }
        }
        return {
          id: row.id,
          name: row.name,
          description: row.description || "",
          bandId: row.bandId,
          bandName: row.bandName,
          userId: row.userId,
          userName: row.userName || "",
          songs,
          setlistSongMeta,
          completedSongs: (() => {
            try {
              return row.completedSongs ? JSON.parse(row.completedSongs) : {};
            } catch (e) {
              return {};
            }
          })(),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        };
      });
      res.status(200).json(setlists);
      return;
    }
    if (req.method === "POST") {
      let sanitize = /* @__PURE__ */ __name(function(str, maxLen = 100) {
        if (typeof str !== "string") return "";
        return str.replace(/[<>"'`]/g, "").slice(0, maxLen);
      }, "sanitize");
      const body = await readJson(req);
      const name = sanitize(body.name, 100);
      if (!name || name.length < 1) {
        res.status(400).json({ error: "Setlist name is required" });
        return;
      }
      const description = sanitize(body.description || "", 300);
      let bandId = body.bandId || null;
      if (bandId) {
        bandId = sanitize(bandId, 50);
        const permissionCheck = await ensureSetlistPermission(client, userId, bandId, PERMISSIONS.SETLIST_CREATE);
        if (!permissionCheck.allowed) {
          res.status(403).json({ error: permissionCheck.reason });
          return;
        }
      }
      const id2 = body.id?.toString() || uuid();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const dedupedSongs = Array.isArray(body.songs) ? dedupeSongIds(body.songs) : [];
      const preferredKeyMap = await getBandPreferredKeyMap(client, bandId, dedupedSongs);
      try {
        await client.execute(
          `INSERT INTO setlists (id, name, description, bandId, createdAt, updatedAt, userId)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id2,
            name,
            description,
            bandId,
            body.createdAt || now,
            now,
            userId
          ]
        );
        if (Array.isArray(body.songs)) {
          for (let i = 0; i < dedupedSongs.length; i++) {
            const songId = dedupedSongs[i];
            const rawMetaObj = body.setlistSongMeta && body.setlistSongMeta[songId] ? body.setlistSongMeta[songId] : {};
            const metaObj = applyBandPreferredKey(rawMetaObj, preferredKeyMap.get(songId));
            await client.execute(
              `INSERT INTO setlist_songs (setlist_id, song_id, position, meta, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(setlist_id, song_id)
               DO UPDATE SET position = excluded.position, meta = excluded.meta, updatedAt = excluded.updatedAt`,
              [id2, songId, i, JSON.stringify(metaObj), now, now]
            );
          }
        }
        await upsertBandPreferredKeys(client, bandId, body.setlistSongMeta, dedupedSongs, now);
        res.status(201).json({ id: id2 });
      } catch (insertErr) {
        if (insertErr.message && insertErr.message.includes("UNIQUE")) {
          await client.execute(
            `UPDATE setlists SET  
               name = ?, 
               description = ?,
               bandId = ?,
               updatedAt = ?,
               userId = ?
             WHERE id = ?`,
            [
              name,
              description,
              bandId,
              now,
              userId,
              id2
            ]
          );
          await client.execute(`DELETE FROM setlist_songs WHERE setlist_id = ?`, [id2]);
          if (Array.isArray(body.songs)) {
            for (let i = 0; i < dedupedSongs.length; i++) {
              const songId = dedupedSongs[i];
              const rawMetaObj = body.setlistSongMeta && body.setlistSongMeta[songId] ? body.setlistSongMeta[songId] : {};
              const metaObj = applyBandPreferredKey(rawMetaObj, preferredKeyMap.get(songId));
              await client.execute(
                `INSERT INTO setlist_songs (setlist_id, song_id, position, meta, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT(setlist_id, song_id)
                 DO UPDATE SET position = excluded.position, meta = excluded.meta, updatedAt = excluded.updatedAt`,
                [id2, songId, i, JSON.stringify(metaObj), now, now]
              );
            }
          }
          await upsertBandPreferredKeys(client, bandId, body.setlistSongMeta, dedupedSongs, now);
          res.status(200).json({ id: id2 });
        } else {
          throw insertErr;
        }
      }
      return;
    }
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("API /api/setlists error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
}
__name(handler3, "handler3");
init_turso();
init_env();
var loadNodemailer = /* @__PURE__ */ __name(() => Promise.resolve().then(() => (init_nodemailer_stub(), nodemailer_stub_exports)), "loadNodemailer");
function getMailConfig(req) {
  return {
    host: getReqEnv(req, "SMTP_HOST") || getReqEnv(req, "EMAIL_HOST") || "smtp.gmail.com",
    port: Number(getReqEnv(req, "SMTP_PORT") || getReqEnv(req, "EMAIL_PORT") || 587),
    user: getReqEnv(req, "SMTP_USER") || getReqEnv(req, "EMAIL_USER"),
    pass: getReqEnv(req, "SMTP_PASS") || getReqEnv(req, "EMAIL_PASSWORD"),
    from: getReqEnv(req, "MAIL_FROM") || getReqEnv(req, "SMTP_USER") || getReqEnv(req, "EMAIL_USER"),
    provider: getReqEnv(req, "MAIL_PROVIDER"),
    resendKey: getReqEnv(req, "RESEND_API_KEY"),
    postmarkToken: getReqEnv(req, "POSTMARK_SERVER_TOKEN")
  };
}
__name(getMailConfig, "getMailConfig");
async function sendViaHttp(config2, message) {
  if (config2.provider === "resend" && config2.resendKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config2.resendKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: message.from || config2.from,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text
      })
    });
    if (!response.ok) throw new Error(`Resend error: HTTP ${response.status}`);
    return response.json();
  }
  if (config2.provider === "postmark" && config2.postmarkToken) {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "x-postmark-server-token": config2.postmarkToken,
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        From: message.from || config2.from,
        To: Array.isArray(message.to) ? message.to.join(",") : message.to,
        Subject: message.subject,
        HtmlBody: message.html,
        TextBody: message.text
      })
    });
    if (!response.ok) throw new Error(`Postmark error: HTTP ${response.status}`);
    return response.json();
  }
  throw new Error(
    "No email transport available: configure SMTP_HOST/SMTP_USER/SMTP_PASS (Node) or MAIL_PROVIDER + provider API key (Cloudflare)."
  );
}
__name(sendViaHttp, "sendViaHttp");
async function sendMail(req, message) {
  const config2 = getMailConfig(req);
  const nodemailer = await loadNodemailer();
  const factory = nodemailer?.createTransport;
  const isStub = !factory || nodemailer && nodemailer.__rpStub;
  if (isStub) return sendViaHttp(config2, message);
  const transporter = factory({
    host: config2.host,
    port: config2.port,
    secure: false,
    auth: { user: config2.user, pass: config2.pass }
  });
  return transporter.sendMail({ ...message, from: message.from || config2.from });
}
__name(sendMail, "sendMail");
init_turso();
async function handler4(req, res) {
  try {
    if (!verifyToken(req, res)) {
      return;
    }
    const client = getTursoClient();
    const userId = req.user?.userId;
    const bandId = req.query?.id || req.params?.id || req.url?.split("/").pop();
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.method === "GET") {
      const memberCheck = await client.execute(
        "SELECT role FROM band_members WHERE bandId = ? AND userId = ?",
        [bandId, userId]
      );
      const bandResult = await client.execute(
        "SELECT * FROM bands WHERE id = ?",
        [bandId]
      );
      if (!bandResult.rows || bandResult.rows.length === 0) {
        return res.status(404).json({ error: "Band not found" });
      }
      const band = bandResult.rows[0];
      const isMember = memberCheck.rows && memberCheck.rows.length > 0;
      const isOwner = band.createdBy === userId;
      if (!isMember && !isOwner) {
        return res.status(403).json({ error: "Access denied" });
      }
      const membersResult = await client.execute(`
        SELECT bm.id, bm.userId, bm.role, bm.status, bm.joinedAt, u.username, u.email
        FROM band_members bm
        JOIN users u ON bm.userId = u.id
        WHERE bm.bandId = ?
        ORDER BY bm.joinedAt ASC
      `, [bandId]);
      const members = (membersResult.rows || []).map((row) => ({
        id: row.id,
        userId: row.userId,
        username: row.username,
        email: row.email,
        role: row.role,
        status: row.status,
        joinedAt: row.joinedAt,
        isOwner: row.userId === band.createdBy
        // Tandai owner
      }));
      return res.status(200).json({
        ...band,
        members,
        isOwner,
        userRole: memberCheck.rows?.[0]?.role || (isOwner ? "owner" : null)
      });
    }
    if (req.method === "PUT") {
      const body = await readJson(req);
      const { name, description, genre } = body;
      const bandResult = await client.execute(
        "SELECT createdBy FROM bands WHERE id = ?",
        [bandId]
      );
      if (!bandResult.rows || bandResult.rows.length === 0) {
        return res.status(404).json({ error: "Band not found" });
      }
      if (bandResult.rows[0].createdBy !== userId) {
        return res.status(403).json({ error: "Only band owner can update" });
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await client.execute(
        "UPDATE bands SET name = ?, description = ?, genre = ?, updatedAt = ? WHERE id = ?",
        [name, description || null, genre || null, now, bandId]
      );
      return res.status(200).json({ success: true });
    }
    if (req.method === "DELETE") {
      const bandResult = await client.execute(
        "SELECT createdBy FROM bands WHERE id = ?",
        [bandId]
      );
      if (!bandResult.rows || bandResult.rows.length === 0) {
        return res.status(404).json({ error: "Band not found" });
      }
      if (bandResult.rows[0].createdBy !== userId) {
        return res.status(403).json({ error: "Only band owner can delete" });
      }
      await client.execute("DELETE FROM bands WHERE id = ?", [bandId]);
      return res.status(200).json({ success: true });
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (error3) {
    console.error("Band detail handler error:", error3);
    res.status(500).json({ error: error3.message || "Internal server error" });
  }
}
__name(handler4, "handler4");
var rateLimitStore = /* @__PURE__ */ new Map();
var RATE_LIMITS = {
  // Authentication endpoints (stricter)
  AUTH_LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1e3 },
  // 5 per 15 min
  AUTH_REGISTER: { maxRequests: 3, windowMs: 60 * 60 * 1e3 },
  // 3 per hour
  AUTH_FORGOT: { maxRequests: 3, windowMs: 60 * 60 * 1e3 },
  // 3 per hour
  AUTH_RESET: { maxRequests: 3, windowMs: 60 * 60 * 1e3 },
  // 3 per hour
  // API endpoints (standard)
  API_READ: { maxRequests: 100, windowMs: 60 * 1e3 },
  // 100 per min
  API_WRITE: { maxRequests: 50, windowMs: 60 * 1e3 },
  // 50 per min
  API_DELETE: { maxRequests: 10, windowMs: 60 * 1e3 },
  // 10 per min
  // General endpoints (permissive)
  GENERAL: { maxRequests: 1e3, windowMs: 60 * 1e3 }
  // 1000 per min
};
function createRateLimiter(options = {}) {
  const maxRequests = options.maxRequests || RATE_LIMITS.GENERAL.maxRequests;
  const windowMs = options.windowMs || RATE_LIMITS.GENERAL.windowMs;
  const keyGenerator = options.keyGenerator || defaultKeyGenerator;
  const skip = options.skip || (() => false);
  return (req, res, next) => {
    if (skip(req)) {
      return next();
    }
    const key = keyGenerator(req);
    const now = Date.now();
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, {
        requests: [],
        created: now
      });
    }
    const data = rateLimitStore.get(key);
    data.requests = data.requests.filter((timestamp) => now - timestamp < windowMs);
    if (data.requests.length >= maxRequests) {
      const oldestRequest = data.requests[0];
      const retryAfter = Math.ceil((windowMs - (now - oldestRequest)) / 1e3);
      return res.status(429).json({
        error: "Too many requests",
        retryAfter,
        message: `Please try again in ${retryAfter} seconds`
      });
    }
    data.requests.push(now);
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", maxRequests - data.requests.length);
    res.setHeader("X-RateLimit-Reset", new Date(now + windowMs).toISOString());
    next();
  };
}
__name(createRateLimiter, "createRateLimiter");
function defaultKeyGenerator(req) {
  const ip = req.ip || req.connection?.remoteAddress || "127.0.0.1";
  return `rate-limit:${ip}`;
}
__name(defaultKeyGenerator, "defaultKeyGenerator");
function cleanupRateLimits() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1e3;
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.created > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}
__name(cleanupRateLimits, "cleanupRateLimits");
if (typeof setInterval === "function") {
  try {
    const timer = setInterval(cleanupRateLimits, 60 * 60 * 1e3);
    timer.unref?.();
  } catch {
  }
}
var rateLimiter = createRateLimiter({ ...RATE_LIMITS.API_WRITE });
async function handler5(req, res) {
  try {
    if (!verifyToken(req, res)) {
      return;
    }
    const path = req.path || req.url.split("?")[0];
    const relativePath = path.replace(/^\/api\/bands\/?/, "").replace(/^\//, "");
    if (relativePath.includes("/")) {
    } else if (relativePath && (req.method === "GET" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE")) {
      req.params = { ...req.params, id: relativePath };
      req.query = { ...req.query, id: relativePath };
      return handler4(req, res);
    }
    const client = getTursoClient();
    const userId = req.user?.userId;
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS bands (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          createdBy TEXT NOT NULL,
          description TEXT,
          genre TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT
        )
      `);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS band_members (
          id TEXT PRIMARY KEY,
          bandId TEXT NOT NULL,
          userId TEXT NOT NULL,
          role TEXT,
          status TEXT DEFAULT 'active',
          joinedAt TEXT DEFAULT (datetime('now')),
          UNIQUE(bandId, userId)
        )
      `);
    } catch (tableError) {
      console.error("Table creation error:", tableError);
    }
    if (req.method === "GET") {
      const result = await client.execute(`
        SELECT DISTINCT b.id, b.name, b.description, b.genre, b.createdBy, b.createdAt,
               bm.role, bm.joinedAt,
               (
                 SELECT COUNT(*)
                 FROM band_members mb
                 WHERE mb.bandId = b.id AND mb.status = 'active'
               ) AS memberCount
        FROM bands b
        LEFT JOIN band_members bm ON b.id = bm.bandId AND bm.userId = ?
        WHERE b.createdBy = ? OR bm.userId = ?
        ORDER BY b.createdAt DESC
      `, [userId, userId, userId]);
      const bands = (result.rows || []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        genre: row.genre,
        createdBy: row.createdBy,
        role: row.role || (row.createdBy === userId ? "owner" : null),
        joinedAt: row.joinedAt,
        createdAt: row.createdAt,
        memberCount: Number(row.memberCount || 0),
        isOwner: row.createdBy === userId
      }));
      return res.status(200).json(bands);
    }
    if (req.method === "POST") {
      let sanitize = /* @__PURE__ */ __name(function(str, maxLen = 100) {
        if (typeof str !== "string") return "";
        return str.replace(/[<>"'`]/g, "").slice(0, maxLen);
      }, "sanitize");
      const { BAND_CREATE } = PERMISSIONS;
      const userRole = req.user?.role;
      if (!hasPermission(userRole, BAND_CREATE)) {
        return res.status(403).json({ error: "You do not have permission to create bands" });
      }
      const body = await readJson(req);
      const name = sanitize(body.name, 100);
      if (!name || name.length < 1) {
        return res.status(400).json({ error: "Band name is required" });
      }
      const description = sanitize(body.description || "", 300);
      const genre = sanitize(body.genre || "", 50);
      const bandId = `band_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await client.execute(
        "INSERT INTO bands (id, name, description, genre, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
        [bandId, name, description || null, genre || null, userId, now]
      );
      await client.execute(
        "INSERT INTO band_members (bandId, userId, role, joinedAt) VALUES (?, ?, ?, ?)",
        [bandId, userId, "owner", now]
      );
      return res.status(201).json({
        id: bandId,
        name,
        description,
        genre,
        createdBy: userId,
        role: "owner",
        createdAt: now,
        memberCount: 1,
        isOwner: true
      });
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (error3) {
    console.error("Bands handler error:", error3);
    res.status(500).json({ error: error3.message || "Internal server error" });
  }
}
__name(handler5, "handler5");
init_turso();
async function handler6(req, res) {
  const bandId = req.params?.id || req.query?.bandId || (req.url.split("/")[3] || "").split("?")[0];
  const userId = req.params?.userId || req.query?.userId || (req.url.split("/")[5] || "").split("?")[0];
  if (!verifyToken(req, res)) return;
  const client = getTursoClient();
  const currentUserId = req.user?.userId;
  if (req.method === "GET") {
    const members = await client.execute(
      "SELECT bm.*, u.email, u.username FROM band_members bm JOIN users u ON bm.userId = u.id WHERE bm.bandId = ?",
      [bandId]
    );
    return res.json(members.rows || []);
  }
  if (req.method === "POST") {
    const { email, role } = req.body || {};
    if (!email || !role) return res.status(400).json({ error: "Email and role required" });
    const userRes = await client.execute("SELECT id FROM users WHERE email = ?", [email]);
    const newUser = userRes.rows?.[0];
    if (!newUser) return res.status(404).json({ error: "User not found" });
    await client.execute(
      "INSERT INTO band_members (bandId, userId, role, joinedAt) VALUES (?, ?, ?, ?)",
      [bandId, newUser.id, role, (/* @__PURE__ */ new Date()).toISOString()]
    );
    return res.json({ success: true });
  }
  if (req.method === "PATCH") {
    console.log("[PATCH] Update member role", {
      bandId,
      userId,
      body: req.body,
      currentUserId
    });
    if (!userId) return res.status(400).json({ error: "User ID required" });
    const { role } = req.body || {};
    if (!role) return res.status(400).json({ error: "Role required" });
    await client.execute(
      "UPDATE band_members SET role = ? WHERE bandId = ? AND userId = ?",
      [role, bandId, userId]
    );
    return res.json({ success: true });
  }
  if (req.method === "DELETE") {
    if (!userId) return res.status(400).json({ error: "User ID required" });
    await client.execute(
      "DELETE FROM band_members WHERE bandId = ? AND userId = ?",
      [bandId, userId]
    );
    return res.json({ success: true });
  }
  res.status(405).json({ error: "Method not allowed" });
}
__name(handler6, "handler6");
init_turso();
function getTable(type) {
  if (type === "gig") return "gigs";
  throw new Error("Invalid type");
}
__name(getTable, "getTable");
async function handler7(req, res) {
  if (!verifyToken(req, res)) return;
  let type = req.params?.type;
  let id = req.params?.id || null;
  if (!type) {
    const match = req.url.match(/\/api\/events\/(gig)(?:\/([^/?]+))?/);
    if (match) {
      type = match[1];
      id = match[2] || null;
    }
  }
  if (!type || type !== "gig") {
    res.status(400).json({ error: "Invalid route" });
    return;
  }
  const table3 = getTable(type);
  const client = getTursoClient();
  const userId = req.user?.userId || req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    if (id) {
      if (req.method === "GET") {
        if (type === "gig") {
          const result = await client.execute(
            `SELECT g.id, g.bandId, g.date, g.venue, g.city, g.fee, g.setlistId, g.notes, g.createdAt, g.updatedAt, b.name as bandName, s.name as setlistName FROM gigs g LEFT JOIN bands b ON g.bandId = b.id LEFT JOIN setlists s ON g.setlistId = s.id WHERE g.id = ? AND (g.userId = ? OR g.bandId IN (SELECT bandId FROM band_members WHERE userId = ?)) LIMIT 1`,
            [id, userId, userId]
          );
          const row = result.rows?.[0] || null;
          if (!row) return res.status(404).json({ error: "Gig not found" });
          res.status(200).json({ ...row });
          return;
        }
      }
      if (req.method === "PUT" || req.method === "PATCH") {
        const body = await readJson(req);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        if (type === "gig") {
          const gigCheck = await client.execute(`SELECT userId, bandId FROM gigs WHERE id = ?`, [id]);
          const gig = gigCheck.rows?.[0];
          if (!gig) return res.status(404).json({ error: "Gig not found" });
          let canEdit = false;
          if (gig.userId === userId) canEdit = true;
          else if (gig.bandId) {
            const bandMember = await client.execute(`SELECT 1 FROM band_members WHERE bandId = ? AND userId = ? AND status = 'active' LIMIT 1`, [gig.bandId, userId]);
            if (bandMember.rows?.length > 0) canEdit = true;
          }
          if (!canEdit) return res.status(403).json({ error: "Forbidden - insufficient permission to edit gig" });
          await client.execute(`UPDATE gigs SET bandId = COALESCE(?, bandId), date = COALESCE(?, date), venue = COALESCE(?, venue), city = COALESCE(?, city), fee = COALESCE(?, fee), setlistId = COALESCE(?, setlistId), notes = COALESCE(?, notes), updatedAt = ? WHERE id = ?`, [body.bandId ?? null, body.date ?? null, body.venue ?? null, body.city ?? null, body.fee ?? null, body.setlistId ?? null, body.notes ?? null, now, id]);
          res.status(200).json({ id });
          return;
        }
      }
      if (req.method === "DELETE") {
        if (type === "gig") {
          const gigCheck = await client.execute(`SELECT userId, bandId FROM gigs WHERE id = ?`, [id]);
          const gig = gigCheck.rows?.[0];
          if (!gig) return res.status(404).json({ error: "Gig not found" });
          let canDelete = false;
          if (gig.userId === userId) canDelete = true;
          else if (gig.bandId) {
            const bandMember = await client.execute(`SELECT 1 FROM band_members WHERE bandId = ? AND userId = ? AND status = 'active' LIMIT 1`, [gig.bandId, userId]);
            if (bandMember.rows?.length > 0) canDelete = true;
          }
          if (!canDelete) return res.status(403).json({ error: "Forbidden - insufficient permission to delete gig" });
          await client.execute(`DELETE FROM gigs WHERE id = ?`, [id]);
          res.status(204).end();
          return;
        }
      }
      res.setHeader("Allow", "GET, PUT, PATCH, DELETE");
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    if (req.method === "GET") {
      const { bandId } = req.query;
      if (type === "gig") {
        let query = `SELECT g.id, g.bandId, g.date, g.venue, g.city, g.fee, g.setlistId, g.notes, g.createdAt, g.updatedAt, b.name as bandName, s.name as setlistName FROM gigs g LEFT JOIN bands b ON g.bandId = b.id LEFT JOIN setlists s ON g.setlistId = s.id WHERE (g.userId = ? OR g.bandId IN (SELECT bandId FROM band_members WHERE userId = ?))`;
        const params = [userId, userId];
        if (bandId) {
          query += " AND g.bandId = ?";
          params.push(bandId);
        }
        query += " ORDER BY g.date DESC LIMIT 100";
        const result = await client.execute(query, params);
        res.status(200).json(result.rows || []);
        return;
      }
    }
    if (req.method === "POST") {
      const body = await readJson(req);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (type === "gig") {
        const id2 = uuid();
        await client.execute(`INSERT INTO gigs (id, bandId, userId, date, venue, city, fee, setlistId, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id2, body.bandId ?? null, userId, body.date ?? null, body.venue ?? "", body.city ?? "", body.fee ?? null, body.setlistId ?? null, body.notes ?? "", now, now]);
        res.status(201).json({ id: id2 });
        return;
      }
    }
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("API /api/events error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
}
__name(handler7, "handler7");
init_env();
var GEMINI_TEXT_MODELS_SUPPORTED = [
  // Verified via ModelService.ListModels (v1beta) — gemini-2.0-* and gemma-3-*
  // are no longer served for standard API keys and only produce 404s.
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash-lite",
  "gemini-pro-latest",
  "gemini-2.5-pro",
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite"
];
var UNSUPPORTED_GEMINI_MODELS = /* @__PURE__ */ new Set([
  "gemma-3n-e2b-it",
  "gemma-3n-e4b-it"
]);
var GEMINI_FALLBACK_MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.5-pro"
];
function isGeminiProjectDeniedAccess(status, message) {
  if (status !== 403) return false;
  const normalized = (message || "").toString().toLowerCase();
  return normalized.includes("denied access") || normalized.includes("project has been denied access");
}
__name(isGeminiProjectDeniedAccess, "isGeminiProjectDeniedAccess");
function buildGeminiModelCandidates(requestedModel) {
  const unique = [];
  const seen = /* @__PURE__ */ new Set();
  for (const modelName of [requestedModel, ...GEMINI_FALLBACK_MODELS, ...GEMINI_TEXT_MODELS_SUPPORTED]) {
    if (!modelName || seen.has(modelName) || UNSUPPORTED_GEMINI_MODELS.has(modelName)) continue;
    seen.add(modelName);
    unique.push(modelName);
  }
  return unique;
}
__name(buildGeminiModelCandidates, "buildGeminiModelCandidates");
var songInfoCache = {};
var env2 = /* @__PURE__ */ __name((req, name) => getReqEnv(req, name), "env");
async function readMultipart(req) {
  const field = "audio";
  const contentType = req.headers?.["content-type"] || req.headers?.["Content-Type"] || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw new Error("Multipart/form-data expected");
  }
  if (typeof FormData !== "undefined" && globalThis.Request) {
    try {
      const request = req.rawRequest || new Request("http://localhost/", {
        method: "POST",
        headers: { "content-type": contentType },
        body: req.body
      });
      const form = await request.formData();
      const file = form.get(field);
      if (file && typeof file.arrayBuffer === "function") {
        const buffer = Buffer.from(await file.arrayBuffer());
        return {
          buffer,
          mimeType: file.type || "audio/mpeg",
          fileName: file.name || "audio.mp3"
        };
      }
      throw new Error("Audio file required or empty");
    } catch (error3) {
      if (/Audio file required/.test(error3.message)) throw error3;
    }
  }
  const { default: busboy } = await Promise.resolve().then(() => __toESM(require_lib(), 1));
  const bb = busboy({ headers: req.headers });
  let audioBuffer = null;
  let mimeType = "audio/mpeg";
  await new Promise((resolve, reject) => {
    bb.on("file", (fieldname, file, info3) => {
      if (fieldname === field) {
        mimeType = info3.mimeType || "audio/mpeg";
        const chunks = [];
        file.on("data", (chunk) => {
          chunks.push(chunk);
        });
        file.on("end", () => {
          audioBuffer = Buffer.concat(chunks);
        });
        file.on("error", reject);
      } else {
        file.resume();
      }
    });
    bb.on("close", resolve);
    bb.on("error", reject);
    if (Buffer.isBuffer(req.body) || req.body instanceof Uint8Array) {
      bb.end(Buffer.from(req.body));
    } else {
      req.pipe(bb);
    }
  });
  return { buffer: audioBuffer, mimeType };
}
__name(readMultipart, "readMultipart");
async function handleRecommendSetlist(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const body = await readJson(req);
    const genre = (body.genre || "").toString();
    const mood = (body.mood || "").toString();
    const numSongs = parseInt(body.numSongs, 10) || 6;
    const { getTursoClient: getTursoClient2 } = await Promise.resolve().then(() => (init_turso(), turso_exports));
    const client = getTursoClient2();
    let query = "SELECT id, title, artist, genre FROM songs";
    const params = [];
    const filters = [];
    if (genre) {
      filters.push("LOWER(genre) LIKE ?");
      params.push(`%${genre.toLowerCase()}%`);
    }
    if (filters.length > 0) {
      query += " WHERE " + filters.join(" AND ");
    }
    query += " ORDER BY RANDOM() LIMIT ?";
    params.push(numSongs);
    const rows = await client.execute(query, params);
    let songs = (rows.rows || []).map((r) => ({ id: r.id, title: r.title, artist: r.artist, genre: r.genre }));
    if (songs.length < numSongs) {
      const allRows = await client.execute("SELECT id, title, artist, genre FROM songs ORDER BY RANDOM() LIMIT ?", [numSongs]);
      const allSongs = (allRows.rows || []).map((r) => ({ id: r.id, title: r.title, artist: r.artist, genre: r.genre }));
      const seen = new Set(songs.map((s) => s.id));
      for (const s of allSongs) {
        if (!seen.has(s.id) && songs.length < numSongs) {
          songs.push(s);
          seen.add(s.id);
        }
      }
    }
    res.status(200).json({ songs });
  } catch (err) {
    console.error("AI recommend setlist error:", err);
    res.status(500).json({ error: "Gagal mendapatkan rekomendasi setlist", message: err.message });
  }
}
__name(handleRecommendSetlist, "handleRecommendSetlist");
async function handler8(req, res) {
  const url = req.url || "";
  if (url.startsWith("/song-search")) return await handleSongSearch(req, res);
  if (url.startsWith("/popular-songs")) {
    return res.status(404).json({
      error: "Endpoint ini tidak digunakan lagi. Gunakan /api/songs?include=trending untuk data trending YouTube."
    });
  }
  if (url.startsWith("/transcribe")) return await handleTranscribe(req, res);
  if (url.startsWith("/recommend-setlist")) return await handleRecommendSetlist(req, res);
  return await handleChat(req, res);
}
__name(handler8, "handler8");
async function handleChat(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const apiKey = env2(req, "GEMINI_API_KEY");
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY tidak diset" });
    }
    const body = await readJson(req);
    const prompt = (body?.prompt || "").toString();
    const context2 = (body?.context || "").toString();
    const system = (body?.system || "").toString();
    const model = (body?.model || "gemini-2.5-flash").toString();
    if (!prompt.trim() && !context2.trim()) {
      return res.status(400).json({ error: "prompt atau context diperlukan" });
    }
    const contents = [];
    if (system) contents.push({ role: "user", parts: [{ text: `System: ${system}` }] });
    if (context2) contents.push({ role: "user", parts: [{ text: `Context:
${context2}` }] });
    contents.push({ role: "user", parts: [{ text: prompt.trim() }] });
    let finalText = "";
    let lastStatus = 500;
    let lastMessage = "Gemini API gagal";
    const attemptedModels = [];
    for (const candidateModel of buildGeminiModelCandidates(model)) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${apiKey}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      });
      const data = await resp.json();
      if (resp.ok) {
        finalText = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") || "";
        return res.status(200).json({ text: finalText, modelUsed: candidateModel, attemptedModels });
      }
      const message = data?.error?.message || "Gemini API gagal";
      attemptedModels.push({ model: candidateModel, status: resp.status, message });
      lastStatus = resp.status;
      lastMessage = message;
      console.error(`Gemini API error (model: ${candidateModel}):`, data);
      const deniedAccess = isGeminiProjectDeniedAccess(resp.status, message);
      if (!deniedAccess) {
        break;
      }
    }
    return res.status(lastStatus).json({
      error: lastMessage,
      attemptedModels,
      suggestion: "Model yang diminta ditolak untuk project ini. Gunakan model umum seperti gemini-2.5-flash atau aktifkan akses model preview di project Google Cloud."
    });
  } catch (err) {
    console.error("API /api/ai error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
}
__name(handleChat, "handleChat");
var GEMINI_JSON_FORMAT_INSTRUCTIONS = `Berikan informasi dalam format JSON dengan field:
- artist: nama artis/penyanyi
- key: kunci musik (C, D, E, F, G, A, B atau minor variants seperti Cm, Dm, dll) atau null jika tidak diketahui
- tempo: tempo BPM sebagai angka atau null jika tidak diketahui
- genre: genre/style musik (pop, rock, jazz, classical, dll) atau null jika tidak diketahui
- arrangement_style: gaya aransemen (akustik, full band, unplugged, dll)
- keyboard_patch: string penjelasan patch keyboard yang digunakan dan bagaimana patch tersebut dipakai dalam lagu (misal: "EP1 untuk intro dan verse, Pad untuk chorus, Strings untuk bridge") atau null jika tidak diketahui
- lyrics: lirik lagu lengkap (string, jika ada, tanpa penjelasan tambahan)

Hanya return JSON tanpa penjelasan tambahan.`;
function buildSongInfoPrompt(title2, artist) {
  if (!artist) {
    return `Cari informasi lagu berjudul "${title2}". Jika diketahui, berikan juga nama artis/penyanyi. ${GEMINI_JSON_FORMAT_INSTRUCTIONS} Contoh:
{"artist": "John Doe", "key": "G", "tempo": 120, "genre": "pop", "arrangement_style": "full band", "keyboard_patch": "EP1 untuk intro, Pad untuk chorus", "lyrics": "Ini lirik lagu..."}`;
  }
  return `Cari informasi lagu "${title2}" oleh "${artist}". ${GEMINI_JSON_FORMAT_INSTRUCTIONS} Contoh:
{"artist": "${artist}", "key": "G", "tempo": 120, "genre": "pop", "arrangement_style": "akustik", "keyboard_patch": "EP1 untuk intro, Pad untuk chorus", "lyrics": "Ini lirik lagu..."}`;
}
__name(buildSongInfoPrompt, "buildSongInfoPrompt");
function buildChordLinks(title2, artist) {
  const q = encodeURIComponent(`${title2} ${artist || ""}`);
  return [
    { title: "Chordtela", site: "chordtela.com", url: `https://www.chordtela.com/chord-kunci-gitar-dasar-hasil-pencarian?q=${q}` },
    { title: "Ultimate Guitar", site: "ultimate-guitar.com", url: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${q}` },
    { title: "Chordify", site: "chordify.net", url: `https://www.chordify.net/search?q=${q}` },
    { title: "Google Search", site: "google.com", url: `https://www.google.com/search?q=${encodeURIComponent(`${title2} ${artist || ""} chord`)}` }
  ];
}
__name(buildChordLinks, "buildChordLinks");
async function searchYoutube(title2, artist, req) {
  const debug3 = {};
  const youtubeKey = env2(req, "VITE_YOUTUBE_API_KEY") || env2(req, "YOUTUBE_API_KEY");
  if (!youtubeKey) {
    console.warn("Warning: VITE_YOUTUBE_API_KEY not configured");
    debug3.youtubeKeyMissing = true;
    return { youtubeId: null, debug: debug3 };
  }
  try {
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(`${title2} ${artist}`)}&key=${youtubeKey}`;
    const youtubeResponse = await fetch(youtubeUrl, {
      signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(5e3) : void 0
    });
    if (!youtubeResponse.ok) {
      debug3.youtubeStatus = youtubeResponse.status;
      console.error(`YouTube API returned ${youtubeResponse.status}`);
      return { youtubeId: null, debug: debug3 };
    }
    const data = await youtubeResponse.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    return { youtubeId: items.length > 0 ? items[0]?.id?.videoId ?? null : null, debug: debug3 };
  } catch (err) {
    console.error("YouTube search error:", err);
    debug3.youtubeError = err.message;
    return { youtubeId: null, debug: debug3 };
  }
}
__name(searchYoutube, "searchYoutube");
async function fetchSongInfoFromGemini(prompt, req) {
  const { GoogleGenerativeAI: GoogleGenerativeAI2 } = await Promise.resolve().then(() => (init_dist(), dist_exports));
  const genAI = new GoogleGenerativeAI2(env2(req, "GEMINI_API_KEY"));
  const deniedModels = /* @__PURE__ */ new Set();
  let lastError = null;
  for (const modelName of GEMINI_TEXT_MODELS_SUPPORTED) {
    if (deniedModels.has(modelName)) continue;
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        modelName,
        fields: {
          artist: parsed.artist || null,
          key: parsed.key || null,
          tempo: parsed.tempo || null,
          genre: parsed.genre || null,
          arrangementStyle: parsed.arrangement_style || null,
          keyboardPatch: parsed.keyboard_patch || null,
          lyrics: parsed.lyrics || null
        },
        debug: {}
      };
    } catch (err) {
      lastError = err;
      console.error(`Gemini API error (model: ${modelName}):`, err);
      if (isGeminiProjectDeniedAccess(err?.status, err?.message)) {
        deniedModels.add(modelName);
      }
    }
  }
  const message = lastError?.message || "";
  const isQuotaError = Boolean(
    lastError && (lastError.status === 429 || message.includes("429") || message.toLowerCase().includes("quota"))
  );
  return {
    success: false,
    modelName: null,
    fields: {},
    debug: {
      geminiError: isQuotaError ? "Gemini API quota exceeded" : lastError?.message || "Gemini API gagal",
      geminiQuota: isQuotaError
    }
  };
}
__name(fetchSongInfoFromGemini, "fetchSongInfoFromGemini");
async function handleSongSearch(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  let body = {};
  try {
    body = await readJson(req);
  } catch (err) {
    console.error("Body parsing error:", err);
    return res.status(400).json({ error: "Invalid request body" });
  }
  const { title: title2, artist } = body;
  if (!title2) {
    return res.status(400).json({ error: "Title required" });
  }
  const cacheKey = `${title2.toLowerCase()}|${(artist || "").toLowerCase()}`;
  if (songInfoCache[cacheKey]) {
    return res.status(200).json(songInfoCache[cacheKey]);
  }
  try {
    const results = {
      artist: null,
      key: null,
      tempo: null,
      genre: null,
      arrangementStyle: null,
      // new field
      keyboardPatch: null,
      // new field
      youtubeId: null,
      lyrics: null,
      chordLinks: [],
      debug: {}
    };
    const youtube = await searchYoutube(title2, artist, req);
    results.youtubeId = youtube.youtubeId;
    results.debug = { ...results.debug, ...youtube.debug };
    results.chordLinks = buildChordLinks(title2, artist);
    if (env2(req, "GEMINI_API_KEY")) {
      const gemini = await fetchSongInfoFromGemini(buildSongInfoPrompt(title2, artist), req);
      Object.assign(results, gemini.fields);
      results.debug = { ...results.debug, ...gemini.debug };
      if (gemini.success) {
        results.debug.geminiModel = gemini.modelName;
      } else {
        songInfoCache[cacheKey] = results;
        return res.status(200).json(results);
      }
    }
    if (!results.artist) results.artist = artist || null;
    songInfoCache[cacheKey] = results;
    return res.status(200).json(results);
  } catch (error3) {
    console.error("Error in song search:", error3);
    return res.status(500).json({ error: "Failed to search song information", message: error3.message, details: env2(req, "NODE_ENV") === "development" ? error3.stack : void 0 });
  }
}
__name(handleSongSearch, "handleSongSearch");
async function handleTranscribe(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const { buffer: audioBuffer, mimeType } = await readMultipart(req);
    if (!audioBuffer || audioBuffer.length === 0) {
      res.status(400).json({ error: "Audio file required or empty" });
      return;
    }
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const { GoogleGenerativeAI: GoogleGenerativeAI2 } = await Promise.resolve().then(() => (init_dist(), dist_exports));
    const client = new GoogleGenerativeAI2(env2(req, "GEMINI_API_KEY"));
    const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent([
      { inlineData: { mimeType, data: base64Audio } },
      { text: "Transkripsi audio ini menjadi teks lirik lagu. Jika ada bagian yang tidak jelas, gunakan [?]. Format hasil sebagai lirik lagu yang bisa dibaca. Jangan tambahkan keterangan atau penjelasan lain, hanya liriknya saja." }
    ]);
    const transcript = response.response.text();
    res.status(200).json({ success: true, transcript: transcript || "", message: "Transkripsi berhasil" });
  } catch (error3) {
    console.error("Transcription error:", error3);
    res.status(500).json({ error: error3.message || "Gagal transkripsi audio", details: error3.toString() });
  }
}
__name(handleTranscribe, "handleTranscribe");
init_turso();
async function handler9(req, res) {
  if (!verifyToken(req, res)) return;
  const client = getTursoClient();
  if (req.method === "GET") {
    try {
      const [songs, setlists, bands, users] = await Promise.all([
        client.execute("SELECT * FROM songs"),
        client.execute("SELECT * FROM setlists"),
        client.execute("SELECT * FROM bands"),
        client.execute("SELECT * FROM users")
      ]);
      res.status(200).json({
        songs: songs.rows,
        setlists: setlists.rows,
        bands: bands.rows,
        users: users.rows
      });
    } catch (e) {
      res.status(500).json({ error: "Export failed", details: e.message });
    }
    return;
  }
  if (req.method === "POST") {
    const { songs, setlists, bands, users } = req.body;
    if (!songs || !setlists || !bands || !users) {
      res.status(400).json({ error: "Missing data for import" });
      return;
    }
    try {
      await client.execute("DELETE FROM songs");
      await client.execute("DELETE FROM setlists");
      await client.execute("DELETE FROM bands");
      await client.execute("DELETE FROM users");
      const songColumns = [
        "id",
        "title",
        "artist",
        "youtubeId",
        "lyrics",
        "key",
        "tempo",
        "genre",
        "time_markers",
        "time_signature",
        "arrangement_style",
        "keyboard_patch",
        "sheet_music_xml",
        "userId",
        "bandId",
        "createdAt",
        "updatedAt"
      ];
      const jsonColumns = /* @__PURE__ */ new Set(["time_markers"]);
      for (const song of songs) {
        const values = songColumns.map((column) => {
          const value = song[column];
          if (value === void 0) return null;
          if (jsonColumns.has(column)) {
            return typeof value === "string" ? value : JSON.stringify(value ?? []);
          }
          return value;
        });
        await client.execute(
          `INSERT INTO songs (${songColumns.join(", ")}) VALUES (${songColumns.map(() => "?").join(", ")})`,
          values
        );
      }
      for (const setlist of setlists) {
        await client.execute(
          "INSERT INTO setlists (id, name, userId, bandId, songs, setlistSongMeta, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [setlist.id, setlist.name, setlist.userId, setlist.bandId, JSON.stringify(setlist.songs), JSON.stringify(setlist.setlistSongMeta), setlist.createdAt, setlist.updatedAt]
        );
      }
      for (const band of bands) {
        await client.execute(
          "INSERT INTO bands (id, name, ownerId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
          [band.id, band.name, band.ownerId, band.createdAt, band.updatedAt]
        );
      }
      for (const user of users) {
        await client.execute(
          "INSERT INTO users (id, email, name, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
          [user.id, user.email, user.name, user.password, user.createdAt, user.updatedAt]
        );
      }
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Import failed", details: e.message });
    }
    return;
  }
  res.status(405).json({ error: "Method not allowed" });
}
__name(handler9, "handler9");
init_turso();
var MAX_ROWS_PER_TABLE = 1e5;
var ROW_CHUNK_SIZE = 1e3;
function toSqlLiteral(val) {
  if (val === null) return "NULL";
  if (typeof val === "number") return String(val);
  const escaped = String(val).replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\0/g, "\\0");
  return `'${escaped}'`;
}
__name(toSqlLiteral, "toSqlLiteral");
async function handler10(req, res) {
  if (!verifyToken(req, res)) return;
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const client = getTursoClient();
  try {
    const tablesRes = await client.execute(
      `SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    );
    const tables = tablesRes.rows;
    const createTableStmts = tables.map((row) => row.sql).filter(Boolean).map((stmt) => {
      let patched = stmt.replace(/^CREATE TABLE(?! IF NOT EXISTS)/i, "CREATE TABLE IF NOT EXISTS");
      return patched.trim().endsWith(";") ? patched.trim() : patched.trim() + ";";
    });
    const insertStmts = [];
    const truncatedTables = [];
    for (const { name } of tables) {
      let offset = 0;
      let tableRowCount = 0;
      for (; ; ) {
        const rowsRes = await client.execute(
          `SELECT * FROM "${name}" LIMIT ${ROW_CHUNK_SIZE} OFFSET ${offset}`
        );
        const rows = rowsRes.rows || [];
        if (!rows.length) break;
        for (const row of rows) {
          if (tableRowCount >= MAX_ROWS_PER_TABLE) {
            truncatedTables.push(name);
            break;
          }
          const columns = Object.keys(row).map((col) => `"${col.replace(/"/g, '""')}"`).join(", ");
          const values = Object.values(row).map(toSqlLiteral).join(", ");
          insertStmts.push(`INSERT OR REPLACE INTO "${name}" (${columns}) VALUES (${values});`);
          tableRowCount += 1;
        }
        if (tableRowCount >= MAX_ROWS_PER_TABLE || rows.length < ROW_CHUNK_SIZE) break;
        offset += ROW_CHUNK_SIZE;
      }
    }
    const sqlContent = "-- CREATE TABLES --\n" + createTableStmts.join("\n") + "\n\n-- INSERTS --\n" + insertStmts.join("\n") + "\n" + (truncatedTables.length ? `
-- WARNING: backup truncated at ${MAX_ROWS_PER_TABLE} rows for tables: ${truncatedTables.join(", ")} --
` : "");
    res.setHeader("Content-Type", "application/sql");
    res.setHeader("Content-Disposition", 'attachment; filename="backup-' + (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-") + '.sql"');
    res.status(200).send(sqlContent);
  } catch (e) {
    res.status(500).json({ error: "Backup failed", details: e.message });
  }
}
__name(handler10, "handler10");
init_turso();
async function handler11(req, res) {
  console.log("[Restore] req.user:", req.user);
  console.log("[Restore] req.body.sql (first 500 chars):", req.body && req.body.sql ? req.body.sql.slice(0, 500) : req.body);
  const user = req.user;
  if (!user || user.role !== "owner") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { sql } = req.body || {};
  if (!sql || typeof sql !== "string" || !sql.trim()) {
    return res.status(400).json({ error: "File SQL kosong atau tidak valid." });
  }
  const allowed = /^(INSERT|UPDATE|DELETE|CREATE TABLE|DROP TABLE|ALTER TABLE)/i;
  const client = getTursoClient();
  try {
    const statements = sql.split(";").map((s) => s.trim()).filter((s) => s && !s.startsWith("--"));
    if (statements.length === 0) {
      return res.status(400).json({ error: "Tidak ada statement SQL ditemukan." });
    }
    for (const stmt of statements) {
      if (!allowed.test(stmt)) {
        return res.status(400).json({ error: "Statement tidak didukung: " + stmt.slice(0, 40) });
      }
      try {
        await client.execute(stmt);
      } catch (err) {
        return res.status(400).json({ error: "Error pada statement: " + stmt.slice(0, 40) + " - " + (err.message || err) });
      }
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Restore failed" });
  }
}
__name(handler11, "handler11");
init_turso();
async function handler12(req, res) {
  if (!verifyToken(req, res)) return;
  const client = getTursoClient();
  if (req.user.role !== "owner") {
    return res.status(403).json({ error: "Hanya owner yang dapat mengakses daftar users" });
  }
  if (req.method === "GET") {
    try {
      const result = await client.execute(`
        SELECT 
          id, email, username, role, isActive, createdAt, updatedAt
        FROM users 
        WHERE deletedAt IS NULL 
        ORDER BY createdAt DESC
      `);
      const users = result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        username: row.username,
        role: row.role,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }));
      for (let user of users) {
        const bandResult = await client.execute({
          sql: `
            SELECT b.id, b.name, bm.role
            FROM band_members bm
            JOIN bands b ON bm.bandId = b.id
            WHERE bm.userId = ? AND bm.deletedAt IS NULL AND b.deletedAt IS NULL
          `,
          args: [user.id]
        });
        user.bands = bandResult.rows.map((r) => ({
          bandId: r.id,
          bandName: r.name,
          role: r.role
        }));
      }
      res.json({ users });
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ error: "Gagal mengambil daftar users" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
__name(handler12, "handler12");
init_turso();
var randomFallback = null;
function randomBytes(len) {
  try {
    return crypto.getRandomValues(new Uint8Array(len));
  } catch {
  }
  try {
    return nodeCrypto.randomBytes(len);
  } catch {
  }
  if (!randomFallback) {
    throw Error(
      "Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative"
    );
  }
  return randomFallback(len);
}
__name(randomBytes, "randomBytes");
function setRandomFallback(random) {
  randomFallback = random;
}
__name(setRandomFallback, "setRandomFallback");
function genSaltSync(rounds, seed_length) {
  rounds = rounds || GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof rounds !== "number")
    throw Error(
      "Illegal arguments: " + typeof rounds + ", " + typeof seed_length
    );
  if (rounds < 4) rounds = 4;
  else if (rounds > 31) rounds = 31;
  var salt = [];
  salt.push("$2b$");
  if (rounds < 10) salt.push("0");
  salt.push(rounds.toString());
  salt.push("$");
  salt.push(base64_encode(randomBytes(BCRYPT_SALT_LEN), BCRYPT_SALT_LEN));
  return salt.join("");
}
__name(genSaltSync, "genSaltSync");
function genSalt(rounds, seed_length, callback) {
  if (typeof seed_length === "function")
    callback = seed_length, seed_length = void 0;
  if (typeof rounds === "function") callback = rounds, rounds = void 0;
  if (typeof rounds === "undefined") rounds = GENSALT_DEFAULT_LOG2_ROUNDS;
  else if (typeof rounds !== "number")
    throw Error("illegal arguments: " + typeof rounds);
  function _async(callback2) {
    nextTick2(function() {
      try {
        callback2(null, genSaltSync(rounds));
      } catch (err) {
        callback2(err);
      }
    });
  }
  __name(_async, "_async");
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
__name(genSalt, "genSalt");
function hashSync(password, salt) {
  if (typeof salt === "undefined") salt = GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof salt === "number") salt = genSaltSync(salt);
  if (typeof password !== "string" || typeof salt !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof salt);
  return _hash(password, salt);
}
__name(hashSync, "hashSync");
function hash(password, salt, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password === "string" && typeof salt === "number")
      genSalt(salt, function(err, salt2) {
        _hash(password, salt2, callback2, progressCallback);
      });
    else if (typeof password === "string" && typeof salt === "string")
      _hash(password, salt, callback2, progressCallback);
    else
      nextTick2(
        callback2.bind(
          this,
          Error("Illegal arguments: " + typeof password + ", " + typeof salt)
        )
      );
  }
  __name(_async, "_async");
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
__name(hash, "hash");
function safeStringCompare(known, unknown) {
  var diff = known.length ^ unknown.length;
  for (var i = 0; i < known.length; ++i) {
    diff |= known.charCodeAt(i) ^ unknown.charCodeAt(i);
  }
  return diff === 0;
}
__name(safeStringCompare, "safeStringCompare");
function compareSync(password, hash2) {
  if (typeof password !== "string" || typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof hash2);
  if (hash2.length !== 60) return false;
  return safeStringCompare(
    hashSync(password, hash2.substring(0, hash2.length - 31)),
    hash2
  );
}
__name(compareSync, "compareSync");
function compare(password, hashValue, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password !== "string" || typeof hashValue !== "string") {
      nextTick2(
        callback2.bind(
          this,
          Error(
            "Illegal arguments: " + typeof password + ", " + typeof hashValue
          )
        )
      );
      return;
    }
    if (hashValue.length !== 60) {
      nextTick2(callback2.bind(this, null, false));
      return;
    }
    hash(
      password,
      hashValue.substring(0, 29),
      function(err, comp) {
        if (err) callback2(err);
        else callback2(null, safeStringCompare(comp, hashValue));
      },
      progressCallback
    );
  }
  __name(_async, "_async");
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
__name(compare, "compare");
function getRounds(hash2) {
  if (typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof hash2);
  return parseInt(hash2.split("$")[2], 10);
}
__name(getRounds, "getRounds");
function getSalt(hash2) {
  if (typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof hash2);
  if (hash2.length !== 60)
    throw Error("Illegal hash length: " + hash2.length + " != 60");
  return hash2.substring(0, 29);
}
__name(getSalt, "getSalt");
function truncates(password) {
  if (typeof password !== "string")
    throw Error("Illegal arguments: " + typeof password);
  return utf8Length(password) > 72;
}
__name(truncates, "truncates");
var nextTick2 = typeof setImmediate === "function" ? setImmediate : typeof scheduler === "object" && typeof scheduler.postTask === "function" ? scheduler.postTask.bind(scheduler) : setTimeout;
function utf8Length(string2) {
  var len = 0, c = 0;
  for (var i = 0; i < string2.length; ++i) {
    c = string2.charCodeAt(i);
    if (c < 128) len += 1;
    else if (c < 2048) len += 2;
    else if ((c & 64512) === 55296 && (string2.charCodeAt(i + 1) & 64512) === 56320) {
      ++i;
      len += 4;
    } else len += 3;
  }
  return len;
}
__name(utf8Length, "utf8Length");
function utf8Array(string2) {
  var offset = 0, c1, c2;
  var buffer = new Array(utf8Length(string2));
  for (var i = 0, k = string2.length; i < k; ++i) {
    c1 = string2.charCodeAt(i);
    if (c1 < 128) {
      buffer[offset++] = c1;
    } else if (c1 < 2048) {
      buffer[offset++] = c1 >> 6 | 192;
      buffer[offset++] = c1 & 63 | 128;
    } else if ((c1 & 64512) === 55296 && ((c2 = string2.charCodeAt(i + 1)) & 64512) === 56320) {
      c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
      ++i;
      buffer[offset++] = c1 >> 18 | 240;
      buffer[offset++] = c1 >> 12 & 63 | 128;
      buffer[offset++] = c1 >> 6 & 63 | 128;
      buffer[offset++] = c1 & 63 | 128;
    } else {
      buffer[offset++] = c1 >> 12 | 224;
      buffer[offset++] = c1 >> 6 & 63 | 128;
      buffer[offset++] = c1 & 63 | 128;
    }
  }
  return buffer;
}
__name(utf8Array, "utf8Array");
var BASE64_CODE = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
var BASE64_INDEX = [
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  0,
  1,
  54,
  55,
  56,
  57,
  58,
  59,
  60,
  61,
  62,
  63,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  28,
  29,
  30,
  31,
  32,
  33,
  34,
  35,
  36,
  37,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  46,
  47,
  48,
  49,
  50,
  51,
  52,
  53,
  -1,
  -1,
  -1,
  -1,
  -1
];
function base64_encode(b, len) {
  var off2 = 0, rs = [], c1, c2;
  if (len <= 0 || len > b.length) throw Error("Illegal len: " + len);
  while (off2 < len) {
    c1 = b[off2++] & 255;
    rs.push(BASE64_CODE[c1 >> 2 & 63]);
    c1 = (c1 & 3) << 4;
    if (off2 >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b[off2++] & 255;
    c1 |= c2 >> 4 & 15;
    rs.push(BASE64_CODE[c1 & 63]);
    c1 = (c2 & 15) << 2;
    if (off2 >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b[off2++] & 255;
    c1 |= c2 >> 6 & 3;
    rs.push(BASE64_CODE[c1 & 63]);
    rs.push(BASE64_CODE[c2 & 63]);
  }
  return rs.join("");
}
__name(base64_encode, "base64_encode");
function base64_decode(s, len) {
  var off2 = 0, slen = s.length, olen = 0, rs = [], c1, c2, c3, c4, o, code;
  if (len <= 0) throw Error("Illegal len: " + len);
  while (off2 < slen - 1 && olen < len) {
    code = s.charCodeAt(off2++);
    c1 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    code = s.charCodeAt(off2++);
    c2 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c1 == -1 || c2 == -1) break;
    o = c1 << 2 >>> 0;
    o |= (c2 & 48) >> 4;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off2 >= slen) break;
    code = s.charCodeAt(off2++);
    c3 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c3 == -1) break;
    o = (c2 & 15) << 4 >>> 0;
    o |= (c3 & 60) >> 2;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off2 >= slen) break;
    code = s.charCodeAt(off2++);
    c4 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    o = (c3 & 3) << 6 >>> 0;
    o |= c4;
    rs.push(String.fromCharCode(o));
    ++olen;
  }
  var res = [];
  for (off2 = 0; off2 < olen; off2++) res.push(rs[off2].charCodeAt(0));
  return res;
}
__name(base64_decode, "base64_decode");
var BCRYPT_SALT_LEN = 16;
var GENSALT_DEFAULT_LOG2_ROUNDS = 10;
var BLOWFISH_NUM_ROUNDS = 16;
var MAX_EXECUTION_TIME = 100;
var P_ORIG = [
  608135816,
  2242054355,
  320440878,
  57701188,
  2752067618,
  698298832,
  137296536,
  3964562569,
  1160258022,
  953160567,
  3193202383,
  887688300,
  3232508343,
  3380367581,
  1065670069,
  3041331479,
  2450970073,
  2306472731
];
var S_ORIG = [
  3509652390,
  2564797868,
  805139163,
  3491422135,
  3101798381,
  1780907670,
  3128725573,
  4046225305,
  614570311,
  3012652279,
  134345442,
  2240740374,
  1667834072,
  1901547113,
  2757295779,
  4103290238,
  227898511,
  1921955416,
  1904987480,
  2182433518,
  2069144605,
  3260701109,
  2620446009,
  720527379,
  3318853667,
  677414384,
  3393288472,
  3101374703,
  2390351024,
  1614419982,
  1822297739,
  2954791486,
  3608508353,
  3174124327,
  2024746970,
  1432378464,
  3864339955,
  2857741204,
  1464375394,
  1676153920,
  1439316330,
  715854006,
  3033291828,
  289532110,
  2706671279,
  2087905683,
  3018724369,
  1668267050,
  732546397,
  1947742710,
  3462151702,
  2609353502,
  2950085171,
  1814351708,
  2050118529,
  680887927,
  999245976,
  1800124847,
  3300911131,
  1713906067,
  1641548236,
  4213287313,
  1216130144,
  1575780402,
  4018429277,
  3917837745,
  3693486850,
  3949271944,
  596196993,
  3549867205,
  258830323,
  2213823033,
  772490370,
  2760122372,
  1774776394,
  2652871518,
  566650946,
  4142492826,
  1728879713,
  2882767088,
  1783734482,
  3629395816,
  2517608232,
  2874225571,
  1861159788,
  326777828,
  3124490320,
  2130389656,
  2716951837,
  967770486,
  1724537150,
  2185432712,
  2364442137,
  1164943284,
  2105845187,
  998989502,
  3765401048,
  2244026483,
  1075463327,
  1455516326,
  1322494562,
  910128902,
  469688178,
  1117454909,
  936433444,
  3490320968,
  3675253459,
  1240580251,
  122909385,
  2157517691,
  634681816,
  4142456567,
  3825094682,
  3061402683,
  2540495037,
  79693498,
  3249098678,
  1084186820,
  1583128258,
  426386531,
  1761308591,
  1047286709,
  322548459,
  995290223,
  1845252383,
  2603652396,
  3431023940,
  2942221577,
  3202600964,
  3727903485,
  1712269319,
  422464435,
  3234572375,
  1170764815,
  3523960633,
  3117677531,
  1434042557,
  442511882,
  3600875718,
  1076654713,
  1738483198,
  4213154764,
  2393238008,
  3677496056,
  1014306527,
  4251020053,
  793779912,
  2902807211,
  842905082,
  4246964064,
  1395751752,
  1040244610,
  2656851899,
  3396308128,
  445077038,
  3742853595,
  3577915638,
  679411651,
  2892444358,
  2354009459,
  1767581616,
  3150600392,
  3791627101,
  3102740896,
  284835224,
  4246832056,
  1258075500,
  768725851,
  2589189241,
  3069724005,
  3532540348,
  1274779536,
  3789419226,
  2764799539,
  1660621633,
  3471099624,
  4011903706,
  913787905,
  3497959166,
  737222580,
  2514213453,
  2928710040,
  3937242737,
  1804850592,
  3499020752,
  2949064160,
  2386320175,
  2390070455,
  2415321851,
  4061277028,
  2290661394,
  2416832540,
  1336762016,
  1754252060,
  3520065937,
  3014181293,
  791618072,
  3188594551,
  3933548030,
  2332172193,
  3852520463,
  3043980520,
  413987798,
  3465142937,
  3030929376,
  4245938359,
  2093235073,
  3534596313,
  375366246,
  2157278981,
  2479649556,
  555357303,
  3870105701,
  2008414854,
  3344188149,
  4221384143,
  3956125452,
  2067696032,
  3594591187,
  2921233993,
  2428461,
  544322398,
  577241275,
  1471733935,
  610547355,
  4027169054,
  1432588573,
  1507829418,
  2025931657,
  3646575487,
  545086370,
  48609733,
  2200306550,
  1653985193,
  298326376,
  1316178497,
  3007786442,
  2064951626,
  458293330,
  2589141269,
  3591329599,
  3164325604,
  727753846,
  2179363840,
  146436021,
  1461446943,
  4069977195,
  705550613,
  3059967265,
  3887724982,
  4281599278,
  3313849956,
  1404054877,
  2845806497,
  146425753,
  1854211946,
  1266315497,
  3048417604,
  3681880366,
  3289982499,
  290971e4,
  1235738493,
  2632868024,
  2414719590,
  3970600049,
  1771706367,
  1449415276,
  3266420449,
  422970021,
  1963543593,
  2690192192,
  3826793022,
  1062508698,
  1531092325,
  1804592342,
  2583117782,
  2714934279,
  4024971509,
  1294809318,
  4028980673,
  1289560198,
  2221992742,
  1669523910,
  35572830,
  157838143,
  1052438473,
  1016535060,
  1802137761,
  1753167236,
  1386275462,
  3080475397,
  2857371447,
  1040679964,
  2145300060,
  2390574316,
  1461121720,
  2956646967,
  4031777805,
  4028374788,
  33600511,
  2920084762,
  1018524850,
  629373528,
  3691585981,
  3515945977,
  2091462646,
  2486323059,
  586499841,
  988145025,
  935516892,
  3367335476,
  2599673255,
  2839830854,
  265290510,
  3972581182,
  2759138881,
  3795373465,
  1005194799,
  847297441,
  406762289,
  1314163512,
  1332590856,
  1866599683,
  4127851711,
  750260880,
  613907577,
  1450815602,
  3165620655,
  3734664991,
  3650291728,
  3012275730,
  3704569646,
  1427272223,
  778793252,
  1343938022,
  2676280711,
  2052605720,
  1946737175,
  3164576444,
  3914038668,
  3967478842,
  3682934266,
  1661551462,
  3294938066,
  4011595847,
  840292616,
  3712170807,
  616741398,
  312560963,
  711312465,
  1351876610,
  322626781,
  1910503582,
  271666773,
  2175563734,
  1594956187,
  70604529,
  3617834859,
  1007753275,
  1495573769,
  4069517037,
  2549218298,
  2663038764,
  504708206,
  2263041392,
  3941167025,
  2249088522,
  1514023603,
  1998579484,
  1312622330,
  694541497,
  2582060303,
  2151582166,
  1382467621,
  776784248,
  2618340202,
  3323268794,
  2497899128,
  2784771155,
  503983604,
  4076293799,
  907881277,
  423175695,
  432175456,
  1378068232,
  4145222326,
  3954048622,
  3938656102,
  3820766613,
  2793130115,
  2977904593,
  26017576,
  3274890735,
  3194772133,
  1700274565,
  1756076034,
  4006520079,
  3677328699,
  720338349,
  1533947780,
  354530856,
  688349552,
  3973924725,
  1637815568,
  332179504,
  3949051286,
  53804574,
  2852348879,
  3044236432,
  1282449977,
  3583942155,
  3416972820,
  4006381244,
  1617046695,
  2628476075,
  3002303598,
  1686838959,
  431878346,
  2686675385,
  1700445008,
  1080580658,
  1009431731,
  832498133,
  3223435511,
  2605976345,
  2271191193,
  2516031870,
  1648197032,
  4164389018,
  2548247927,
  300782431,
  375919233,
  238389289,
  3353747414,
  2531188641,
  2019080857,
  1475708069,
  455242339,
  2609103871,
  448939670,
  3451063019,
  1395535956,
  2413381860,
  1841049896,
  1491858159,
  885456874,
  4264095073,
  4001119347,
  1565136089,
  3898914787,
  1108368660,
  540939232,
  1173283510,
  2745871338,
  3681308437,
  4207628240,
  3343053890,
  4016749493,
  1699691293,
  1103962373,
  3625875870,
  2256883143,
  3830138730,
  1031889488,
  3479347698,
  1535977030,
  4236805024,
  3251091107,
  2132092099,
  1774941330,
  1199868427,
  1452454533,
  157007616,
  2904115357,
  342012276,
  595725824,
  1480756522,
  206960106,
  497939518,
  591360097,
  863170706,
  2375253569,
  3596610801,
  1814182875,
  2094937945,
  3421402208,
  1082520231,
  3463918190,
  2785509508,
  435703966,
  3908032597,
  1641649973,
  2842273706,
  3305899714,
  1510255612,
  2148256476,
  2655287854,
  3276092548,
  4258621189,
  236887753,
  3681803219,
  274041037,
  1734335097,
  3815195456,
  3317970021,
  1899903192,
  1026095262,
  4050517792,
  356393447,
  2410691914,
  3873677099,
  3682840055,
  3913112168,
  2491498743,
  4132185628,
  2489919796,
  1091903735,
  1979897079,
  3170134830,
  3567386728,
  3557303409,
  857797738,
  1136121015,
  1342202287,
  507115054,
  2535736646,
  337727348,
  3213592640,
  1301675037,
  2528481711,
  1895095763,
  1721773893,
  3216771564,
  62756741,
  2142006736,
  835421444,
  2531993523,
  1442658625,
  3659876326,
  2882144922,
  676362277,
  1392781812,
  170690266,
  3921047035,
  1759253602,
  3611846912,
  1745797284,
  664899054,
  1329594018,
  3901205900,
  3045908486,
  2062866102,
  2865634940,
  3543621612,
  3464012697,
  1080764994,
  553557557,
  3656615353,
  3996768171,
  991055499,
  499776247,
  1265440854,
  648242737,
  3940784050,
  980351604,
  3713745714,
  1749149687,
  3396870395,
  4211799374,
  3640570775,
  1161844396,
  3125318951,
  1431517754,
  545492359,
  4268468663,
  3499529547,
  1437099964,
  2702547544,
  3433638243,
  2581715763,
  2787789398,
  1060185593,
  1593081372,
  2418618748,
  4260947970,
  69676912,
  2159744348,
  86519011,
  2512459080,
  3838209314,
  1220612927,
  3339683548,
  133810670,
  1090789135,
  1078426020,
  1569222167,
  845107691,
  3583754449,
  4072456591,
  1091646820,
  628848692,
  1613405280,
  3757631651,
  526609435,
  236106946,
  48312990,
  2942717905,
  3402727701,
  1797494240,
  859738849,
  992217954,
  4005476642,
  2243076622,
  3870952857,
  3732016268,
  765654824,
  3490871365,
  2511836413,
  1685915746,
  3888969200,
  1414112111,
  2273134842,
  3281911079,
  4080962846,
  172450625,
  2569994100,
  980381355,
  4109958455,
  2819808352,
  2716589560,
  2568741196,
  3681446669,
  3329971472,
  1835478071,
  660984891,
  3704678404,
  4045999559,
  3422617507,
  3040415634,
  1762651403,
  1719377915,
  3470491036,
  2693910283,
  3642056355,
  3138596744,
  1364962596,
  2073328063,
  1983633131,
  926494387,
  3423689081,
  2150032023,
  4096667949,
  1749200295,
  3328846651,
  309677260,
  2016342300,
  1779581495,
  3079819751,
  111262694,
  1274766160,
  443224088,
  298511866,
  1025883608,
  3806446537,
  1145181785,
  168956806,
  3641502830,
  3584813610,
  1689216846,
  3666258015,
  3200248200,
  1692713982,
  2646376535,
  4042768518,
  1618508792,
  1610833997,
  3523052358,
  4130873264,
  2001055236,
  3610705100,
  2202168115,
  4028541809,
  2961195399,
  1006657119,
  2006996926,
  3186142756,
  1430667929,
  3210227297,
  1314452623,
  4074634658,
  4101304120,
  2273951170,
  1399257539,
  3367210612,
  3027628629,
  1190975929,
  2062231137,
  2333990788,
  2221543033,
  2438960610,
  1181637006,
  548689776,
  2362791313,
  3372408396,
  3104550113,
  3145860560,
  296247880,
  1970579870,
  3078560182,
  3769228297,
  1714227617,
  3291629107,
  3898220290,
  166772364,
  1251581989,
  493813264,
  448347421,
  195405023,
  2709975567,
  677966185,
  3703036547,
  1463355134,
  2715995803,
  1338867538,
  1343315457,
  2802222074,
  2684532164,
  233230375,
  2599980071,
  2000651841,
  3277868038,
  1638401717,
  4028070440,
  3237316320,
  6314154,
  819756386,
  300326615,
  590932579,
  1405279636,
  3267499572,
  3150704214,
  2428286686,
  3959192993,
  3461946742,
  1862657033,
  1266418056,
  963775037,
  2089974820,
  2263052895,
  1917689273,
  448879540,
  3550394620,
  3981727096,
  150775221,
  3627908307,
  1303187396,
  508620638,
  2975983352,
  2726630617,
  1817252668,
  1876281319,
  1457606340,
  908771278,
  3720792119,
  3617206836,
  2455994898,
  1729034894,
  1080033504,
  976866871,
  3556439503,
  2881648439,
  1522871579,
  1555064734,
  1336096578,
  3548522304,
  2579274686,
  3574697629,
  3205460757,
  3593280638,
  3338716283,
  3079412587,
  564236357,
  2993598910,
  1781952180,
  1464380207,
  3163844217,
  3332601554,
  1699332808,
  1393555694,
  1183702653,
  3581086237,
  1288719814,
  691649499,
  2847557200,
  2895455976,
  3193889540,
  2717570544,
  1781354906,
  1676643554,
  2592534050,
  3230253752,
  1126444790,
  2770207658,
  2633158820,
  2210423226,
  2615765581,
  2414155088,
  3127139286,
  673620729,
  2805611233,
  1269405062,
  4015350505,
  3341807571,
  4149409754,
  1057255273,
  2012875353,
  2162469141,
  2276492801,
  2601117357,
  993977747,
  3918593370,
  2654263191,
  753973209,
  36408145,
  2530585658,
  25011837,
  3520020182,
  2088578344,
  530523599,
  2918365339,
  1524020338,
  1518925132,
  3760827505,
  3759777254,
  1202760957,
  3985898139,
  3906192525,
  674977740,
  4174734889,
  2031300136,
  2019492241,
  3983892565,
  4153806404,
  3822280332,
  352677332,
  2297720250,
  60907813,
  90501309,
  3286998549,
  1016092578,
  2535922412,
  2839152426,
  457141659,
  509813237,
  4120667899,
  652014361,
  1966332200,
  2975202805,
  55981186,
  2327461051,
  676427537,
  3255491064,
  2882294119,
  3433927263,
  1307055953,
  942726286,
  933058658,
  2468411793,
  3933900994,
  4215176142,
  1361170020,
  2001714738,
  2830558078,
  3274259782,
  1222529897,
  1679025792,
  2729314320,
  3714953764,
  1770335741,
  151462246,
  3013232138,
  1682292957,
  1483529935,
  471910574,
  1539241949,
  458788160,
  3436315007,
  1807016891,
  3718408830,
  978976581,
  1043663428,
  3165965781,
  1927990952,
  4200891579,
  2372276910,
  3208408903,
  3533431907,
  1412390302,
  2931980059,
  4132332400,
  1947078029,
  3881505623,
  4168226417,
  2941484381,
  1077988104,
  1320477388,
  886195818,
  18198404,
  3786409e3,
  2509781533,
  112762804,
  3463356488,
  1866414978,
  891333506,
  18488651,
  661792760,
  1628790961,
  3885187036,
  3141171499,
  876946877,
  2693282273,
  1372485963,
  791857591,
  2686433993,
  3759982718,
  3167212022,
  3472953795,
  2716379847,
  445679433,
  3561995674,
  3504004811,
  3574258232,
  54117162,
  3331405415,
  2381918588,
  3769707343,
  4154350007,
  1140177722,
  4074052095,
  668550556,
  3214352940,
  367459370,
  261225585,
  2610173221,
  4209349473,
  3468074219,
  3265815641,
  314222801,
  3066103646,
  3808782860,
  282218597,
  3406013506,
  3773591054,
  379116347,
  1285071038,
  846784868,
  2669647154,
  3771962079,
  3550491691,
  2305946142,
  453669953,
  1268987020,
  3317592352,
  3279303384,
  3744833421,
  2610507566,
  3859509063,
  266596637,
  3847019092,
  517658769,
  3462560207,
  3443424879,
  370717030,
  4247526661,
  2224018117,
  4143653529,
  4112773975,
  2788324899,
  2477274417,
  1456262402,
  2901442914,
  1517677493,
  1846949527,
  2295493580,
  3734397586,
  2176403920,
  1280348187,
  1908823572,
  3871786941,
  846861322,
  1172426758,
  3287448474,
  3383383037,
  1655181056,
  3139813346,
  901632758,
  1897031941,
  2986607138,
  3066810236,
  3447102507,
  1393639104,
  373351379,
  950779232,
  625454576,
  3124240540,
  4148612726,
  2007998917,
  544563296,
  2244738638,
  2330496472,
  2058025392,
  1291430526,
  424198748,
  50039436,
  29584100,
  3605783033,
  2429876329,
  2791104160,
  1057563949,
  3255363231,
  3075367218,
  3463963227,
  1469046755,
  985887462
];
var C_ORIG = [
  1332899944,
  1700884034,
  1701343084,
  1684370003,
  1668446532,
  1869963892
];
function _encipher(lr, off2, P, S) {
  var n, l = lr[off2], r = lr[off2 + 1];
  l ^= P[0];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[1];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[2];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[3];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[4];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[5];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[6];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[7];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[8];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[9];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[10];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[11];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[12];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[13];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[14];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[15];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[16];
  lr[off2] = r ^ P[BLOWFISH_NUM_ROUNDS + 1];
  lr[off2 + 1] = l;
  return lr;
}
__name(_encipher, "_encipher");
function _streamtoword(data, offp) {
  for (var i = 0, word = 0; i < 4; ++i)
    word = word << 8 | data[offp] & 255, offp = (offp + 1) % data.length;
  return { key: word, offp };
}
__name(_streamtoword, "_streamtoword");
function _key(key, P, S) {
  var offset = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
  for (var i = 0; i < plen; i++)
    sw = _streamtoword(key, offset), offset = sw.offp, P[i] = P[i] ^ sw.key;
  for (i = 0; i < plen; i += 2)
    lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
  for (i = 0; i < slen; i += 2)
    lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
}
__name(_key, "_key");
function _ekskey(data, key, P, S) {
  var offp = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
  for (var i = 0; i < plen; i++)
    sw = _streamtoword(key, offp), offp = sw.offp, P[i] = P[i] ^ sw.key;
  offp = 0;
  for (i = 0; i < plen; i += 2)
    sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
  for (i = 0; i < slen; i += 2)
    sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
}
__name(_ekskey, "_ekskey");
function _crypt(b, salt, rounds, callback, progressCallback) {
  var cdata = C_ORIG.slice(), clen = cdata.length, err;
  if (rounds < 4 || rounds > 31) {
    err = Error("Illegal number of rounds (4-31): " + rounds);
    if (callback) {
      nextTick2(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.length !== BCRYPT_SALT_LEN) {
    err = Error(
      "Illegal salt length: " + salt.length + " != " + BCRYPT_SALT_LEN
    );
    if (callback) {
      nextTick2(callback.bind(this, err));
      return;
    } else throw err;
  }
  rounds = 1 << rounds >>> 0;
  var P, S, i = 0, j;
  if (typeof Int32Array === "function") {
    P = new Int32Array(P_ORIG);
    S = new Int32Array(S_ORIG);
  } else {
    P = P_ORIG.slice();
    S = S_ORIG.slice();
  }
  _ekskey(salt, b, P, S);
  function next() {
    if (progressCallback) progressCallback(i / rounds);
    if (i < rounds) {
      var start = Date.now();
      for (; i < rounds; ) {
        i = i + 1;
        _key(b, P, S);
        _key(salt, P, S);
        if (Date.now() - start > MAX_EXECUTION_TIME) break;
      }
    } else {
      for (i = 0; i < 64; i++)
        for (j = 0; j < clen >> 1; j++) _encipher(cdata, j << 1, P, S);
      var ret = [];
      for (i = 0; i < clen; i++)
        ret.push((cdata[i] >> 24 & 255) >>> 0), ret.push((cdata[i] >> 16 & 255) >>> 0), ret.push((cdata[i] >> 8 & 255) >>> 0), ret.push((cdata[i] & 255) >>> 0);
      if (callback) {
        callback(null, ret);
        return;
      } else return ret;
    }
    if (callback) nextTick2(next);
  }
  __name(next, "next");
  if (typeof callback !== "undefined") {
    next();
  } else {
    var res;
    while (true) if (typeof (res = next()) !== "undefined") return res || [];
  }
}
__name(_crypt, "_crypt");
function _hash(password, salt, callback, progressCallback) {
  var err;
  if (typeof password !== "string" || typeof salt !== "string") {
    err = Error("Invalid string / salt: Not a string");
    if (callback) {
      nextTick2(callback.bind(this, err));
      return;
    } else throw err;
  }
  var minor, offset;
  if (salt.charAt(0) !== "$" || salt.charAt(1) !== "2") {
    err = Error("Invalid salt version: " + salt.substring(0, 2));
    if (callback) {
      nextTick2(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.charAt(2) === "$") minor = String.fromCharCode(0), offset = 3;
  else {
    minor = salt.charAt(2);
    if (minor !== "a" && minor !== "b" && minor !== "y" || salt.charAt(3) !== "$") {
      err = Error("Invalid salt revision: " + salt.substring(2, 4));
      if (callback) {
        nextTick2(callback.bind(this, err));
        return;
      } else throw err;
    }
    offset = 4;
  }
  if (salt.charAt(offset + 2) > "$") {
    err = Error("Missing salt rounds");
    if (callback) {
      nextTick2(callback.bind(this, err));
      return;
    } else throw err;
  }
  var r1 = parseInt(salt.substring(offset, offset + 1), 10) * 10, r2 = parseInt(salt.substring(offset + 1, offset + 2), 10), rounds = r1 + r2, real_salt = salt.substring(offset + 3, offset + 25);
  password += minor >= "a" ? "\0" : "";
  var passwordb = utf8Array(password), saltb = base64_decode(real_salt, BCRYPT_SALT_LEN);
  function finish(bytes) {
    var res = [];
    res.push("$2");
    if (minor >= "a") res.push(minor);
    res.push("$");
    if (rounds < 10) res.push("0");
    res.push(rounds.toString());
    res.push("$");
    res.push(base64_encode(saltb, saltb.length));
    res.push(base64_encode(bytes, C_ORIG.length * 4 - 1));
    return res.join("");
  }
  __name(finish, "finish");
  if (typeof callback == "undefined")
    return finish(_crypt(passwordb, saltb, rounds));
  else {
    _crypt(
      passwordb,
      saltb,
      rounds,
      function(err2, bytes) {
        if (err2) callback(err2, null);
        else callback(null, finish(bytes));
      },
      progressCallback
    );
  }
}
__name(_hash, "_hash");
function encodeBase64(bytes, length) {
  return base64_encode(bytes, length);
}
__name(encodeBase64, "encodeBase64");
function decodeBase64(string2, length) {
  return base64_decode(string2, length);
}
__name(decodeBase64, "decodeBase64");
var bcryptjs_default = {
  setRandomFallback,
  genSaltSync,
  genSalt,
  hashSync,
  hash,
  compareSync,
  compare,
  getRounds,
  getSalt,
  truncates,
  encodeBase64,
  decodeBase64
};
async function handler13(req, res) {
  if (!verifyToken(req, res)) return;
  const client = getTursoClient();
  const userId = req.query.id || req.params.id;
  if (req.user.role !== "owner") {
    return res.status(403).json({ error: "Hanya owner yang dapat mengelola users" });
  }
  if (req.method === "GET") {
    try {
      const result = await client.execute({
        sql: "SELECT id, email, username, role, isActive, createdAt, updatedAt FROM users WHERE id = ? AND deletedAt IS NULL",
        args: [userId]
      });
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User tidak ditemukan" });
      }
      const user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        username: result.rows[0].username,
        role: result.rows[0].role,
        isActive: result.rows[0].isActive,
        createdAt: result.rows[0].createdAt,
        updatedAt: result.rows[0].updatedAt
      };
      const bandResult = await client.execute({
        sql: `
          SELECT b.id, b.name, bm.role, bm.status
          FROM band_members bm
          JOIN bands b ON bm.bandId = b.id
          WHERE bm.userId = ? AND bm.deletedAt IS NULL AND b.deletedAt IS NULL
        `,
        args: [userId]
      });
      user.bands = bandResult.rows.map((r) => ({
        bandId: r.id,
        bandName: r.name,
        role: r.role,
        status: r.status
      }));
      res.json({ user });
    } catch (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ error: "Gagal mengambil data user" });
    }
  } else if (req.method === "PUT") {
    try {
      const { role, isActive } = req.body;
      if (role && !["owner", "admin", "member"].includes(role)) {
        return res.status(400).json({ error: "Role tidak valid" });
      }
      if (isActive !== void 0 && typeof isActive !== "number") {
        return res.status(400).json({ error: "isActive harus berupa number (0 atau 1)" });
      }
      const checkUser = await client.execute({
        sql: "SELECT id, role FROM users WHERE id = ? AND deletedAt IS NULL",
        args: [userId]
      });
      if (checkUser.rows.length === 0) {
        return res.status(404).json({ error: "User tidak ditemukan" });
      }
      if (userId === req.user.userId && role && role !== checkUser.rows[0].role) {
        return res.status(400).json({ error: "Tidak dapat mengubah role sendiri" });
      }
      let updates = [];
      let args = [];
      if (role) {
        updates.push("role = ?");
        args.push(role);
      }
      if (isActive !== void 0) {
        updates.push("isActive = ?");
        args.push(isActive);
      }
      if (updates.length > 0) {
        updates.push("updatedAt = datetime('now')");
        args.push(userId);
        await client.execute({
          sql: `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
          args
        });
      }
      res.json({ success: true, message: "User berhasil diupdate" });
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ error: "Gagal mengupdate user" });
    }
  } else if (req.method === "DELETE") {
    try {
      const checkUser = await client.execute({
        sql: "SELECT id FROM users WHERE id = ? AND deletedAt IS NULL",
        args: [userId]
      });
      if (checkUser.rows.length === 0) {
        return res.status(404).json({ error: "User tidak ditemukan" });
      }
      if (userId === req.user.userId) {
        return res.status(400).json({ error: "Tidak dapat menghapus akun sendiri" });
      }
      await client.execute({
        sql: "UPDATE users SET deletedAt = datetime('now') WHERE id = ?",
        args: [userId]
      });
      res.json({ success: true, message: "User berhasil dihapus" });
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ error: "Gagal menghapus user" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
__name(handler13, "handler13");
init_turso();
async function handler14(req, res) {
  if (!verifyToken(req, res)) return;
  const client = getTursoClient();
  const userId = req.query.id || req.params.id;
  if (req.user.role !== "owner") {
    return res.status(403).json({ error: "Hanya owner yang dapat reset password user" });
  }
  if (req.method === "POST") {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password baru minimal 6 karakter" });
      }
      const checkUser = await client.execute({
        sql: "SELECT id, email FROM users WHERE id = ? AND deletedAt IS NULL",
        args: [userId]
      });
      if (checkUser.rows.length === 0) {
        return res.status(404).json({ error: "User tidak ditemukan" });
      }
      const salt = await bcryptjs_default.genSalt(10);
      const passwordHash = await bcryptjs_default.hash(newPassword, salt);
      await client.execute({
        sql: "UPDATE users SET passwordHash = ?, updatedAt = datetime('now') WHERE id = ?",
        args: [passwordHash, userId]
      });
      res.json({
        success: true,
        message: `Password untuk ${checkUser.rows[0].email} berhasil direset`
      });
    } catch (err) {
      console.error("Error resetting password:", err);
      res.status(500).json({ error: "Gagal reset password" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
__name(handler14, "handler14");
var import_jsonwebtoken2 = __toESM(require_jsonwebtoken(), 1);
init_turso();
init_env();
var getJwtSecret = /* @__PURE__ */ __name((req) => getReqEnv(req, "JWT_SECRET", "your-secret-key-change-in-production"), "getJwtSecret");
var rateLimiter2 = createRateLimiter({ ...RATE_LIMITS.AUTH_REGISTER });
async function handler15(req, res) {
  await rateLimiter2(req, res, () => {
  });
  if (res.headersSent) return;
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    const client = getTursoClient();
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT
      )
    `);
    const body = await readJson(req);
    const { email, username, password } = body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: "Email, username, and password required" });
    }
    const existing = await client.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existing.rows && existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const usernameExists = await client.execute(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );
    if (usernameExists.rows && usernameExists.rows.length > 0) {
      return res.status(409).json({ error: "Username already taken" });
    }
    const passwordHash = await bcryptjs_default.hash(password, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const role = "member";
    await client.execute(
      "INSERT INTO users (id, email, username, passwordHash, role) VALUES (?, ?, ?, ?, ?)",
      [userId, email, username, passwordHash, role]
    );
    const token = import_jsonwebtoken2.default.sign(
      { userId, email, username, role },
      getJwtSecret(req),
      { expiresIn: "7d" }
    );
    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: { id: userId, email, username }
    });
  } catch (error3) {
    console.error("Register handler error:", error3);
    if (res.headersSent) return;
    res.status(500).json({ error: error3.message || "Registration failed" });
  }
}
__name(handler15, "handler15");
var import_jsonwebtoken3 = __toESM(require_jsonwebtoken(), 1);
init_turso();
init_env();
var getJwtSecret2 = /* @__PURE__ */ __name((req) => getReqEnv(req, "JWT_SECRET", "your-secret-key-change-in-production"), "getJwtSecret2");
var rateLimiter3 = createRateLimiter({ ...RATE_LIMITS.AUTH_LOGIN });
async function handler16(req, res) {
  let allowed = false;
  await rateLimiter3(req, res, () => {
    allowed = true;
  });
  if (res.headersSent) return;
  if (!allowed) {
    return res.status(429).json({
      error: "Too many requests",
      message: "Terlalu banyak percobaan login. Coba lagi nanti."
    });
  }
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    const client = getTursoClient();
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT
      )
    `);
    const body = await readJson(req);
    const { email, password } = body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const result = await client.execute(
      "SELECT id, email, username, passwordHash, role FROM users WHERE email = ?",
      [email]
    );
    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const user = result.rows[0];
    const isValidPassword = await bcryptjs_default.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = import_jsonwebtoken3.default.sign(
      { userId: user.id, email: user.email, username: user.username, role: user.role },
      getJwtSecret2(req),
      { expiresIn: "7d" }
    );
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
    });
  } catch (error3) {
    console.error("Login handler error:", error3);
    res.status(500).json({ error: error3.message || "Login failed" });
  }
}
__name(handler16, "handler16");
var import_jsonwebtoken4 = __toESM(require_jsonwebtoken(), 1);
init_turso();
init_env();
var getJwtSecret3 = /* @__PURE__ */ __name((req) => getReqEnv(req, "JWT_SECRET", "your-secret-key-change-in-production"), "getJwtSecret3");
async function handler17(req, res) {
  try {
    const client = getTursoClient();
    if (req.method === "GET") {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }
      let decoded;
      try {
        decoded = import_jsonwebtoken4.default.verify(token, getJwtSecret3(req));
      } catch (error3) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      const result = await client.execute(
        "SELECT id, email, username, createdAt, displayName, bio, profilePicture, instrument, experience, genres, location FROM users WHERE id = ?",
        [decoded.userId]
      );
      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = result.rows[0];
      if (user.genres && typeof user.genres === "string") {
        try {
          user.genres = JSON.parse(user.genres);
        } catch {
        }
      }
      const bandsResult = await client.execute(
        `SELECT b.id, b.name, b.genre, b.description, bm.role
         FROM band_members bm
         JOIN bands b ON bm.bandId = b.id
         WHERE bm.userId = ? AND bm.status = 'active' AND b.deletedAt IS NULL`,
        [user.id]
      );
      user.bands = bandsResult.rows || [];
      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          displayName: user.displayName,
          bio: user.bio,
          profilePicture: user.profilePicture,
          instrument: user.instrument,
          experience: user.experience,
          genres: user.genres,
          location: user.location,
          createdAt: user.createdAt,
          bands: user.bands
        }
      });
    }
    if (req.method === "PUT") {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }
      let decoded;
      try {
        decoded = import_jsonwebtoken4.default.verify(token, getJwtSecret3(req));
      } catch (error3) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      const userId = decoded.userId;
      const body = req.body || await readJson(req);
      const fields = {};
      if (body.displayName) fields.displayName = body.displayName;
      if (body.bio) fields.bio = body.bio;
      if (body.profilePicture) fields.profilePicture = body.profilePicture;
      if (body.instrument) fields.instrument = body.instrument;
      if (body.experience) fields.experience = body.experience;
      if (body.genres) fields.genres = JSON.stringify(body.genres);
      if (body.location) fields.location = body.location;
      if (Object.keys(fields).length === 0) {
        return res.status(400).json({ error: "No profile fields to update" });
      }
      const setClause = Object.keys(fields).map((k) => `${k} = ?`).join(", ");
      const values = Object.values(fields);
      values.push(userId);
      await client.execute(
        `UPDATE users SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
      return res.status(200).json({ success: true, message: "Profile updated" });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error3) {
    console.error("Get user handler error:", error3);
    res.status(500).json({ error: error3.message || "Failed to get user" });
  }
}
__name(handler17, "handler17");
init_turso();
init_env();
var smtpConfig = /* @__PURE__ */ __name((req) => ({
  host: getReqEnv(req, "SMTP_HOST") || getReqEnv(req, "EMAIL_HOST"),
  port: getReqEnv(req, "SMTP_PORT") || getReqEnv(req, "EMAIL_PORT"),
  user: getReqEnv(req, "SMTP_USER") || getReqEnv(req, "EMAIL_USER"),
  pass: getReqEnv(req, "SMTP_PASS") || getReqEnv(req, "EMAIL_PASSWORD"),
  appUrl: getReqEnv(req, "APP_URL", "http://localhost:5173")
}), "smtpConfig");
var rateLimiter4 = createRateLimiter({ ...RATE_LIMITS.AUTH_FORGOT });
async function handler18(req, res) {
  await rateLimiter4(req, res, () => {
  });
  if (res.headersSent) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { email } = await readJson(req);
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    const client = getTursoClient();
    const userResult = await client.execute(
      "SELECT id, username FROM users WHERE email = ?",
      [email]
    );
    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(200).json({
        message: "If an account exists with this email, a reset link has been sent"
      });
    }
    const userId = userResult.rows[0].id;
    const resetToken = randomHex(32);
    const tokenHash = crypto2.createHash("sha256").update(resetToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1e3);
    await client.execute(
      `INSERT INTO password_reset_tokens
       (userId, tokenHash, expiresAt, createdAt)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, tokenHash, expiresAt.toISOString()]
    );
    const smtp = smtpConfig(req);
    const resetLink = `${smtp.appUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    try {
      await sendMail(req, {
        from: smtp.user,
        to: email,
        subject: "Ruang Performer - Reset Your Password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">Password Reset Request</h2>
            <p>Hi ${userResult.rows[0].username},</p>
            <p>We received a request to reset your password. Click the link below to create a new password:</p>
            <p style="margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </p>
            <p>Or copy and paste this link:</p>
            <p style="word-break: break-all; color: #666;">${resetLink}</p>
            <p style="color: #999; font-size: 12px;">This link expires in 1 hour.</p>
            <p style="color: #999; font-size: 12px;">
              If you didn't request this reset, you can safely ignore this email.
            </p>
          </div>
        `,
        text: `
          Password Reset Request

          Hi ${userResult.rows[0].username},

          Click the link below to reset your password:
          ${resetLink}

          This link expires in 1 hour.

          If you didn't request this reset, you can safely ignore this email.
        `
      });
    } catch (emailError) {
      console.error("Email send error:", emailError);
      return res.status(500).json({ error: "Failed to send reset email" });
    }
    return res.status(200).json({
      message: "If an account exists with this email, a reset link has been sent"
    });
  } catch (error3) {
    console.error("Forgot password error:", error3);
    if (res.headersSent) return;
    return res.status(500).json({ error: "Failed to process password reset request" });
  }
}
__name(handler18, "handler18");
init_turso();
var rateLimiter5 = createRateLimiter({ ...RATE_LIMITS.AUTH_RESET });
async function handler19(req, res) {
  await rateLimiter5(req, res, () => {
  });
  if (res.headersSent) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { token, email, newPassword } = await readJson(req);
    if (!token || !email || !newPassword) {
      return res.status(400).json({ error: "Token, email, and password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const client = getTursoClient();
    const userResult = await client.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid reset token" });
    }
    const userId = userResult.rows[0].id;
    const tokenHash = crypto3.createHash("sha256").update(token).digest("hex");
    const tokenResult = await client.execute(
      `SELECT id FROM password_reset_tokens 
       WHERE userId = ? AND tokenHash = ? AND expiresAt > CURRENT_TIMESTAMP
       ORDER BY createdAt DESC LIMIT 1`,
      [userId, tokenHash]
    );
    if (!tokenResult.rows || tokenResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }
    const passwordHash = await bcryptjs_default.hash(newPassword, 10);
    await client.execute(
      "UPDATE users SET passwordHash = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [passwordHash, userId]
    );
    await client.execute(
      "DELETE FROM password_reset_tokens WHERE userId = ?",
      [userId]
    );
    await client.execute(
      `INSERT INTO audit_logs 
       (userId, action, category, severity, status, createdAt) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, "USER_PASSWORD_RESET", "SECURITY", "high", "success"]
    );
    return res.status(200).json({
      message: "Password reset successfully",
      success: true
    });
  } catch (error3) {
    console.error("Reset password error:", error3);
    if (res.headersSent) return;
    return res.status(500).json({ error: "Failed to reset password" });
  }
}
__name(handler19, "handler19");
var import_jsonwebtoken5 = __toESM(require_jsonwebtoken(), 1);
init_turso();
init_env();
var getJwtSecret4 = /* @__PURE__ */ __name((req) => getReqEnv(req, "JWT_SECRET", "your-secret-key-change-in-production"), "getJwtSecret4");
async function handler20(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token provided" });
  let decoded;
  try {
    decoded = import_jsonwebtoken5.default.verify(token, getJwtSecret4(req));
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  const userId = decoded.userId;
  const client = getTursoClient();
  if (req.method === "POST") {
    const body = await readJson(req);
    const { oldPassword, newPassword } = body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Old and new password required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const result = await client.execute("SELECT passwordHash FROM users WHERE id = ?", [userId]);
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = result.rows[0];
    const isValid2 = await bcryptjs_default.compare(oldPassword, user.passwordHash);
    if (!isValid2) {
      return res.status(401).json({ error: "Old password incorrect" });
    }
    const passwordHash = await bcryptjs_default.hash(newPassword, 10);
    await client.execute("UPDATE users SET passwordHash = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?", [passwordHash, userId]);
    return res.status(200).json({ success: true, message: "Password updated" });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
__name(handler20, "handler20");
var import_jsonwebtoken6 = __toESM(require_jsonwebtoken(), 1);
init_turso();
init_env();
var getJwtSecret5 = /* @__PURE__ */ __name((req) => getReqEnv(req, "JWT_SECRET", "your-secret-key-change-in-production"), "getJwtSecret5");
async function handler21(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const client = getTursoClient();
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    let decoded;
    try {
      decoded = import_jsonwebtoken6.default.verify(token, getJwtSecret5(req));
    } catch (error3) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    const userId = decoded.userId;
    const result = await client.execute(
      `SELECT id, action, category, severity, status, bandId, description, details, ipAddress, userAgent, changes, createdAt
       FROM audit_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT 20`,
      [userId]
    );
    return res.status(200).json({ success: true, logs: result.rows });
  } catch (error3) {
    console.error("Get user audit logs error:", error3);
    res.status(500).json({ error: error3.message || "Failed to get audit logs" });
  }
}
__name(handler21, "handler21");
var FETCH_TIMEOUT_MS = 1e4;
var MAX_REDIRECTS = 3;
function normalizeUrl(raw) {
  let value = String(raw || "").trim();
  if (!value) return null;
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    value = `https://${value}`;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed;
  } catch {
    return null;
  }
}
__name(normalizeUrl, "normalizeUrl");
async function fetchPage(urlObject) {
  let current = urlObject;
  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt += 1) {
    const response = await fetch(current.toString(), {
      method: "GET",
      redirect: "manual",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        accept: "text/html,application/xhtml+xml"
      },
      signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(FETCH_TIMEOUT_MS) : void 0
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { status: response.status, html: "" };
      current = new URL(location, current);
      continue;
    }
    const html = await response.text();
    return { status: response.status, html };
  }
  throw new Error("Terlalu banyak redirect");
}
__name(fetchPage, "fetchPage");
async function handler22(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: "URL diperlukan" });
    }
    const urlObject = normalizeUrl(url);
    if (!urlObject) {
      return res.status(400).json({ error: "Format URL tidak valid" });
    }
    const { status, html } = await fetchPage(urlObject);
    if (status !== 200) {
      return res.status(400).json({ error: `Halaman tidak ditemukan (${status})` });
    }
    if (!html) {
      return res.status(400).json({ error: "Halaman kosong atau tidak valid" });
    }
    return res.json({ html });
  } catch (error3) {
    console.error("Extract chord error:", error3.message);
    const isTimeout = /timeout|abort/i.test(error3.message || "");
    return res.status(isTimeout ? 504 : 500).json({
      error: error3.message || "Gagal memproses URL"
    });
  }
}
__name(handler22, "handler22");
function compile(pattern) {
  const names = [];
  const source = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\:(\w+)\?/g, (_, name) => {
    names.push(name);
    return "(?:\\/([^/]*))?";
  }).replace(/:(\w+)/g, (_, name) => {
    names.push(name);
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${source}$`), names };
}
__name(compile, "compile");
var routeTable = [
  // Backup/restore must stay ahead of the /api/tools prefix.
  { pattern: "/api/tools/backup", handler: handler10, auth: true },
  { pattern: "/api/tools/restore", handler: handler11, auth: true },
  { pattern: "/api/tools", handler: handler9, auth: true },
  { pattern: "/api/tools/*rest", handler: handler9, auth: true },
  { pattern: "/api/auth/register", handler: handler15 },
  { pattern: "/api/auth/login", handler: handler16 },
  { pattern: "/api/auth/me", handler: handler17, auth: true },
  { pattern: "/api/auth/user-audit-logs", handler: handler21, auth: true },
  { pattern: "/api/auth/change-password", handler: handler20, auth: true },
  { pattern: "/api/auth/forgot-password", handler: handler18 },
  { pattern: "/api/auth/reset-password", handler: handler19 },
  { pattern: "/api/songs", handler: handler2, auth: true },
  { pattern: "/api/songs/*rest", handler: handler2, auth: true },
  { pattern: "/api/setlists", handler: handler3, auth: true },
  { pattern: "/api/setlists/*rest", handler: handler3, auth: true },
  // Members must match first, otherwise `/api/bands` swallows them.
  { pattern: "/api/bands/:id/members", handler: handler6, auth: true },
  { pattern: "/api/bands/:id/members/:userId", handler: handler6, auth: true },
  { pattern: "/api/bands", handler: handler5, auth: true },
  { pattern: "/api/bands/:id", handler: handler5, auth: true },
  { pattern: "/api/events/:type", handler: handler7, auth: true },
  { pattern: "/api/events/:type/:id", handler: handler7, auth: true },
  { pattern: "/api/users/:id/reset-password", handler: handler14, auth: true },
  { pattern: "/api/users/:id", handler: handler13, auth: true },
  { pattern: "/api/users", handler: handler12, auth: true },
  { pattern: "/api/ai", handler: handler8 },
  { pattern: "/api/ai/*rest", handler: handler8 },
  { pattern: "/api/status", handler: /* @__PURE__ */ __name((req, res) => res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() }), "handler") },
  { pattern: "/api/extract-chord", handler: handler22 },
  { pattern: "/api", handler: /* @__PURE__ */ __name((req, res) => res.status(404).json({ error: "Not found" }), "handler") }
];
for (const rule of routeTable) {
  Object.assign(rule, compile(rule.pattern));
}
function splitUrl(url) {
  const index = url.indexOf("?");
  return index === -1 ? [url, ""] : [url.slice(0, index), url.slice(index + 1)];
}
__name(splitUrl, "splitUrl");
function mergeQuery(query, search) {
  const merged = { ...query || {} };
  if (!search) return merged;
  const params = new URLSearchParams(search);
  for (const [key, value] of params.entries()) {
    if (merged[key] === void 0) merged[key] = value;
  }
  return merged;
}
__name(mergeQuery, "mergeQuery");
function applyParams(req, rule, match) {
  const params = { ...req.params || {} };
  rule.names.forEach((name, index) => {
    const value = match[index + 1];
    if (value !== void 0 && params[name] === void 0) params[name] = value;
  });
  if (rule.pattern.endsWith("/*rest") && params.rest === void 0) {
    params.rest = match[match.length - 1] || "";
  }
  return params;
}
__name(applyParams, "applyParams");
function matchRoute(url) {
  const [pathname, search] = splitUrl(url || "/");
  for (const rule of routeTable) {
    const match = rule.regex.exec(pathname);
    if (match) return { rule, match, pathname, search };
  }
  return null;
}
__name(matchRoute, "matchRoute");
async function runHandler(rule, req, res) {
  if (rule.auth) {
    const authorized = await verifyToken(req, res);
    if (!authorized || res.headersSent) return res;
  }
  await rule.handler(req, res);
  return res;
}
__name(runHandler, "runHandler");
async function dispatch(req, res) {
  const found = matchRoute(req.url || "/");
  if (!found) return { matched: false, res };
  const { rule, match, pathname, search } = found;
  req.path = pathname;
  req.params = applyParams(req, rule, match);
  req.query = mergeQuery(req.query, search);
  await runHandler(rule, req, res);
  return { matched: true, res };
}
__name(dispatch, "dispatch");
var JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
function decode2(input) {
  try {
    return decodeURIComponent(input.replace(/\+/g, " "));
  } catch {
    return input;
  }
}
__name(decode2, "decode2");
function parseQuery2(search) {
  const out = {};
  if (!search) return out;
  const params = new URLSearchParams(search);
  for (const [key, value] of params.entries()) {
    if (out[key] === void 0) {
      out[key] = value;
    } else if (Array.isArray(out[key])) {
      out[key].push(value);
    } else {
      out[key] = [out[key], value];
    }
  }
  return out;
}
__name(parseQuery2, "parseQuery2");
function decodePath(pathname) {
  return pathname.split("/").map(decode2).join("/");
}
__name(decodePath, "decodePath");
function headersToObject(headers) {
  const out = {};
  if (!headers) return out;
  if (typeof headers.forEach === "function") {
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  for (const [key, value] of Object.entries(headers)) {
    out[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return out;
}
__name(headersToObject, "headersToObject");
function createRequestContext(request, { body, bodyText, params = {}, path, query, env: env22 } = {}) {
  const url = new URL(request.url);
  const pathname = path || decodePath(url.pathname);
  const headerObject = headersToObject(request.headers);
  const queryObject = query || parseQuery2(url.search);
  const rawBody = body;
  const req = {
    method: String(request.method || "GET").toUpperCase(),
    url: pathname + url.search,
    originalUrl: url.pathname + url.search,
    path: pathname,
    query: queryObject,
    params,
    headers: headerObject,
    body: rawBody,
    rpEnv: env22 || {},
    ip: headerObject["cf-connecting-ip"] || headerObject["x-forwarded-for"]?.split(",")[0]?.trim() || "127.0.0.1",
    // Keep the Web Request around for multipart streams (busboy-compatible).
    rawRequest: request,
    // The adapter buffers the request body once; helpers read this copy.
    rpBodyText: bodyText
  };
  req.connection = { remoteAddress: req.ip };
  req.socket = { remoteAddress: req.ip };
  const headers = /* @__PURE__ */ new Map();
  let statusCode = 200;
  let responseBody = "";
  let sent = false;
  const normalizeBody = /* @__PURE__ */ __name((payload) => {
    if (payload === void 0 || payload === null) return "";
    if (typeof payload === "string") return payload;
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(payload)) return payload;
    if (payload instanceof ArrayBuffer) return new Uint8Array(payload);
    if (ArrayBuffer.isView(payload)) return payload;
    return JSON.stringify(payload);
  }, "normalizeBody");
  const res = {
    get headersSent() {
      return sent;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return responseBody;
    },
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), value);
      return res;
    },
    getHeader(name) {
      return headers.get(String(name).toLowerCase());
    },
    removeHeader(name) {
      headers.delete(String(name).toLowerCase());
    },
    /** Plain object copy of the pending headers (Web `Response` needs this). */
    getHeaders() {
      return Object.fromEntries(headers.entries());
    },
    status(code) {
      if (!sent) statusCode = Number(code) || 200;
      return res;
    },
    json(payload) {
      if (!sent) {
        statusCode = statusCode || 200;
        headers.set("content-type", JSON_HEADERS["content-type"]);
        responseBody = JSON.stringify(payload);
        sent = true;
      }
      return res;
    },
    send(payload) {
      if (!sent) {
        responseBody = normalizeBody(payload);
        sent = true;
      }
      return res;
    },
    end(payload) {
      return res.send(payload);
    },
    writeHead(code, headerBag) {
      if (headerBag && typeof headerBag === "object") {
        for (const [key, value] of Object.entries(headerBag)) headers.set(key.toLowerCase(), value);
      }
      return res.status(code);
    }
  };
  return {
    req,
    res,
    get response() {
      return new Response(sent ? responseBody : "", {
        status: statusCode,
        headers
      });
    },
    // Mutable accessors so callers can read the response AFTER the handler ran
    // (a getter captured above would evaluate once, before dispatch).
    get status() {
      return statusCode;
    },
    get body() {
      return responseBody;
    },
    get sent() {
      return sent;
    }
  };
}
__name(createRequestContext, "createRequestContext");
function toResponse(ctx) {
  return new Response(ctx.sent ? ctx.body : "", { status: ctx.status, headers: ctx.res.getHeaders() });
}
__name(toResponse, "toResponse");
var API_PREFIX = "/api";
var JSON_404 = { "content-type": "application/json; charset=utf-8" };
function jsonResponse(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_404, ...extraHeaders }
  });
}
__name(jsonResponse, "jsonResponse");
async function bufferBody(request) {
  if (request.method === "GET" || request.method === "HEAD") return { body: void 0, bodyText: "" };
  const bytes = new Uint8Array(await request.arrayBuffer());
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  const isJson = contentType.includes("application/json") || contentType === "";
  const bodyText = new TextDecoder().decode(bytes);
  let body;
  if (isJson) {
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      body = void 0;
    }
  } else {
    body = bytes;
  }
  return { body, bodyText: null };
}
__name(bufferBody, "bufferBody");
async function handleApi(request, env22) {
  const { body, bodyText } = await bufferBody(request);
  const ctx = createRequestContext(request, { body, bodyText, env: env22 });
  const { req, res } = ctx;
  try {
    const { matched } = await dispatch(req, res);
    if (!matched) return jsonResponse(404, { error: "Not found" });
    return toResponse(ctx);
  } catch (error3) {
    console.error("Unhandled API error:", error3);
    if (res.headersSent) return toResponse(ctx);
    return jsonResponse(500, {
      error: "Internal Server Error",
      message: error3?.message
    });
  }
}
__name(handleApi, "handleApi");
async function serveAsset(request, env22) {
  const assets = env22.ASSETS;
  if (!assets || typeof assets.fetch !== "function") return null;
  const response = await assets.fetch(request);
  return response && response.status !== 404 ? response : null;
}
__name(serveAsset, "serveAsset");
async function serveSpaFallback(request, env22) {
  const assets = env22.ASSETS;
  if (!assets || typeof assets.fetch !== "function") return null;
  const url = new URL(request.url);
  url.pathname = "/index.html";
  const response = await assets.fetch(new Request(url.toString(), request));
  return response && response.status !== 404 ? response : null;
}
__name(serveSpaFallback, "serveSpaFallback");
var worker_default = {
  async fetch(request, env22) {
    const url = new URL(request.url);
    if (url.pathname === API_PREFIX || url.pathname.startsWith(`${API_PREFIX}/`)) {
      return handleApi(request, env22);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          "access-control-allow-headers": "Content-Type, Authorization"
        }
      });
    }
    const asset = await serveAsset(request, env22);
    if (asset) return asset;
    const fallback = await serveSpaFallback(request, env22);
    if (fallback) return fallback;
    return jsonResponse(404, { error: "Not found" });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
